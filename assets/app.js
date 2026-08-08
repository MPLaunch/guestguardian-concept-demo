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

    /* ---- The gate (Nick's wishlist item 1) ----
       The figures are only WRITTEN INTO THE PAGE once the form is submitted.
       Masking them in CSS alone would leave the real numbers sitting in the DOM
       for anyone who opened dev tools, which is not a lock, it is a curtain.
       On a production build the sum itself moves to the server so the numbers
       never reach the browser until a lead exists. */
    var wrap = document.getElementById('estwrap');
    var gate = document.getElementById('estform');
    var done = document.getElementById('estdone');
    var doneEmail = document.getElementById('estdone-email');
    var unlocked = false;

    /* The locked class is already on the element from the build, so there is no
       unlocked flash and no dependency on this script running at all. */
    if (wrap && !gate) wrap.classList.remove('is-locked');

    var calc = function () {
      var b = Math.max(1, Math.min(4, parseInt(beds.value, 10) || 1));
      var a = area.value in BASE ? area.value : 'city';
      var o = parseInt(occ.value, 10) || 60;
      var nightly = BASE[a][b - 1];
      var month = Math.round(nightly * 30.4 * (o / 100));
      var year = month * 12;
      occOut.textContent = o + '%';
      if (!unlocked) return;
      outNight.textContent = '$' + nightly.toLocaleString('en-AU');
      outMonth.textContent = '$' + month.toLocaleString('en-AU');
      outYear.textContent = '$' + year.toLocaleString('en-AU');
    };
    [beds, area, occ].forEach(function (el) {
      if (el) { el.addEventListener('input', calc); el.addEventListener('change', calc); }
    });

    if (gate) {
      gate.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var ok = true;
        var email = '';
        ['eg-name', 'eg-phone', 'eg-email', 'eg-suburb'].forEach(function (id) {
          var f = document.getElementById(id);
          if (!f) return;
          var v = f.value.trim();
          var bad = !v || (f.type === 'email' && v.indexOf('@') < 1);
          f.classList.toggle('is-bad', bad);
          if (bad) ok = false;
          if (id === 'eg-email') email = v;
        });
        if (!ok) return;

        unlocked = true;
        wrap.classList.remove('is-locked');
        calc();
        if (done) {
          if (doneEmail && email) doneEmail.textContent = email;
          done.hidden = false;
        }
      });
      /* Clear the error outline as soon as they start fixing it. */
      gate.addEventListener('input', function (ev) {
        if (ev.target && ev.target.classList) ev.target.classList.remove('is-bad');
      });
    } else {
      unlocked = true;
    }
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

  /* ---- Property filter.
     Filters on real attributes (sleeps / bedrooms / pool) read off their
     booking engine. Deliberately no date filter: their engine ignores date
     params, so a date control here would silently do nothing. ---- */
  var pf = document.getElementById('propfilter');
  if (pf) {
    var fGuests = document.getElementById('f-guests');
    var fBeds = document.getElementById('f-beds');
    var fPool = document.getElementById('f-pool');
    var fCount = document.getElementById('f-count');
    var fEmpty = document.getElementById('f-empty');
    var props = document.querySelectorAll('#proplist .prop');

    var applyFilter = function () {
      var g = parseInt(fGuests.value, 10) || 0;
      var b = parseInt(fBeds.value, 10) || 0;
      var p = fPool.value;
      var shown = 0;
      props.forEach(function (el) {
        var ok = parseInt(el.getAttribute('data-sleeps'), 10) >= g
              && parseInt(el.getAttribute('data-beds'), 10) >= b
              && (p === 'any' || el.getAttribute('data-pool') === 'true');
        el.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      if (fCount) fCount.textContent = shown;
      if (fEmpty) fEmpty.style.display = shown ? 'none' : '';
    };
    [fGuests, fBeds, fPool].forEach(function (el) {
      if (el) el.addEventListener('change', applyFilter);
    });
    applyFilter();

    /* Depart can never precede arrive. */
    var fStart = document.getElementById('f-start');
    var fEnd = document.getElementById('f-end');
    if (fStart && fEnd) {
      var today = new Date().toISOString().slice(0, 10);
      fStart.min = today;
      fEnd.min = today;
      fStart.addEventListener('change', function () {
        fEnd.min = fStart.value || today;
        if (fEnd.value && fEnd.value <= fStart.value) {
          var next = new Date(fStart.value);
          next.setDate(next.getDate() + 1);
          fEnd.value = next.toISOString().slice(0, 10);
        }
      });
    }
  }

  /* ---- Booking modal.
     Opens the REAL listing page over the site so the guest books without ever
     leaving guestguardian. The iframe src is only set on open, so we don't pay
     for four hidden page loads up front. ---- */
  var bmodal = document.getElementById('bmodal');
  if (bmodal) {
    var bmFrame = bmodal.querySelector('iframe');
    var bmLoad = bmodal.querySelector('.bmodal-load');
    var bmTitle = bmodal.querySelector('.bmodal-title');
    var bmNewTab = bmodal.querySelector('.bm-newtab');
    var lastFocus = null;

    var closeModal = function () {
      bmodal.classList.remove('open');
      document.body.classList.remove('bmodal-lock');
      bmFrame.src = 'about:blank';
      if (lastFocus) { try { lastFocus.focus(); } catch (e) {} }
    };
    var openModal = function (url, title) {
      lastFocus = document.activeElement;
      bmTitle.textContent = title || 'Book your stay';
      if (bmNewTab) bmNewTab.href = url;
      bmLoad.classList.remove('gone');
      bmFrame.src = url;
      bmodal.classList.add('open');
      document.body.classList.add('bmodal-lock');
      var closeBtn = bmodal.querySelector('.bmodal-close');
      if (closeBtn) closeBtn.focus();
    };

    bmFrame.addEventListener('load', function () {
      if (bmFrame.src && bmFrame.src !== 'about:blank') bmLoad.classList.add('gone');
    });
    // Fail open: never leave a loading panel stuck over the engine.
    var loadGuard;
    bmodal.addEventListener('transitionend', function () {});

    var guardLoader = function () {
      clearTimeout(loadGuard);
      loadGuard = setTimeout(function () { bmLoad.classList.add('gone'); }, 7000);
    };

    document.querySelectorAll('[data-book-url]').forEach(function (card) {
      card.addEventListener('click', function (ev) {
        // Let modified clicks (new tab / middle click) behave normally.
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault();
        openModal(card.getAttribute('data-book-url'), card.getAttribute('data-book-title'));
        guardLoader();
      });
    });

    /* The date/guest search opens in the SAME modal, so checking availability
       never bounces the guest off the site either. The plain form action stays
       as the no-JS fallback. */
    var bookbar = document.querySelector('form.bookbar');
    if (bookbar) {
      bookbar.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var params = [];
        Array.prototype.forEach.call(bookbar.elements, function (el) {
          // Only named fields go to their engine. Bedrooms/pool are ours and
          // filter the cards locally, so they are deliberately unnamed.
          if (el.name && el.value) {
            params.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value));
          }
        });
        var url = bookbar.getAttribute('action') + (params.length ? '?' + params.join('&') : '');
        var s = document.getElementById('f-start'), e = document.getElementById('f-end');
        var title = (s && s.value && e && e.value)
          ? 'Available ' + s.value + ' to ' + e.value
          : 'Available properties';
        openModal(url, title);
        guardLoader();
      });
    }

    /* Single-property booking form — same modal, but the deep link is already
       pinned to one listing id, so the guest only ever sees that home. */
    var pbook = document.querySelector('form.propbook');
    if (pbook) {
      pbook.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var params = [];
        Array.prototype.forEach.call(pbook.elements, function (el) {
          if (el.name && el.value) {
            params.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value));
          }
        });
        openModal(
          pbook.getAttribute('action') + (params.length ? '?' + params.join('&') : ''),
          pbook.getAttribute('data-book-title') || 'Book your stay'
        );
        guardLoader();
      });
    }

    bmodal.querySelectorAll('.bmodal-close').forEach(function (b) {
      b.addEventListener('click', closeModal);
    });
    bmodal.addEventListener('click', function (ev) { if (ev.target === bmodal) closeModal(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && bmodal.classList.contains('open')) closeModal();
    });
  }

  /* ==========================================================================
     Copy-to-clipboard buttons (direct property links + the embed snippet)
     ========================================================================== */

  /* The markup carries the production domain, which is the right thing to show
     on a real build but does not resolve while this is a preview. Rewrite the
     copyable links onto whatever host we are actually served from, so a link
     Nick copies out of the demo genuinely opens. */
  var pageBase = location.origin + location.pathname.replace(/[^/]*$/, '');
  document.querySelectorAll('.copyrow input').forEach(function (inp) {
    var abs = pageBase + inp.value.split('/').pop();
    inp.value = abs;
    var b = inp.parentNode.querySelector('.btn-copy[data-copy]');
    if (b) b.setAttribute('data-copy', abs);
  });

  document.querySelectorAll('.btn-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var from = btn.getAttribute('data-copy-from');
      var src = from ? document.querySelector(from) : null;
      var text = src ? src.value : (btn.getAttribute('data-copy') || '');
      if (!text) return;

      var flash = function () {
        var label = btn.querySelector('span');
        if (!label) return;
        var was = label.textContent;
        label.textContent = 'Copied';
        btn.classList.add('is-done');
        setTimeout(function () { label.textContent = was; btn.classList.remove('is-done'); }, 1800);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(flash, flash);
      } else {
        /* Fallback for older browsers and any non-secure context. */
        var t = document.createElement('textarea');
        t.value = text;
        t.setAttribute('readonly', '');
        t.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(t);
        t.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t);
        flash();
      }
    });
  });

  /* ==========================================================================
     Embed builder (share.html) — writes the snippet and drives the live preview
     ========================================================================== */
  var embProp = document.getElementById('emb-prop');
  var embCode = document.getElementById('emb-code');
  if (embProp && embCode) {
    var embTheme = document.getElementById('emb-theme');
    var embFrame = document.getElementById('emb-frame');
    /* Absolute origin, because the snippet is going onto someone else's site
       where a relative path would resolve against THEIR domain. */
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');

    var render = function () {
      var slug = embProp.value;
      var theme = embTheme ? embTheme.value : 'light';
      var src = base + 'embed.html?p=' + encodeURIComponent(slug) +
                (theme === 'dark' ? '&theme=dark' : '');
      embCode.value =
        '<iframe\n' +
        '  src="' + src + '"\n' +
        '  title="Guest Guardian property"\n' +
        '  style="width:100%;max-width:560px;height:470px;border:0"\n' +
        '  loading="lazy">\n' +
        '</iframe>';
      if (embFrame) embFrame.src = src;
    };
    embProp.addEventListener('change', render);
    if (embTheme) embTheme.addEventListener('change', render);
    render();
  }

  /* ==========================================================================
     Owner portal (owners.html)
     ========================================================================== */
  var ownerForm = document.getElementById('ownerform');
  var ownerApp = document.getElementById('owner-app');
  var ownerLogin = document.getElementById('owner-login');
  var managerApp = document.getElementById('manager-app');
  if (ownerForm && ownerApp && ownerLogin) {
    /* Three states: signed out, signed in as an owner, signed in as Guest
       Guardian. Kept in one place so they can never both be visible. */
    var show = function (view) {
      ownerLogin.hidden = view !== 'out';
      ownerApp.hidden = view !== 'owner';
      if (managerApp) managerApp.hidden = view !== 'manager';
      try { sessionStorage.setItem('gg_portal_view', view); } catch (e) {}
      if (view !== 'out') window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    /* Demo only: no credentials are checked and nothing is sent anywhere. */
    ownerForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      show('owner');
    });
    var asManager = document.getElementById('ow-as-manager');
    if (asManager) asManager.addEventListener('click', function () { show('manager'); });

    ['ow-signout', 'mg-signout'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () {
        show('out');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    /* Survive a refresh, and let the installed app icon land straight in. */
    try {
      var saved = sessionStorage.getItem('gg_portal_view');
      if (saved === 'owner' || saved === 'manager') show(saved);
    } catch (e) {}
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone && ownerApp.hidden && (!managerApp || managerApp.hidden)) show('owner');

    /* Tabs — owner side and manager side share the look and the behaviour, so
       both are scoped to their own container. Selecting on `.owner-tab` alone
       would let an owner-tab click strip the highlight off the manager tabs. */
    [[ownerApp, 'data-tab', 'data-panel'], [managerApp, 'data-mtab', 'data-mpanel']].forEach(function (set) {
      var root = set[0];
      if (!root) return;
      var tabs = root.querySelectorAll('[' + set[1] + ']');
      var panels = root.querySelectorAll('[' + set[2] + ']');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var want = tab.getAttribute(set[1]);
          tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); });
          panels.forEach(function (p) { p.hidden = p.getAttribute(set[2]) !== want; });
        });
      });
    });

    /* Save buttons on the manager screen — demo feedback only. */
    document.querySelectorAll('.btn-save').forEach(function (b) {
      b.addEventListener('click', function () {
        var was = b.textContent;
        b.textContent = 'Saved';
        b.classList.add('is-done');
        setTimeout(function () { b.textContent = was; b.classList.remove('is-done'); }, 1800);
      });
    });

    /* Add to home screen. Chrome/Android hands us a real install prompt to
       fire. iOS never does, so there we explain the Share-sheet steps instead
       of pretending a button can do it. */
    var installBtn = document.getElementById('ow-install');
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (ev) {
      ev.preventDefault();
      deferred = ev;
    });
    if (installBtn) {
      installBtn.addEventListener('click', function () {
        if (deferred) { deferred.prompt(); deferred = null; return; }
        var ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        alert(ios
          ? 'To add Guest Guardian to your home screen:\n\n1. Tap the Share button at the bottom of Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap Add\n\nIt will open straight into this dashboard, with no browser bar.'
          : 'To add Guest Guardian to your home screen, open your browser menu and choose "Install app" or "Add to Home screen".\n\nIt will open straight into this dashboard, with no browser bar.');
      });
    }
  }

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
