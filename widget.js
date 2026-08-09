/* Guest Guardian property widget.
   Paste on any website:
     <div data-gg-stay="the-bungalow"></div>
     <script src="https://guestguardian-concept.mplaunch.com.au/widget.js" async></script>
   Add data-gg-brand="show" to credit Guest Guardian. Default is white label. */
(function () {
  var DATA = [{"slug":"the-bungalow","name":"The Bungalow","beds":3,"baths":2,"sleeps":7,"blurb":"A three bedroom home built for groups who actually want to spend time together. Full kitchen, outdoor BBQ and a games room that keeps everyone occupied when the weather turns.","img":"https://bookingenginecdn.hostaway.com/listing/179273-472310-mdLS2PR8--9qDCkDj1B--87D6N4d9lesKLtJddjGktk04-695c087b43b9a?width=1200&height=630&quality=70&format=jpeg&v=2","url":"https://guestguardian-concept.mplaunch.com.au/stay-the-bungalow.html"},{"slug":"the-cabana","name":"The Cabana","beds":2,"baths":1,"sleeps":5,"blurb":"Two bedrooms, a private pool and a spa. The one guests book when the trip is the point rather than the base, and the one that holds its nightly rate hardest through summer.","img":"https://bookingenginecdn.hostaway.com/listing/179273-472311-7GdLxE4s5MHnS05leY1a--twCPHZeNzlXkdf--v6bwNH8-695b580d28636?width=1200&height=630&quality=70&format=jpeg&v=2","url":"https://guestguardian-concept.mplaunch.com.au/stay-the-cabana.html"},{"slug":"the-bungalow-and-the-cabana","name":"The Bungalow and The Cabana","beds":5,"baths":3,"sleeps":12,"blurb":"Both homes taken together for up to twelve guests, with the pool and spa included. This is the booking for a wedding party, a milestone birthday or two families travelling as one.","img":"https://bookingenginecdn.hostaway.com/listing/179273-472312-WHckDgCCL6WwgMiCBrzBdivjz7uEJKQgdoM-QNSJ-cU-695b57ce8756e?width=1200&height=630&quality=70&format=jpeg&v=2","url":"https://guestguardian-concept.mplaunch.com.au/stay-the-bungalow-and-the-cabana.html"},{"slug":"victoria-house","name":"Victoria House","beds":3,"baths":1,"sleeps":7,"blurb":"Three bedrooms, a sunroom and a BBQ area, set up for families and longer stays. Comfortable, well presented and easy to settle into for a week rather than a weekend.","img":"https://bookingenginecdn.hostaway.com/listing/179273-495920-xl2qjZGiS7Zeppe2rz77atkHgkbXaXUM--37l7gzQz8U-69b1528e8af7f?width=1200&height=630&quality=70&format=jpeg&v=2","url":"https://guestguardian-concept.mplaunch.com.au/stay-victoria-house.html"}];
  var HOST = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/[^/]*$/, '');
    return 'https://guestguardian-concept.mplaunch.com.au/';
  })();

  function css(el, o) { for (var k in o) el.style[k] = o[k]; }

  function build(slot) {
    var slug = slot.getAttribute('data-gg-stay');
    var showBrand = slot.getAttribute('data-gg-brand') === 'show';
    var p = null;
    for (var i = 0; i < DATA.length; i++) if (DATA[i].slug === slug) p = DATA[i];
    if (!p) return;

    var card = document.createElement('div');
    /* font-family: inherit is the whole trick — the card takes the host
       page's typography instead of carrying its own. */
    css(card, {
      font: 'inherit', maxWidth: '560px', border: '1px solid rgba(0,0,0,.14)',
      borderRadius: '10px', overflow: 'hidden', background: 'transparent',
    });

    var img = document.createElement('img');
    img.src = p.img; img.alt = p.name; img.loading = 'lazy';
    css(img, { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' });
    card.appendChild(img);

    var body = document.createElement('div');
    css(body, { padding: '18px 20px 20px' });

    if (showBrand) {
      var brand = document.createElement('div');
      brand.textContent = 'Managed by Guest Guardian';
      css(brand, { font: 'inherit', fontSize: '11px', letterSpacing: '.11em',
        textTransform: 'uppercase', opacity: '.6', marginBottom: '8px' });
      body.appendChild(brand);
    }

    var h = document.createElement('div');
    h.textContent = p.name;
    css(h, { font: 'inherit', fontSize: '1.35em', lineHeight: '1.2', marginBottom: '8px' });
    body.appendChild(h);

    var meta = document.createElement('div');
    css(meta, { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0 0 12px' });
    [p.beds + ' bedroom' + (p.beds > 1 ? 's' : ''),
     p.baths + ' bathroom' + (p.baths > 1 ? 's' : ''),
     'Sleeps ' + p.sleeps].forEach(function (t) {
      var s = document.createElement('span');
      s.textContent = t;
      css(s, { font: 'inherit', fontSize: '.8em', padding: '3px 10px',
        border: '1px solid rgba(0,0,0,.14)', borderRadius: '100px', opacity: '.8' });
      meta.appendChild(s);
    });
    body.appendChild(meta);

    var blurb = document.createElement('p');
    blurb.textContent = p.blurb;
    css(blurb, { font: 'inherit', fontSize: '.92em', lineHeight: '1.6', margin: '0 0 16px', opacity: '.85' });
    body.appendChild(blurb);

    var cta = document.createElement('a');
    cta.href = HOST + 'stay-' + p.slug + '.html';
    cta.textContent = showBrand ? 'Check dates & book' : 'Check availability';
    css(cta, { font: 'inherit', display: 'block', textAlign: 'center', padding: '13px 20px',
      borderRadius: '6px', background: 'currentColor', textDecoration: 'none', fontSize: '.95em' });
    /* The button borrows the page's own text colour for its background and
       punches the label out of it, so it lands in the host's palette rather
       than ours. */
    var inner = document.createElement('span');
    inner.textContent = cta.textContent;
    cta.textContent = '';
    css(inner, { color: getComputedStyle(document.body).backgroundColor || '#fff', font: 'inherit' });
    cta.appendChild(inner);
    body.appendChild(cta);

    if (showBrand) {
      var foot = document.createElement('div');
      foot.innerHTML = 'Booked and managed by <a href="' + HOST + '" style="color:inherit">Guest Guardian</a>';
      css(foot, { font: 'inherit', fontSize: '.78em', textAlign: 'center', marginTop: '10px', opacity: '.6' });
      body.appendChild(foot);
    }

    card.appendChild(body);
    slot.appendChild(card);
    slot.setAttribute('data-gg-done', '1');
  }

  function run() {
    var slots = document.querySelectorAll('[data-gg-stay]:not([data-gg-done])');
    for (var i = 0; i < slots.length; i++) build(slots[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
