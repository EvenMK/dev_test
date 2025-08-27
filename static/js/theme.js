(function() {
	function applyTheme(theme) {
		var href = '/static/css/' + (theme === 'neon' ? 'neon' : 'light') + '.css';
		document.getElementById('theme-css').setAttribute('href', href);
		try { localStorage.setItem('theme', theme); } catch (e) {}
	}

	var saved = null;
	try { saved = localStorage.getItem('theme'); } catch (e) {}
	if (saved) applyTheme(saved);

	document.addEventListener('click', function(e) {
		var t = e.target;
		if (t && t.matches('button[data-theme]')) {
			applyTheme(t.getAttribute('data-theme'));
		}
	});
})();

