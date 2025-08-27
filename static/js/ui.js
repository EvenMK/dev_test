(function() {
	function qs(sel, ctx){ return (ctx||document).querySelector(sel); }
	function qsa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

	// Modal logic
	var modal = null, frame = null;
	function openModal(url){
		if(!modal){ modal = qs('#modal'); frame = qs('#modal-frame'); }
		frame.setAttribute('src', url);
		modal.classList.remove('hidden');
		document.body.style.overflow = 'hidden';
	}
	function closeModal(){
		if(!modal){ return; }
		modal.classList.add('hidden');
		frame.setAttribute('src', 'about:blank');
		document.body.style.overflow = '';
	}
	document.addEventListener('click', function(e){
		var a = e.target.closest('a.open-modal');
		if(a){
			e.preventDefault();
			var link = a.getAttribute('data-link');
			if(link){ openModal(link); }
		}
		if(e.target.matches('.modal-close') || e.target.matches('.modal-backdrop')){
			closeModal();
		}
	});

	// Ticker logic
	async function loadTicker(){
		try {
			const res = await fetch('/api/sp500');
			if(!res.ok) { const track = qs('#ticker-track'); if(track) track.textContent='S&P 500 data unavailable'; return; }
			const json = await res.json();
			const track = qs('#ticker-track');
			if(!track) return;
			if(!json.data || json.data.length === 0){
				track.textContent = 'S&P 500 data unavailable right now';
				return;
			}
			const parts = json.data.map(it => `${it.symbol} ${Number(it.price).toFixed(2)}`);
			const content = parts.join('   •   ');
			track.textContent = content + '   •   ' + content; // duplicate for seamless loop
		} catch (e) {
			const track = qs('#ticker-track');
			if(track) track.textContent = 'S&P 500 ticker failed to load';
		}
	}

	document.addEventListener('DOMContentLoaded', function(){
		loadTicker();
	});
})();

