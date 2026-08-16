/* Front page motion.
   The hero mints the card and delivers its messages in one orchestrated run;
   the sections below reveal themselves as they come into view. */
(function () {
  'use strict';

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- hero: the card is made, and it tells you ---------------- */
  (function hero() {
    var hero = document.getElementById('hero');
    var card = document.getElementById('heroCard');
    var serialEl = document.getElementById('heroSerial');
    var issueEl = document.getElementById('heroIssue');
    var expiryEl = document.getElementById('heroExpiry');
    var notes = document.querySelectorAll('#heroNotes .note-chip');
    if (!hero || !card || !serialEl) return;

    var SERIAL = 'UG45 4789 1008';
    var MASK = '▒▒▒▒ ▒▒▒▒ ▒▒▒▒';

    function stampDates() {
      var d = new Date();
      if (issueEl) issueEl.textContent = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
      if (expiryEl) expiryEl.textContent = '31/10/' + (d.getFullYear() + 3);
    }

    if (still) {
      hero.classList.add('is-live');
      card.dataset.state = 'issued';
      serialEl.textContent = SERIAL;
      stampDates();
      Array.prototype.forEach.call(notes, function (n) { n.classList.add('is-in'); });
      return;
    }

    card.dataset.state = 'blueprint';
    serialEl.textContent = MASK;

    var t = [];
    function at(ms, fn) { t.push(setTimeout(fn, ms)); }

    requestAnimationFrame(function () { hero.classList.add('is-live'); });

    /* each message lands as its stage completes */
    at(700,  function () { notes[0] && notes[0].classList.add('is-in'); });
    at(1300, function () { notes[1] && notes[1].classList.add('is-in'); });
    at(1900, function () { notes[2] && notes[2].classList.add('is-in'); });

    /* the print head passes, and the serial resolves under it */
    at(1950, function () { hero.classList.add('is-printing'); card.dataset.state = 'printing'; });
    at(2150, scramble);

    function scramble() {
      var chars = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
      var start = performance.now();
      var DURATION = 1100;
      (function frame(now) {
        var p = Math.min(1, (now - start) / DURATION);
        var shown = SERIAL.split('').map(function (c, i) {
          if (c === ' ') return ' ';
          return (i / SERIAL.length) < p ? c : chars[(Math.random() * chars.length) | 0];
        }).join('');
        serialEl.textContent = shown;
        if (p < 1) requestAnimationFrame(frame);
        else {
          serialEl.textContent = SERIAL;
          card.dataset.state = 'issued';
          stampDates();
          at(180, function () { notes[3] && notes[3].classList.add('is-in'); });
        }
      })(start);
    }

    window.addEventListener('pagehide', function () { t.forEach(clearTimeout); });
  })();

  /* ---------------- sections reveal as they arrive ---------------- */
  (function reveals() {
    var sections = ['stages', 'split', 'needs'].map(function (id) {
      return document.getElementById(id);
    }).filter(Boolean);

    if (still || !('IntersectionObserver' in window)) {
      sections.forEach(function (s) { s.classList.add('is-live'); });
      document.querySelectorAll('#stages .stage').forEach(function (s) { s.classList.add('is-on'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-live');
        io.unobserve(e.target);
        /* the rail lights its stations in order, in step with the track filling */
        if (e.target.id === 'stages') {
          var dots = e.target.querySelectorAll('.stage');
          Array.prototype.forEach.call(dots, function (d, i) {
            setTimeout(function () { d.classList.add('is-on'); }, 220 + i * 270);
          });
        }
      });
    }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  })();
})();

/* ---------------- depth: parallax, tilt, and a headline that arrives ---------------- */
(function depth() {
  'use strict';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var mast = document.querySelector('.mast');
  var cardwrap = document.querySelector('.hero__cardwrap');
  var notes = document.getElementById('heroNotes');
  var copy = document.querySelector('.hero__grid > div:first-child');
  var card = document.getElementById('heroCard');
  var h1 = document.querySelector('.hero h1');

  /* the headline arrives a word at a time */
  if (h1 && !still) {
    var parts = [];
    Array.prototype.forEach.call(h1.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.nodeValue.split(/(\s+)/).forEach(function (w) {
          if (!w.trim()) { parts.push(document.createTextNode(w)); return; }
          var s = document.createElement('span');
          s.className = 'word';
          s.textContent = w;
          parts.push(s);
        });
      } else {
        var wrap = document.createElement('span');
        wrap.className = 'word';
        wrap.appendChild(node.cloneNode(true));
        parts.push(wrap);
      }
    });
    h1.textContent = '';
    parts.forEach(function (p) { h1.appendChild(p); });
    var words = h1.querySelectorAll('.word');
    Array.prototype.forEach.call(words, function (w, i) {
      w.style.animationDelay = (60 + i * 55) + 'ms';
    });
    h1.classList.add('is-split');
  }

  /* one scroll listener, one frame — parallax plus the condensing masthead */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      if (mast) mast.classList.toggle('is-stuck', y > 12);
      if (!still) {
        var cap = Math.min(y, 420);
        if (cardwrap) cardwrap.style.transform = 'translate3d(0,' + (cap * 0.13) + 'px,0)';
        if (notes) notes.style.transform = 'translate3d(0,' + (cap * 0.05) + 'px,0)';
        if (copy) copy.style.transform = 'translate3d(0,' + (cap * -0.045) + 'px,0)';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* the card is a physical object: it leans towards the pointer and settles back */
  if (card && cardwrap && fine && !still) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    var MAX = 7;

    function loop() {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      card.style.transform = 'perspective(900px) rotateX(' + cy.toFixed(2) +
        'deg) rotateY(' + cx.toFixed(2) + 'deg)';
      if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) {
        raf = requestAnimationFrame(loop);
      } else { raf = null; }
    }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }

    cardwrap.addEventListener('pointermove', function (e) {
      var r = cardwrap.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * (MAX * 2);
      ty = -((e.clientY - r.top) / r.height - 0.5) * (MAX * 2);
      start();
    });
    cardwrap.addEventListener('pointerleave', function () { tx = 0; ty = 0; start(); });
  }
})();
