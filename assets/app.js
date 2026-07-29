/* Guest Guardian concept — interactions */
(function () {
  'use strict';

  /* Sticky nav shadow */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle('stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Mobile menu */
  var burger = document.querySelector('.burger');
  var mmenu = document.querySelector('.mobile-menu');
  if (burger && mmenu) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mmenu.classList.toggle('open', !open);
    });
    mmenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.setAttribute('aria-expanded', 'false');
        mmenu.classList.remove('open');
      });
    });
  }

  /* Scroll reveal.
     Reveals are decoration only — never a precondition for seeing content.
     revealAll() is the escape hatch and runs if anything at all goes wrong. */
  var rv = document.querySelectorAll('.rv');
  var revealAll = function () {
    rv.forEach(function (el) { el.style.transitionDelay = '0ms'; el.classList.add('in'); });
  };

  if (rv.length) {
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealAll();
    } else {
      try {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              var el = e.target;
              var d = el.getAttribute('data-d');
              if (d) { el.style.transitionDelay = d + 'ms'; }
              el.classList.add('in');
              io.unobserve(el);
            }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        rv.forEach(function (el) { io.observe(el); });

        /* Watchdog. Two passes, because a PARTIAL observer failure is the
           nastier case: if even one element reveals, a "did anything fire?"
           check would stand down and leave the rest invisible forever.
           So we repeatedly sweep anything sitting in the viewport unrevealed. */
        var sweep = function () {
          var vh = window.innerHeight || document.documentElement.clientHeight || 0;
          // Fail OPEN: an unmeasurable viewport (hidden/headless/zero-height
          // renderer) must never leave the page blank.
          if (!vh) { revealAll(); return; }
          Array.prototype.forEach.call(rv, function (el) {
            if (el.classList.contains('in')) return;
            var r = el.getBoundingClientRect();
            if (r.top < vh && r.bottom > 0) {
              el.style.transitionDelay = '0ms';
              el.classList.add('in');
            }
          });
        };
        setTimeout(sweep, 1200);
        setTimeout(sweep, 3000);
        window.addEventListener('scroll', function () {
          clearTimeout(window.__ggSweep);
          window.__ggSweep = setTimeout(sweep, 900);
        }, { passive: true });
      } catch (err) {
        revealAll();
      }
    }
  }

  /* Count-up stats */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var pre = el.getAttribute('data-pre') || '';
        var post = el.getAttribute('data-post') || '';
        var dec = (String(target).split('.')[1] || '').length;
        var t0 = null, dur = 1400;
        var tick = function (ts) {
          if (!t0) t0 = ts;
          var pr = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - pr, 3);
          var v = (target * eased).toFixed(dec);
          el.textContent = pre + Number(v).toLocaleString('en-AU', {
            minimumFractionDigits: dec, maximumFractionDigits: dec
          }) + post;
          if (pr < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { cio.observe(el); });
  }

  /* Demo form handling — concept only, nothing is sent */
  document.querySelectorAll('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = f.querySelector('button[type="submit"]');
      if (!btn) return;
      var original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      setTimeout(function () {
        btn.textContent = 'Thanks — we’ll be in touch';
        setTimeout(function () {
          btn.disabled = false;
          btn.innerHTML = original;
          f.reset();
        }, 2600);
      }, 700);
    });
  });

  /* Income estimator (pricing page) */
  var est = document.getElementById('estimator');
  if (est) {
    var beds = document.getElementById('est-beds');
    var area = document.getElementById('est-area');
    var occ = document.getElementById('est-occ');
    var outNight = document.getElementById('est-night');
    var outMonth = document.getElementById('est-month');
    var outYear = document.getElementById('est-year');
    var occOut = document.getElementById('est-occ-out');

    /* Indicative nightly rates by area band and bedroom count.
       ANCHOR: Adelaide's median nightly rate across all tracked short-stay
       listings was $237 (Airbtics market snapshot, June 2026). A 2-bedroom in
       the city sits close to that median, and the rest of the grid is scaled
       around it by bedroom count and area.
       ⚠️ These are ILLUSTRATIVE, not a forecast. A production version would be
       driven by Guest Guardian's own Hostaway booking history, or by a licensed
       market data feed, so the numbers are defensible per property. */
    var BASE = { coastal: [155, 215, 310, 430], city: [165, 225, 315, 425], inner: [140, 190, 265, 360], hills: [150, 205, 285, 380] };

    var calc = function () {
      var b = Math.max(1, Math.min(4, parseInt(beds.value, 10) || 1));
      var a = area.value in BASE ? area.value : 'city';
      var o = parseInt(occ.value, 10) || 60;
      var nightly = BASE[a][b - 1];
      var month = Math.round(nightly * 30.4 * (o / 100));
      var year = month * 12;
      occOut.textContent = o + '%';
      outNight.textContent = '$' + nightly.toLocaleString('en-AU');
      outMonth.textContent = '$' + month.toLocaleString('en-AU');
      outYear.textContent = '$' + year.toLocaleString('en-AU');
    };
    [beds, area, occ].forEach(function (el) {
      if (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); }
    });
    calc();
  }

  /* ---- Staggered word reveal on headings.
     Splits into spans only when JS is present; without JS the heading renders
     normally, and textContent is byte-identical either way (SEO-safe). ---- */
  var rws = document.querySelectorAll('.rw');
  if (rws.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rws.forEach(function (h) {
      var kicker = h.querySelector('.h1-kicker');
      var nodes = Array.prototype.filter.call(h.childNodes, function (n) { return n !== kicker; });
      var frag = document.createDocumentFragment();
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
            var w = document.createElement('span');
            w.className = 'w';
            var i = document.createElement('i');
            i.textContent = tok;
            w.appendChild(i);
            frag.appendChild(w);
          });
        } else {
          frag.appendChild(node.cloneNode(true));
        }
      });
      nodes.forEach(function (n) { h.removeChild(n); });
      h.appendChild(frag);
      h.querySelectorAll('.w > i').forEach(function (i, idx) {
        i.style.transitionDelay = (idx * 55) + 'ms';
      });
    });
    if ('IntersectionObserver' in window) {
      var rio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
      }, { threshold: 0.2 });
      rws.forEach(function (h) { rio.observe(h); });
      setTimeout(function () { rws.forEach(function (h) { h.classList.add('in'); }); }, 1400);
    } else {
      rws.forEach(function (h) { h.classList.add('in'); });
    }
  } else {
    rws.forEach(function (h) { h.classList.add('in'); });
  }

  /* ---- Before / after slider ---- */
  document.querySelectorAll('.ba').forEach(function (ba) {
    var set = function (clientX) {
      var r = ba.getBoundingClientRect();
      var pct = ((clientX - r.left) / r.width) * 100;
      pct = Math.max(2, Math.min(98, pct));
      ba.style.setProperty('--pos', pct + '%');
    };
    var down = false;
    var start = function (e) { down = true; set((e.touches ? e.touches[0] : e).clientX); };
    var move = function (e) { if (!down) return; set((e.touches ? e.touches[0] : e).clientX); };
    var end = function () { down = false; };
    ba.addEventListener('mousedown', start);
    ba.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    ba.addEventListener('click', function (e) { set(e.clientX); });
  });

  /* ---- Process steps light up as they enter ---- */
  var psteps = document.querySelectorAll('.pstep');
  if (psteps.length && 'IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('in', e.isIntersecting); });
    }, { threshold: 0.55 });
    psteps.forEach(function (s) { pio.observe(s); });
  }

  /* ---- Marquee: duplicate the track so the loop is seamless ---- */
  document.querySelectorAll('.marquee-track').forEach(function (t) {
    t.innerHTML = t.innerHTML + t.innerHTML;
  });

  /* ---- Booking engine iframe: hide the loading panel once it renders ---- */
  var bookFrame = document.getElementById('book-frame');
  var bookLoad = document.getElementById('book-loading');
  if (bookFrame && bookLoad) {
    var hideLoader = function () { bookLoad.classList.add('gone'); };
    bookFrame.addEventListener('load', hideLoader);
    // Fail open: never leave a loading panel covering the engine.
    setTimeout(hideLoader, 6000);
  }

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
