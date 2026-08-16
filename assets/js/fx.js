/* Shared interaction effects, used by both the front page and the portal. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* A press leaves a mark where it landed. Fast and low-contrast, because
     officers press these hundreds of times a day. */
  document.addEventListener('pointerdown', function (e) {
    var host = e.target.closest('.btn, .door, .qrow, .doc');
    if (!host || host.hasAttribute('disabled')) return;

    var r = host.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2.2;
    var ink = document.createElement('span');
    ink.className = 'ripple';
    ink.style.width = ink.style.height = size + 'px';
    ink.style.left = (e.clientX - r.left) + 'px';
    ink.style.top = (e.clientY - r.top) + 'px';
    host.appendChild(ink);
    setTimeout(function () { ink.remove(); }, 460);
  });
})();
