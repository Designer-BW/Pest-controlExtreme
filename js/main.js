/* Extreme Intelligent Pest Control — prototype interactions (vanilla JS) */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.add('is-loading');

  /* ---------- Preloader ---------- */
  const hidePreloader = () => {
    document.getElementById('preloader')?.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
  };
  window.addEventListener('load', () => setTimeout(hidePreloader, 400));
  setTimeout(hidePreloader, 4000); // safety net

  /* ---------- Prototype: nav links are display-only ---------- */
  document.querySelectorAll('.nav-dummy').forEach(a =>
    a.addEventListener('click', e => e.preventDefault())
  );

  /* ---------- Split headings into words ---------- */
  document.querySelectorAll('.split-reveal').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words
      .map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`)
      .join(' ');
  });

  /* ---------- Reveal delays ---------- */
  document.querySelectorAll('[data-delay]').forEach(el =>
    el.style.setProperty('--d', `${el.dataset.delay}ms`)
  );

  /* ---------- Counters ---------- */
  const fmt = n => n.toLocaleString('en-BW');
  const runCounter = el => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseInt(el.dataset.count, 10);
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const dur = 1800;
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- IntersectionObserver for all scroll effects ---------- */
  // clip-path hides .img-reveal completely, so we observe its parent instead
  const proxyTargets = new Map();
  const activate = el => {
    if (el.hasAttribute('data-count')) runCounter(el);
    else el.classList.add('is-in');
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      (proxyTargets.get(el) || [el]).forEach(activate);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('[data-reveal], .split-reveal, [data-count]').forEach(el => io.observe(el));
  document.querySelectorAll('.img-reveal').forEach(el => {
    const parent = el.parentElement;
    if (!proxyTargets.has(parent)) { proxyTargets.set(parent, []); io.observe(parent); }
    proxyTargets.get(parent).push(el);
  });

  // fallback: reveal anything still hidden once the visitor reaches the page bottom
  const revealRemaining = () => {
    document.querySelectorAll('[data-reveal]:not(.is-in), .split-reveal:not(.is-in), .img-reveal:not(.is-in)')
      .forEach(el => el.classList.add('is-in'));
    document.querySelectorAll('[data-count]').forEach(runCounter);
  };

  /* ---------- Sticky header (hide on scroll down, show on up) ---------- */
  const header = document.getElementById('siteHeader');
  const toTop = document.getElementById('toTop');
  const ring = toTop?.querySelector('circle');
  const RING_LEN = 150.8;
  let lastY = window.scrollY;

  /* ---------- Parallax ---------- */
  const parallaxEls = [...document.querySelectorAll('[data-parallax]')];

  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;

    // header
    const stickAt = vh * 0.6;
    if (y > stickAt) {
      header.classList.add('is-sticky');
      header.classList.toggle('is-hidden', y > lastY && y > vh);
    } else {
      header.classList.remove('is-sticky', 'is-hidden');
    }
    lastY = y;

    // back-to-top + progress ring
    const max = document.documentElement.scrollHeight - vh;
    const progress = max > 0 ? y / max : 0;
    toTop.classList.toggle('is-visible', y > vh * 0.5);
    if (ring) ring.style.strokeDashoffset = RING_LEN - RING_LEN * progress;
    if (progress > 0.985) revealRemaining();

    // parallax
    if (!reduceMotion) {
      parallaxEls.forEach(el => {
        const rect = el.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const speed = parseFloat(el.dataset.parallax) || 0.2;
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Custom cursor (fine pointers only) ---------- */
  if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    const dot = document.querySelector('.cursor-dot');
    const ringEl = document.querySelector('.cursor-ring');
    let mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      document.body.classList.add('cursor-on');
    });
    document.addEventListener('mouseleave', () => document.body.classList.remove('cursor-on'));
    const follow = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ringEl.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(follow);
    };
    follow();
    document.querySelectorAll('a, button, .service-card, .post-card, .price-card').forEach(el => {
      el.addEventListener('mouseenter', () => ringEl.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ringEl.classList.remove('is-hover'));
    });
  }

  /* ---------- Pricing toggle ---------- */
  const sw = document.getElementById('billingSwitch');
  sw?.addEventListener('click', () => {
    const annual = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(annual));
    document.querySelectorAll('.billing-toggle [data-label]').forEach(s =>
      s.classList.toggle('is-active', (s.dataset.label === 'annual') === annual)
    );
    document.querySelectorAll('.price').forEach(p => {
      const amt = p.querySelector('.amount');
      const per = p.querySelector('.per');
      amt.classList.add('flip');
      setTimeout(() => {
        amt.textContent = fmt(parseInt(annual ? amt.dataset.annual : amt.dataset.monthly, 10));
        per.textContent = annual ? '/year' : '/month';
        amt.classList.remove('flip');
      }, 250);
    });
  });

  /* ---------- Testimonial slider (scroll-snap) ---------- */
  const slider = document.getElementById('tSlider');
  const dotsWrap = document.getElementById('tDots');
  if (slider) {
    const cards = [...slider.children];
    cards.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
    });
    const dots = [...dotsWrap.children];
    const current = () => {
      const left = slider.scrollLeft;
      return cards.reduce((best, c, i) =>
        Math.abs(c.offsetLeft - slider.offsetLeft - left) <
        Math.abs(cards[best].offsetLeft - slider.offsetLeft - left) ? i : best, 0);
    };
    const goTo = i => {
      const idx = (i + cards.length) % cards.length;
      slider.scrollTo({ left: cards[idx].offsetLeft - slider.offsetLeft, behavior: 'smooth' });
    };
    const sync = () => dots.forEach((d, i) => d.classList.toggle('active', i === current()));
    slider.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    sync();

    const atEnd = () => slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 4;
    document.getElementById('tNext')?.addEventListener('click', () => atEnd() ? goTo(0) : goTo(current() + 1));
    document.getElementById('tPrev')?.addEventListener('click', () => goTo(current() - 1));

    if (!reduceMotion) {
      let auto = setInterval(() => atEnd() ? goTo(0) : goTo(current() + 1), 5000);
      slider.addEventListener('pointerenter', () => clearInterval(auto));
      slider.addEventListener('pointerleave', () => {
        clearInterval(auto);
        auto = setInterval(() => atEnd() ? goTo(0) : goTo(current() + 1), 5000);
      });
    }
  }

  /* ---------- Prototype forms ---------- */
  const toast = document.getElementById('formToast');
  document.getElementById('bookingForm')?.addEventListener('submit', e => {
    e.preventDefault();
    toast.textContent = 'Thanks! This is a prototype — in the live site our team would call you back within the hour.';
    e.target.reset();
  });
  document.getElementById('newsletterForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    input.value = '';
    input.placeholder = 'Subscribed (prototype)';
  });

  /* ---------- Footer year ---------- */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
