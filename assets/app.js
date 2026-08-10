/* Guest Guardian concept — interactions */
(function () {
  'use strict';

  /* ==========================================================================
     Concept-preview lead relay.
     Posts a form submission to MP Launch so Peter can see the thing works.
     🚨 TEST CHANNEL: it reaches Peter's inbox ONLY. Nothing is sent to Guest
     Guardian, no prospect is emailed, and nothing is written to the Lead
     Tracker. On a real build this would go to the client instead.
     Fire-and-forget on purpose — a network failure must never stop the visitor
     seeing their estimate.
     ========================================================================== */
  var LEAD_ENDPOINT = 'https://mplaunch.com.au/api/preview-lead';
  function relayLead(form, fields, meta) {
    try {
      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: 'guestguardian-concept',
          form: form,
          name: fields.name || '',
          email: fields.email || '',
          phone: fields.phone || '',
          suburb: fields.suburb || '',
          message: fields.message || '',
          meta: meta || {},
        }),
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  /* Guest share row on a property page. The native share sheet only appears
     where the browser actually has one (phones, mostly), so it is hidden by
     default and revealed rather than shown then broken. */
  var shareRow = document.querySelector('.sharebtns');
  if (shareRow && navigator.share) {
    var nativeBtn = shareRow.querySelector('[data-share-native]');
    if (nativeBtn) {
      nativeBtn.hidden = false;
      nativeBtn.addEventListener('click', function () {
        navigator.share({
          title: shareRow.getAttribute('data-share-title') || document.title,
          url: shareRow.getAttribute('data-share-url') || location.href,
        }).catch(function () {});
      });
    }
  }

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

  /* Concept forms. The visible behaviour is unchanged; they now also relay the
     submission to Peter so the round trip is provable before go-live. */
  document.querySelectorAll('form[data-demo]').forEach(function (f) {
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var pick = function (names) {
        for (var i = 0; i < names.length; i++) {
          var el = f.querySelector('[name="' + names[i] + '"]');
          if (el && el.value.trim()) return el.value.trim();
        }
        return '';
      };
      relayLead(f.getAttribute('data-demo') || 'contact form', {
        name: pick(['name', 'fullname', 'your-name']),
        email: pick(['email', 'your-email']),
        phone: pick(['phone', 'tel', 'mobile']),
        suburb: pick(['suburb', 'address', 'location']),
        message: pick(['message', 'comments', 'enquiry', 'notes']),
      });

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
    /* Guest Guardian's REAL achieved nightly rates, injected by the build from
       their own Hostaway bookings. The literals below are only the fallback for
       a page built before that data existed. */
    var BASE = window.GG_RATES ||
      { coastal: [155, 215, 310, 430], city: [165, 225, 315, 425], inner: [140, 190, 265, 360], hills: [150, 205, 285, 380] };

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

    /* ---- Three steps in one card (Nick's wishlist item 1) ----
       Choose the property, THEN hand over details, THEN see the figures. The
       form used to sit beside the sliders, which showed the price of an
       estimate before anyone had done the easy part.

       The figures are only WRITTEN INTO THE PAGE once the form is submitted.
       Masking them in CSS alone would leave the real numbers in the DOM for
       anyone who opened dev tools, which is a curtain rather than a lock. On a
       production build the sum moves to the server so they never reach the
       browser without a lead. */
    var stepInputs = document.querySelector('[data-est-inputs]');
    var stepGate = document.querySelector('[data-est-gate]');
    var stepOut = document.querySelector('[data-est-out]');
    var gate = document.getElementById('estform');
    var done = document.getElementById('estdone');
    var doneEmail = document.getElementById('estdone-email');
    var unlocked = false;

    var showStep = function (n) {
      if (!stepInputs) return;
      stepInputs.hidden = (n === 2);
      if (stepGate) stepGate.hidden = (n !== 2);
      if (stepOut) stepOut.hidden = (n !== 3);
      var next = document.getElementById('est-next');
      if (next) next.hidden = (n !== 1);
    };
    if (stepInputs) showStep(1);

    var nextBtn = document.getElementById('est-next');
    if (nextBtn) nextBtn.addEventListener('click', function () {
      showStep(2);
      var f = document.getElementById('eg-name');
      if (f) f.focus();
    });
    var backBtn = document.getElementById('est-back');
    if (backBtn) backBtn.addEventListener('click', function () { showStep(1); });

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
        showStep(3);
        calc();
        if (doneEmail && email) doneEmail.textContent = email;

        /* Send it on, including what they had the sliders set to — the numbers
           they saw are the whole context for following the lead up. */
        var val = function (id) { var f = document.getElementById(id); return f ? f.value.trim() : ''; };
        var areaSel = area.options[area.selectedIndex];
        relayLead('income estimator', {
          name: val('eg-name'), email: email, phone: val('eg-phone'), suburb: val('eg-suburb'),
        }, {
          Area: areaSel ? areaSel.textContent.trim() : area.value,
          Bedrooms: beds.value,
          Occupancy: occ.value + '%',
          /* Sent as separate values as well as the readable line, so the
             customer's copy of the estimate can be laid out properly rather
             than parsed back out of a sentence. */
          estNightly: outNight.textContent,
          estMonthly: outMonth.textContent,
          estYearly: outYear.textContent,
        });
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

    var AV = window.GG_AVAIL || {};
    var datesOn = false;          // only judge availability once dates are given

    var nightsIn = function (a, b) {
      var out = [];
      var d = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
      var end = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
      while (d < end) {
        var x = new Date(d);
        out.push(x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') +
                 '-' + String(x.getUTCDate()).padStart(2, '0'));
        d += 86400000;
      }
      return out;
    };

    /* Three answers, not two. "We do not hold that far ahead" is a different
       thing from "someone has it", and telling a guest the second when the
       truth is the first is how a site loses a booking it could have taken. */
    var checkStay = function (id, a, b) {
      var av = AV[String(id)];
      if (!av) return { state: 'unknown' };
      var nights = nightsIn(a, b);
      if (!nights.length) return { state: 'unknown' };
      if (nights[0] < av.min || nights[nights.length - 1] > av.max) return { state: 'outside' };
      var taken = nights.some(function (d) {
        return (av.booked || []).some(function (r) { return d >= r[0] && d <= r[1]; });
      });
      if (taken) return { state: 'taken' };
      var total = nights.reduce(function (s, d) { return s + ((av.prices || {})[d] || 0); }, 0);
      return { state: 'free', nights: nights.length, total: total, avg: total / nights.length };
    };

    var applyFilter = function () {
      /* Queried per run, not cached — practice properties are appended to the
         grid after this block initialises, and a cached list would leave them
         invisible to the filter and uncounted in "N homes match". */
      var props = document.querySelectorAll('#proplist .prop');
      var g = parseInt(fGuests.value, 10) || 0;
      var b = parseInt(fBeds.value, 10) || 0;
      var p = fPool.value;
      var a1 = fStartEl && fStartEl.value, a2 = fEndEl && fEndEl.value;
      var useDates = datesOn && a1 && a2 && a2 > a1;
      var shown = 0, outside = 0;

      props.forEach(function (el) {
        var ok = parseInt(el.getAttribute('data-sleeps'), 10) >= g
              && parseInt(el.getAttribute('data-beds'), 10) >= b
              && (p === 'any' || el.getAttribute('data-pool') === 'true');

        var tag = el.querySelector('[data-av]');
        if (tag) { tag.textContent = ''; tag.hidden = true; }

        if (ok && useDates) {
          var r = checkStay(el.getAttribute('data-listing'), a1, a2);
          if (r.state === 'taken') ok = false;
          else if (tag && r.state === 'free') {
            tag.hidden = false;
            tag.className = 'jcard-av is-free';
            tag.textContent = r.nights + ' night' + (r.nights > 1 ? 's' : '') + ' · $' +
              Math.round(r.total).toLocaleString('en-AU') + ' · $' +
              Math.round(r.avg).toLocaleString('en-AU') + ' a night';
          } else if (tag && r.state === 'outside') {
            outside++;
            tag.hidden = false;
            tag.className = 'jcard-av is-outside';
            tag.textContent = 'Beyond the dates we hold here — ask us';
          }
        }
        /* Carry the search through to the property page, so clicking a home
           lands on its calendar with those dates and that many guests already
           chosen. Written onto the href rather than handled on click, so
           middle-click, open-in-new-tab and copy-link all carry it too. */
        var base = (el.getAttribute('href') || '').split('?')[0];
        el.setAttribute('href', (ok && useDates)
          ? base + '?arrive=' + a1 + '&depart=' + a2 + '&guests=' + (g || 1)
          : base);

        el.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });

      /* 🪤 The hint is rebuilt from scratch every run, and #f-count is written
         by textContent rather than replaced by innerHTML. Rewriting the whole
         paragraph detached the count element, so from the second search onward
         the number stopped updating and the sentence kept whichever wording the
         previous search left behind — a date outside the window showed the
         cards saying "ask us" above a line insisting nothing was free. */
      var hint = document.querySelector('.bb-hint');
      var tail;
      if (!useDates) {
        tail = ' of our 4 homes match. Add dates to see what is actually free and what those nights cost.';
      } else if (outside) {
        tail = ' of our 4 homes match, but those dates run past the window this preview holds. Ask us and we will check the live calendar.';
      } else if (shown) {
        tail = ' of our 4 homes ' + (shown === 1 ? 'is' : 'are') +
               ' free for those nights, priced for the exact dates you picked.';
      } else {
        tail = ' of our 4 homes are free for those nights. Try moving them by a night or two.';
      }
      if (hint) {
        var strong = hint.querySelector('strong') || fCount;
        hint.textContent = tail;
        if (strong) hint.insertBefore(strong, hint.firstChild);
      }
      if (fCount) fCount.textContent = outside ? props.length : shown;

      if (fEmpty) {
        /* A date past the window is not "no match" — the cards are still on
           screen saying ask us, so an empty-state under them would contradict. */
        fEmpty.style.display = (shown || outside) ? 'none' : '';
        fEmpty.textContent = useDates
          ? 'None of our homes are free for those dates. Try moving them by a night or two.'
          : 'No homes match that combination. Try widening the filters.';
      }
    };

    var fStartEl = document.getElementById('f-start');
    var fEndEl = document.getElementById('f-end');

    [fGuests, fBeds, fPool].forEach(function (el) {
      if (el) el.addEventListener('change', applyFilter);
    });
    /* Changing a date after searching re-answers straight away rather than
       leaving yesterday's answer on screen next to today's dates. */
    [fStartEl, fEndEl].forEach(function (el) {
      if (el) el.addEventListener('change', function () { if (datesOn) applyFilter(); });
    });

    /* 🚨 This used to open their booking engine in a panel over the page — the
       one remaining place a guest was handed to another company. It also
       disagreed with the page underneath it: the cards said one home matched
       while the panel said "No results". Now it just answers, here. */
    pf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      datesOn = true;
      applyFilter();
      var list = document.getElementById('proplist');
      if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    /* 🚨 The date/guest search USED to open the booking engine in this modal.
       It is now answered on the page itself, in the property-filter block
       above. Nothing here may bind to form.bookbar again: #propfilter carries
       that class, so a handler here would re-open the panel over the top of the
       answer the page has already given. */

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
     Practice properties — shared between the back office and the public site.

     A property added in practice mode is stored in THIS BROWSER only
     (localStorage) so the demo can show the whole promise: add it in the back
     office, and it appears on the website. No server is involved and nobody
     else can see it; a real build does this for everyone via Hostaway.
     ========================================================================== */
  var PRACTICE_KEY = 'gg_practice_props';
  var practiceAll = function () {
    try { return JSON.parse(localStorage.getItem(PRACTICE_KEY) || '[]'); } catch (e) { return []; }
  };
  var practiceSave = function (list) {
    try { localStorage.setItem(PRACTICE_KEY, JSON.stringify(list)); } catch (e) {}
  };
  var practiceRemove = function (slug) {
    practiceSave(practiceAll().filter(function (p) { return p.slug !== slug; }));
  };

  /* Which properties the client has chosen to show on their own website.
     Hostaway has nowhere to store "show this on our site", so the flag lives
     on our side. Default is shown — a property nobody has touched appears. */
  var HIDE_KEY = 'gg_hidden_listings';
  var hiddenListings = function () {
    try { return JSON.parse(localStorage.getItem(HIDE_KEY) || '[]').map(String); } catch (e) { return []; }
  };
  var setListingHidden = function (id, hidden) {
    var list = hiddenListings().filter(function (x) { return x !== String(id); });
    if (hidden) list.push(String(id));
    try { localStorage.setItem(HIDE_KEY, JSON.stringify(list)); } catch (e) {}
  };

  /* Public site: honour it on the Book Your Stay grid. */
  (function () {
    var grid = document.getElementById('proplist');
    if (!grid) return;
    /* One-off cleanup: practice properties were removable only while the Add
       screen existed, so any left behind had no way out. That screen is gone. */
    try { localStorage.removeItem('gg_practice_props'); } catch (e) {}

    var hidden = hiddenListings();
    if (!hidden.length) return;
    grid.querySelectorAll('[data-listing]').forEach(function (card) {
      if (hidden.indexOf(String(card.getAttribute('data-listing'))) > -1) card.remove();
    });
    var note = document.getElementById('f-count');
    if (note) note.textContent = grid.querySelectorAll('.prop').length;
  })();

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
  /* Bookings made in this browser during the demo. Lets the whole workflow be
     walked: book a stay, then sign in and find it waiting. */
  var demoBookings = function () {
    try { return JSON.parse(localStorage.getItem('gg_bookings') || '[]'); } catch (e) { return []; }
  };

  var ownerForm = document.getElementById('ownerform');
  var ownerApp = document.getElementById('owner-app');
  var ownerLogin = document.getElementById('owner-login');
  var managerApp = document.getElementById('manager-app');
  var guestApp = document.getElementById('guest-app');
  if (ownerForm && ownerApp && ownerLogin) {
    /* ONE login, three destinations. On a real build the account decides where
       you land; here the view is chosen for the preview. Kept in a single
       function so two portals can never be on screen at once. */
    var VIEWS = { out: ownerLogin, owner: ownerApp, manager: managerApp, guest: guestApp };

    /* The header button is the ONLY way in or out. Having a Sign in up top and a
       separate Sign out inside each portal meant two controls for one job, in
       two different places depending which portal you were in. */
    var navBtn = document.querySelector('.nav-signin');
    var navLabel = navBtn && navBtn.querySelector('span');
    var navHome = navBtn && navBtn.getAttribute('href');

    var show = function (view) {
      Object.keys(VIEWS).forEach(function (k) {
        if (VIEWS[k]) VIEWS[k].hidden = (k !== view);
      });
      if (navBtn && navLabel) {
        var inside = view !== 'out';
        navLabel.textContent = inside ? 'Sign out' : 'Sign in';
        navBtn.classList.toggle('is-out', inside);
        navBtn.setAttribute('href', inside ? '#' : navHome);
      }
      try { sessionStorage.setItem('gg_portal_view', view); } catch (e) {}
      if (view !== 'out') window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (navBtn) navBtn.addEventListener('click', function (ev) {
      if (!navBtn.classList.contains('is-out')) return;   // signed out: normal link
      ev.preventDefault();
      show('out');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* Demo only: no credentials are checked and nothing is sent anywhere.
       A plain sign-in lands on the property-owner view, since that is who most
       people signing in would be. */
    ownerForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      show('owner');
    });

    document.querySelectorAll('.demo-roles-btns [data-role]').forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-role')); });
    });


    /* Survive a refresh, and let the installed app icon land straight in. */
    try {
      var saved = sessionStorage.getItem('gg_portal_view');
      if (saved && saved !== 'out' && VIEWS[saved]) show(saved);
    } catch (e) {}
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone && ownerLogin.hidden === false) show('owner');

    /* A booking made during the demo takes over the guest view, so signing in
       after booking shows YOUR stay rather than the worked example. */
    var mine = demoBookings();
    if (mine.length && guestApp) {
      var b = mine[mine.length - 1];
      var fmtLong = function (s) {
        var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
        return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
      };
      var setText = function (sel, txt) {
        var el = guestApp.querySelector(sel);
        if (el) el.textContent = txt;
      };
      setText('.eyebrow', 'Your stay, ' + b.first);
      setText('h1', b.property || 'Your stay');
      setText('.owner-top p.small', b.nights + ' night' + (b.nights > 1 ? 's' : '') +
        ' · ' + b.guests + ' guest' + (b.guests > 1 ? 's' : '') + ' · booked ' + b.madeAt);
      var kpis = guestApp.querySelectorAll('.okpi-n');
      if (kpis.length >= 3) {
        kpis[0].textContent = fmtLong(b.arrive);
        kpis[1].textContent = fmtLong(b.depart);
        kpis[2].textContent = b.ref;
      }
    }

    /* Tabs — owner side and manager side share the look and the behaviour, so
       both are scoped to their own container. Selecting on `.owner-tab` alone
       would let an owner-tab click strip the highlight off the manager tabs. */
    [[ownerApp, 'data-tab', 'data-panel'],
     [managerApp, 'data-mtab', 'data-mpanel'],
     [guestApp, 'data-gtab', 'data-gpanel']].forEach(function (set) {
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

    /* ---------------------------------------------------------------------
       ADD A PROPERTY.

       🚨 SAFE BY DESIGN. There is no code path in this file that writes to
       Hostaway. The form builds a preview and an embed snippet locally and
       nothing else. The "publish live" tick only changes what the page SAYS
       would happen, so a mis-click cannot create a listing on a live booking
       system, cannot reach a channel, and cannot be seen by a guest.
       Wiring the real POST is a deliberate, separate job for the production
       build, behind a server that holds the key.
       --------------------------------------------------------------------- */
    /* One snippet builder, shared by the add screen and the manage panel, so
       the code a partner gets is identical wherever it was copied from. */
    var buildSnippet = function (p, whiteLabel) {
      var base = location.origin + location.pathname.replace(/[^/]*$/, '');
      var src = base + 'embed.html?p=' + encodeURIComponent(p.slug) +
        '&name=' + encodeURIComponent(p.name) +
        '&beds=' + encodeURIComponent(p.beds) +
        '&baths=' + encodeURIComponent(p.baths) +
        '&sleeps=' + encodeURIComponent(p.sleeps) +
        '&price=' + encodeURIComponent(p.price) +
        (whiteLabel ? '&wl=1' : '');
      return '<iframe\n' +
        '  src="' + src + '"\n' +
        '  title="' + String(p.name).replace(/"/g, '') + '"\n' +
        '  style="width:100%;max-width:560px;height:470px;border:0"\n' +
        '  loading="lazy">\n' +
        '</iframe>';
    };

    /* One builder for a practice row, used on add and on reload. */
    var insertPracticeRow = function (p) {
      var props = document.querySelector('#manager-app [data-mpanel="props"] .wrap');
      if (!props) return;
      var legend = props.querySelector('.mg-legend');
      var existing = props.querySelector('.mgprop[data-practice="' + p.slug + '"]');
      if (existing) existing.remove();
      var row = document.createElement('div');
      row.className = 'mgprop';
      row.setAttribute('data-practice', p.slug);
      row.innerHTML =
        '<div class="mgprop-img">' +
          (p.photo ? '<img src="' + p.photo + '" alt="">'
            : '<div style="display:grid;place-items:center;height:100%;color:var(--muted);font-size:.78rem">Photos to come</div>') +
        '</div>' +
        '<div class="mgprop-body">' +
          '<div class="mgprop-head"><div>' +
            '<h3 class="h3" style="font-size:1.08rem">' + String(p.name || '').replace(/[<>]/g, '') + '</h3>' +
            '<p class="small muted" style="margin:.2rem 0 0">Practice mode &middot; this browser only</p>' +
          '</div><span class="tag tag-web">Practice</span></div>' +
          '<div class="mgprop-facts">' +
            '<span>Sleeps ' + (p.sleeps || '?') + '</span><span>' + (p.beds || '?') + ' bed</span>' +
            '<span>' + (p.baths || '?') + ' bath</span><span>$' + (p.price || '?') + '/night</span>' +
            '<span>Not published</span>' +
          '</div>' +
          '<div class="mgprop-foot">' +
            '<span class="small muted">Also showing on the Book Your Stay page, in this browser. On a real build it goes live for everyone via Hostaway.</span>' +
            '<span style="display:flex;gap:.5rem">' +
              '<button class="btn btn-ghost" type="button" data-practice-manage>Manage</button>' +
              '<button class="btn btn-ghost" type="button" data-practice-rm="' + p.slug + '">Remove</button>' +
            '</span>' +
          '</div>' +
          '<div class="mgmanage" hidden>' +
            '<div class="field"><label>Description shown on the website <span class="tag tag-web">website</span></label>' +
              '<textarea rows="2" data-f="desc">' + String(p.desc || '').replace(/[<>]/g, '') + '</textarea></div>' +
            '<div class="field-row">' +
              '<div class="field"><label>Nightly rate <span class="tag tag-auto">Hostaway</span></label>' +
                '<input value="$' + (p.price || '') + '" readonly title="Change this in Hostaway"></div>' +
              '<div class="field"><label>Bedrooms <span class="tag tag-auto">Hostaway</span></label>' +
                '<input value="' + (p.beds || '') + '" readonly title="Change this in Hostaway"></div>' +
            '</div>' +
            '<p class="small muted" style="margin:-.3rem 0 .9rem">The Hostaway fields are read-only here on purpose. Changing a price or a bed count in two places is how a calendar and a website end up disagreeing, so those stay where the booking system keeps them.</p>' +
            '<p class="eyebrow" style="margin-bottom:.5rem">The code for a partner</p>' +
            '<div class="wlpick" role="radiogroup" aria-label="Branding">' +
              '<label class="wlopt"><input type="radio" name="wl-' + p.slug + '" value="0" checked><span class="wlopt-ui"></span>' +
                '<span class="wlopt-txt"><b>Show your name</b><span>Card credits Guest Guardian.</span></span></label>' +
              '<label class="wlopt"><input type="radio" name="wl-' + p.slug + '" value="1"><span class="wlopt-ui"></span>' +
                '<span class="wlopt-txt"><b>White label</b><span>Reads as the partner\'s own listing.</span></span></label>' +
            '</div>' +
            '<textarea class="embed-code embed-code-light" rows="5" readonly data-f="embed"></textarea>' +
            '<button class="btn btn-ghost btn-copy" type="button" data-f="copy" style="width:100%;justify-content:center">Copy the embed code</button>' +
          '</div>' +
        '</div>';
      if (legend) legend.insertAdjacentElement('afterend', row);
      else props.prepend(row);

      row.querySelector('[data-practice-rm]').addEventListener('click', function () {
        row.remove();
        practiceRemove(p.slug);
      });

      /* Manage opens the property in place, so its code can always be found
         again after the add form has been cleared for the next one. */
      var panel = row.querySelector('.mgmanage');
      var codeBox = panel.querySelector('[data-f="embed"]');
      var writeCode = function () {
        var on = panel.querySelector('input[name="wl-' + p.slug + '"]:checked');
        codeBox.value = buildSnippet(p, on && on.value === '1');
        panel.querySelector('[data-f="copy"]').setAttribute('data-copy', codeBox.value);
      };
      panel.querySelectorAll('input[type="radio"]').forEach(function (r) {
        r.addEventListener('change', writeCode);
      });
      writeCode();
      row.querySelector('[data-practice-manage]').addEventListener('click', function (ev) {
        panel.hidden = !panel.hidden;
        ev.currentTarget.textContent = panel.hidden ? 'Manage' : 'Done';
      });
      panel.querySelector('[data-f="desc"]').addEventListener('input', function (e) {
        var list = practiceAll();
        list.forEach(function (x) { if (x.slug === p.slug) x.desc = e.target.value; });
        practiceSave(list);
      });
    };

    var addForm = document.getElementById('addprop');
    /* Reload: anything added earlier in this browser comes back. */
    if (addForm) practiceAll().forEach(insertPracticeRow);
    if (addForm) {
      var liveTick = document.getElementById('ap-live');
      var submitBtn = document.getElementById('ap-submit');
      var safebar = document.getElementById('safebar');

      /* Photo picker.
         🚨 Nothing is uploaded. The thumbnails are drawn from the file the
         browser already has, via FileReader, and never leave the machine — a
         static preview has nowhere to put them and no business holding a
         client's photos. Real uploads need a server and storage. */
      var photoInput = document.getElementById('ap-photos');
      var photoGrid = document.getElementById('ap-photogrid');
      var photos = [];
      var drawPhotos = function () {
        photoGrid.innerHTML = photos.map(function (p, i) {
          return '<figure class="dz-item"><img src="' + p.src + '" alt="">' +
                 (i === 0 ? '<figcaption>Cover</figcaption>' : '') +
                 '<button type="button" data-rm="' + i + '" aria-label="Remove photo">&times;</button></figure>';
        }).join('');
      };
      if (photoInput && photoGrid) {
        photoInput.addEventListener('change', function () {
          [].slice.call(photoInput.files).slice(0, 12).forEach(function (f) {
            if (!/^image\//.test(f.type)) return;
            var fr = new FileReader();
            fr.onload = function () { photos.push({ name: f.name, src: fr.result }); drawPhotos(); };
            fr.readAsDataURL(f);
          });
          photoInput.value = '';
        });
        photoGrid.addEventListener('click', function (ev) {
          var b = ev.target.closest('[data-rm]');
          if (!b) return;
          photos.splice(+b.getAttribute('data-rm'), 1);
          drawPhotos();
        });
        var dz = document.querySelector('.dropzone');
        ['dragenter', 'dragover'].forEach(function (e) {
          dz.addEventListener(e, function (ev) { ev.preventDefault(); dz.classList.add('is-over'); });
        });
        ['dragleave', 'drop'].forEach(function (e) {
          dz.addEventListener(e, function (ev) { ev.preventDefault(); dz.classList.remove('is-over'); });
        });
        dz.addEventListener('drop', function (ev) {
          var files = ev.dataTransfer && ev.dataTransfer.files;
          if (!files) return;
          [].slice.call(files).slice(0, 12).forEach(function (f) {
            if (!/^image\//.test(f.type)) return;
            var fr = new FileReader();
            fr.onload = function () { photos.push({ name: f.name, src: fr.result }); drawPhotos(); };
            fr.readAsDataURL(f);
          });
        });
      }

      var slugify = function (s) {
        return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-property';
      };

      var reflectMode = function () {
        var live = liveTick && liveTick.checked;
        submitBtn.innerHTML = live
          ? 'Publish to my live account'
          : 'Add in practice mode';
        submitBtn.classList.toggle('btn-danger', !!live);
        if (safebar) safebar.classList.toggle('is-live', !!live);
      };
      if (liveTick) liveTick.addEventListener('change', reflectMode);
      reflectMode();

      addForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var name = (document.getElementById('ap-name').value || '').trim();
        if (!name) { document.getElementById('ap-name').classList.add('is-bad'); return; }

        if (liveTick && liveTick.checked) {
          var ok = window.confirm(
            'On a real build this would create "' + name + '" in your Hostaway account, ' +
            'where it would pick up a calendar and become bookable.\n\n' +
            'THIS PREVIEW SENDS NOTHING. Your Hostaway account is not touched, ' +
            'no listing is created and no channel is contacted.\n\n' +
            'Continue?');
          if (!ok) return;
        }

        var slug = slugify(name);
        var base = location.origin + location.pathname.replace(/[^/]*$/, '');
        var url = base + 'stay-' + slug + '.html';
        /* The snippet carries the property's details in the link itself. A
           practice property exists nowhere on the server, so the card builds
           itself from what travels in the URL — no publish, nothing invented,
           and the partner sees the actual property that was typed in. */
        var embedBase = base + 'embed.html?p=' + encodeURIComponent(slug) +
          '&name=' + encodeURIComponent(name) +
          '&beds=' + encodeURIComponent(document.getElementById('ap-beds').value) +
          '&baths=' + encodeURIComponent(document.getElementById('ap-baths').value) +
          '&sleeps=' + encodeURIComponent(document.getElementById('ap-sleeps').value) +
          '&price=' + encodeURIComponent(document.getElementById('ap-price').value);

        document.getElementById('ap-created').innerHTML =
          '<div class="ap-badge">' + (liveTick && liveTick.checked ? 'Would go live' : 'Practice only') + '</div>' +
          '<h3>' + name.replace(/[<>]/g, '') + '</h3>' +
          (photos.length ? '<img class="ap-cover" src="' + photos[0].src + '" alt="">' : '') +
          (photos.length ? '<p class="ap-photocount">' + photos.length + ' photo' + (photos.length > 1 ? 's' : '') + ' attached</p>' : '') +
          '<p>' + [document.getElementById('ap-beds').value + ' bedroom',
                   document.getElementById('ap-baths').value + ' bathroom',
                   'sleeps ' + document.getElementById('ap-sleeps').value,
                   '$' + document.getElementById('ap-price').value + ' a night'].join(' &middot; ') + '</p>';

        document.getElementById('ap-url').value = url;
        document.getElementById('ap-copyurl').setAttribute('data-copy', url);
        /* Two versions of the same snippet. The only difference is wl=1, which
           strips every Guest Guardian mention off the card. */
        var embedField = document.getElementById('ap-embed');
        var writeSnippet = function () {
          var wlOn = document.querySelector('input[name="ap-wl"]:checked');
          var src = embedBase + ((wlOn && wlOn.value === '1') ? '&wl=1' : '');
          embedField.value =
            '<iframe\n' +
            '  src="' + src + '"\n' +
            '  title="' + name.replace(/"/g, '') + '"\n' +
            '  style="width:100%;max-width:560px;height:470px;border:0"\n' +
            '  loading="lazy">\n' +
            '</iframe>';
        };
        document.querySelectorAll('input[name="ap-wl"]').forEach(function (radio) {
          radio.addEventListener('change', writeSnippet);
        });
        writeSnippet();
        document.getElementById('ap-copyembed').setAttribute('data-copy-from', '#ap-embed');

        /* 🚨 Capture the property BEFORE the form is cleared. Reading the
           inputs after a reset gives you the defaults, which silently filed
           a 6-bedroom at $850 as a 2-bedroom at $350. */
        var record = {
          slug: slug,
          name: name,
          beds: document.getElementById('ap-beds').value,
          baths: document.getElementById('ap-baths').value,
          sleeps: document.getElementById('ap-sleeps').value,
          price: document.getElementById('ap-price').value,
          desc: document.getElementById('ap-desc').value,
          photo: (photos.length && photos[0].src.length < 250000) ? photos[0].src : '',
        };

        insertPracticeRow(record);
        var stored = practiceAll().filter(function (p) { return p.slug !== slug; });
        stored.push(record);
        practiceSave(stored);

        /* Point the "see it on a winery's site" link at THIS property. */
        var wl = document.querySelector('#ap-result a[href^="winery-example"]');
        if (wl) wl.setAttribute('href', 'winery-example.html?p=' + encodeURIComponent(slug));

        /* Confirm, then clear the form so the next one can be added straight
           away. Nothing is lost: the property and its code live on its row in
           Properties, under Manage. */
        var done = document.createElement('div');
        done.className = 'addtoast';
        done.innerHTML = '<b>' + name.replace(/[<>]/g, '') + ' added.</b> ' +
          'It is on your Properties tab and on Book Your Stay. Open it under ' +
          '<b>Manage</b> any time to edit it or copy its code again.' +
          '<button type="button" class="addtoast-go">Go to Properties</button>';
        addForm.insertAdjacentElement('beforebegin', done);
        done.querySelector('.addtoast-go').addEventListener('click', function () {
          var t = document.querySelector('[data-mtab="props"]');
          if (t) t.click();
        });
        setTimeout(function () { done.remove(); }, 12000);

        addForm.reset();
        photos.length = 0;
        if (photoGrid) photoGrid.innerHTML = '';
        if (liveTick) liveTick.checked = false;
        reflectMode();

        document.getElementById('ap-result').hidden = false;
        document.getElementById('ap-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      addForm.addEventListener('input', function (ev) {
        if (ev.target && ev.target.classList) ev.target.classList.remove('is-bad');
      });

      var del = document.getElementById('ap-delete');
      if (del) del.addEventListener('click', function () {
        /* Deleting the property also removes its row from the Properties tab
           and from the public pages, so no screen can disagree about what
           exists. */
        document.querySelectorAll('.mgprop[data-practice]').forEach(function (r) {
          practiceRemove(r.getAttribute('data-practice'));
          r.remove();
        });
        document.getElementById('ap-result').hidden = true;
        addForm.reset();
        photos.length = 0;
        if (photoGrid) photoGrid.innerHTML = '';
        if (liveTick) liveTick.checked = false;
        reflectMode();
      });
    }

    /* ---------------------------------------------------------------------
       LEADS TABLE — sort, search, filter, export.
       All client-side over the rows already in the page. A live build would do
       this on the server once there are more rows than a person wants to
       scroll, but the behaviour a client sees is identical.
       --------------------------------------------------------------------- */
    var leadTbl = document.getElementById('leadtbl');
    if (leadTbl) {
      var tbody = leadTbl.querySelector('tbody');

      /* A booking taken during the demo lands at the top of the enquiry list,
         so the back office reflects it the moment it happens. */
      demoBookings().slice().reverse().forEach(function (b) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td data-sort="' + b.madeAt + '"><span class="lead-when">just now</span><span class="lead-time">' + b.madeAt.slice(11) + '</span></td>' +
          '<td><b>' + (b.first + ' ' + b.last).replace(/[<>]/g, '') + '</b></td>' +
          '<td><span class="lead-em">' + b.email.replace(/[<>]/g, '') + '</span><span class="lead-ph">' + b.phone.replace(/[<>]/g, '') + '</span></td>' +
          '<td><span class="src src-booking">Direct booking</span></td>' +
          '<td>Guest</td>' +
          '<td class="lead-note">' + (b.property || '') + ' &middot; ' + b.nights + ' night' + (b.nights > 1 ? 's' : '') +
            ' &middot; $' + Math.round(b.total).toLocaleString('en-AU') + ' &middot; ' + b.ref + '</td>' +
          '<td><span class="pill pill-ok">Booked</span></td>';
        tbody.insertBefore(tr, tbody.firstChild);
      });

      var allRows = [].slice.call(tbody.querySelectorAll('tr'));
      var search = document.getElementById('lead-search');
      var filter = document.getElementById('lead-filter');
      var countEl = document.getElementById('lead-count');
      var sortCol = 0, sortDir = -1;   // newest first to begin with

      /* Sort on the raw value where a cell provides one — the When column shows
         "07 Aug" but sorts on the full timestamp, so months order correctly. */
      var cellVal = function (row, i) {
        var td = row.children[i];
        if (!td) return '';
        return (td.getAttribute('data-sort') || td.textContent || '').trim().toLowerCase();
      };

      var apply = function () {
        var q = (search && search.value || '').trim().toLowerCase();
        var src = (filter && filter.value || '');
        var shown = 0;

        var rows = allRows.slice().sort(function (a, b) {
          var x = cellVal(a, sortCol), y = cellVal(b, sortCol);
          return x < y ? -sortDir : x > y ? sortDir : 0;
        });

        rows.forEach(function (r) {
          var hay = r.textContent.toLowerCase();
          var srcCell = (r.children[3] && r.children[3].textContent) || '';
          var ok = (!q || hay.indexOf(q) > -1) && (!src || srcCell.indexOf(src) > -1);
          r.hidden = !ok;
          if (ok) shown++;
          tbody.appendChild(r);
        });

        if (countEl) {
          countEl.textContent = (shown === allRows.length)
            ? 'Showing all ' + allRows.length + ' enquiries. Click any heading to sort.'
            : 'Showing ' + shown + ' of ' + allRows.length + ' enquiries.';
        }
      };

      leadTbl.querySelectorAll('.th-sort').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var col = +btn.getAttribute('data-col');
          sortDir = (col === sortCol) ? -sortDir : 1;
          sortCol = col;
          leadTbl.querySelectorAll('.th-sort').forEach(function (b) {
            b.classList.remove('is-asc', 'is-desc');
          });
          btn.classList.add(sortDir === 1 ? 'is-asc' : 'is-desc');
          apply();
        });
      });

      if (search) search.addEventListener('input', apply);
      if (filter) filter.addEventListener('change', apply);

      var csvBtn = document.getElementById('lead-csv');
      if (csvBtn) csvBtn.addEventListener('click', function () {
        var esc = function (s) { return '"' + String(s).replace(/\s+/g, ' ').trim().replace(/"/g, '""') + '"'; };
        var head = [].slice.call(leadTbl.querySelectorAll('thead th'))
          .map(function (th) { return esc(th.textContent); }).join(',');
        var body = allRows.filter(function (r) { return !r.hidden; }).map(function (r) {
          return [].slice.call(r.children).map(function (td) { return esc(td.textContent); }).join(',');
        });
        var blob = new Blob([[head].concat(body).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'guest-guardian-enquiries.csv';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      });

      apply();
    }

    /* Show-on-website toggles. These are the only fields on this screen that
       change what the public sees, so they persist rather than just animating. */
    document.querySelectorAll('[data-show-listing]').forEach(function (box) {
      var id = box.getAttribute('data-show-listing');
      box.checked = hiddenListings().indexOf(String(id)) === -1;
      box.addEventListener('change', function () {
        setListingHidden(id, !box.checked);
        var row = box.closest('.mgprop');
        var lab = row && row.querySelector('.mgprop-facts');
        if (lab) {
          var tag = lab.querySelector('[data-hidden-tag]');
          if (!box.checked && !tag) {
            var s2 = document.createElement('span');
            s2.setAttribute('data-hidden-tag', '');
            s2.textContent = 'Hidden from the website';
            s2.style.background = 'rgba(192,43,10,.1)';
            s2.style.color = 'var(--rust)';
            lab.appendChild(s2);
          } else if (box.checked && tag) { tag.remove(); }
        }
      });
      /* Reflect a saved hidden state on load. */
      if (!box.checked) box.dispatchEvent(new Event('change'));
    });

    /* Partner-link panel on each REAL property. Properties are born in
       Hostaway, so this is the only place a partner snippet can come from —
       it is generated against a listing that actually exists. */
    document.querySelectorAll('[data-partner-toggle]').forEach(function (btn) {
      var row = btn.closest('.mgprop');
      var panel = row.querySelector('[data-partner-panel]');
      var box = panel.querySelector('[data-partner-code]');
      var copy = panel.querySelector('[data-partner-copy]');
      var write = function () {
        var on = panel.querySelector('input[type="radio"]:checked');
        /* A real listing needs only its own reference. The card looks up the
           photo, the details and the live booking link from the listing
           itself, so stuffing them into the URL would only create a second
           copy that could fall out of date on someone else's website. */
        var base = location.origin + location.pathname.replace(/[^/]*$/, '');
        var src = base + 'embed.html?p=' + encodeURIComponent(box.getAttribute('data-slug')) +
          ((on && on.value === '1') ? '&wl=1' : '');
        var code = '<iframe\n' +
          '  src="' + src + '"\n' +
          '  title="' + box.getAttribute('data-name').replace(/"/g, '') + '"\n' +
          '  style="width:100%;max-width:560px;height:470px;border:0"\n' +
          '  loading="lazy">\n' +
          '</iframe>';
        box.value = code;
        copy.setAttribute('data-copy', code);
      };
      panel.querySelectorAll('input[type="radio"]').forEach(function (r) {
        r.addEventListener('change', write);
      });
      write();
      btn.addEventListener('click', function () {
        panel.hidden = !panel.hidden;
        btn.textContent = panel.hidden ? 'Partner link' : 'Done';
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
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (ev) {
      ev.preventDefault();
      deferred = ev;
    });
    ['ow-install', 'gu-install'].forEach(function (id) {
      var installBtn = document.getElementById(id);
      if (!installBtn) return;
      installBtn.addEventListener('click', function () {
        if (deferred) { deferred.prompt(); deferred = null; return; }
        var ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        alert(ios
          ? 'To add Guest Guardian to your home screen:\n\n1. Tap the Share button at the bottom of Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap Add\n\nIt will open straight into this dashboard, with no browser bar.'
          : 'To add Guest Guardian to your home screen, open your browser menu and choose "Install app" or "Add to Home screen".\n\nIt will open straight into this dashboard, with no browser bar.');
      });
    });
  }

  /* ==========================================================================
     BOOKING PANEL (property pages)

     The guest picks dates, sees real availability and a real total, all on
     Guest Guardian's own page. It used to open the booking engine over the
     top, which put another company's website in front of the guest at the
     exact moment they decided.

     🚨 Where the demo stops: taking the card and writing the reservation need
     a server holding the Hostaway key. Nothing here talks to anyone — the
     calendar was baked in at build time. The panel says so rather than
     pretending, because a fake "booked!" is worse than an honest stop.
     ========================================================================== */
  var bp = document.getElementById('bookpanel');
  if (bp && window.GG_CAL) {
    var CAL = {};
    window.GG_CAL.forEach(function (r) { CAL[r[0]] = { free: !!r[1], price: r[2] }; });
    var allDates = Object.keys(CAL).sort();
    if (allDates.length) {
      var cleanFee = +bp.getAttribute('data-clean') || 0;
      var daysEl = document.getElementById('bp-days');
      var monthEl = document.getElementById('bp-month');
      var hintEl = document.getElementById('bp-hint');
      var quoteEl = document.getElementById('bp-quote');
      var linesEl = document.getElementById('bp-lines');
      var goBtn = document.getElementById('bp-go');
      var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                 'August', 'September', 'October', 'November', 'December'];
      var view = allDates[0].slice(0, 7);
      var arrive = null, depart = null;

      var iso = function (y, m, d) {
        return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      };
      var addMonth = function (ym, n) {
        var y = +ym.slice(0, 4), m = +ym.slice(5, 7) + n;
        return (y + Math.floor((m - 1) / 12)) + '-' + String(((m - 1) % 12 + 12) % 12 + 1).padStart(2, '0');
      };
      /* Every night from arrival to the night before departure.
         🚨 Stays in UTC start to finish. Doing this with new Date('2026-08-08')
         and toISOString() parses as LOCAL midnight and hands back the PREVIOUS
         day in Adelaide (UTC+9:30), so every night shifted a day early and no
         date ever matched the calendar. A booking calendar is the last place
         you want an off-by-one. */
      var nightsBetween = function (a, b) {
        var out = [];
        var d = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
        var end = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
        while (d < end) {
          var x = new Date(d);
          out.push(x.getUTCFullYear() + '-' +
                   String(x.getUTCMonth() + 1).padStart(2, '0') + '-' +
                   String(x.getUTCDate()).padStart(2, '0'));
          d += 86400000;
        }
        return out;
      };
      var rangeIsFree = function (a, b) {
        return nightsBetween(a, b).every(function (d) { return CAL[d] && CAL[d].free; });
      };

      /* The real Hostaway pricing rules for this listing. Their checkout applies
         all of these, so ours has to as well or the two disagree at the moment
         the guest is looking at a number.
         🚨 weeklyDiscount/monthlyDiscount are MULTIPLIERS, not discounts. 0.6
         means the guest pays 60%, i.e. 40% off. Reading it the other way round
         turns a 40% discount into a 60% one. */
      var weeklyMult = parseFloat(bp.getAttribute('data-weekly'));
      var monthlyMult = parseFloat(bp.getAttribute('data-monthly'));
      var extraPerson = +bp.getAttribute('data-extra') || 0;
      var guestsIncl = +bp.getAttribute('data-incl') || 1;

      /* Extras and coupon live on the payment step but change the total, so the
         quote has to know about them. */
      var chosenExtras = [];
      var coupon = null;                       // {code, pct}

      var money = function (n) {
        return '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      var priceBreakdown = function () {
        if (!arrive || !depart) return null;
        var nights = nightsBetween(arrive, depart);
        var n = nights.length;
        var accom = nights.reduce(function (s, d) { return s + ((CAL[d] && CAL[d].price) || 0); }, 0);
        var guests = +(document.getElementById('bp-guests') || {}).value || 1;

        var lines = [];
        lines.push({ label: money(accom / n) + ' average &times; ' + n + ' night' + (n > 1 ? 's' : ''), amt: accom });

        /* Length-of-stay discount, exactly as their engine does it. */
        var stayDisc = 0, stayLabel = '';
        if (n >= 28 && monthlyMult > 0 && monthlyMult < 1) {
          stayDisc = accom * (1 - monthlyMult); stayLabel = 'Monthly discount';
        } else if (n >= 7 && weeklyMult > 0 && weeklyMult < 1) {
          stayDisc = accom * (1 - weeklyMult); stayLabel = 'Weekly discount';
        }
        if (stayDisc > 0) lines.push({ label: stayLabel, amt: -stayDisc, good: true });

        /* Extra guests above the number the nightly rate covers. */
        var extraGuests = Math.max(0, guests - guestsIncl);
        var extraCost = extraGuests * extraPerson * n;
        if (extraCost > 0) {
          lines.push({ label: extraGuests + ' extra guest' + (extraGuests > 1 ? 's' : '') + ' &times; ' + n + ' night' + (n > 1 ? 's' : ''), amt: extraCost });
        }

        if (cleanFee) lines.push({ label: 'Cleaning fee', amt: cleanFee });

        chosenExtras.forEach(function (x) { lines.push({ label: x.name, amt: x.price }); });

        var sub = lines.reduce(function (s, l) { return s + l.amt; }, 0);

        var couponCut = 0;
        if (coupon) {
          couponCut = sub * coupon.pct;
          lines.push({ label: 'Coupon ' + coupon.code, amt: -couponCut, good: true });
        }

        return { nights: n, guests: guests, lines: lines, total: sub - couponCut };
      };

      var renderLines = function (table, q) {
        if (!table || !q) return;
        table.innerHTML = q.lines.map(function (l) {
          return '<tr' + (l.good ? ' class="bp-good"' : '') + '><td>' + l.label + '</td><td>' +
                 (l.amt < 0 ? '&minus;' : '') + money(l.amt) + '</td></tr>';
        }).join('') +
        '<tr class="bp-total"><td>Total</td><td>' + money(q.total) + '</td></tr>';
      };

      var quote = function () {
        var q = priceBreakdown();
        if (!q) { quoteEl.hidden = true; return null; }
        renderLines(linesEl, q);
        quoteEl.hidden = false;
        return q;
      };

      var draw = function () {
        var y = +view.slice(0, 4), m = +view.slice(5, 7);
        monthEl.textContent = MON[m - 1] + ' ' + y;
        var first = new Date(y, m - 1, 1);
        var lead = (first.getDay() + 6) % 7;              // Monday-start grid
        var count = new Date(y, m, 0).getDate();
        var html = '<span class="bp-pad"></span>'.repeat(lead);
        for (var d = 1; d <= count; d++) {
          var key = iso(y, m, d);
          var info = CAL[key];
          var cls = 'bp-day';
          if (!info) cls += ' is-out';
          else if (!info.free) cls += ' is-taken';
          if (key === arrive) cls += ' is-start';
          if (key === depart) cls += ' is-end';
          if (arrive && depart && key > arrive && key < depart) cls += ' is-mid';
          html += '<button type="button" class="' + cls + '" data-d="' + key + '"' +
                  ((!info || !info.free) ? ' disabled' : '') + '>' + d + '</button>';
        }
        daysEl.innerHTML = html;

        var prev = document.querySelector('[data-cal-prev]');
        var next = document.querySelector('[data-cal-next]');
        if (prev) prev.disabled = view <= allDates[0].slice(0, 7);
        if (next) next.disabled = view >= allDates[allDates.length - 1].slice(0, 7);
      };

      daysEl.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-d]');
        if (!b || b.disabled) return;
        var key = b.getAttribute('data-d');

        if (!arrive || (arrive && depart) || key <= arrive) {
          arrive = key; depart = null;
          hintEl.textContent = 'Now pick your departure.';
        } else if (!rangeIsFree(arrive, key)) {
          /* Start again from the day they just pressed. Keeping the old
             arrival left them stuck: every later date also spans the booked
             night, so nothing they clicked would work and nothing said why. */
          arrive = key; depart = null;
          hintEl.textContent = 'Someone has those nights. Starting again from here — pick your departure.';
        } else {
          depart = key;
          hintEl.textContent = '';
        }

        refreshGo();
        draw();
      });

      var refreshGo = function () {
        var q = quote();
        goBtn.disabled = !q;
        goBtn.textContent = q
          ? 'Book ' + q.nights + ' night' + (q.nights > 1 ? 's' : '') + ' — ' + money(q.total)
          : 'Select your dates';
        return q;
      };

      /* Guest count changes the price wherever a listing charges for extra
         people, so the quote has to follow it. */
      var guestSel = document.getElementById('bp-guests');
      if (guestSel) guestSel.addEventListener('change', function () { refreshGo(); });

      var prevBtn = document.querySelector('[data-cal-prev]');
      var nextBtn2 = document.querySelector('[data-cal-next]');
      if (prevBtn) prevBtn.addEventListener('click', function () { view = addMonth(view, -1); draw(); });
      if (nextBtn2) nextBtn2.addEventListener('click', function () { view = addMonth(view, 1); draw(); });

      /* ---- Steps 2 and 3: guest details, then confirmation ----
         🚨 Stored in THIS BROWSER only, so the whole journey can be walked
         end to end without a server and without touching the live booking
         system. A real build replaces this one function with a call that
         takes the payment and writes the reservation into Hostaway. Nothing
         else in the flow changes. */
      var detailsEl = document.getElementById('bp-details');
      var payEl = document.getElementById('bp-payment');
      var doneEl = document.getElementById('bp-done');
      var lines2 = document.getElementById('bp-lines2');
      var linesPay = document.getElementById('bp-lines-pay');
      var lines3 = document.getElementById('bp-lines3');
      var val = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };

      var step = function (n) {
        bp.hidden = n !== 1;
        if (detailsEl) detailsEl.hidden = n !== 2;
        if (payEl) payEl.hidden = n !== 3;
        if (doneEl) doneEl.hidden = n !== 4;
        /* Each step replaces the one before it in the same sticky column, so on
           a phone the top of the new step can end up above the fold. */
        var top = (n === 1 ? bp : n === 2 ? detailsEl : n === 3 ? payEl : doneEl);
        if (top && top.getBoundingClientRect().top < 0) {
          top.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      goBtn.addEventListener('click', function () {
        if (!quote()) return;
        lines2.innerHTML = linesEl.innerHTML;
        step(2);
        var f = document.getElementById('bk-first');
        if (f) f.focus();
      });

      var backBtn2 = document.getElementById('bp-back');
      if (backBtn2) backBtn2.addEventListener('click', function () { step(1); });
      var backBtn3 = document.getElementById('bp-back2');
      if (backBtn3) backBtn3.addEventListener('click', function () { step(2); });

      /* ---- Step 3: the payment page. Extras, coupon and the card, all on
         Guest Guardian's own domain. Repricing runs through the same
         priceBreakdown() the calendar uses, so the number on the card step can
         never drift from the number on the calendar step. */
      var payNowBtn = document.getElementById('bp-paynow');

      var repay = function () {
        var q = priceBreakdown();
        if (!q) return null;
        renderLines(linesPay, q);
        if (payNowBtn) payNowBtn.textContent = 'Pay ' + money(q.total);
        return q;
      };

      document.querySelectorAll('.bp-extra-in').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var name = cb.getAttribute('data-name');
          var price = +cb.getAttribute('data-price') || 0;
          chosenExtras = chosenExtras.filter(function (x) { return x.name !== name; });
          if (cb.checked) chosenExtras.push({ name: name, price: price });
          repay();
        });
      });

      var couponOpen = document.getElementById('bp-coupon-open');
      var couponRow = document.getElementById('bp-coupon-row');
      var couponMsg = document.getElementById('bp-coupon-msg');
      if (couponOpen) couponOpen.addEventListener('click', function () {
        couponRow.hidden = !couponRow.hidden;
        if (!couponRow.hidden) document.getElementById('bp-coupon-code').focus();
      });
      var couponApply = document.getElementById('bp-coupon-apply');
      if (couponApply) couponApply.addEventListener('click', function () {
        var code = val('bp-coupon-code').toUpperCase();
        couponMsg.hidden = false;
        /* One demo code so the mechanism is visible. A real build validates
           against codes Guest Guardian creates, not a list baked into a page. */
        if (code === 'DIRECT10') {
          coupon = { code: code, pct: 0.10 };
          couponMsg.textContent = 'Coupon applied — 10% off.';
          couponMsg.className = 'small bp-good-text';
        } else if (code) {
          coupon = null;
          couponMsg.textContent = 'That code is not recognised.';
          couponMsg.className = 'small muted';
        }
        repay();
      });

      var payBtn = document.getElementById('bp-pay');
      if (payBtn) payBtn.addEventListener('click', function () {
        var ok = true;
        ['bk-first', 'bk-last', 'bk-email', 'bk-phone'].forEach(function (id) {
          var e = document.getElementById(id);
          var bad = !e.value.trim() || (e.type === 'email' && e.value.indexOf('@') < 1);
          e.classList.toggle('is-bad', bad);
          if (bad) ok = false;
        });
        if (!ok) return;

        var fmtd = function (s) {
          var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
          return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        };
        var pq = repay();
        document.getElementById('bp-paysum').textContent =
          fmtd(arrive) + ' to ' + fmtd(depart) + ' · ' + pq.nights + ' night' +
          (pq.nights > 1 ? 's' : '') + ' · ' + pq.guests + ' guest' + (pq.guests > 1 ? 's' : '');
        step(3);
      });

      /* Card number spacing, purely so the field behaves like a real one. The
         value never leaves this function. */
      var ccIn = document.getElementById('bp-cc');
      if (ccIn) ccIn.addEventListener('input', function () {
        var digits = ccIn.value.replace(/\D/g, '').slice(0, 16);
        ccIn.value = (digits.match(/.{1,4}/g) || []).join(' ');
      });

      if (payNowBtn) payNowBtn.addEventListener('click', function () {
        var q = repay();
        var ref = 'GG-' + arrive.slice(2, 4) + arrive.slice(5, 7) + arrive.slice(8, 10) +
                  '-' + String(bp.getAttribute('data-listing')).slice(-3);

        var booking = {
          ref: ref,
          listing: bp.getAttribute('data-listing'),
          property: document.querySelector('h1.h2') ? document.querySelector('h1.h2').textContent.trim() : '',
          arrive: arrive, depart: depart, nights: q.nights, total: q.total,
          guests: document.getElementById('bp-guests').value,
          first: val('bk-first'), last: val('bk-last'),
          email: val('bk-email'),
          phone: (val('bk-cc') + ' ' + val('bk-phone')).trim(),
          notes: val('bk-notes'),
          extras: chosenExtras.map(function (x) { return x.name; }).join(', '),
          coupon: coupon ? coupon.code : '',
          billing: [val('bp-addr'), val('bp-addr2'), val('bp-city'), val('bp-state'),
                    val('bp-post'), val('bp-country')].filter(Boolean).join(', '),
          optin: document.getElementById('bp-optin') && document.getElementById('bp-optin').checked ? 'yes' : 'no',
          madeAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        };
        /* 🚨 Note what is NOT in that object: no card number, no expiry, no CVC.
           The card fields are never read, never stored and never relayed. */
        try {
          var all = JSON.parse(localStorage.getItem('gg_bookings') || '[]');
          all = all.filter(function (b) { return b.ref !== ref; });
          all.push(booking);
          localStorage.setItem('gg_bookings', JSON.stringify(all));
        } catch (e) {}

        var fmt = function (s) {
          var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
          return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
        };
        document.getElementById('bp-doneline').textContent =
          fmt(arrive) + ' to ' + fmt(depart) + ' · ' + booking.guests + ' guest' + (booking.guests > 1 ? 's' : '');
        renderLines(lines3, q);
        document.getElementById('bp-ref').textContent = ref;

        /* ---- The confirmation email the guest would receive.
           Built here so there is ONE version of the wording: the same text is
           rendered on screen and relayed to Peter, so what he reads in his inbox
           is what the guest would have read. */
        var mailSubject = 'Your stay at ' + booking.property + ' — ' + ref;
        var mailBody =
          'Hi ' + booking.first + ',\n\n' +
          'You are booked in. Here are the details.\n\n' +
          booking.property + '\n' +
          fmt(arrive) + ' to ' + fmt(depart) + '\n' +
          q.nights + ' night' + (q.nights > 1 ? 's' : '') + ' · ' + booking.guests +
            ' guest' + (booking.guests > 1 ? 's' : '') + '\n' +
          'Reference ' + ref + '\n' +
          'Total paid ' + money(q.total) + '\n' +
          (booking.extras ? 'Added to your stay: ' + booking.extras + '\n' : '') +
          '\nCheck in from ' + (bp.getAttribute('data-checkin') || '2') + ':00, check out by ' +
            (bp.getAttribute('data-checkout') || '10') + ':00.\n\n' +
          'We will be in touch before you arrive with everything you need. ' +
          'Reply to this email if anything changes, or call us on 08 8239 1787.\n\n' +
          'See you soon,\nGuest Guardian';

        var to = document.getElementById('bp-mail-to');
        var subj = document.getElementById('bp-mail-subj');
        var text = document.getElementById('bp-mail-text');
        if (to) to.textContent = booking.email;
        if (subj) subj.textContent = mailSubject;
        if (text) text.textContent = mailBody;

        step(4);

        /* Tell Peter a demo booking came through — same relay as the estimator,
           his inbox only. Contact details, the stay and a copy of the guest's
           confirmation. Never the card. */
        relayLead('direct booking', {
          name: booking.first + ' ' + booking.last,
          email: booking.email, phone: booking.phone,
          message: booking.notes,
        }, {
          Property: booking.property, Reference: ref,
          Dates: arrive + ' to ' + depart,
          Nights: String(q.nights), Guests: booking.guests,
          Extras: booking.extras || 'none', Coupon: booking.coupon || 'none',
          Total: money(q.total),
          'Billing address': booking.billing || 'not given',
          'Marketing opt-in': booking.optin,
          'Guest confirmation (NOT sent to them)': mailSubject + '\n\n' + mailBody,
        });
      });

      draw();

      /* ---- Arriving from the Book Your Stay search.
         The guest has already said when and how many, so asking again is
         asking twice. Dates are re-checked against this property's own
         calendar rather than trusted from the URL: the search page could be a
         stale tab, or someone could type anything in. If they do not hold up,
         the calendar just opens on that month with nothing selected. */
      try {
        var qs = new URLSearchParams(location.search);
        var qa = qs.get('arrive'), qd = qs.get('depart'), qg = qs.get('guests');

        if (qg && guestSel) {
          var wanted = String(Math.min(parseInt(qg, 10) || 1, +bp.getAttribute('data-max') || 1));
          if (Array.prototype.some.call(guestSel.options, function (o) { return o.value === wanted; })) {
            guestSel.value = wanted;
          }
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(qa || '') && /^\d{4}-\d{2}-\d{2}$/.test(qd || '') && qd > qa) {
          view = qa.slice(0, 7);
          if (CAL[qa] && rangeIsFree(qa, qd)) {
            arrive = qa; depart = qd;
            hintEl.textContent = 'Carried over from your search. Change any date to adjust.';
            refreshGo();
          } else {
            hintEl.textContent = 'Those nights have gone since you searched. Pick your arrival.';
          }
          draw();
        }
      } catch (e) {}
    }
  }

  /* ==========================================================================
     OWNER STATEMENTS.

     Renders one month, itemised the way their owners already receive it, from
     figures that came out of Nick's own formula at build time. Nothing is
     calculated here beyond formatting: the maths lives in gg_statements.py so
     there is exactly ONE place it can be wrong.
     ========================================================================== */
  var stmtBody = document.getElementById('stmt-body');
  if (stmtBody && window.GG_STMT) {
    var S = window.GG_STMT;
    var sel = document.getElementById('stmt-month');
    var ML = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May',
               '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October',
               '11': 'November', '12': 'December' };
    var lab = function (ym) { return ML[ym.slice(5, 7)] + ' ' + ym.slice(0, 4); };
    var $ = function (n) {
      return '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    var day = function (s) {
      if (!s) return '';
      var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    };

    var draw = function (ym) {
      var m = S.months[ym];
      if (!m) { stmtBody.innerHTML = ''; return; }

      /* Every booking, then the run down to what the owner is paid. The
         deduction rows are negative and read as negative, because a statement
         that hides its subtractions is the reason people distrust them. */
      var rows = m.lines.map(function (l) {
        return '<tr><td><b>' + day(l.arrive) + ' to ' + day(l.depart) + '</b>' +
               '<span class="stmt-sub">' + l.nights + ' night' + (l.nights === 1 ? '' : 's') +
               (l.channel === 'airbnbOfficial' ? ' &middot; Airbnb' : l.channel ? ' &middot; ' + l.channel : '') +
               (l.flag ? ' &middot; <span class="stmt-flag">check this one</span>' : '') +
               '</span></td><td class="num">' + $(l.total) + '</td>' +
               '<td class="num neg">&minus;' + $(l.fee) + '</td>' +
               '<td class="num">' + $(l.payout) + '</td></tr>';
      }).join('');

      var line = function (label, amt, cls) {
        return '<tr class="' + (cls || '') + '"><td>' + label + '</td><td class="num">' +
               (amt < 0 ? '&minus;' : '') + $(amt) + '</td></tr>';
      };

      stmtBody.innerHTML =
        '<p class="stmt-period">' + lab(ym) + ' &middot; ' + m.bookings + ' booking' +
          (m.bookings === 1 ? '' : 's') + ' &middot; ' + m.nights + ' night' + (m.nights === 1 ? '' : 's') + '</p>' +
        '<div class="tbl-wrap"><table class="otbl stmt-tbl">' +
          '<thead><tr><th>Stay</th><th class="num">Booking</th><th class="num">Channel fee</th><th class="num">Received</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div>' +
        '<table class="otbl stmt-run">' +
          line('Received from the channel', m.payout) +
          line('Cleaning', -m.cleaning, 'neg-row') +
          line('Net', m.net, 'stmt-sub-total') +
          line('Management, 22% including GST', -m.commission, 'neg-row') +
          line('Linen and amenities', -m.linen, 'neg-row') +
          '<tr class="stmt-total"><td>Paid to you</td><td class="num">' + $(m.ownerAfter) + '</td></tr>' +
        '</table>';
    };

    if (sel) {
      sel.addEventListener('change', function () { draw(sel.value); });
      draw(sel.value);
    }

    /* PDF is the browser's own print-to-PDF against a print stylesheet. It
       needs no server, it is the same document on every machine, and it keeps
       working the day this moves onto their real site. */
    var printBtn = document.querySelector('[data-stmt-print]');
    if (printBtn) printBtn.addEventListener('click', function () {
      document.body.classList.add('printing-stmt');
      window.print();
      setTimeout(function () { document.body.classList.remove('printing-stmt'); }, 400);
    });

    /* The whole financial year, as a spreadsheet their accountant can open. */
    var fyBtn = document.querySelector('[data-fy-csv]');
    if (fyBtn) fyBtn.addEventListener('click', function () {
      var head = ['Month', 'Arrive', 'Depart', 'Nights', 'Channel', 'Booking total',
                  'Channel fee', 'Received', 'Cleaning', 'Net', 'Management', 'Linen', 'Paid to you'];
      var rows = [head];
      (S.fy || []).forEach(function (ym) {
        var m = S.months[ym];
        if (!m) return;
        m.lines.forEach(function (l) {
          rows.push([lab(ym), l.arrive, l.depart, l.nights,
                     l.channel === 'airbnbOfficial' ? 'Airbnb' : (l.channel || ''),
                     l.total, l.fee, l.payout, l.cleaning, l.net, l.commission, l.linen, l.ownerAfter]);
        });
      });
      /* Quote every field: property names and dates both contain commas. */
      var csv = rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      a.download = 'guest-guardian-statements-FY2026-27.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    });
  }

  /* ==========================================================================
     THE STATEMENT DOCUMENT (statement.html)

     One page that serves every owner and every period. ?p= picks the property,
     ?m= picks a month or `fy` for the financial year to date. Both the owner
     portal and Guest Guardian's back office link here, so there is one document
     and one set of numbers rather than two that can drift apart.
     ========================================================================== */
  var docEl = document.getElementById('doc');
  if (docEl && window.GG_DOC) {
    var D = window.GG_DOC;
    var qs = new URLSearchParams(location.search);
    var pid = qs.get('p') || Object.keys(D.properties)[0];
    var prop = D.properties[pid];

    var MLD = { '01': 'January', '02': 'February', '03': 'March', '04': 'April', '05': 'May',
                '06': 'June', '07': 'July', '08': 'August', '09': 'September', '10': 'October',
                '11': 'November', '12': 'December' };
    var mny = function (n) {
      return '$' + Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    var dshort = function (s) {
      if (!s) return '';
      var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    };

    /* The Australian financial year the given month sits in: 1 Jul to 30 Jun. */
    var fyOf = function (ym) {
      var y = +ym.slice(0, 4), m = +ym.slice(5, 7);
      return m >= 7 ? y : y - 1;
    };
    var months = prop ? Object.keys(prop.months).sort() : [];
    var latest = months[months.length - 1];
    var fyStart = latest ? fyOf(latest) : new Date().getUTCFullYear();
    var fyMonths = months.filter(function (ym) { return fyOf(ym) === fyStart; });

    var sumOf = function (list, k) {
      return list.reduce(function (s, ym) { return s + (prop.months[ym][k] || 0); }, 0);
    };
    var linesOf = function (list) {
      return list.reduce(function (a, ym) {
        return a.concat(prop.months[ym].lines.map(function (l) {
          var c = {}; for (var k in l) c[k] = l[k]; c._ym = ym; return c;
        }));
      }, []);
    };

    /* Period selector: the financial year first, because an owner downloading a
       statement at tax time wants the year, not to click twelve months. */
    var sel = document.getElementById('doc-period');
    if (sel) {
      sel.innerHTML =
        '<option value="fy">Financial year ' + fyStart + '/' + String(fyStart + 1).slice(2) + ' to date</option>' +
        months.slice().reverse().map(function (ym) {
          return '<option value="' + ym + '">' + MLD[ym.slice(5, 7)] + ' ' + ym.slice(0, 4) + '</option>';
        }).join('');
      sel.value = qs.get('m') || 'fy';
    }

    var render = function (period) {
      if (!prop) { docEl.innerHTML = '<p>No statement for that property.</p>'; return; }
      var isFY = period === 'fy';
      var list = isFY ? fyMonths : [period];
      if (!isFY && !prop.months[period]) { docEl.innerHTML = '<p>No statement for that period.</p>'; return; }

      var lines = linesOf(list);
      var t = function (k) { return sumOf(list, k); };
      var title = isFY
        ? 'Financial year ' + fyStart + '/' + String(fyStart + 1).slice(2) + ', to date'
        : MLD[period.slice(5, 7)] + ' ' + period.slice(0, 4);
      var range = isFY && fyMonths.length
        ? '1 July ' + fyStart + ' to ' + dshort(prop.months[fyMonths[fyMonths.length - 1]].lines.slice(-1)[0].depart)
        : '';

      var rows = lines.map(function (l) {
        return '<tr>' +
          '<td>' + dshort(l.arrive) + '<span class="d-sub">to ' + dshort(l.depart) + '</span></td>' +
          '<td class="num">' + l.nights + '</td>' +
          '<td>' + (l.channel === 'airbnbOfficial' ? 'Airbnb' : (l.channel || 'Direct')) + '</td>' +
          '<td class="num">' + mny(l.total) + '</td>' +
          '<td class="num">' + mny(l.fee) + '</td>' +
          '<td class="num">' + mny(l.cleaning) + '</td>' +
          '<td class="num">' + mny(l.commission) + '</td>' +
          '<td class="num">' + mny(l.linen) + '</td>' +
          '<td class="num strong">' + mny(l.ownerAfter) + '</td>' +
        '</tr>';
      }).join('');

      var run = function (label, amt, cls) {
        return '<tr class="' + (cls || '') + '"><td>' + label + '</td><td class="num">' +
          (amt < 0 ? '&minus;' : '') + mny(amt) + '</td></tr>';
      };

      docEl.innerHTML =
        '<header class="doc-head">' +
          '<div class="doc-brand"><span class="doc-mark"></span><div>' +
            '<div class="doc-biz">Guest <b>Guardian</b></div>' +
            '<div class="doc-tag">Short-stay management &middot; Adelaide</div>' +
          '</div></div>' +
          '<div class="doc-meta">' +
            '<div class="doc-kind">Owner statement</div>' +
            '<div class="doc-period">' + title + '</div>' +
            (range ? '<div class="doc-range">' + range + '</div>' : '') +
          '</div>' +
        '</header>' +

        '<section class="doc-to">' +
          '<div><span>Property</span><b>' + (prop.name || '') + '</b></div>' +
          '<div><span>Prepared for</span><b>' + (prop.owner || 'Owner') + '</b></div>' +
          '<div><span>Bookings</span><b>' + lines.length + '</b></div>' +
          '<div><span>Nights</span><b>' + lines.reduce(function (s, l) { return s + (+l.nights || 0); }, 0) + '</b></div>' +
        '</section>' +

        '<div class="doc-headline"><span>Paid to you</span><b>' + mny(t('ownerAfter')) + '</b></div>' +

        '<table class="doc-tbl">' +
          '<thead><tr><th>Stay</th><th class="num">Nights</th><th>Channel</th><th class="num">Booking</th>' +
          '<th class="num">Channel fee</th><th class="num">Cleaning</th><th class="num">Management</th>' +
          '<th class="num">Linen</th><th class="num">To you</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +

        '<table class="doc-run">' +
          run('Received from the channels', t('payout')) +
          run('Cleaning', -t('cleaning'), 'sub') +
          run('Net', t('net'), 'mid') +
          run('Management, ' + Math.round(prop.commission * 100) + '% including GST', -t('commission'), 'sub') +
          run('Linen and amenities', -t('linen'), 'sub') +
          '<tr class="tot"><td>Paid to you</td><td class="num">' + mny(t('ownerAfter')) + '</td></tr>' +
        '</table>' +

        '<section class="doc-foot">' +
          '<p><b>' + D.business.name + '</b> &middot; ABN ' + D.business.abn + ' &middot; ' +
            D.business.phone + ' &middot; ' + D.business.email + '</p>' +
          '<p>All amounts include GST. Channel fees are charged by the booking platform. ' +
          'A booking is counted in the month the stay begins.</p>' +
          '<p class="doc-demo">Concept document produced for review. Figures are read from the ' +
          'Guest Guardian booking system.</p>' +
        '</section>';
    };

    if (sel) {
      sel.addEventListener('change', function () {
        render(sel.value);
        /* Keep the address bar honest so the document can be linked or resent. */
        var u = new URL(location.href);
        u.searchParams.set('p', pid); u.searchParams.set('m', sel.value);
        history.replaceState(null, '', u);
      });
    }
    render((sel && sel.value) || 'fy');

    var dp = document.getElementById('doc-print');
    if (dp) dp.addEventListener('click', function () { window.print(); });
  }

  /* Footer year */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
