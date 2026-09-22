/* Isaac Hohl — site behavior.
   Vanilla reimplementation of the interactions the design-canvas runtime drove:
   menu overlay, production sheet carousel, click-to-play reels, scroll reveal,
   and the desktop parallax name. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SHOWS = [
    { t: 'West Side Story', r: 'Action', m: 'Historic Palace Theatre · dir. Trisha Stacey', base: 'west-side-story', n: 9 },
    { t: 'Godspell', r: 'Judas', m: 'NU Theatre · dir. Robyn Lee', base: 'godspell', n: 9 },
    { t: 'Witch', r: 'Scratch', m: 'NU Theatre · dir. Steve Braddock', base: 'witch', n: 11 },
    { t: 'Company', r: 'Harry', m: 'NU Theatre · dir. Steve Braddock', base: 'company', n: 9 },
    { t: 'Return to the Forbidden Planet', r: 'Cookie the Cook', m: 'NU Theatre · dir. Steve Vaughan', base: 'forbidden-planet', n: 8 },
    { t: 'RENT', r: 'Benjamin Coffin III', m: 'NU Theatre · dir. Steve Braddock', base: 'rent', n: 6 }
  ];

  function plates(show) {
    var out = [];
    for (var i = 0; i < show.n; i++) {
      out.push('img/w/' + show.base + (i ? '-' + (i + 1) : '') + '.jpg');
    }
    return out;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  /* Keeps Tab inside an open overlay and restores focus when it closes. */
  function Trap(el) {
    this.el = el;
    this.prev = null;
    var self = this;
    this.onKey = function (e) {
      if (e.key !== 'Tab') return;
      var items = Array.prototype.filter.call(
        self.el.querySelectorAll(FOCUSABLE),
        function (n) { return n.offsetParent !== null || n === document.activeElement; }
      );
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
  }
  Trap.prototype.on = function () {
    this.prev = document.activeElement;
    document.addEventListener('keydown', this.onKey);
    document.body.classList.add('is-locked');
    var first = this.el.querySelector(FOCUSABLE);
    if (first) first.focus();
  };
  /* restore=false when the closer is handing focus somewhere else, e.g. an
     in-page anchor the viewer just chose from the menu */
  Trap.prototype.off = function (restore) {
    document.removeEventListener('keydown', this.onKey);
    document.body.classList.remove('is-locked');
    if (restore !== false && this.prev && this.prev.focus) this.prev.focus();
    this.prev = null;
  };

  /* ---------------- menu ---------------- */

  function initMenu() {
    var menu = document.getElementById('menu');
    var open = document.getElementById('menu-open');
    if (!menu || !open) return;
    var close = menu.querySelector('[data-menu-close]');
    var trap = new Trap(menu);
    var isOpen = false;

    function set(next, restore) {
      isOpen = next;
      menu.setAttribute('data-open', next ? 'true' : 'false');
      menu.setAttribute('aria-hidden', next ? 'false' : 'true');
      open.setAttribute('aria-expanded', next ? 'true' : 'false');
      if (next) trap.on(); else trap.off(restore);
    }

    open.addEventListener('click', function () { set(true); });
    if (close) close.addEventListener('click', function () { set(false); });

    /* On the home flow the nav points at in-page sections, so the overlay has
       to get out of the way and let the anchor take focus. */
    Array.prototype.forEach.call(menu.querySelectorAll('.menu__nav a'), function (link) {
      link.addEventListener('click', function () {
        var href = link.getAttribute('href') || '';
        var hash = href.indexOf('#');
        if (hash === -1) return;
        var samePage = hash === 0 || href.slice(0, hash) === location.pathname.split('/').pop();
        if (samePage) set(false, false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) set(false);
    });
    set(false);
  }

  /* ---------------- production sheet ---------------- */

  function initSheet() {
    var sheet = document.getElementById('sheet');
    var grid = document.getElementById('gallery-grid');
    if (!sheet || !grid) return;

    var track = sheet.querySelector('[data-track]');
    var titleEl = sheet.querySelector('[data-sheet-title]');
    var roleEl = sheet.querySelector('[data-sheet-role]');
    var metaEl = sheet.querySelector('[data-sheet-meta]');
    var countEl = sheet.querySelector('[data-sheet-count]');
    var stage = sheet.querySelector('[data-stage]');
    var closeBtn = sheet.querySelector('[data-sheet-close]');
    var prevBtn = sheet.querySelector('[data-prev]');
    var nextBtn = sheet.querySelector('[data-next]');
    var trap = new Trap(sheet);

    var show = null;
    var pics = [];
    var at = 0;
    var timer = null;
    var isOpen = false;

    function paint() {
      track.style.transform = 'translateX(' + (-at * 100) + '%)';
      countEl.textContent = pad(at + 1) + ' / ' + pad(pics.length);
    }

    function step(d) {
      if (!pics.length) return;
      at = (at + d + pics.length) % pics.length;
      paint();
    }

    function autoplay() {
      clearInterval(timer);
      if (reduced) return;
      timer = setInterval(function () { step(1); }, 4000);
    }

    function open(i) {
      show = SHOWS[i];
      pics = plates(show);
      at = 0;
      titleEl.textContent = show.t;
      roleEl.textContent = show.r;
      metaEl.textContent = show.m;
      track.innerHTML = '';
      pics.forEach(function (src, k) {
        var d = document.createElement('div');
        d.className = 'sheet__slide';
        var img = document.createElement('img');
        img.src = src;
        img.alt = show.t + ' — photo ' + (k + 1) + ' of ' + pics.length;
        img.loading = k === 0 ? 'eager' : 'lazy';
        d.appendChild(img);
        track.appendChild(d);
      });
      paint();
      isOpen = true;
      sheet.setAttribute('data-open', 'true');
      sheet.setAttribute('aria-hidden', 'false');
      trap.on();
      autoplay();
    }

    function close() {
      clearInterval(timer);
      isOpen = false;
      sheet.setAttribute('data-open', 'false');
      sheet.setAttribute('aria-hidden', 'true');
      track.innerHTML = '';
      trap.off();
    }

    Array.prototype.forEach.call(grid.querySelectorAll('[data-show]'), function (btn) {
      btn.addEventListener('click', function () {
        open(parseInt(btn.getAttribute('data-show'), 10));
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); autoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1); autoplay(); });

    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') { step(-1); autoplay(); }
      else if (e.key === 'ArrowRight') { step(1); autoplay(); }
    });

    /* swipe — same 40px threshold the mockup used */
    var dx = null;
    stage.addEventListener('pointerdown', function (e) { dx = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (dx === null) return;
      var moved = e.clientX - dx;
      dx = null;
      if (Math.abs(moved) > 40) { step(moved < 0 ? 1 : -1); autoplay(); }
    });
    stage.addEventListener('pointercancel', function () { dx = null; });

    sheet.setAttribute('data-open', 'false');
    sheet.setAttribute('aria-hidden', 'true');
  }

  /* ---------------- reels ---------------- */

  function initReels() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-video]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-video');
        var name = btn.getAttribute('data-video-title') || 'Reel';
        var frame = document.createElement('iframe');
        frame.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
        frame.title = name;
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen';
        frame.setAttribute('allowfullscreen', 'allowfullscreen');
        btn.parentNode.appendChild(frame);
        btn.remove();
        frame.focus();
      });
    });
  }

  /* ---------------- reveal ---------------- */

  function initReveal() {
    var nodes = document.querySelectorAll('[data-reveal]');
    if (!nodes.length) return;
    /* No observer, or the viewer asked for less motion: leave everything visible
       and never arm the hidden state. */
    if (reduced || !('IntersectionObserver' in window)) return;

    var root = document.documentElement;
    root.classList.add('js-reveal');

    var reported = false;
    var io = new IntersectionObserver(function (entries) {
      reported = true;
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });

    /* Watchdog: a healthy observer reports on the first frame. If nothing has
       come back, assume it will not and show the content unanimated rather than
       leaving the page blank. */
    window.setTimeout(function () {
      if (!reported) {
        io.disconnect();
        root.classList.remove('js-reveal');
      }
    }, 2000);
  }

  /* ---------------- desktop parallax name ---------------- */

  function initParallax() {
    var name = document.querySelector('[data-bigname]');
    if (!name || reduced) return;
    var ticking = false;
    function sync() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      name.style.transform = 'translateY(' + (y * 0.45) + 'px)';
      name.style.opacity = String(0.92 * Math.max(0, 1 - y / 620));
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(sync); }
    }, { passive: true });
    sync();
  }

  /* The phone credits list scrolls with a hidden scrollbar (per 1a), so make it
     focusable — but only while it actually overflows, to avoid a dead tab stop
     on desktop where the list is fully expanded. */
  function initScrollables() {
    var list = document.querySelector('.credits');
    if (!list) return;
    function sync() {
      if (list.scrollHeight > list.clientHeight + 1) {
        list.setAttribute('tabindex', '0');
        list.setAttribute('role', 'group');
        list.setAttribute('aria-label', 'Selected credits, scrollable');
      } else {
        list.removeAttribute('tabindex');
        list.removeAttribute('role');
        list.removeAttribute('aria-label');
      }
    }
    sync();
    if ('ResizeObserver' in window) {
      new ResizeObserver(sync).observe(list);
    } else {
      window.addEventListener('resize', sync, { passive: true });
    }
  }

  function boot() {
    initMenu();
    initScrollables();
    initSheet();
    initReels();
    initReveal();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
