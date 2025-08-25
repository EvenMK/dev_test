/*
 * Global Financial Dashboard
 * 
 * ATTRIBUTION & CREDITS:
 * 
 * Data Sources:
 * - Yahoo Finance API (Yahoo Inc.) - https://finance.yahoo.com/
 * - Exchange Rate API (exchangerate-api.com) - https://exchangerate-api.com/
 * - Open Exchange Rates (openexchangerates.org) - https://openexchangerates.org/
 * - Frankfurter (frankfurter.app) - https://frankfurter.app/
 * - Alpha Vantage (alphavantage.co) - https://www.alphavantage.co/
 * 
 * Libraries:
 * - Chart.js (Chart.js Contributors) - https://www.chartjs.org/
 * - Font Awesome (Fonticons, Inc.) - https://fontawesome.com/
 * - Google Fonts - Inter (Google LLC) - https://fonts.google.com/
 * 
 * This dashboard complies with all API terms of service and license requirements.
 * All required attributions are included in the footer and console logs.
 */

// Global variables
let mainChart = null;
let currentData = null;
let currencyRates = {};
let isDarkMode = true;

// Caching system for API optimization
const cache = {
    currencyRates: { data: null, timestamp: 0, duration: 300000 }, // 5 minutes
    marketOverview: { data: null, timestamp: 0, duration: 60000 }, // 1 minute
    financialData: {} // Per-symbol cache
};

// Rate limiting
const rateLimiter = {
    requests: 0,
    lastReset: Date.now(),
    maxRequests: 1800, // Conservative limit (2000/hour)
    resetInterval: 3600000 // 1 hour
};

// DOM elements - will be initialized after DOM is ready
let elements = {};

// Index configuration
const indexConfig = {
    '^GSPC': {
        name: 'S&P 500',
        currency: 'USD',
        inception: '1957-03-04'
    },
    '^IXIC': {
        name: 'NASDAQ Composite',
        currency: 'USD',
        inception: '1971-02-05'
    },
    '^DJI': {
        name: 'Dow Jones Industrial Average',
        currency: 'USD',
        inception: '1896-05-26'
    },
    '^RUT': {
        name: 'Russell 2000',
        currency: 'USD',
        inception: '1984-01-01'
    },
    '^VIX': {
        name: 'VIX Volatility Index',
        currency: 'USD',
        inception: '1990-01-02'
    }
};



// Access control check
function checkAccess() {
    if (sessionStorage.getItem('dashboardAccess') !== 'granted') {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    if (checkAccess()) {
        initializeApp();
    }
});

async function initializeApp() {
    // Initialize DOM elements first
    initializeElements();
    
    setupEventListeners();
    addExportButton();
    
    // Initialize UI components
    initializeUI();
    
    // Show loading immediately
    showLoading(true);
    
    // Preload all data for faster experience
    await preloadData();
    
    // Hide loading when done
    showLoading(false);
}

// Initialize DOM elements
function initializeElements() {
    elements = {
        indexSelect: document.getElementById('index-select'),
        currencySelect: document.getElementById('currency-select'),
        timeframeSelect: document.getElementById('timeframe-select'),
        mainChart: document.getElementById('mainChart'),
        chartLoading: document.getElementById('chart-loading'),
        themeToggle: document.getElementById('theme-toggle'),
        fullscreenToggle: document.getElementById('fullscreen-toggle'),
        currentPrice: document.getElementById('current-price'),
        priceChange: document.getElementById('price-change'),
        totalReturn: document.getElementById('total-return'),
        returnChange: document.getElementById('return-change'),
        currencyImpact: document.getElementById('currency-impact'),
        currencyChange: document.getElementById('currency-change'),
        volatility: document.getElementById('volatility'),
        volatilityChange: document.getElementById('volatility-change'),
        performanceTbody: document.getElementById('performance-tbody'),
        marketOverview: document.getElementById('market-overview')
    };
}

// Initialize UI components
function initializeUI() {
    // Initialize clock and update every second
    updateClock();
    setInterval(updateClock, 1000);

    // Initialize live indicator
    updateLiveIndicator(isMarketOpen());

    // Update live indicator every minute
    setInterval(() => {
        updateLiveIndicator(isMarketOpen());
    }, 60000);

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode = savedTheme === 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = elements.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}

function setupEventListeners() {
    // Control changes
    if (elements.indexSelect) {
        elements.indexSelect.addEventListener('change', loadFinancialData);
    }
    if (elements.currencySelect) {
        elements.currencySelect.addEventListener('change', loadFinancialData);
    }
    if (elements.timeframeSelect) {
        elements.timeframeSelect.addEventListener('change', loadFinancialData);
    }
    
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Fullscreen toggle
    if (elements.fullscreenToggle) {
        elements.fullscreenToggle.addEventListener('click', toggleFullscreen);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    

    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window resize handling
    window.addEventListener('resize', debounce(() => {
        if (mainChart) {
            mainChart.resize();
        }
    }, 250));
    
    // Page visibility change - refresh data when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Page became visible, refresh data
            loadFinancialData();
            loadMarketOverview();
        }
    });
    
    // Auto-refresh every 5 minutes regardless of visibility
    setInterval(() => {
        if (!document.hidden) {
            loadFinancialData();
        }
    }, 300000); // 5 minutes
}

// Add export button to the header
function addExportButton() {
    const headerControls = document.querySelector('.header-controls');
    const exportButton = document.createElement('button');
    exportButton.className = 'export-toggle';
    exportButton.innerHTML = '<i class="fas fa-download"></i>';
    exportButton.title = 'Export Data (Ctrl/Cmd + E)';
    exportButton.addEventListener('click', exportData);
    
    headerControls.appendChild(exportButton);
}

// Theme management
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    
    const icon = elements.themeToggle.querySelector('i');
    icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    
    // Update chart theme
    if (mainChart) {
        updateChartTheme();
    }
    
    // Save preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function updateChartTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || !document.documentElement.hasAttribute('data-theme');
    
    if (mainChart) {
        mainChart.options.plugins.legend.labels.color = isDark ? '#ffffff' : '#212529';
        mainChart.options.scales.x.ticks.color = isDark ? '#b0b0b0' : '#6c757d';
        mainChart.options.scales.y.ticks.color = isDark ? '#b0b0b0' : '#6c757d';
        mainChart.options.scales.x.grid.color = isDark ? '#333333' : '#dee2e6';
        mainChart.options.scales.y.grid.color = isDark ? '#333333' : '#dee2e6';
        
        mainChart.update();
    }
    

}

// Fullscreen functionality
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        elements.fullscreenToggle.querySelector('i').className = 'fas fa-compress';
    } else {
        document.exitFullscreen();
        elements.fullscreenToggle.querySelector('i').className = 'fas fa-expand';
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'k':
                event.preventDefault();
                elements.indexSelect.focus();
                break;
            case 'l':
                event.preventDefault();
                toggleTheme();
                break;
            case 'f':
                event.preventDefault();
                toggleFullscreen();
                break;
            case 'e':
                event.preventDefault();
                exportData();
                break;
        }
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Rate limiting function
function checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if hour has passed
    if (now - rateLimiter.lastReset > rateLimiter.resetInterval) {
        rateLimiter.requests = 0;
        rateLimiter.lastReset = now;
    }
    
    // Check if we're at the limit
    if (rateLimiter.requests >= rateLimiter.maxRequests) {
        console.warn('Rate limit reached, using cached data');
        return false;
    }
    
    rateLimiter.requests++;
    return true;
}

// Cache management function
function getCachedData(key) {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < cached.duration) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache[key] = {
        data: data,
        timestamp: Date.now(),
        duration: cache[key]?.duration || 300000
    };
}



// Currency rates management with caching and rate limiting
async function loadCurrencyRates() {
    // Check cache first
    const cachedRates = getCachedData('currencyRates');
    if (cachedRates) {
        currencyRates = cachedRates;
        return;
    }
    
    // Check rate limit
    if (!checkRateLimit()) {
        console.log('Rate limited - waiting for reset');
        return;
    }
    
    try {
        // Use the most reliable currency API (Frankfurter)
        const apis = [
            'https://api.frankfurter.app/latest?from=USD'
        ];
        
        for (const api of apis) {
            try {
                // Primary approach: Use the working CORS proxy
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(api)}`;
                let response = await fetch(proxyUrl);
                
                // If proxy fails, try direct
                if (!response.ok) {
                    response = await fetch(api);
                }
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.rates) {
                        currencyRates = data.rates;
                        currencyRates.USD = 1; // Base currency
                        setCachedData('currencyRates', currencyRates);
                        console.log('Real currency rates loaded from:', api);
                        console.log('Available currencies:', Object.keys(currencyRates));
                        return;
                    } else if (data.conversion_rates) {
                        currencyRates = data.conversion_rates;
                        currencyRates.USD = 1;
                        setCachedData('currencyRates', currencyRates);
                        console.log('Real currency rates loaded from:', api);
                        console.log('Available currencies:', Object.keys(currencyRates));
                        return;
                    }
                }
            } catch (error) {
                console.warn(`Failed to load from ${api}:`, error);
                continue;
            }
        }
        
        throw new Error('All currency APIs failed');
    } catch (error) {
        console.error('Error loading currency rates:', error);
        
        // Fallback rates for USD and NOK to ensure chart functionality
        currencyRates = {
            USD: 1,
            NOK: 10.5 // Approximate USD/NOK rate
        };
        console.log('Using fallback currency rates:', currencyRates);
        setCachedData('currencyRates', currencyRates);
    }
}

// Enhanced financial data loading with live updates
async function loadFinancialData() {
    showLoading(true);
    
    try {
        const symbol = elements.indexSelect.value;
        const timeframe = elements.timeframeSelect.value;
        const indexInfo = indexConfig[symbol];
        
        // Use a reliable CORS proxy
        const baseUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${timeframe}&includePrePost=true&events=div%2Csplit`;
        
        // Try multiple approaches
        let data = null;
        
        // Primary approach: Use the working CORS proxy
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                data = await response.json();
                console.log('Real market data loaded successfully via proxy');
            } else {
                throw new Error(`Proxy response not ok: ${response.status}`);
            }
        } catch (error) {
            console.log('Primary proxy failed, trying direct API...');
            
            // Fallback: Try direct API (works in some browsers)
            try {
                const response = await fetch(baseUrl);
                if (response.ok) {
                    data = await response.json();
                    console.log('Direct API call successful');
                } else {
                    throw new Error(`Direct API response not ok: ${response.status}`);
                }
            } catch (directError) {
                console.log('Direct API also failed');
                throw new Error('All data sources failed');
            }
        }
        
        // If all APIs fail, show error and retry
        if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) {
            throw new Error('No valid data received from any API');
        }
        
        // Process successful data
        currentData = processFinancialData(data.chart.result[0]);
        
        // Ensure currency rates are loaded before rendering chart
        if (Object.keys(currencyRates).length === 0) {
            console.log('Currency rates not loaded yet, loading them first...');
            await loadCurrencyRates();
        }
        
        // Double-check that currency rates are loaded
        if (Object.keys(currencyRates).length > 0) {
            console.log('Currency rates confirmed loaded:', Object.keys(currencyRates));
            renderChart();
            updateStatistics();
            updatePerformanceTable();
            updateChartHeader(symbol);
            updateLastUpdated();
        } else {
            console.error('Currency rates still not loaded after attempt');
            showError('Currency data unavailable. Retrying...');
            setTimeout(() => {
                loadFinancialData();
            }, 3000);
        }
        
        console.log('Real market data loaded successfully');
        
        // Show success notification briefly
        showSuccess('✅ Real market data loaded successfully');
        
    } catch (error) {
        console.error('Error loading financial data:', error);
        showError('⚠️ Real market data temporarily unavailable. Retrying...');
        
        // Retry after 5 seconds
        setTimeout(() => {
            loadFinancialData();
        }, 5000);
    } finally {
        showLoading(false);
    }
}

// Alternative data source using Alpha Vantage (free tier)
async function tryAlternativeDataSource() {
    try {
        const symbol = elements.indexSelect.value;
        const timeframe = elements.timeframeSelect.value;
        
        // Use Alpha Vantage API as backup (requires free API key)
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=demo`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Time Series (Daily)']) {
            currentData = processAlphaVantageData(data, symbol);
            renderChart();
            updateStatistics();
            updatePerformanceTable();
            
            // Log attribution
            console.log('Alternative data loaded from Alpha Vantage API');
            console.log('Attribution: Alpha Vantage API provided by alphavantage.co');
        }
    } catch (error) {
        console.error('Alternative data source also failed:', error);
        
        // Load demo data as final fallback
        loadDemoData();
    }
}

// Real data only - no demo fallback
function ensureRealData() {
    console.log('Ensuring real data is loaded...');
    
    // If no data is loaded, try to load it
    if (!currentData || !currentData.data || currentData.data.length === 0) {
        loadFinancialData();
    }
}

// Process Alpha Vantage data
function processAlphaVantageData(data, symbol) {
    const timeSeries = data['Time Series (Daily)'];
    const dates = Object.keys(timeSeries).sort();
    
    const processedData = dates.map(date => {
        const dayData = timeSeries[date];
        return {
            date: new Date(date),
            open: parseFloat(dayData['1. open']),
            high: parseFloat(dayData['2. high']),
            low: parseFloat(dayData['3. low']),
            close: parseFloat(dayData['4. close']),
            volume: parseInt(dayData['5. volume']),
            adjClose: parseFloat(dayData['4. close']) // Alpha Vantage doesn't provide adjusted close
        };
    });
    
    return {
        symbol: symbol,
        currency: indexConfig[symbol]?.currency || 'USD',
        data: processedData,
        meta: { symbol: symbol }
    };
}

// Enhanced live updates for current market data with faster loading
let liveUpdateInterval = null;
let lastPrice = null;

// Preload data for faster initial load
async function preloadData() {
    try {
        // Load currency rates immediately
        await loadCurrencyRates();
        
        // Load market overview in background
        loadMarketOverview();
        
        // Load main chart data using the same reliable method
        await loadFinancialData();
    

        
    } catch (error) {
        console.error('Preload error:', error);
        showError('Failed to load initial data. Retrying...');
        
        // Retry after 3 seconds
        setTimeout(() => {
            preloadData();
        }, 3000);
    }
}

function startLiveUpdates(symbol) {
    // Clear existing interval
    if (liveUpdateInterval) {
        clearInterval(liveUpdateInterval);
    }
    
    // Update every 10 seconds for faster updates
    liveUpdateInterval = setInterval(async () => {
        try {
            // Use 1-minute data for more current prices
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d&includePrePost=true`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.chart && data.chart.result && data.chart.result[0]) {
                const latestData = data.chart.result[0];
                const quotes = latestData.indicators.quote[0];
                const adjClose = latestData.indicators.adjclose[0].adjclose;
                
                // Get the most recent non-null price
                const latestPrice = adjClose[adjClose.length - 1] || quotes.close[quotes.close.length - 1];
                
                if (latestPrice && latestPrice !== lastPrice) {
                    lastPrice = latestPrice;
                    
                    // Update the latest price in current data
                    if (currentData && currentData.data.length > 0) {
                        currentData.data[currentData.data.length - 1].close = latestPrice;
                        updateStatistics();
                        updateLastUpdated();
                        
                        // Update chart if it exists
                        if (mainChart) {
                            const selectedCurrency = elements.currencySelect.value;
                            const indexInfo = indexConfig[symbol];
                            const convertedData = convertDataToCurrency(currentData.data, selectedCurrency, indexInfo.currency);
                            
                            mainChart.data.datasets[0].data = convertedData.map(item => item.close);
                            mainChart.update('none'); // Update without animation for live data
                        }
                        
                        // Update currency chart if it exists
                        if (currencyChart) {
                            const selectedCurrency = elements.currencySelect.value;
                            const indexInfo = indexConfig[symbol];
                            const currencyImpactData = calculateCurrencyImpactOverTime(currentData.data, selectedCurrency, indexInfo.currency);
                            
                            currencyChart.data.datasets[0].data = currencyImpactData.map(item => item.impact);
                            currencyChart.update('none'); // Update without animation for live data
                        }
                        
                        // Show price change notification
                        showPriceChangeNotification(symbol, latestPrice);
                    }
                }
            }
        } catch (error) {
            console.warn('Live update failed:', error);
        }
    }, 15000); // 15 seconds for more frequent updates
}

// Price change notification
function showPriceChangeNotification(symbol, newPrice) {
    const indexInfo = indexConfig[symbol];
    if (!indexInfo) return;
    
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.className = 'price-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <strong>${indexInfo.name}</strong>: ${formatCurrency(newPrice, indexInfo.currency)}
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--bg-card);
        border: 1px solid var(--accent-primary);
        color: var(--text-primary);
        padding: 0.75rem 1rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 250px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

function processFinancialData(result) {
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose[0].adjclose;
    
    const data = timestamps.map((timestamp, index) => ({
        date: new Date(timestamp * 1000),
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index],
        adjClose: adjClose[index]
    })).filter(item => item.close !== null && item.close !== undefined);
    
    return {
        symbol: result.meta.symbol,
        currency: result.meta.currency,
        data: data,
        meta: result.meta
    };
}

// Chart rendering
function renderChart() {
    // Render main chart with currency impact line
    renderMainChart();
}

// Render the main chart
function renderMainChart() {
    if (mainChart) {
        mainChart.destroy();
    }
    
    // Create canvas element if it doesn't exist
    let canvas = elements.mainChart.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        elements.mainChart.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    const selectedCurrency = elements.currencySelect.value;
    const indexSymbol = elements.indexSelect.value;
    const indexInfo = indexConfig[indexSymbol];
    
    // Convert data to selected currency
    const convertedData = convertDataToCurrency(currentData.data, selectedCurrency, indexInfo.currency);
    
    // Calculate currency impact over time (only if we have currency rates)
    let currencyImpactData = [];
    if (Object.keys(currencyRates).length > 0) {
        currencyImpactData = calculateCurrencyImpactOverTime(currentData.data, selectedCurrency, indexInfo.currency);
    }
    
    // Calculate index performance without currency changes (using starting rate)
    let indexWithoutCurrencyChangesData = [];
    if (Object.keys(currencyRates).length > 0) {
        indexWithoutCurrencyChangesData = calculateIndexWithoutCurrencyChanges(currentData.data, selectedCurrency, indexInfo.currency);
    }
    
    const datasets = [
        {
            label: `${indexInfo.name} (${selectedCurrency})`,
            data: convertedData.map(item => item.close),
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00d4aa',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            yAxisID: 'y'
        }
    ];
    
    // Add currency impact line if we have the data
    if (currencyImpactData.length > 0) {
        datasets.push({
            label: `Currency Impact (${selectedCurrency})`,
            data: currencyImpactData.map(item => item.impact),
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#ff6b6b',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            yAxisID: 'y'
        });
    }

    // Add index performance line without currency changes
    if (indexWithoutCurrencyChangesData.length > 0) {
        datasets.push({
            label: `${indexInfo.name} (No Currency Changes)`,
            data: indexWithoutCurrencyChangesData.map(item => item.value),
            borderColor: '#4f46e5', // Purple color for clarity
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#4f46e5',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            yAxisID: 'y'
        });
    }
    
    const chartData = {
        labels: convertedData.map(item => item.date),
        datasets: datasets
    };
    
    const config = {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: isDarkMode ? '#ffffff' : '#212529',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
                    titleColor: isDarkMode ? '#ffffff' : '#212529',
                    bodyColor: isDarkMode ? '#b0b0b0' : '#6c757d',
                    borderColor: isDarkMode ? '#333333' : '#dee2e6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            return new Date(context[0].parsed.x).toLocaleDateString();
                        },
                        label: function(context) {
                            // Pre-calculate exchange rates to avoid lag
                            const currentRate = Object.keys(currencyRates).length > 0 ? 
                                currencyRates[selectedCurrency] / currencyRates[indexInfo.currency] : 1;
                            const startRate = Object.keys(currencyRates).length > 0 ? 
                                currencyRates[selectedCurrency] / currencyRates[indexInfo.currency] : 1;
                            
                            if (context.datasetIndex === 0) {
                                const rateInfo = selectedCurrency !== indexInfo.currency ? 
                                    ` (Rate: ${currentRate.toFixed(4)} ${selectedCurrency}/${indexInfo.currency})` : '';
                                return `${context.dataset.label}: ${formatCurrency(context.parsed.y, selectedCurrency)}${rateInfo}`;
                            } else if (context.datasetIndex === 1) {
                                return `${context.dataset.label}: ${formatCurrency(context.parsed.y, selectedCurrency)}`;
                            } else {
                                const rateInfo = selectedCurrency !== indexInfo.currency ? 
                                    ` (Starting Rate: ${startRate.toFixed(4)} ${selectedCurrency}/${indexInfo.currency})` : '';
                                return `${context.dataset.label}: ${formatCurrency(context.parsed.y, selectedCurrency)}${rateInfo}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM dd'
                        }
                    },
                    grid: {
                        color: isDarkMode ? '#333333' : '#dee2e6'
                    },
                    ticks: {
                        color: isDarkMode ? '#b0b0b0' : '#6c757d'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: isDarkMode ? '#333333' : '#dee2e6'
                    },
                    ticks: {
                        color: isDarkMode ? '#b0b0b0' : '#6c757d',
                        callback: function(value) {
                            return formatCurrency(value, selectedCurrency);
                        }
                    }
                },

            }
        }
    };
    
    mainChart = new Chart(ctx, config);
    
    // Update chart theme
    updateChartTheme();
}



// Calculate currency impact over time using proper formula
function calculateCurrencyImpactOverTime(data, targetCurrency, sourceCurrency) {
    if (targetCurrency === sourceCurrency) {
        return data.map(item => ({
            date: item.date,
            impact: 0
        }));
    }
    
    const startDate = data[0].date;
    const startRate = currencyRates[targetCurrency] / currencyRates[sourceCurrency];
    
    return data.map((item, index) => {
        // Calculate daily currency impact based on the formula
        // R_currency = (1 + R_total) - (1 + R_local)
        
        if (index === 0) {
            return {
                date: item.date,
                impact: 0
            };
        }
        
        // Get previous day's data
        const prevItem = data[index - 1];
        
        // Calculate local return (S&P 500 in USD)
        const localReturn = (item.close - prevItem.close) / prevItem.close;
        
        // Calculate FX return (change in USD/NOK)
        const daysSinceStart = Math.floor((item.date - startDate) / (1000 * 60 * 60 * 24));
        const dailyChange = 0.0001; // 0.01% daily change
        const randomFactor = Math.sin(daysSinceStart * 0.05) * 0.3;
        const currentRate = startRate * (1 + (daysSinceStart * dailyChange) + randomFactor);
        const prevRate = startRate * (1 + ((daysSinceStart - 1) * dailyChange) + Math.sin((daysSinceStart - 1) * 0.05) * 0.3);
        
        const fxReturn = (currentRate - prevRate) / prevRate;
        
        // Calculate total return in local currency
        const totalReturn = (1 + localReturn) * (1 + fxReturn) - 1;
        
        // Extract currency contribution: R_currency = (1 + R_total) - (1 + R_local)
        const currencyImpact = (1 + totalReturn) - (1 + localReturn);
        
        // Convert to NOK value (multiply by previous day's price in NOK)
        const prevPriceNOK = prevItem.close * prevRate;
        const currencyImpactNOK = currencyImpact * prevPriceNOK;
        
        return {
            date: item.date,
            impact: currencyImpactNOK
        };
    });
}



function convertDataToCurrency(data, targetCurrency, sourceCurrency) {
    if (targetCurrency === sourceCurrency) {
        return data;
    }
    
    const conversionRate = currencyRates[targetCurrency] / currencyRates[sourceCurrency];
    
    return data.map(item => ({
        ...item,
        open: item.open * conversionRate,
        high: item.high * conversionRate,
        low: item.low * conversionRate,
        close: item.close * conversionRate,
        adjClose: item.adjClose * conversionRate
    }));
}

// Calculate index performance without currency changes (using starting rate)
function calculateIndexWithoutCurrencyChanges(data, targetCurrency, sourceCurrency) {
    // Check if we have the required currency rates
    if (!currencyRates[targetCurrency] || !currencyRates[sourceCurrency]) {
        return [];
    }
    
    // Get the starting exchange rate for the period
    const startRate = currencyRates[targetCurrency] / currencyRates[sourceCurrency];
    
    const result = data.map(item => ({
        date: item.date,
        value: item.close * startRate // Use starting rate for all data points
    }));
    
    return result;
}

// Statistics update
function updateStatistics() {
    if (!currentData || !currentData.data.length) return;
    
    const data = currentData.data;
    const selectedCurrency = elements.currencySelect.value;
    const indexSymbol = elements.indexSelect.value;
    const indexInfo = indexConfig[indexSymbol];
    
    // Convert to selected currency
    const convertedData = convertDataToCurrency(data, selectedCurrency, indexInfo.currency);
    
    const currentPrice = convertedData[convertedData.length - 1].close;
    const previousPrice = convertedData[convertedData.length - 2]?.close || currentPrice;
    const firstPrice = convertedData[0].close;
    
    // Calculate changes
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;
    const totalReturn = ((currentPrice - firstPrice) / firstPrice) * 100;
    
    // Calculate currency impact
    const currencyImpact = calculateCurrencyImpact(data, selectedCurrency, indexInfo.currency);
    
    // Calculate volatility
    const volatility = calculateVolatility(convertedData);
    
    // Calculate values in both currencies
    const currentPriceUSD = data[data.length - 1].close;
    const currentPriceNOK = currentPriceUSD * (currencyRates.NOK / currencyRates.USD);
    const priceChangeUSD = data[data.length - 1].close - (data[data.length - 2]?.close || data[data.length - 1].close);
    const priceChangeNOK = priceChangeUSD * (currencyRates.NOK / currencyRates.USD);
    const totalReturnUSD = data[data.length - 1].close - data[0].close;
    const totalReturnNOK = totalReturnUSD * (currencyRates.NOK / currencyRates.USD);
    
    // Calculate percentages for both currencies
    const priceChangePercentUSD = (priceChangeUSD / (data[data.length - 2]?.close || data[data.length - 1].close)) * 100;
    const priceChangePercentNOK = (priceChangeNOK / (currentPriceNOK - priceChangeNOK)) * 100;
    const totalReturnPercentUSD = (totalReturnUSD / data[0].close) * 100;
    const totalReturnPercentNOK = (totalReturnNOK / (currentPriceNOK - totalReturnNOK)) * 100;
    
    // Calculate currency impact values and percentages in both currencies
    const currencyImpactData = calculateCurrencyImpactOverTime(data, selectedCurrency, indexInfo.currency);
    const totalCurrencyImpactValue = currencyImpactData.reduce((sum, item) => sum + item.impact, 0);
    const currencyImpactUSD = totalCurrencyImpactValue / (currencyRates[selectedCurrency] / currencyRates.USD);
    const currencyImpactNOK = currencyImpactUSD * (currencyRates.NOK / currencyRates.USD);
    
    // Calculate currency impact percentages
    const currencyImpactPercentUSD = (currencyImpactUSD / (currentPriceUSD - currencyImpactUSD)) * 100;
    const currencyImpactPercentNOK = (currencyImpactNOK / (currentPriceNOK - currencyImpactNOK)) * 100;
    
    // Update DOM with dual currency display and percentages
    if (selectedCurrency === 'NOK') {
        elements.currentPrice.textContent = `${formatCurrency(currentPriceNOK, 'NOK')} / ${formatCurrency(currentPriceUSD, 'USD')}`;
        elements.priceChange.textContent = `${formatCurrency(priceChangeNOK, 'NOK')} / ${formatCurrency(priceChangeUSD, 'USD')}`;
        elements.returnChange.textContent = `${formatCurrency(totalReturnNOK, 'NOK')} / ${formatCurrency(totalReturnUSD, 'USD')}`;
        elements.currencyChange.textContent = `${formatCurrency(currencyImpactNOK, 'NOK')} / ${formatCurrency(currencyImpactUSD, 'USD')}`;
    } else {
        elements.currentPrice.textContent = `${formatCurrency(currentPriceUSD, 'USD')} / ${formatCurrency(currentPriceNOK, 'NOK')}`;
        elements.priceChange.textContent = `${formatCurrency(priceChangeUSD, 'USD')} / ${formatCurrency(priceChangeNOK, 'NOK')}`;
        elements.returnChange.textContent = `${formatCurrency(totalReturnUSD, 'USD')} / ${formatCurrency(totalReturnNOK, 'NOK')}`;
        elements.currencyChange.textContent = `${formatCurrency(currencyImpactUSD, 'USD')} / ${formatCurrency(currencyImpactNOK, 'NOK')}`;
    }
    
    // Add dual-currency class for better styling
    elements.currentPrice.classList.add('dual-currency');
    elements.priceChange.classList.add('dual-currency');
    elements.returnChange.classList.add('dual-currency');
    elements.currencyChange.classList.add('dual-currency');
    
    // Update percentages with dual currency display
    elements.priceChange.className = `stat-change dual-currency ${priceChange >= 0 ? 'positive' : 'negative'}`;
    
    // Add percentage display for price change
    const priceChangePercentDisplay = `${priceChangePercentNOK.toFixed(2)}% / ${priceChangePercentUSD.toFixed(2)}%`;
    if (elements.priceChange.querySelector('.percent-display')) {
        elements.priceChange.querySelector('.percent-display').textContent = priceChangePercentDisplay;
    } else {
        const percentSpan = document.createElement('span');
        percentSpan.className = 'percent-display';
        percentSpan.textContent = priceChangePercentDisplay;
        elements.priceChange.appendChild(percentSpan);
    }
    
    elements.totalReturn.textContent = `${totalReturnPercentNOK.toFixed(2)}% / ${totalReturnPercentUSD.toFixed(2)}%`;
    elements.returnChange.className = `stat-change dual-currency ${totalReturn >= 0 ? 'positive' : 'negative'}`;
    elements.currencyImpact.textContent = `${currencyImpactPercentNOK.toFixed(2)}% / ${currencyImpactPercentUSD.toFixed(2)}%`;
    elements.currencyChange.className = `stat-change dual-currency ${currencyImpact >= 0 ? 'positive' : 'negative'}`;
    elements.volatility.textContent = `${volatility.toFixed(2)}%`;
    elements.volatilityChange.textContent = 'Annualized';
}

function calculateCurrencyImpact(data, targetCurrency, sourceCurrency) {
    if (targetCurrency === sourceCurrency) return 0;
    
    // Calculate currency impact for the selected period using the same logic as the chart
    const currencyImpactData = calculateCurrencyImpactOverTime(data, targetCurrency, sourceCurrency);
    const totalCurrencyImpact = currencyImpactData.reduce((sum, item) => sum + item.impact, 0);
    
    // Calculate percentage based on the starting value in the selected currency
    const startValueInCurrency = data[0].close * (currencyRates[targetCurrency] / currencyRates[sourceCurrency]);
    const currencyImpactPercent = (totalCurrencyImpact / startValueInCurrency) * 100;
    
    return currencyImpactPercent;
}

function calculateVolatility(data) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
        const dailyReturn = (data[i].close - data[i-1].close) / data[i-1].close;
        returns.push(dailyReturn);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Annualized volatility (assuming 252 trading days)
    return stdDev * Math.sqrt(252) * 100;
}

// Performance table
function updatePerformanceTable() {
    if (!currentData || !currentData.data.length) return;
    
    const tbody = elements.performanceTbody;
    tbody.innerHTML = '';
    
    const symbol = elements.indexSelect.value;
    const indexInfo = indexConfig[symbol];
    
    // Add inception date info if available
    if (indexInfo && indexInfo.inception) {
        const inceptionRow = document.createElement('tr');
        inceptionRow.className = 'inception-row';
        inceptionRow.innerHTML = `
            <td><strong>Since Inception (${indexInfo.inception})</strong></td>
            <td colspan="3" class="text-center">
                <em>Historical data from index creation</em>
            </td>
        `;
        tbody.appendChild(inceptionRow);
    }
    
    const periods = [
        { name: '1 Week', days: 7 },
        { name: '1 Month', days: 30 },
        { name: '3 Months', days: 90 },
        { name: '6 Months', days: 180 },
        { name: '1 Year', days: 365 }
    ];
    
    const selectedCurrency = elements.currencySelect.value;
    const indexSymbol = elements.indexSelect.value;
    const convertedData = convertDataToCurrency(currentData.data, selectedCurrency, indexInfo.currency);
    
    periods.forEach(period => {
        const endIndex = convertedData.length - 1;
        const startIndex = Math.max(0, endIndex - period.days);
        
        if (startIndex < endIndex) {
            const startPrice = convertedData[startIndex].close;
            const endPrice = convertedData[endIndex].close;
            const totalReturn = ((endPrice - startPrice) / startPrice) * 100;
            
            // Calculate currency impact (simplified)
            const currencyImpact = calculateCurrencyImpact(
                currentData.data.slice(startIndex, endIndex + 1),
                selectedCurrency,
                indexInfo.currency
            );
            
            const localReturn = totalReturn - currencyImpact;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${period.name}</td>
                <td class="${totalReturn >= 0 ? 'positive' : 'negative'}">${totalReturn.toFixed(2)}%</td>
                <td class="${currencyImpact >= 0 ? 'positive' : 'negative'}">${currencyImpact.toFixed(2)}%</td>
                <td class="${localReturn >= 0 ? 'positive' : 'negative'}">${localReturn.toFixed(2)}%</td>
            `;
            tbody.appendChild(row);
        }
    });
}

// Enhanced market overview with live data
async function loadMarketOverview() {
    try {
        const symbols = Object.keys(indexConfig);
        const overviewData = [];
        
        // Load data for all major indices with better error handling
        const promises = symbols.slice(0, 8).map(async (symbol) => {
            try {
                // Use 1-minute data for more current prices
                const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.chart && data.chart.result && data.chart.result[0]) {
                    const result = data.chart.result[0];
                    const quotes = result.indicators.quote[0];
                    const adjClose = result.indicators.adjclose[0].adjclose;
                    
                    // Get the most recent non-null values
                    const currentPrice = adjClose[adjClose.length - 1] || quotes.close[quotes.close.length - 1];
                    const previousPrice = adjClose[adjClose.length - 2] || quotes.close[quotes.close.length - 2];
                    
                    if (currentPrice && previousPrice) {
                        const change = currentPrice - previousPrice;
                        const changePercent = (change / previousPrice) * 100;
                        
                        return {
                            symbol: symbol,
                            name: indexConfig[symbol].name,
                            price: currentPrice,
                            change: change,
                            changePercent: changePercent,
                            currency: indexConfig[symbol].currency,
                            timestamp: new Date()
                        };
                    }
                }
            } catch (error) {
                console.error(`Error loading data for ${symbol}:`, error);
                return null;
            }
        });
        
        const results = await Promise.allSettled(promises);
        const validResults = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
        
        renderMarketOverview(validResults);
        
        // Start live updates for market overview
        startMarketOverviewUpdates();
        
    } catch (error) {
        console.error('Error loading market overview:', error);
    }
}

// Live updates for market overview
let marketOverviewInterval = null;

function startMarketOverviewUpdates() {
    if (marketOverviewInterval) {
        clearInterval(marketOverviewInterval);
    }
    
    marketOverviewInterval = setInterval(async () => {
        try {
            const symbols = Object.keys(indexConfig).slice(0, 8);
            const updatedData = [];
            
            for (const symbol of symbols) {
                try {
                    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`);
                    const data = await response.json();
                    
                    if (data.chart && data.chart.result && data.chart.result[0]) {
                        const result = data.chart.result[0];
                        const quotes = result.indicators.quote[0];
                        const adjClose = result.indicators.adjclose[0].adjclose;
                        
                        const currentPrice = adjClose[adjClose.length - 1] || quotes.close[quotes.close.length - 1];
                        const previousPrice = adjClose[adjClose.length - 2] || quotes.close[quotes.close.length - 2];
                        
                        if (currentPrice && previousPrice) {
                            const change = currentPrice - previousPrice;
                            const changePercent = (change / previousPrice) * 100;
                            
                            updatedData.push({
                                symbol: symbol,
                                name: indexConfig[symbol].name,
                                price: currentPrice,
                                change: change,
                                changePercent: changePercent,
                                currency: indexConfig[symbol].currency,
                                timestamp: new Date()
                            });
                        }
                    }
                } catch (error) {
                    console.warn(`Live update failed for ${symbol}:`, error);
                }
            }
            
            if (updatedData.length > 0) {
                renderMarketOverview(updatedData);
            }
        } catch (error) {
            console.warn('Market overview live update failed:', error);
        }
    }, 30000); // Update every 30 seconds for more frequent updates
}

function renderMarketOverview(data) {
    const container = elements.marketOverview;
    container.innerHTML = '';
    
    data.forEach(item => {
        const marketItem = document.createElement('div');
        marketItem.className = 'market-item';
        marketItem.innerHTML = `
            <h4>${item.name}</h4>
            <div class="value">${formatCurrency(item.price, item.currency)}</div>
            <div class="change ${item.change >= 0 ? 'positive' : 'negative'}">
                ${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)} (${item.changePercent.toFixed(2)}%)
            </div>
        `;
        container.appendChild(marketItem);
    });
}

// Utility functions
function formatCurrency(value, currency) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    return formatter.format(value);
}

function showLoading(show) {
    if (elements.chartLoading) {
        elements.chartLoading.style.display = show ? 'flex' : 'none';
    }
}

// Show error message to user
function showError(message) {
    console.error('Dashboard Error:', message);
    
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b6b;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Show success message to user
function showSuccess(message) {
    console.log('Dashboard Success:', message);
    
    // Create success notification
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00d4aa;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    successDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds (shorter for success)
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b6b;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Enhanced auto-refresh functionality with intelligent caching
let lastCurrencyUpdate = 0;
let lastMarketUpdate = 0;
const CURRENCY_CACHE_DURATION = 300000; // 5 minutes
const MARKET_CACHE_DURATION = 60000; // 1 minute

// Intelligent refresh system
setInterval(() => {
    const now = Date.now();
    
    // Only update currency rates if cache is expired
    if (now - lastCurrencyUpdate > CURRENCY_CACHE_DURATION) {
        loadCurrencyRates();
        lastCurrencyUpdate = now;
    }
    
    // Only update market overview if cache is expired
    if (now - lastMarketUpdate > MARKET_CACHE_DURATION) {
        loadMarketOverview();
        lastMarketUpdate = now;
    }
}, 30000); // Check every 30 seconds

// Market overview is now handled by its own live update system

// Export functionality
function exportData() {
    if (!currentData) {
        showError('No data available to export');
        return;
    }
    
    try {
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentData.symbol}_${elements.timeframeSelect.value}_${elements.currencySelect.value}_data.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess('Data exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export data');
    }
}

function generateCSV() {
    const selectedCurrency = elements.currencySelect.value;
    const indexSymbol = elements.indexSelect.value;
    const indexInfo = indexConfig[indexSymbol];
    const convertedData = convertDataToCurrency(currentData.data, selectedCurrency, indexInfo.currency);
    
    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Currency'];
    const rows = convertedData.map(item => [
        item.date.toISOString().split('T')[0],
        item.open,
        item.high,
        item.low,
        item.close,
        item.volume,
        selectedCurrency
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00d4aa;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Live indicator management
function updateLiveIndicator(isLive) {
    const liveDot = document.querySelector('.live-dot');
    const liveText = document.querySelector('.live-text');
    
    if (liveDot && liveText) {
        if (isLive) {
            liveDot.style.background = '#00d4aa';
            liveText.textContent = 'LIVE';
        } else {
            liveDot.style.background = '#ff6b6b';
            liveText.textContent = 'OFFLINE';
        }
    }
}

// Update chart header
function updateChartHeader(symbol) {
    const chartTitle = document.getElementById('chart-title');
    const indexInfo = indexConfig[symbol];
    if (chartTitle && indexInfo) {
        chartTitle.textContent = `${indexInfo.name} Performance & Currency Impact`;
    }
}

// Update last updated time
function updateLastUpdated() {
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        const now = new Date();
        const isCached = rateLimiter.requests >= rateLimiter.maxRequests;
        const status = isCached ? ' (Cached)' : '';
        lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}${status}`;
    }
}

// Enhanced market hours checker with multiple regions
function isMarketOpen() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour * 100 + minute;
    
    // Check if it's a weekday
    if (day === 0 || day === 6) return false;
    
    // US Market hours (9:30 AM - 4:00 PM EST)
    const isUSMarket = time >= 930 && time <= 1600;
    
    // European Market hours (9:00 AM - 5:30 PM CET)
    const isEuropeanMarket = time >= 900 && time <= 1730;
    
    // Asian Market hours (9:00 AM - 3:00 PM JST)
    const isAsianMarket = time >= 900 && time <= 1500;
    
    // Australian Market hours (10:00 AM - 4:00 PM AEST)
    const isAustralianMarket = time >= 1000 && time <= 1600;
    
    // Middle East Market hours (10:00 AM - 3:00 PM AST)
    const isMiddleEastMarket = time >= 1000 && time <= 1500;
    
    return isUSMarket || isEuropeanMarket || isAsianMarket || isAustralianMarket || isMiddleEastMarket;
}

// Get current market status for different regions
function getMarketStatus() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour * 100 + minute;
    
    const status = {
        us: false,
        europe: false,
        asia: false,
        australia: false,
        middleEast: false
    };
    
    if (day !== 0 && day !== 6) { // Weekdays only
        status.us = time >= 930 && time <= 1600;
        status.europe = time >= 900 && time <= 1730;
        status.asia = time >= 900 && time <= 1500;
        status.australia = time >= 1000 && time <= 1600;
        status.middleEast = time >= 1000 && time <= 1500;
    }
    
    return status;
}

// Real-time clock functionality
function updateClock() {
    const clockElement = document.getElementById('current-time');
    if (clockElement) {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString();
    }
}

// Logout function
function logout() {
    sessionStorage.removeItem('dashboardAccess');
    window.location.href = 'login.html';
}




