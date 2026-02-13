(function () {
  /* ═══════════════════════════════════════════
     SCROLL CONTAINER – same architecture as who-me
     ═══════════════════════════════════════════ */
  var scrollContainer = document.querySelector('.index-page main');
  if (!scrollContainer) return;

  var allSections = Array.prototype.slice.call(
    document.querySelectorAll('.idx-section')
  );

  /* ═══════════════════════════════════════════
     SCROLL REVEAL – IntersectionObserver
     Uses scrollContainer as root so reveals fire
     when elements enter the container viewport.
     ═══════════════════════════════════════════ */
  var revealEls = document.querySelectorAll(
    '.idx-reveal, .idx-reveal-up, .idx-reveal-left, .idx-reveal-right'
  );

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
      { root: scrollContainer, threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ═══════════════════════════════════════════
     ANIMATED COUNTERS – Metrics
     ═══════════════════════════════════════════ */
  var metricValues = document.querySelectorAll('.idx-metric-value[data-count]');

  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var isDecimal = target % 1 !== 0;
    var duration = 1500;
    var start = performance.now();

    function update(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = target * eased;

      if (isDecimal) {
        el.textContent = current.toFixed(1);
      } else {
        el.textContent = Math.round(current);
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { root: scrollContainer, threshold: 0.5 }
    );
    metricValues.forEach(function (el) { counterObserver.observe(el); });
  } else {
    metricValues.forEach(function (el) {
      el.textContent = el.getAttribute('data-count');
    });
  }

  /* ═══════════════════════════════════════════
     HERO SHAPES – mouse-follow parallax
     ═══════════════════════════════════════════ */
  var heroShapes = document.querySelector('.idx-hero-shapes');
  var hero = document.querySelector('.idx-hero');

  if (heroShapes && hero) {
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      var y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
      heroShapes.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      heroShapes.style.transition = 'transform 0.3s ease-out';
    });
  }

  /* ═══════════════════════════════════════════
     HELPERS – scroll to section
     ═══════════════════════════════════════════ */
  var isAnimating = false;
  var lastWheelTime = 0;

  /** Get an element's offset from the top of the scroll container */
  function getOffsetTop(el) {
    var top = 0;
    var current = el;
    while (current && current !== scrollContainer) {
      top += current.offsetTop;
      current = current.offsetParent;
    }
    return top;
  }

  /** Smooth-scroll the container to a section.
      Toggles navbar compact state immediately so both
      the header shrink and the section flip happen together. */
  function scrollToSection(el) {
    if (!el) return;
    isAnimating = true;

    /* Toggle compact RIGHT NOW so header animates in parallel */
    var targetIdx = allSections.indexOf(el);
    var shouldCompact = targetIdx > 0;
    if (siteHeader && shouldCompact !== compactState) {
      compactState = shouldCompact;
      siteHeader.classList[shouldCompact ? 'add' : 'remove']('is-compact');
    }

    var startScroll = scrollContainer.scrollTop;
    var startTime = performance.now();
    var duration = 600;

    function frame(now) {
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);        /* ease-out cubic */

      /* Re-calculate every frame – offsets shift as header resizes */
      var targetTop = getOffsetTop(el);
      scrollContainer.scrollTop = startScroll + (targetTop - startScroll) * eased;

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        /* Final hard-snap */
        scrollContainer.scrollTop = getOffsetTop(el);
        finishScroll();
      }
    }

    function finishScroll() {
      scrollContainer.scrollTop = getOffsetTop(el);
      /* If trackpad momentum is still flowing, stay locked */
      if (Date.now() - lastWheelTime < 200) {
        setTimeout(finishScroll, 120);
        return;
      }
      isAnimating = false;
    }

    requestAnimationFrame(frame);
  }

  /** Which section is most visible right now? */
  function getCurrentSectionIndex() {
    var scrollY = scrollContainer.scrollTop + scrollContainer.clientHeight * 0.35;
    var best = 0;
    allSections.forEach(function (sec, i) {
      if (getOffsetTop(sec) <= scrollY) {
        best = i;
      }
    });
    return best;
  }

  /* ═══════════════════════════════════════════
     NEXT-SECTION ARROW BUTTONS
     ═══════════════════════════════════════════ */
  var nextBtns = document.querySelectorAll('.idx-next');
  nextBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (isAnimating) return;
      var parentSection = btn.closest('.idx-section');
      if (!parentSection) return;
      var idx = allSections.indexOf(parentSection);
      if (idx !== -1 && idx < allSections.length - 1) {
        scrollToSection(allSections[idx + 1]);
      }
    });
  });

  /* ═══════════════════════════════════════════
     TOUCH OVERLAYS – capture swipe on iframes
     + CLICK-TO-OPEN for IG & LinkedIn posts
     Cross-origin iframes absorb touch events.
     Overlays sit on top so touches land on a
     same-origin element and bubble to the
     scrollContainer handlers.
     Clicking / tapping opens the original post
     in a new tab.
     ═══════════════════════════════════════════ */
  var embedFrames = document.querySelectorAll('.idx-embed-frame');
  embedFrames.forEach(function (frame) {
    var overlay = document.createElement('div');
    overlay.className = 'idx-touch-overlay';
    frame.appendChild(overlay);

    /* Determine the post URL from data-href or from the iframe src */
    var iframe = frame.querySelector('iframe');
    var src = iframe ? (iframe.getAttribute('src') || '') : '';
    var postUrl = frame.getAttribute('data-href') || '';

    if (!postUrl && src.indexOf('instagram.com') !== -1) {
      postUrl = src.replace(/\/embed\/?/, '/');
      var qIdx = postUrl.indexOf('?');
      if (qIdx !== -1) postUrl = postUrl.substring(0, qIdx);
    }

    if (postUrl) {
      overlay.style.cursor = 'pointer';
    }

    var tapStartY = null;

    overlay.addEventListener('touchstart', function (e) {
      tapStartY = e.touches[0].clientY;
    }, { passive: true });

    overlay.addEventListener('touchend', function (e) {
      if (tapStartY === null) return;
      var delta = Math.abs(tapStartY - e.changedTouches[0].clientY);
      tapStartY = null;

      /* Small movement = tap → open the post in a new tab */
      if (delta < 12 && postUrl) {
        window.open(postUrl, '_blank', 'noopener,noreferrer');
      }
    }, { passive: true });

    /* Desktop click → open post in new tab */
    overlay.addEventListener('click', function (e) {
      if (postUrl) {
        e.preventDefault();
        e.stopPropagation();
        window.open(postUrl, '_blank', 'noopener,noreferrer');
      }
    });
  });

  /* ═══════════════════════════════════════════
     INSTAGRAM CAROUSEL – CSS-driven infinite scroll
     Same approach as LinkedIn: animation runs via CSS
     keyframes, paused when out of view to save resources.
     ═══════════════════════════════════════════ */
  var igCarousel = document.querySelector('.idx-ig-carousel');
  if (igCarousel) {
    var igTrack = igCarousel.querySelector('.idx-ig-track');
    var igSection = document.getElementById('social-media');

    if (igTrack && igSection && 'IntersectionObserver' in window) {
      /* Start paused, play only when visible */
      igTrack.style.animationPlayState = 'paused';

      var igObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (igTrack) {
            igTrack.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
          }
        });
      }, { root: scrollContainer, threshold: 0.15 });
      igObserver.observe(igSection);
    }
  }

  /* ═══════════════════════════════════════════
     INSTAGRAM AUTO-HEIGHT – listen for postMessage
     from IG embed iframes and resize to actual
     content height, eliminating whitespace/cropping.
     Also propagates to duplicate iframes (same src)
     used for the seamless-loop carousel.
     ═══════════════════════════════════════════ */
  var igIframes = document.querySelectorAll('.idx-embed-frame--ig iframe');

  function resizeIgFrame(iframe, height) {
    iframe.style.height = height + 'px';
    var wrapper = iframe.closest('.idx-embed-frame--ig');
    if (wrapper) wrapper.style.height = height + 'px';
  }

  window.addEventListener('message', function (evt) {
    if (!evt.origin || evt.origin.indexOf('instagram.com') === -1) return;

    var data;
    try {
      data = typeof evt.data === 'string' ? JSON.parse(evt.data) : evt.data;
    } catch (e) {
      return;
    }
    if (!data || typeof data !== 'object') return;

    /* Instagram sends MEASURE messages with the content height */
    var height = (data.details && data.details.height) || data.height;
    if (!height || height < 100) return;

    /* Find the source iframe and its src for duplicate matching */
    var matchedSrc = '';
    igIframes.forEach(function (iframe) {
      if (iframe.contentWindow === evt.source) {
        resizeIgFrame(iframe, height);
        matchedSrc = iframe.getAttribute('src') || '';
      }
    });

    /* Propagate to duplicate iframes with the same src (loop clones) */
    if (matchedSrc) {
      igIframes.forEach(function (iframe) {
        if (iframe.contentWindow !== evt.source &&
            (iframe.getAttribute('src') || '') === matchedSrc) {
          resizeIgFrame(iframe, height);
        }
      });
    }
  });

  /* ═══════════════════════════════════════════
     LINKEDIN CAROUSEL – CSS-driven infinite scroll
     Animation runs via CSS keyframes. JS only pauses
     the animation when the section is out of view to
     save resources.
     ═══════════════════════════════════════════ */
  var linkedinCarousel = document.querySelector('.idx-linkedin-carousel');
  if (linkedinCarousel) {
    var liTrack = linkedinCarousel.querySelector('.idx-linkedin-track');
    var linkedinSection = document.getElementById('linkedin');

    if (liTrack && linkedinSection && 'IntersectionObserver' in window) {
      /* Start paused, play only when visible */
      liTrack.style.animationPlayState = 'paused';

      var liObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (liTrack) {
            liTrack.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
          }
        });
      }, { root: scrollContainer, threshold: 0.15 });
      liObserver.observe(linkedinSection);
    }
  }

  /* ═══════════════════════════════════════════
     WHEEL: section-by-section navigation
     (matches who-me page behavior)
     ═══════════════════════════════════════════ */
  scrollContainer.addEventListener('wheel', function (e) {
    e.preventDefault();
    lastWheelTime = Date.now();
    if (isAnimating) return;

    var idx = getCurrentSectionIndex();
    if (e.deltaY > 0 && idx < allSections.length - 1) {
      scrollToSection(allSections[idx + 1]);
    } else if (e.deltaY < 0 && idx > 0) {
      scrollToSection(allSections[idx - 1]);
    }
  }, { passive: false });

  /* ═══════════════════════════════════════════
     TOUCH: swipe with drag feedback + snap
     (same pattern as who-me page)
     ═══════════════════════════════════════════ */
  var swipeStartY = null;
  var snapScrollTop = 0;
  var SWIPE_THRESHOLD = 40;

  scrollContainer.addEventListener('touchstart', function (e) {
    if (isAnimating) return;
    swipeStartY = e.touches[0].clientY;
    snapScrollTop = scrollContainer.scrollTop;
  }, { passive: true });

  scrollContainer.addEventListener('touchmove', function (e) {
    if (swipeStartY === null || isAnimating) return;
    var delta = swipeStartY - e.touches[0].clientY;
    /* 1:1 drag – move content with finger */
    scrollContainer.scrollTop = snapScrollTop + delta;
  }, { passive: true });

  scrollContainer.addEventListener('touchend', function (e) {
    if (swipeStartY === null || isAnimating) return;
    var deltaY = swipeStartY - e.changedTouches[0].clientY;
    swipeStartY = null;

    if (deltaY > SWIPE_THRESHOLD) {
      /* Swiped up → next section */
      var idx = getCurrentSectionIndex();
      if (idx < allSections.length - 1) {
        scrollToSection(allSections[idx + 1]);
      }
    } else if (deltaY < -SWIPE_THRESHOLD) {
      /* Swiped down → prev section */
      var idx2 = getCurrentSectionIndex();
      if (idx2 > 0) {
        scrollToSection(allSections[idx2 - 1]);
      }
    }
    /* Below threshold → content stays where the finger left it */
  }, { passive: true });

  /* ═══════════════════════════════════════════
     COMPACT NAVBAR – shrink after scrolling past hero
     Uses scrollTop instead of IntersectionObserver to
     avoid a feedback loop (observer → resize → re-observe).
     ═══════════════════════════════════════════ */
  var siteHeader = document.querySelector('.site-header');
  var compactState = false;

  /** Safety-net: sync compact state when not mid-animation
      (e.g. browser restoring scroll position on load). */
  function updateCompact() {
    if (isAnimating) return;
    var shouldCompact = scrollContainer.scrollTop > 50;
    if (shouldCompact === compactState) return;
    compactState = shouldCompact;
    if (siteHeader) {
      siteHeader.classList[shouldCompact ? 'add' : 'remove']('is-compact');
    }
  }

  scrollContainer.addEventListener('scroll', updateCompact);

  /* ═══════════════════════════════════════════
     KEYBOARD: arrow / page navigation
     ═══════════════════════════════════════════ */
  document.addEventListener('keydown', function (e) {
    var down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
    var up = e.key === 'ArrowUp' || e.key === 'PageUp';
    if (!down && !up) return;

    if (document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA')) return;

    e.preventDefault();
    if (isAnimating) return;

    var idx = getCurrentSectionIndex();
    if (down && idx < allSections.length - 1) {
      scrollToSection(allSections[idx + 1]);
    } else if (up && idx > 0) {
      scrollToSection(allSections[idx - 1]);
    }
  });
})();
