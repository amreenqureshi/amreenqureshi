(function () {
  /* ── Sync CSS --header-height with actual header size ── */
  var header = document.querySelector('.site-header');

  function syncHeaderHeight() {
    if (header) {
      document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
    }
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  /* Also watch for header size changes (e.g. compact mode transition) */
  if ('ResizeObserver' in window && header) {
    new ResizeObserver(syncHeaderHeight).observe(header);
  }

  const navLinks = document.querySelectorAll('.nav-bar .nav-btn[href]');

  function setActiveNav() {
    const path = window.location.pathname;
    const hash = window.location.hash || '#home';
    const hashName = hash.replace('#', '') || 'home';
    const isWhoMePage = /who-me\.html$/.test(path) || path.endsWith('who-me');

    navLinks.forEach(function (link) {
      link.classList.remove('active');
      const href = link.getAttribute('href') || '';
      const linkHash = href.indexOf('#') !== -1 ? href.split('#')[1] : '';
      if (isWhoMePage && (href === 'who-me.html' || href.indexOf('who-me') !== -1)) {
        link.classList.add('active');
      } else if (!isWhoMePage && linkHash === hashName) {
        link.classList.add('active');
      } else if (!isWhoMePage && href === hash && hash) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('hashchange', setActiveNav);
  window.addEventListener('load', setActiveNav);
})();
