/* Front page: mint the hero card once, so the stages are shown rather than described. */
(function () {
  var card = document.getElementById('heroCard');
  var caption = document.getElementById('heroCaption');
  var serialEl = document.getElementById('heroSerial');
  if (!card || !caption || !serialEl) return;

  var SERIAL = 'UG48 2190 3311';
  var MASK = '▒▒▒▒ ▒▒▒▒ ▒▒▒▒';

  var script = [
    { state: 'blueprint', n: 1, label: 'request submitted', serial: MASK },
    { state: 'blueprint', n: 2, label: 'payment verified', serial: MASK },
    { state: 'blueprint', n: 3, label: 'officer review', serial: MASK },
    { state: 'printing', n: 4, label: 'in the print batch', serial: null },
    { state: 'issued', n: 5, label: 'ready for collection', serial: SERIAL }
  ];

  function paint(step) {
    card.dataset.state = step.state;
    caption.innerHTML = 'Stage ' + step.n + ' of 5 — <b>' + step.label + '</b>';
    if (step.serial !== null) serialEl.textContent = step.serial;
  }

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) {
    paint(script[script.length - 1]);
    return;
  }

  var i = 0;
  paint(script[0]);

  function next() {
    i += 1;
    if (i >= script.length) return;
    paint(script[i]);
    if (script[i].state === 'printing') { scramble(); return; }
    if (i < script.length - 1) setTimeout(next, 900);
  }

  /* the serial resolves as the card is printed */
  function scramble() {
    var chars = '0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
    var ticks = 0;
    var id = setInterval(function () {
      ticks += 1;
      var shown = SERIAL.split('').map(function (c, idx) {
        if (c === ' ') return ' ';
        return idx < ticks - 2 ? c : chars[Math.floor(Math.random() * chars.length)];
      }).join('');
      serialEl.textContent = shown;
      if (ticks > SERIAL.length + 2) {
        clearInterval(id);
        serialEl.textContent = SERIAL;
        setTimeout(next, 260);
      }
    }, 55);
  }

  setTimeout(next, 900);
})();
