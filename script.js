// Theme handling
(function theme() {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const PREF_KEY = 'theme-preference-v1';

  function getPreferred() {
    const stored = localStorage.getItem(PREF_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem(PREF_KEY, mode); } catch (e) {}
  }

  applyTheme(getPreferred());

  toggle?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
})();

// Mobile nav toggle
(function nav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
})();

// Over-hero header (transparent while over hero)
(function overHeroHeader() {
  const header = document.querySelector('.site-header');
  const hero = document.getElementById('hero');
  if (!header || !hero) return;

  // Use IntersectionObserver to detect when the hero is beneath the header
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const isOverHero = entry.isIntersecting && entry.intersectionRect.height > 0 && entry.boundingClientRect.top <= (header.offsetHeight + 20);
      header.classList.toggle('over-hero', isOverHero);
    });
  }, { rootMargin: `-${(document.querySelector('.site-header')?.offsetHeight || 64) + 10}px 0px 0px 0px`, threshold: [0, 0.01, 0.1] });

  io.observe(hero);
})();

// Smooth scroll fix for sticky header (offset)
(function smoothAnchors() {
  const header = document.querySelector('.site-header');
  const offset = () => (header ? header.offsetHeight + 12 : 0);
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#' || id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - offset();
      window.scrollTo({ top, behavior: 'smooth' });
      history.pushState(null, '', id);
    });
  });
})();

// Reveal on scroll
(function revealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || items.length === 0) {
    items.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
})();

// Footer year
(function year() {
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();

// POW: interactive media switcher with auto-rotate
(function powSwitcher() {
  const section = document.getElementById('pow');
  if (!section) return;

  const img = section.querySelector('#pow-image');
  const linkEl = section.querySelector('#pow-link');
  const items = Array.from(section.querySelectorAll('.pow-item'));
  if (!img || items.length === 0) return;

  // Build the image and link lists from data attributes (keep indexes aligned)
  const sources = items.map((li) => li.getAttribute('data-image'));
  const links = items.map((li) => li.getAttribute('data-link'));
  let index = Math.max(0, items.findIndex(li => li.classList.contains('active')));
  if (index < 0) index = 0;

  function setActive(i) {
    index = (i + items.length) % items.length;
    const src = sources[index];
    if (src) {
      img.src = src;
    }
    // Update link target if provided; otherwise disable the anchor
    const href = links[index];
    if (linkEl) {
      if (href && href !== '#') {
        linkEl.href = href;
        linkEl.style.pointerEvents = '';
        linkEl.setAttribute('aria-disabled', 'false');
      } else {
        linkEl.href = '#';
        linkEl.style.pointerEvents = 'none';
        linkEl.setAttribute('aria-disabled', 'true');
      }
    }
    items.forEach((li, idx) => {
      li.classList.toggle('active', idx === index);
      // apply callout pill style to the active item
      li.classList.toggle('callout', idx === index);
      li.setAttribute('aria-current', idx === index ? 'true' : 'false');
    });
  }

  function next() { setActive(index + 1); }

  // Click and keyboard interactions
  items.forEach((li, idx) => {
    li.addEventListener('click', () => {
      setActive(idx);
      resetTimer();
    });
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActive(idx);
        resetTimer();
      }
    });
  });

  // Auto-rotate every 3 seconds
  let timer = null;
  function startTimer() {
    stopTimer();
    timer = setInterval(next, 3000);
  }
  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function resetTimer() { startTimer(); }

  // Pause on hover/focus to avoid jank while user reads
  section.addEventListener('mouseenter', stopTimer);
  section.addEventListener('mouseleave', startTimer);
  section.addEventListener('focusin', stopTimer);
  section.addEventListener('focusout', startTimer);

  // Initialize
  setActive(index);
  startTimer();
})();

// PDF Modal viewer
(function pdfModal() {
  const modal = document.getElementById('pdf-modal');
  const frame = document.getElementById('pdf-frame');
  const imgView = document.getElementById('img-view');
  const fallback = document.getElementById('pdf-fallback');
  const closeBtn = document.querySelector('.modal-close');
  const openers = document.querySelectorAll('.open-pdf');
  const imageOpeners = document.querySelectorAll('.open-image');
  if (!modal || !frame || !fallback) return;

  function toEmbeddable(url) {
    const clean = url.trim();
    // Google Docs document -> use preview viewer for embedding
    const docsMatch = clean.match(/https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docsMatch) {
      const id = docsMatch[1];
      return `https://docs.google.com/document/d/${id}/preview`;
    }
    // Google Drive file link -> use preview endpoint
    const driveMatch = clean.match(/https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const id = driveMatch[1];
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    // Direct PDF stays as-is
    if (/\.pdf($|\?)/i.test(clean)) return clean;
    // Fallback to Google Docs Viewer for other doc types
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(clean)}`;
  }

  function openModal(url) {
    // Reset content
    frame.src = '';
    fallback.hidden = true;
    if (imgView) {
      imgView.src = '';
      imgView.setAttribute('hidden', '');
    }

    if (url && typeof url === 'string' && url.trim().length > 0) {
      frame.removeAttribute('hidden');
      frame.src = toEmbeddable(url);
    } else {
      frame.setAttribute('hidden', '');
      fallback.hidden = false;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // trap focus to close button for simplicity
    closeBtn?.focus();
    document.addEventListener('keydown', onKey);
  }

  function openImage(url) {
    // Reset content
    frame.src = '';
    frame.setAttribute('hidden', '');
    fallback.hidden = true;
    if (imgView && url) {
      imgView.removeAttribute('hidden');
      imgView.src = url;
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    frame.src = '';
    frame.removeAttribute('hidden');
    if (imgView) {
      imgView.src = '';
      imgView.setAttribute('hidden', '');
    }
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  openers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = btn.getAttribute('data-pdf') || '';
      openModal(url);
    });
  });

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Image openers
  imageOpeners.forEach(img => {
    img.addEventListener('click', (e) => {
      e.preventDefault();
      const src = img.getAttribute('data-img') || img.getAttribute('src');
      if (src) openImage(src);
    });
  });
})();
