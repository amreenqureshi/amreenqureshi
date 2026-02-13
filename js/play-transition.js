(function () {
  /* ═══════════════════════════════════════════════
     Play Transition – ASCII Pixel-Breaking Animation
     Intercepts "Play" nav clicks, shatters the screen
     into ASCII particles, then navigates to game.html
     ═══════════════════════════════════════════════ */

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href="game.html"]');
    if (!link) return;
    e.preventDefault();
    breakAndNavigate();
  });

  function breakAndNavigate() {
    if (document.getElementById('aq-break-overlay')) return;

    /* ── Canvas overlay ── */
    var canvas = document.createElement('canvas');
    canvas.id = 'aq-break-overlay';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;';
    document.body.appendChild(canvas);
    document.body.style.overflow = 'hidden';

    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var CW = 10, CH = 15;
    var cx = W / 2, cy = H / 2;
    var maxDist = Math.sqrt(cx * cx + cy * cy);
    var glyphs = '░▒▓█▀▄▌▐│─┌┐└┘├┤┬┴┼═║╔╗╚╝·.+*:;~^><'.split('');

    /* ── "SCROLL STOPPER" title art ── */
    var art = [
      '╔══════════════════════════════╗',
      '║   S C R O L L               ║',
      '║         S T O P P E R       ║',
      '╚══════════════════════════════╝',
    ];
    var artPW = art[0].length * CW;
    var artX = cx - artPW / 2;
    var artY = cy - art.length * CH / 2;

    /* ── Background grid particles (sparse) ── */
    var bgP = [];
    var gridCols = Math.ceil(W / CW) + 1;
    var gridRows = Math.ceil(H / CH) + 1;

    for (var r = 0; r < gridRows; r++) {
      for (var c = 0; c < gridCols; c++) {
        if (Math.random() > 0.42) continue;
        var px = c * CW, py = r * CH;
        var dx = px - cx, dy = py - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var angle = Math.atan2(dy, dx);
        var nd = dist / maxDist;
        bgP.push({
          x: px, y: py,
          ch: glyphs[Math.floor(Math.random() * glyphs.length)],
          /* Appear: edges first, wave inward */
          appearAt: (1 - nd) * 18 + Math.random() * 8,
          /* Explosion direction & speed */
          eAngle: angle,
          eSpeed: 3 + Math.random() * 9 + nd * 6,
          hue: 36 + Math.random() * 10,
          lgt: 16 + Math.random() * 20,
        });
      }
    }

    /* ── Title art particles ── */
    var artP = [];
    for (var i = 0; i < art.length; i++) {
      for (var j = 0; j < art[i].length; j++) {
        var ch = art[i][j];
        if (ch === ' ') continue;
        var px = artX + j * CW, py = artY + i * CH;
        var dx = px - cx, dy = py - cy;
        var angle = Math.atan2(dy, dx);
        artP.push({
          x: px, y: py, ch: ch,
          eAngle: angle,
          eSpeed: 5 + Math.random() * 14,
        });
      }
    }

    /* ── Phase timings (frames @ ~60fps) ── */
    var TITLE_START = 20;  /* title text begins appearing */
    var TITLE_FULL  = 36;  /* title fully visible */
    var BREAK       = 42;  /* explosion moment */
    var NAV         = 86;  /* navigate to game.html */
    var frame = 0;

    /* ── Light-speed departure SFX ── */
    (function playWarpDepart() {
      try {
        var ac = new (window.AudioContext || window.webkitAudioContext)();
        var t = ac.currentTime;
        var breakT = t + 0.7;       /* matches BREAK @ frame 42 */
        var endT   = t + 1.43;      /* matches NAV @ frame 86 */

        /* 1. Charge-up sweep — low sawtooth rising (builds tension as chars appear) */
        var chOsc = ac.createOscillator();
        var chG   = ac.createGain();
        chOsc.type = 'sawtooth';
        chOsc.frequency.setValueAtTime(55, t);
        chOsc.frequency.exponentialRampToValueAtTime(420, breakT);
        chG.gain.setValueAtTime(0.03, t);
        chG.gain.linearRampToValueAtTime(0.07, breakT - 0.05);
        chG.gain.linearRampToValueAtTime(0.1, breakT);
        chOsc.connect(chG).connect(ac.destination);
        chOsc.start(t); chOsc.stop(breakT + 0.02);

        /* 2. Sub-bass rumble — sustained weight throughout */
        var subO = ac.createOscillator();
        var subG = ac.createGain();
        subO.type = 'sine';
        subO.frequency.setValueAtTime(38, t);
        subO.frequency.linearRampToValueAtTime(28, endT);
        subG.gain.setValueAtTime(0.04, t);
        subG.gain.linearRampToValueAtTime(0.07, breakT);
        subG.gain.exponentialRampToValueAtTime(0.001, endT);
        subO.connect(subG).connect(ac.destination);
        subO.start(t); subO.stop(endT);

        /* 3. Warp CRACK — noise burst at break point */
        var nLen  = Math.floor(ac.sampleRate * 0.18);
        var nBuf  = ac.createBuffer(1, nLen, ac.sampleRate);
        var nData = nBuf.getChannelData(0);
        for (var i = 0; i < nLen; i++) nData[i] = Math.random() * 2 - 1;
        var nSrc  = ac.createBufferSource();
        nSrc.buffer = nBuf;
        var nFilt = ac.createBiquadFilter();
        nFilt.type = 'bandpass';
        nFilt.frequency.setValueAtTime(2200, breakT);
        nFilt.Q.value = 0.6;
        var nG = ac.createGain();
        nG.gain.setValueAtTime(0.14, breakT);
        nG.gain.exponentialRampToValueAtTime(0.001, breakT + 0.18);
        nSrc.connect(nFilt).connect(nG).connect(ac.destination);
        nSrc.start(breakT); nSrc.stop(breakT + 0.18);

        /* 4. Warp punch — sharp rising sine sweep (lightspeed engage) */
        var wpO = ac.createOscillator();
        var wpG = ac.createGain();
        wpO.type = 'sine';
        wpO.frequency.setValueAtTime(380, breakT);
        wpO.frequency.exponentialRampToValueAtTime(3200, breakT + 0.25);
        wpG.gain.setValueAtTime(0.07, breakT);
        wpG.gain.exponentialRampToValueAtTime(0.001, breakT + 0.35);
        wpO.connect(wpG).connect(ac.destination);
        wpO.start(breakT); wpO.stop(breakT + 0.35);

        /* 5. Travel hum — sustained tremolo while particles fly out */
        var trO = ac.createOscillator();
        var trG = ac.createGain();
        trO.type = 'triangle';
        trO.frequency.setValueAtTime(220, breakT + 0.08);
        trO.frequency.exponentialRampToValueAtTime(70, endT);
        trG.gain.setValueAtTime(0.05, breakT + 0.08);
        trG.gain.exponentialRampToValueAtTime(0.001, endT);
        /* LFO wobble for doppler-like effect */
        var lfo = ac.createOscillator();
        var lfoG = ac.createGain();
        lfo.type = 'sine'; lfo.frequency.value = 14;
        lfoG.gain.value = 0.025;
        lfo.connect(lfoG).connect(trG.gain);
        trO.connect(trG).connect(ac.destination);
        trO.start(breakT + 0.08); trO.stop(endT);
        lfo.start(breakT + 0.08); lfo.stop(endT);

        /* 6. High shimmer tail — fading sparkle */
        var shO = ac.createOscillator();
        var shG = ac.createGain();
        shO.type = 'sine';
        shO.frequency.setValueAtTime(1800, breakT + 0.05);
        shO.frequency.exponentialRampToValueAtTime(600, endT);
        shG.gain.setValueAtTime(0.03, breakT + 0.05);
        shG.gain.exponentialRampToValueAtTime(0.001, endT - 0.1);
        shO.connect(shG).connect(ac.destination);
        shO.start(breakT + 0.05); shO.stop(endT);

      } catch (e) { /* audio not supported — fail silently */ }
    })();

    function font(s) {
      ctx.font = s + "px 'Press Start 2P','Courier New',monospace";
    }

    function tick() {
      frame++;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);

      font(CW - 2);
      ctx.textBaseline = 'top';

      var i, p, bf, bx, by, fade, ap;

      if (frame < BREAK) {
        /* ─── Phase 1 & 2: Appear + Title ─── */
        for (i = 0; i < bgP.length; i++) {
          p = bgP[i];
          ap = Math.max(0, Math.min(1, (frame - p.appearAt) / 5));
          if (ap <= 0) continue;
          /* Flicker noise */
          if (Math.random() > 0.82)
            p.ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          ctx.globalAlpha = ap * 0.28;
          ctx.fillStyle = 'hsl(' + p.hue + ',22%,' + p.lgt + '%)';
          ctx.fillText(p.ch, p.x, p.y);
        }

        if (frame >= TITLE_START) {
          var tp = Math.min(1, (frame - TITLE_START) / (TITLE_FULL - TITLE_START));
          var pulse = 0.7 + 0.3 * Math.sin(frame * 0.18);
          for (i = 0; i < artP.length; i++) {
            ctx.globalAlpha = tp * pulse;
            ctx.fillStyle = '#d4a850';
            ctx.fillText(artP[i].ch, artP[i].x, artP[i].y);
          }
        }
      } else {
        /* ─── Phase 3: Explosion ─── */
        bf = frame - BREAK;
        fade = Math.max(0, 1 - bf / 30);

        for (i = 0; i < bgP.length; i++) {
          p = bgP[i];
          bx = p.x + Math.cos(p.eAngle) * p.eSpeed * bf * 0.5;
          by = p.y + Math.sin(p.eAngle) * p.eSpeed * bf * 0.5;
          ctx.globalAlpha = fade * 0.28;
          ctx.fillStyle = 'hsl(' + p.hue + ',22%,' + p.lgt + '%)';
          ctx.fillText(p.ch, bx, by);
        }

        for (i = 0; i < artP.length; i++) {
          p = artP[i];
          bx = p.x + Math.cos(p.eAngle) * p.eSpeed * bf * 0.5;
          by = p.y + Math.sin(p.eAngle) * p.eSpeed * bf * 0.5;
          ctx.globalAlpha = fade;
          ctx.fillStyle = '#d4a850';
          ctx.fillText(p.ch, bx, by);
        }

        /* Gold shockwave flash */
        if (bf <= 4) {
          ctx.globalAlpha = 0.22 * (1 - bf / 4);
          ctx.fillStyle = '#d4a850';
          ctx.fillRect(0, 0, W, H);
        }
      }

      /* Scanlines */
      ctx.globalAlpha = 0.04;
      ctx.fillStyle = '#000';
      for (var y = 0; y < H; y += 4) ctx.fillRect(0, y + 2, W, 2);
      ctx.globalAlpha = 1;

      /* Navigate */
      if (frame >= NAV) {
        sessionStorage.setItem('aq-play-intro', '1');
        window.location.href = 'game.html';
        return;
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }
})();
