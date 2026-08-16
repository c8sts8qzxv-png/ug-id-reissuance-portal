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
