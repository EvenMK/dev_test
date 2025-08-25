# Global Financial Dashboard

A comprehensive, professional financial dashboard that displays global market indices with real-time currency conversion and impact analysis. Built for GitHub Pages with a modern dark theme and responsive design.

## 🌟 Features

### 📊 Core Functionality
- **Real-time Financial Data**: Live data from major US indices using Yahoo Finance API
- **Currency Conversion**: View any index in USD or NOK with automatic conversion
- **Currency Impact Analysis**: See how much of the return is due to currency changes
- **Three-Line Chart**: Shows index performance, currency impact, and fixed-rate comparison
- **Multiple Timeframes**: From 1 day to maximum available data

### 🎨 User Experience
- **Dark/Light Theme**: Professional dark theme with light mode toggle
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Fullscreen Mode**: Immersive viewing experience
- **Keyboard Shortcuts**: Quick access to key functions
- **Auto-refresh**: Data updates automatically every 5 minutes

### 📈 Major Indices Included
- **US Markets**: S&P 500, Dow Jones Industrial Average, NASDAQ Composite
- **US Small Cap**: Russell 2000
- **Volatility**: VIX Volatility Index

### 💱 Supported Currencies
- **USD** (US Dollar)
- **NOK** (Norwegian Krone)

### 📋 Additional Features
- **Performance Table**: Detailed breakdown by time periods
- **Market Overview**: Quick snapshot of major indices
- **Volatility Analysis**: Annualized volatility calculations
- **Export Functionality**: Download data as CSV
- **Loading States**: Professional loading indicators
- **Error Handling**: Graceful error management

## 🚀 Quick Start

### For GitHub Pages Deployment

1. **Fork or Clone** this repository
2. **Enable GitHub Pages** in your repository settings
3. **Set source** to main branch
4. **Access** your dashboard at `https://yourusername.github.io/repository-name`

### For Local Development

1. **Clone** the repository:
   ```bash
   git clone https://github.com/yourusername/financial-dashboard.git
   cd financial-dashboard
   ```

2. **Open** `index.html` in your browser or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Access** the dashboard at `http://localhost:8000`

## 🎯 Usage Guide

### Basic Navigation
- **Index Selection**: Choose from major global indices
- **Currency Selection**: View data in your preferred currency
- **Timeframe Selection**: Adjust the chart period

### Advanced Features
- **Theme Toggle**: Click the moon/sun icon to switch themes
- **Fullscreen Mode**: Click the expand icon for immersive view
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + K`: Focus on index selector
  - `Ctrl/Cmd + L`: Toggle theme
  - `Ctrl/Cmd + F`: Toggle fullscreen

### Understanding the Data
- **Current Price**: Latest closing price in selected currency
- **Total Return**: Percentage change over the selected period
- **Currency Impact**: How much return is due to currency changes
- **Volatility**: Annualized volatility measure

## 🛠️ Technical Details

### APIs Used
- **Yahoo Finance API**: Free, reliable financial data
- **Exchange Rate API**: Real-time currency conversion rates

### Technologies
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Modern JavaScript with async/await
- **Chart.js**: Professional charting library
- **Font Awesome**: Icon library

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📁 File Structure

```
financial-dashboard/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and themes
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## 🔧 Customization

### Adding New Indices
Edit the `indexConfig` object in `script.js`:
```javascript
const indexConfig = {
    '^NEWSYMBOL': { name: 'New Index', currency: 'XXX', country: 'Country' },
    // ... existing indices
};
```

### Adding New Currencies
1. Add to the currency select in `index.html`
2. Update the `currencyRates` fallback in `script.js`

### Styling Customization
Modify CSS variables in `styles.css`:
```css
:root {
    --accent-primary: #your-color;
    --bg-primary: #your-background;
    /* ... other variables */
}
```

## 🌐 Deployment

### **Option 1: GitHub Pages (Recommended)**

#### Quick Setup:
1. **Fork this repository** or create a new one
2. **Enable GitHub Pages** in repository Settings > Pages
3. **Select source branch** (main or master)
4. **Your site is live** at `https://username.github.io/repo-name`

#### Detailed Steps:
1. Go to [GitHub.com](https://github.com) and create a new repository
2. Upload all files: `index.html`, `styles.css`, `script.js`, `README.md`, `package.json`, `.gitignore`
3. Go to Settings > Pages
4. Under "Source", select "Deploy from a branch"
5. Choose your main branch (main or master)
6. Click Save
7. Wait 2-3 minutes for deployment

### **Option 2: Netlify (Easiest)**
1. Go to [Netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Your site is live instantly!

### **Option 3: Vercel**
1. Go to [Vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Deploy automatically

### **Option 4: Any Static Hosting**
- Upload files to any web hosting service
- Works with any static file hosting

## 📊 Data Sources & Attribution

### **Financial Data APIs**
- **Yahoo Finance API** (Yahoo Inc.)
  - **URL**: https://query1.finance.yahoo.com/
  - **License**: Free for commercial use
  - **Rate Limit**: ~2000 requests/hour
  - **Attribution**: Required ✅

### **Currency Exchange APIs**
- **Frankfurter API** (frankfurter.app) - **Primary**
  - **URL**: https://api.frankfurter.app/
  - **License**: Free, open source
  - **Rate Limit**: No strict limits
  - **Attribution**: Required ✅

- **Exchange Rate API** (exchangerate-api.com) - **Backup**
  - **URL**: https://api.exchangerate-api.com/
  - **License**: Free tier available
  - **Rate Limit**: 1000 requests/month (free)
  - **Attribution**: Required ✅

- **Open Exchange Rates** (openexchangerates.org) - **Backup**
  - **URL**: https://open.er-api.com/
  - **License**: Free tier available
  - **Rate Limit**: 1000 requests/month (free)
  - **Attribution**: Required ✅

### **Alternative Data Source**
- **Alpha Vantage** (alphavantage.co)
  - **URL**: https://www.alphavantage.co/
  - **License**: Free tier available
  - **Rate Limit**: 5 requests/minute (free)
  - **Attribution**: Required ✅

### **CORS Proxy Service**
- **api.allorigins.win** (allorigins.win)
  - **URL**: https://api.allorigins.win/
  - **License**: Free service
  - **Purpose**: CORS proxy for Yahoo Finance API
  - **Attribution**: Required ✅

### **Libraries & Dependencies**
- **Chart.js** (Chart.js Contributors)
  - **License**: MIT License
  - **URL**: https://www.chartjs.org/
  - **Attribution**: Required ✅

- **Font Awesome** (Fonticons, Inc.)
  - **License**: Free License
  - **URL**: https://fontawesome.com/
  - **Attribution**: Required ✅

- **Google Fonts - Inter** (Google LLC)
  - **License**: Open Font License
  - **URL**: https://fonts.google.com/
  - **Attribution**: Required ✅

### **Fallback Data**
- Built-in approximate rates for reliability when APIs are unavailable

## 🔒 Privacy & Security

- No user data is collected or stored
- All API calls are made directly from the browser
- No authentication required
- Works entirely client-side

## ⚖️ Legal Compliance & Terms

### **API Usage Compliance**
This dashboard complies with all API terms of service:

- **Yahoo Finance**: Used within rate limits, proper attribution provided
- **Exchange Rate APIs**: Used within free tier limits, attribution included
- **Alpha Vantage**: Used as backup within rate limits
- **Chart.js**: MIT License compliance maintained
- **Font Awesome**: Free license terms followed
- **Google Fonts**: Open Font License compliance

### **Required Attributions**
All required attributions are included in:
- **Footer section** of the dashboard
- **README.md** file
- **Console logs** for API sources

### **Rate Limiting**
- Conservative rate limiting implemented (1800/hour vs 2000/hour allowed)
- Intelligent caching to minimize API calls
- Fallback data when rate limits are reached

### **Data Usage**
- **Purpose**: Informational/educational only
- **No financial advice**: Clear disclaimers included
- **No commercial trading**: Data display only
- **No data resale**: Direct API usage only

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Troubleshooting

### Common Issues

**Data not loading:**
- Check internet connection
- Verify API endpoints are accessible
- Check browser console for errors

**Charts not displaying:**
- Ensure Chart.js is loaded
- Check for JavaScript errors
- Verify canvas element exists

**Currency conversion issues:**
- Check if currency rates API is accessible
- Verify currency codes are correct
- Check fallback rates in code

### Performance Tips

- Use modern browsers for best performance
- Close other tabs to free up memory
- Consider reducing the number of displayed indices
- Use shorter timeframes for faster loading

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Open an issue on GitHub with detailed information

---

**Disclaimer**: This dashboard is for informational purposes only and should not be considered as financial advice. Always consult with a qualified financial advisor before making investment decisions.
