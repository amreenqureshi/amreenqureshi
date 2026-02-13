(function () {
  /* ── Sync CSS --header-height with actual header size ── */
  function syncHeaderHeight() {
    var header = document.querySelector('.site-header');
    if (header) {
      document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
    }
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);

  /* ── Active nav link ── */
  var navLinks = document.querySelectorAll('.nav-bar .nav-btn[href]');
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (href === 'who-me.html' || href.indexOf('who-me') !== -1) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  var workBtn = document.querySelector('.nav-btn-dropdown');
  if (workBtn) workBtn.classList.remove('active');

  /* ── Gather elements ── */
  var storyEl = document.querySelector('.story');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.story-chapter'));
  var pathwayNodes = document.querySelectorAll('.pathway-node');
  var nextBtns = document.querySelectorAll('.story-next');
  var reveals = document.querySelectorAll('.reveal');
  var siteHeader = document.querySelector('.site-header');

  var snapTargets = chapters;

  /* ── State ── */
  var currentIndex = 0;
  var isAnimating = false;
  var compactState = false;

  /* ── Toggle compact navbar (shrink after hero) ── */
  function setCompact(shouldCompact) {
    if (shouldCompact === compactState) return;
    compactState = shouldCompact;
    if (siteHeader) {
      siteHeader.classList[shouldCompact ? 'add' : 'remove']('is-compact');
    }
  }

  /* ── Navigate to a section by index ── */
  function goToIndex(idx) {
    if (!storyEl || idx < 0 || idx >= snapTargets.length || idx === currentIndex) return;

    isAnimating = true;
    currentIndex = idx;

    /* Toggle compact RIGHT NOW so header animates in parallel */
    setCompact(idx > 0);

    var startScroll = storyEl.scrollTop;
    var startTime = performance.now();
    var duration = 600;

    function frame(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);        /* ease-out cubic */

      /* Re-calculate every frame – offsets shift as header resizes */
      var targetTop = snapTargets[idx].offsetTop;
      storyEl.scrollTop = startScroll + (targetTop - startScroll) * eased;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        /* Final hard-snap with fresh offset */
        storyEl.scrollTop = snapTargets[idx].offsetTop;
        isAnimating = false;
        updatePathway();
      }
    }

    requestAnimationFrame(frame);
  }

  /* ── Snap back to current section (e.g. after sub-threshold touch drag) ── */
  function snapBack() {
    if (!storyEl) return;
    storyEl.scrollTo({ top: snapTargets[currentIndex].offsetTop, behavior: 'smooth' });
  }

  /* ── Scroll to a specific element ── */
  function scrollToSection(el) {
    if (!el) return;
    var idx = snapTargets.indexOf(el);
    if (idx !== -1) goToIndex(idx);
  }

  /* ── Current chapter index (for pathway dots) ── */
  function getCurrentChapterIndex() {
    return Math.min(currentIndex, chapters.length - 1);
  }

  /* ── Scroll-reveal with IntersectionObserver ── */
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { root: storyEl, threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ── Pathway: update active node ── */
  function updatePathway() {
    var activeIndex = getCurrentChapterIndex();
    pathwayNodes.forEach(function (node, i) {
      if (i === activeIndex) {
        node.classList.add('pathway-node-active');
      } else {
        node.classList.remove('pathway-node-active');
      }
    });
  }

  /* ── Pathway: click to navigate ── */
  pathwayNodes.forEach(function (node) {
    node.addEventListener('click', function (e) {
      e.preventDefault();
      if (isAnimating) return;
      var targetId = node.getAttribute('data-target');
      var targetEl = document.getElementById(targetId);
      scrollToSection(targetEl);
    });
  });

  /* ── Next-chapter buttons ── */
  nextBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (isAnimating) return;
      goToIndex(currentIndex + 1);
    });
  });

  /* ═══════════════════════════════════════════
     WHEEL: one section per scroll gesture.
     wheelCooldown eats trackpad momentum so
     only the first flick in a gesture fires.
     isAnimating is a separate lock for the
     scroll animation itself.
     ═══════════════════════════════════════════ */
  var wheelCooldown = false;
  var wheelTimer = null;

  if (storyEl) {
    storyEl.addEventListener('wheel', function (e) {
      e.preventDefault();

      /* Restart cooldown timer on every wheel event (including momentum) */
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () {
        wheelCooldown = false;
      }, 350);

      /* Block if we're animating OR already consumed this gesture */
      if (isAnimating || wheelCooldown) return;
      wheelCooldown = true;

      if (e.deltaY > 0) {
        goToIndex(currentIndex + 1);
      } else if (e.deltaY < 0) {
        goToIndex(currentIndex - 1);
      }
    }, { passive: false });
  }

  /* ═══════════════════════════════════════════
     KEYBOARD: arrow / page navigation
     ═══════════════════════════════════════════ */
  document.addEventListener('keydown', function (e) {
    var down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    var up = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!down && !up) return;
    e.preventDefault();
    if (isAnimating) return;

    if (down) {
      goToIndex(currentIndex + 1);
    } else {
      goToIndex(currentIndex - 1);
    }
  });

  /* ═══════════════════════════════════════════
     TOUCH: swipe with drag feedback + snap
     ═══════════════════════════════════════════ */
  var swipeStartY = null;
  var snapScrollTop = 0;
  var SWIPE_THRESHOLD = 40;

  if (storyEl) {
    storyEl.addEventListener('touchstart', function (e) {
      if (isAnimating) return;
      swipeStartY = e.touches[0].clientY;
      snapScrollTop = storyEl.scrollTop;
    }, { passive: true });

    storyEl.addEventListener('touchmove', function (e) {
      if (swipeStartY === null || isAnimating) return;
      var delta = swipeStartY - e.touches[0].clientY;
      storyEl.scrollTop = snapScrollTop + delta * 0.3;
    }, { passive: true });

    storyEl.addEventListener('touchend', function (e) {
      if (swipeStartY === null || isAnimating) return;
      var deltaY = swipeStartY - e.changedTouches[0].clientY;
      swipeStartY = null;

      if (deltaY > SWIPE_THRESHOLD) {
        goToIndex(currentIndex + 1);
      } else if (deltaY < -SWIPE_THRESHOLD) {
        goToIndex(currentIndex - 1);
      } else {
        snapBack();
      }
    }, { passive: true });
  }

  /* ── Scroll handler (pathway update + compact navbar safety-net) ── */
  if (storyEl) {
    var ticking = false;
    storyEl.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updatePathway();
          /* Safety-net: sync compact state when not mid-animation */
          if (!isAnimating) {
            setCompact(storyEl.scrollTop > 50);
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ── Initial call ── */
  updatePathway();
})();
