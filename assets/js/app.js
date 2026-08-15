/* SIRTS portal — view rendering and interactions. */
(function () {
  'use strict';

  var S = window.SIRTS;
  var OFFICER = 'K. Mensah';
  var view = document.getElementById('view');
  var role = 'student';
  var picked = null;   // ref selected in the officer queue

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function $(id) { return document.getElementById(id); }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function when(ts) {
    var d = new Date(ts);
    var hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + hh + ':' + mm;
  }
  function dateOnly(ts) {
    var d = new Date(ts);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function dur(ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' h';
    var d = Math.floor(h / 24);
    return d + ' d ' + (h % 24) + ' h';
  }
  function ago(ts) { return dur(Date.now() - ts) + ' ago'; }

  function toast(title, body, kind) {
    var box = $('toasts');
    var t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast--' + kind : '');
    t.innerHTML = '<div><b>' + esc(title) + '</b>' + (body ? esc(body) : '') + '</div>';
    box.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s ease';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 260);
    }, 4200);
  }

  function cardState(stage) {
    if (stage === 'rejected') return 'void';
    if (stage === 'print') return 'printing';
    if (stage === 'ready' || stage === 'collected') return 'issued';
    return 'blueprint';
  }
  function pillFor(stage) {
    if (stage === 'rejected') return '<span class="pill pill--stop">Returned to you</span>';
    if (stage === 'collected') return '<span class="pill pill--ok">Collected</span>';
    if (stage === 'ready') return '<span class="pill pill--ok">Ready for collection</span>';
    if (stage === 'print') return '<span class="pill pill--wait">In the print batch</span>';
    if (stage === 'review') return '<span class="pill pill--wait">Under review</span>';
    return '<span class="pill pill--idle">' + esc(S.labelOf(stage)) + '</span>';
  }

  function idcardHTML(r) {
    var initials = r.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
    return '' +
      '<figure class="idcard" data-state="' + cardState(r.stage) + '">' +
        '<div class="idcard__face">' +
          '<div class="idcard__head">' +
            '<span class="idcard__crest" aria-hidden="true">UG</span>' +
            '<span class="idcard__org"><b>University of Ghana</b><span>Student Identity Card</span></span>' +
          '</div>' +
          '<div class="idcard__body">' +
            '<div class="idcard__photo" aria-hidden="true">' + esc(initials) + '</div>' +
            '<dl class="idcard__lines">' +
              '<div><dt>Name</dt><dd>' + esc(r.name) + '</dd></div>' +
              '<div><dt>Student number</dt><dd class="sm mono">' + esc(r.studentId) + ' · ' + esc(r.programme) + '</dd></div>' +
            '</dl>' +
          '</div>' +
          '<div class="idcard__foot">' +
            '<span class="idcard__serial"><small>Card serial</small>' +
              (r.serial ? esc(r.serial) : '▒▒▒▒ ▒▒▒▒ ▒▒▒▒') +
            '</span>' +
            '<span class="idcard__seal" aria-hidden="true">UG</span>' +
          '</div>' +
        '</div>' +
      '</figure>';
  }

  /* ---------------- student ---------------- */
  var NEXT = {
    submitted: 'We are waiting for the payment platform to confirm your GH₵ 50.00. This normally takes a few minutes.',
    payment: 'Your request is in the ID Card Unit queue. An officer will check it against your student record.',
    review: 'An officer is checking your record and your document. You will get a message as soon as there is a decision.',
    print: 'Approved. Your card is in the next print batch — we will tell you the day it is ready.',
    ready: 'Collect at the ID Card Unit, Registrar\'s Office Annex, Monday to Friday, 09:00–16:00. Bring one other form of identification and your reference number.',
    collected: 'Nothing further to do. Your previous card was deactivated when you collected this one.'
  };

  function railHTML(r) {
    var here = S.stageIndex(r.stage);
    var stopped = r.stage === 'rejected';
    return '<div class="railv">' + S.STAGES.map(function (st, i) {
      var ev = S.eventAt(r, st.key);
      var state;
      if (stopped) state = i < 2 ? 'done' : (i === 2 ? 'stop' : 'todo');
      else if (r.stage === 'collected') state = 'done';
      else if (i < here) state = 'done';
      else if (i === here) state = 'now';
      else state = 'todo';

      var mark = state === 'done' ? '✓' : (state === 'stop' ? '!' : ('0' + (i + 1)));
      var right = ev
        ? when(ev.at) + (state === 'now' ? '<br><span style="color:var(--legon)">waiting ' + dur(Date.now() - ev.at) + '</span>' : '')
        : '—';
      return '<div class="step" data-s="' + state + '">' +
          '<span class="step__mark">' + mark + '</span>' +
          '<span><span class="step__name">' + esc(st.label) + '</span>' +
            '<span class="step__who">' + esc(st.who) + '</span></span>' +
          '<span class="step__when">' + right + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function studentView() {
    var r = S.active();
    var history = S.mine();

    var top;
    if (!r) {
      top = '<div class="panel"><div class="empty">' +
        '<b>You have no open request</b>' +
        'Report a lost, stolen or damaged card and follow it from here.' +
        '<div style="margin-top:16px"><button class="btn" data-act="new">Request a replacement card</button></div>' +
        '</div></div>';
    } else {
      var stopped = r.stage === 'rejected';
      var next = stopped
        ? '<div class="next next--stop"><p class="eyebrow">What you need to fix</p><p>' +
            esc(r.rejectedReason || 'The request was returned.') +
          '</p><div style="margin-top:12px"><button class="btn btn--sm" data-act="new">Submit a new request</button></div></div>'
        : '<div class="next"><p class="eyebrow">What happens next</p><p>' + esc(NEXT[r.stage] || '') + '</p></div>';

      top = '<div class="folio">' +
        '<div class="folio__card">' +
          idcardHTML(r) +
          '<p class="folio__note">' +
            (r.serial ? 'Serial assigned at printing' : 'Your card is printed once the request is approved') +
          '</p>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="panel__head">' +
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
              '<span class="refchip"><small>Ref</small>' + esc(r.ref) + '</span>' + pillFor(r.stage) +
            '</div>' +
            '<span class="mono" style="font-size:12px;color:var(--ink-3)">opened ' + ago(r.events[0].at) + '</span>' +
          '</div>' +
          '<div class="panel__body">' + railHTML(r) + next + '</div>' +
        '</div>' +
      '</div>';
    }

    var facts = r ? '<div class="panel" style="overflow:hidden"><dl class="facts">' +
        '<div class="fact"><dt>Reason</dt><dd>' + esc(S.REASONS[r.reason]) + '</dd></div>' +
        '<div class="fact"><dt>Document</dt><dd><button class="doc" style="border:0;background:none;padding:0;font-size:14px;color:var(--legon);text-decoration:underline" data-doc="' + esc(r.doc.name) + '">' + esc(r.doc.name) + '</button></dd></div>' +
        '<div class="fact"><dt>Fee</dt><dd>' + (r.pay.status === 'verified'
            ? 'GH₵ ' + S.FEE + '.00 paid <span class="mono" style="color:var(--ink-3);font-size:12px">· ' + esc(r.pay.receipt) + '</span>'
            : 'GH₵ ' + S.FEE + '.00 confirming…') + '</dd></div>' +
        '<div class="fact"><dt>Submitted</dt><dd>' + dateOnly(r.events[0].at) + '</dd></div>' +
      '</dl></div>' : '';

    var rows = history.map(function (h) {
      return '<tr>' +
        '<td class="num">' + esc(h.ref) + '</td>' +
        '<td>' + dateOnly(h.events[0].at) + '</td>' +
        '<td>' + esc(S.REASONS[h.reason]) + '</td>' +
        '<td class="num">GH₵ ' + S.FEE + '.00</td>' +
        '<td>' + pillFor(h.stage) + '</td>' +
        '<td class="num">' + (h.serial ? esc(h.serial) : '—') + '</td>' +
      '</tr>';
    }).join('');

    var table = '<div class="panel" style="overflow:hidden">' +
      '<div class="panel__head"><h2>My request history</h2>' +
      '<span class="mono" style="font-size:12px;color:var(--ink-3)">' + history.length + ' request' + (history.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="scroll-x"><table class="tbl"><thead><tr>' +
        '<th>Reference</th><th>Submitted</th><th>Reason</th><th>Fee</th><th>Stage</th><th>Card serial</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';

    return top + facts + table;
  }

  /* ---------------- officer ---------------- */
  function officerView() {
    var q = S.queue();
    var m = S.metrics();
    if (!picked || !S.byRef(picked) || S.byRef(picked).stage !== 'review') {
      picked = q.length ? q[0].ref : null;
    }

    var tiles = '<dl class="tiles">' +
      '<div class="tile tile--wait"><dt>Waiting for review</dt><dd>' + q.length + '</dd></div>' +
      '<div class="tile"><dt>Approved, not yet printed</dt><dd>' + m.backlog.print + '</dd></div>' +
      '<div class="tile"><dt>Awaiting collection</dt><dd>' + m.backlog.ready + '</dd></div>' +
      '<div class="tile tile--ok"><dt>Cards issued</dt><dd>' + m.issued + '</dd></div>' +
    '</dl>';

    var qhtml = q.length ? '<div class="queue">' + q.map(function (r) {
      return '<button class="qrow" data-pick="' + esc(r.ref) + '" aria-current="' + (r.ref === picked) + '">' +
        '<span><span class="qrow__name">' + esc(r.name) + '</span>' +
          '<span class="qrow__meta">' + esc(S.REASONS[r.reason]) + ' · ' + esc(r.studentId) + '</span>' +
          '<span class="qrow__ref">' + esc(r.ref) + '</span></span>' +
        '<span class="qrow__age">' + ago(r.events[0].at) + '</span>' +
      '</button>';
    }).join('') + '</div>'
      : '<div class="empty"><b>The queue is clear</b>Nothing is waiting for a decision.</div>';

    var sel = picked ? S.byRef(picked) : null;
    var detail = sel ? '<div class="panel detail">' +
      '<div class="panel__head"><h2>' + esc(sel.name) + '</h2>' + pillFor(sel.stage) + '</div>' +
      '<div class="panel__body">' +
        '<dl>' +
          '<div><dt>Reference</dt><dd class="mono">' + esc(sel.ref) + '</dd></div>' +
          '<div><dt>Student</dt><dd>' + esc(sel.studentId) + ' · ' + esc(sel.programme) + '</dd></div>' +
          '<div><dt>Reason</dt><dd>' + esc(S.REASONS[sel.reason]) + '</dd></div>' +
          '<div><dt>Fee</dt><dd>GH₵ ' + S.FEE + '.00 verified · <span class="mono">' + esc(sel.pay.receipt) + '</span> (' + esc(sel.pay.channel) + ')</dd></div>' +
          '<div><dt>Submitted</dt><dd>' + when(sel.events[0].at) + ' · ' + ago(sel.events[0].at) + '</dd></div>' +
          '<div><dt>Supporting document</dt><dd>' +
            '<button class="doc" data-doc="' + esc(sel.doc.name) + '"><span>PDF</span><span>' + esc(sel.doc.name) + '</span></button>' +
          '</dd></div>' +
        '</dl>' +
        '<div class="actions" style="margin-top:18px">' +
          '<button class="btn btn--go" data-approve="' + esc(sel.ref) + '">Approve and queue for printing</button>' +
          '<button class="btn btn--stop" data-reject="' + esc(sel.ref) + '">Return to student</button>' +
        '</div>' +
      '</div></div>'
      : '<div class="panel detail"><div class="empty"><b>No request selected</b>Pick one from the queue to review it.</div></div>';

    var ready = S.at('ready');
    var readyRows = ready.map(function (r) {
      return '<tr>' +
        '<td class="num">' + esc(r.ref) + '</td>' +
        '<td>' + esc(r.name) + '<div class="qrow__meta">' + esc(r.studentId) + '</div></td>' +
        '<td class="num">' + esc(r.serial || '—') + '</td>' +
        '<td class="num">' + ago(S.eventAt(r, 'ready').at) + '</td>' +
        '<td><button class="btn btn--sm btn--quiet" data-collect="' + esc(r.ref) + '">Record collection</button></td>' +
      '</tr>';
    }).join('');

    var readyPanel = '<div class="panel" style="overflow:hidden">' +
      '<div class="panel__head"><h2>Waiting at the counter</h2>' +
      '<span class="mono" style="font-size:12px;color:var(--ink-3)">' + ready.length + ' card' + (ready.length === 1 ? '' : 's') + '</span></div>' +
      (ready.length
        ? '<div class="scroll-x"><table class="tbl"><thead><tr><th>Reference</th><th>Student</th><th>Card serial</th><th>Ready for</th><th></th></tr></thead><tbody>' + readyRows + '</tbody></table></div>'
        : '<div class="empty"><b>Nothing waiting</b>Every printed card has been collected.</div>') +
    '</div>';

    return tiles +
      '<div class="desk">' +
        '<div class="panel" style="overflow:hidden">' +
          '<div class="panel__head"><h2>Requests waiting for a decision</h2>' +
          '<span class="mono" style="font-size:12px;color:var(--ink-3)">oldest first</span></div>' +
          qhtml +
        '</div>' + detail +
      '</div>' + readyPanel;
  }

  /* ---------------- administrator ---------------- */
  function adminView() {
    var m = S.metrics();
    var max = Math.max(1, m.backlog.review, m.backlog.print, m.backlog.ready);

    var tiles = '<dl class="tiles">' +
      '<div class="tile"><dt>Average turnaround</dt><dd>' + m.turnaroundDays.toFixed(1) +
        '<small>days, submission to ready · ' + m.sampleSize + ' completed requests</small></dd></div>' +
      '<div class="tile tile--wait"><dt>Open requests</dt><dd>' + m.openTotal +
        '<small>across review, printing and collection</small></dd></div>' +
      '<div class="tile tile--ok"><dt>Cards issued</dt><dd>' + m.issued +
        '<small>printed and released</small></dd></div>' +
      '<div class="tile"><dt>Fees processed</dt><dd>' + m.fees.toLocaleString() +
        '<small>GH₵, at GH₵ ' + S.FEE + '.00 per replacement</small></dd></div>' +
    '</dl>';

    function bar(label, n, mod) {
      return '<div class="bar ' + (mod || '') + '">' +
        '<span>' + esc(label) + '</span>' +
        '<span class="bar__track"><span class="bar__fill" style="width:' + Math.round(n / max * 100) + '%"></span></span>' +
        '<span class="bar__n">' + n + '</span></div>';
    }
    var backlog = '<div class="panel"><div class="panel__head"><h2>Where the backlog is sitting</h2>' +
      '<span class="mono" style="font-size:12px;color:var(--ink-3)">live</span></div>' +
      '<div class="panel__body"><div class="bars">' +
        bar('Officer review', m.backlog.review, 'bar--wait') +
        bar('In the print batch', m.backlog.print) +
        bar('Awaiting collection', m.backlog.ready, 'bar--ok') +
      '</div>' +
      '<p style="margin-top:16px;font-size:13px;color:var(--ink-3)">' +
        m.returned + ' request' + (m.returned === 1 ? ' was' : 's were') + ' returned to students for correction.' +
      '</p></div></div>';

    var audit = '<div class="panel" style="overflow:hidden"><div class="panel__head"><h2>Audit trail</h2>' +
      '<span class="mono" style="font-size:12px;color:var(--ink-3)">every decision, with who and when</span></div>' +
      '<ul class="log">' + S.audit().slice(0, 12).map(function (a) {
        return '<li><time>' + when(a.at) + '</time>' +
          '<span>' + esc(a.action) + '<span class="who">' + esc(a.actor) + '</span></span>' +
          '<span class="ref">' + esc(a.ref) + '</span></li>';
      }).join('') + '</ul></div>';

    var users = '<div class="panel" style="overflow:hidden"><div class="panel__head"><h2>User accounts</h2></div>' +
      '<div class="scroll-x"><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Unit</th><th>Status</th></tr></thead><tbody>' +
      S.users().map(function (u) {
        return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.role) + '</td><td>' + esc(u.unit) + '</td>' +
          '<td><span class="pill pill--' + (u.status === 'Active' ? 'ok' : 'idle') + '">' + esc(u.status) + '</span></td></tr>';
      }).join('') + '</tbody></table></div></div>';

    var reset = '<div class="panel"><div class="panel__body" style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center">' +
      '<p style="font-size:13.5px;color:var(--ink-3);max-width:56ch">' +
        'This prototype keeps its data in your browser. Resetting restores the sample queue so the ' +
        'workflow can be demonstrated again from the start.</p>' +
      '<button class="btn btn--quiet" data-act="reset">Reset demo data</button>' +
    '</div></div>';

    return tiles + backlog + audit + users + reset;
  }

  /* ---------------- shell ---------------- */
  var HEADS = {
    student: { title: 'My replacement request', sub: S.ME.name + ' · ' + S.ME.id, initials: 'RA' },
    officer: { title: 'ID Card Unit desk', sub: OFFICER + ' · Academic Affairs Directorate', initials: 'KM' },
    admin: { title: 'Reports and administration', sub: 'System Administrator · UG Computing Systems', initials: 'SA' }
  };

  function render() {
    var head = HEADS[role];
    $('viewTitle').textContent = head.title;
    $('viewSub').textContent = head.sub;
    $('whoInitials').textContent = head.initials;
    $('bellCount').textContent = S.notifications().length;

    var action = '';
    if (role === 'student') action = '<button class="btn" data-act="new">Request a replacement card</button>';
    if (role === 'officer') {
      var n = S.batch().length;
      action = '<button class="btn" data-act="print"' + (n ? '' : ' disabled') + '>Print batch (' + n + ')</button>';
    }
    $('appbarAction').innerHTML = action;

    view.innerHTML = role === 'student' ? studentView()
      : role === 'officer' ? officerView()
      : adminView();
  }

  /* ---------------- actions ---------------- */
  function openDlg(id) { var d = $(id); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function closeDlg(d) { if (d.close) d.close(); else d.removeAttribute('open'); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-close],[data-act],[data-pick],[data-approve],[data-reject],[data-collect],[data-doc]');
    if (!t) return;

    if (t.hasAttribute('data-close')) { closeDlg(t.closest('dialog')); return; }

    if (t.dataset.doc) {
      $('docName').textContent = t.dataset.doc;
      openDlg('docDlg');
      return;
    }
    if (t.dataset.pick) { picked = t.dataset.pick; render(); return; }

    if (t.dataset.approve) {
      var a = S.approve(t.dataset.approve, OFFICER);
      if (a) { toast('Approved', ' ' + a.ref + ' is in the print batch. ' + a.name.split(' ')[0] + ' has been messaged.', 'ok'); picked = null; render(); }
      return;
    }
    if (t.dataset.reject) {
      var r = S.byRef(t.dataset.reject);
      $('rejectForm').dataset.ref = r.ref;
      $('rejectWho').textContent = r.name + ' · ' + r.ref + ' · ' + S.REASONS[r.reason];
      $('rejectReason').value = '';
      openDlg('rejectDlg');
      return;
    }
    if (t.dataset.collect) {
      var c = S.collect(t.dataset.collect, OFFICER);
      if (c) { toast('Collection recorded', ' Card ' + c.serial + ' issued to ' + c.name + '. The old card is deactivated.', 'ok'); render(); }
      return;
    }

    var act = t.dataset.act;
    if (act === 'new') {
      $('newRequestForm').reset();
      setDocRequirement('');
      openDlg('newRequest');
    } else if (act === 'print') {
      runBatch();
    } else if (act === 'reset') {
      S.reset(); picked = null; render();
      toast('Demo data reset', ' The sample queue is back to its starting state.');
    }
  });

  $('bell').addEventListener('click', function () {
    var list = S.notifications().slice(0, 30).map(function (n) {
      return '<div class="note">' +
        '<div class="note__top"><b>' + esc(n.to) + '</b>' +
          '<span><span class="note__ch">' + esc(n.channel) + '</span> <time>' + when(n.at) + '</time></span></div>' +
        '<p>' + esc(n.body) + '</p></div>';
    }).join('');
    $('notesList').innerHTML = list || '<div class="empty">Nothing sent yet.</div>';
    openDlg('notesDlg');
  });

  /* new request */
  function setDocRequirement(reason) {
    var needed = reason === 'lost' || reason === 'stolen';
    var label = $('docLabel'), hint = $('docHint'), input = $('doc');
    if (reason === 'damaged') {
      label.textContent = 'Photo of the damaged card';
      hint.textContent = 'Optional. Bring the damaged card to the counter when you collect the new one.';
    } else if (reason === 'name_change') {
      label.textContent = 'Deed poll or supporting letter';
      hint.textContent = 'Optional, but it speeds up the officer\'s check.';
    } else {
      label.textContent = 'Police report or affidavit';
      hint.textContent = 'PDF, PNG or JPG, up to 5 MB. Required for a lost or stolen card.';
    }
    input.required = needed;
  }
  $('reason').addEventListener('change', function () { setDocRequirement(this.value); });

  $('newRequestForm').addEventListener('submit', function () {
    var reason = $('reason').value;
    var file = $('doc').files[0];
    var channel = document.querySelector('input[name="channel"]:checked').value;
    var r = S.create({ reason: reason, docName: file ? file.name : null, channel: channel });
    render();
    toast('Request submitted', ' Your reference is ' + r.ref + '. Keep it — you can quote it at the counter.');

    /* the payment platform, then the queue — separate actors, so they land separately */
    setTimeout(function () {
      if (S.confirmPayment(r.ref)) {
        render();
        toast('Payment confirmed', ' GH₵ ' + S.FEE + '.00 received for ' + r.ref + '.', 'ok');
      }
    }, 1800);
    setTimeout(function () {
      if (S.queueForReview(r.ref)) render();
    }, 3600);
  });

  $('rejectForm').addEventListener('submit', function () {
    var ref = this.dataset.ref;
    var reason = $('rejectReason').value.trim();
    if (!reason) return;
    var r = S.reject(ref, reason, OFFICER);
    if (r) { toast('Returned to student', ' ' + r.name.split(' ')[0] + ' was told what to fix.', 'stop'); picked = null; render(); }
  });

  /* batch printing */
  function runBatch() {
    var list = S.batch();
    if (!list.length) return;
    var printed = S.printBatch(OFFICER);
    $('batchsheet').innerHTML =
      '<h1>ID Card Print Batch</h1>' +
      '<p class="meta">University of Ghana · ID Card Unit · ' + dateOnly(Date.now()) +
        ' · ' + printed.length + ' card' + (printed.length === 1 ? '' : 's') + ' · issued by ' + esc(OFFICER) + '</p>' +
      '<table><thead><tr><th>#</th><th>Reference</th><th>Student</th><th>Student number</th><th>Programme</th><th>Card serial</th></tr></thead><tbody>' +
      printed.map(function (r, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.ref) + '</td><td>' + esc(r.name) + '</td>' +
          '<td>' + esc(r.studentId) + '</td><td>' + esc(r.programme) + '</td><td>' + esc(r.serial) + '</td></tr>';
      }).join('') + '</tbody></table>';
    render();
    toast('Batch printed', ' ' + printed.length + ' card' + (printed.length === 1 ? '' : 's') +
      ' moved to “ready for collection” and every student was messaged.', 'ok');
    setTimeout(function () { window.print(); }, 400);
  }

  /* role */
  function setRole(next) {
    role = HEADS[next] ? next : 'student';
    $('roleSelect').value = role;
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('role', role);
      history.replaceState(null, '', url);
    } catch (e) { /* file:// */ }
    render();
  }
  $('roleSelect').addEventListener('change', function () { picked = null; setRole(this.value); });

  var start = 'student';
  try { start = new URL(window.location.href).searchParams.get('role') || 'student'; } catch (e) {}
  setRole(start);

  /* keep the "waiting 9 h" counters honest without a reload */
  setInterval(function () { if (!document.querySelector('dialog[open]')) render(); }, 60000);
})();
