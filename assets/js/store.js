/* SIRTS store — seed data, state transitions and persistence.
   Plain script (no ES modules) so the prototype also runs from file://. */
window.SIRTS = (function () {
  'use strict';

  var KEY = 'sirts.v5';
  var MIN = 60000, HOUR = 3600000, DAY = 86400000;
  var FEE = 50;

  /* The five tracked stages, in order. 'collected' completes the request;
     'rejected' stops it. Mirrors the activity diagram in the Phase 2 proposal. */
  var STAGES = [
    { key: 'submitted', label: 'Request submitted',   who: 'Student' },
    { key: 'payment',   label: 'Payment verified',    who: 'Payment platform' },
    { key: 'review',    label: 'Officer review',      who: 'ID Card Unit' },
    { key: 'print',     label: 'In the print batch',  who: 'ID Card Unit' },
    { key: 'ready',     label: 'Ready for collection', who: 'Student' }
  ];

  var REASONS = {
    lost: 'Lost card',
    stolen: 'Stolen card',
    damaged: 'Damaged card',
    name_change: 'Correction / name change'
  };

  var ME = { id: '10928374', name: 'Reginald Ankrah', programme: 'BA Public Administration' };

  function stageIndex(key) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].key === key) return i;
    return key === 'collected' ? STAGES.length : -1;
  }

  function serial() {
    var n = '';
    for (var i = 0; i < 12; i++) n += Math.floor(Math.random() * 10);
    return 'UG' + n.slice(0, 2) + ' ' + n.slice(2, 6) + ' ' + n.slice(6, 10);
  }

  /* ---------------- seed ---------------- */
  function seed() {
    var now = Date.now();
    var year = new Date(now).getFullYear();
    var counter = 89;   // 089 is assigned explicitly below; generated refs start at 090

    function pad(n) { return ('00' + n).slice(-3); }
    function ref() { counter += 1; return 'UG-ID-' + year + '-' + pad(counter); }

    function build(o) {
      var r = {
        ref: o.ref || ref(),
        studentId: o.studentId,
        name: o.name,
        programme: o.programme,
        reason: o.reason,
        doc: o.doc,
        fee: FEE,
        pay: o.pay || { channel: 'Mobile money', receipt: 'MM' + Math.floor(Math.random() * 9e7 + 1e7), status: 'verified' },
        stage: o.stage,
        serial: o.serial || null,
        rejectedReason: o.rejectedReason || null,
        events: []
      };
      /* gaps[i] is the wait between event i and event i+1, in hours */
      var upto = o.stage === 'rejected' ? stageIndex('review') : stageIndex(o.stage);
      var t = now - o.ageDays * DAY;
      for (var i = 0; i <= upto && i < STAGES.length; i++) {
        r.events.push({ stage: STAGES[i].key, at: t, by: STAGES[i].who });
        t += (o.gaps[i] !== undefined ? o.gaps[i] : 6) * HOUR;
      }
      if (o.stage === 'rejected') r.events.push({ stage: 'rejected', at: t, by: 'K. Mensah' });
      if (o.stage === 'collected') r.events.push({ stage: 'collected', at: t, by: 'Counter' });
      return r;
    }

    var requests = [
      build({ ref: 'UG-ID-' + year + '-089', studentId: ME.id, name: ME.name, programme: ME.programme,
              reason: 'lost', doc: { name: 'Police_Report_092.pdf' }, stage: 'review',
              ageDays: 1.6, gaps: [0.4, 5] }),
      build({ studentId: '10847291', name: 'Ama Mensah', programme: 'BSc Computer Science',
              reason: 'damaged', doc: { name: 'Damaged_Card.jpg' }, stage: 'review',
              ageDays: 1.1, gaps: [0.3, 4] }),
      build({ studentId: '11003852', name: 'Kwabena Osei', programme: 'LLB Law',
              reason: 'stolen', doc: { name: 'Police_Report_118.pdf' }, stage: 'review',
              ageDays: 0.4, gaps: [0.2, 1.5] }),
      build({ studentId: '10771640', name: 'Efua Baidoo', programme: 'BA Sociology',
              reason: 'lost', doc: { name: 'Affidavit_Baidoo.pdf' }, stage: 'print',
              ageDays: 2.4, gaps: [0.5, 8, 6] }),
      build({ studentId: '10990117', name: 'Yaw Boateng', programme: 'BSc Agriculture',
              reason: 'name_change', doc: { name: 'Deed_Poll.pdf' }, stage: 'print',
              ageDays: 2.1, gaps: [0.4, 10, 5] }),
      build({ studentId: '10668204', name: 'Naa Adjeley Tetteh', programme: 'BA Information Studies',
              reason: 'lost', doc: { name: 'Police_Report_101.pdf' }, stage: 'ready',
              serial: 'UG73 5510 2284', ageDays: 3.2, gaps: [0.3, 7, 5, 9] }),
      build({ studentId: '10812335', name: 'Selorm Agbeko', programme: 'BSc Statistics',
              reason: 'damaged', doc: { name: 'Card_Front.jpg' }, stage: 'collected',
              serial: 'UG20 9174 6653', ageDays: 6.5, gaps: [0.4, 6, 5, 8, 20] }),
      build({ studentId: '10559871', name: 'Abena Owusu', programme: 'BA Political Science',
              reason: 'lost', doc: { name: 'Statement.pdf' }, stage: 'collected',
              serial: 'UG61 3320 8890', ageDays: 9.0, gaps: [0.5, 9, 6, 10, 26] }),
      build({ studentId: '10904466', name: 'Mohammed Iddrisu', programme: 'BSc Nursing',
              reason: 'stolen', doc: { name: 'Report_scan.jpg' }, stage: 'rejected',
              rejectedReason: 'The uploaded police report is not legible. Upload a clear scan of the full page and resubmit.',
              ageDays: 4.0, gaps: [0.3, 7, 4] }),
      build({ ref: 'UG-ID-2024-012', studentId: ME.id, name: ME.name, programme: ME.programme,
              reason: 'damaged', doc: { name: 'Old_Card.jpg' }, stage: 'collected',
              serial: 'UG18 4402 7761', ageDays: 913, gaps: [0.5, 14, 8, 12, 30] })
    ];

    var notes = [];
    requests.forEach(function (r) {
      r.events.forEach(function (e) {
        notes.push(note(r, e.stage, e.at));
      });
    });

    return {
      requests: requests,
      notifications: notes.sort(function (a, b) { return b.at - a.at; }).slice(0, 40),
      audit: requests.filter(function (r) { return r.stage !== 'submitted'; }).slice(0, 6).map(function (r) {
        return { at: r.events[r.events.length - 1].at, actor: 'K. Mensah (Officer)',
                 action: 'Advanced request to “' + labelOf(r.stage) + '”', ref: r.ref };
      }).sort(function (a, b) { return b.at - a.at; }),
      users: [
        { name: 'Reginald Ankrah', role: 'Student', unit: 'BA Public Administration', status: 'Active' },
        { name: 'K. Mensah', role: 'ID Card Officer', unit: 'Academic Affairs Directorate', status: 'Active' },
        { name: 'J. Adjei', role: 'ID Card Officer', unit: 'Academic Affairs Directorate', status: 'Suspended' },
        { name: 'R. Ankrah', role: 'System Administrator', unit: 'UG Computing Systems', status: 'Active' }
      ]
    };
  }

  function labelOf(stage) {
    if (stage === 'collected') return 'Collected';
    if (stage === 'rejected') return 'Returned to student';
    var i = stageIndex(stage);
    return i >= 0 ? STAGES[i].label : stage;
  }

  /* the message the student actually receives — the feedback loop, made visible */
  function note(r, stage, at) {
    var body = {
      submitted: 'Request ' + r.ref + ' received. Fee GH₵ ' + FEE + '.00 is pending confirmation.',
      payment: 'Payment confirmed for ' + r.ref + '. Your request is now with the ID Card Unit.',
      review: 'Request ' + r.ref + ' is being reviewed by the ID Card Unit.',
      print: 'Good news — ' + r.ref + ' was approved and is in the print batch.',
      ready: 'Your new card for ' + r.ref + ' is ready. Collect at the ID Card Unit, Mon–Fri 09:00–16:00.',
      collected: 'Card collected for ' + r.ref + '. Your previous card is now deactivated.',
      rejected: 'Request ' + r.ref + ' was returned. Open the portal to see what to fix.'
    }[stage] || ('Request ' + r.ref + ' was updated.');
    return { at: at, to: r.name, channel: stage === 'ready' ? 'SMS' : 'Email', ref: r.ref, body: body };
  }

  /* ---------------- persistence ---------------- */
  var state;
  try {
    state = JSON.parse(localStorage.getItem(KEY));
  } catch (e) { state = null; }
  if (!state || !state.requests) { state = seed(); save(); }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function reset() { state = seed(); save(); }

  /* ---------------- queries ---------------- */
  function all() { return state.requests.slice(); }
  function mine() {
    return state.requests.filter(function (r) { return r.studentId === ME.id; })
      .sort(function (a, b) { return b.events[0].at - a.events[0].at; });
  }
  function active() {
    return mine().filter(function (r) { return r.stage !== 'collected'; })[0] || null;
  }
  function byRef(ref) {
    return state.requests.filter(function (r) { return r.ref === ref; })[0] || null;
  }
  function queue() {
    return state.requests.filter(function (r) { return r.stage === 'review'; })
      .sort(function (a, b) { return a.events[0].at - b.events[0].at; });
  }
  function batch() {
    return state.requests.filter(function (r) { return r.stage === 'print'; });
  }
  function at(stage) {
    return state.requests.filter(function (r) { return r.stage === stage; });
  }
  function eventAt(r, stage) {
    for (var i = 0; i < r.events.length; i++) if (r.events[i].stage === stage) return r.events[i];
    return null;
  }

  function metrics() {
    var done = state.requests.filter(function (r) { return eventAt(r, 'ready'); });
    var total = 0, counted = 0;
    done.forEach(function (r) {
      var a = eventAt(r, 'submitted'), b = eventAt(r, 'ready');
      if (a && b) { total += b.at - a.at; counted += 1; }
    });
    var issued = state.requests.filter(function (r) {
      return r.stage === 'collected' || r.stage === 'ready';
    });
    return {
      turnaroundDays: counted ? (total / counted / DAY) : 0,
      sampleSize: counted,
      backlog: {
        review: at('review').length,
        print: at('print').length,
        ready: at('ready').length
      },
      openTotal: at('review').length + at('print').length + at('ready').length,
      issued: issued.length,
      fees: issued.length * FEE,
      returned: at('rejected').length
    };
  }

  /* ---------------- transitions ---------------- */
  function advance(r, stage, by) {
    r.stage = stage;
    var ev = { stage: stage, at: Date.now(), by: by };
    r.events.push(ev);
    state.notifications.unshift(note(r, stage, ev.at));
    state.notifications = state.notifications.slice(0, 60);
    save();
    return ev;
  }

  function log(actor, action, ref) {
    state.audit.unshift({ at: Date.now(), actor: actor, action: action, ref: ref });
    state.audit = state.audit.slice(0, 60);
    save();
  }

  function create(input) {
    var year = new Date().getFullYear();
    var used = state.requests.map(function (r) { return r.ref; });
    var n = 89;
    var mk = function (i) { return 'UG-ID-' + year + '-' + ('00' + i).slice(-3); };
    while (used.indexOf(mk(n)) !== -1) n += 1;
    var r = {
      ref: mk(n),
      studentId: ME.id, name: ME.name, programme: ME.programme,
      reason: input.reason,
      doc: { name: input.docName || 'No document attached' },
      fee: FEE,
      pay: { channel: input.channel, receipt: 'PENDING', status: 'pending' },
      stage: 'submitted', serial: null, rejectedReason: null,
      events: [{ stage: 'submitted', at: Date.now(), by: 'Student' }]
    };
    state.requests.push(r);
    state.notifications.unshift(note(r, 'submitted', Date.now()));
    log(ME.name + ' (Student)', 'Submitted a ' + REASONS[input.reason].toLowerCase() + ' request', r.ref);
    save();
    return r;
  }

  /* the payment platform confirming the fee — simulated, but it is a separate actor */
  function confirmPayment(ref) {
    var r = byRef(ref);
    if (!r || r.stage !== 'submitted') return null;
    r.pay.status = 'verified';
    r.pay.receipt = (r.pay.channel === 'Bank card' ? 'CD' : 'MM') + Math.floor(Math.random() * 9e7 + 1e7);
    advance(r, 'payment', 'Payment platform');
    log('Payment platform', 'Confirmed GH₵ ' + FEE + '.00 · receipt ' + r.pay.receipt, r.ref);
    return r;
  }

  function queueForReview(ref) {
    var r = byRef(ref);
    if (!r || r.stage !== 'payment') return null;
    advance(r, 'review', 'System');
    return r;
  }

  function approve(ref, by) {
    var r = byRef(ref);
    if (!r || r.stage !== 'review') return null;
    advance(r, 'print', by);
    log(by + ' (Officer)', 'Approved request and queued it for printing', ref);
    return r;
  }

  function reject(ref, reason, by) {
    var r = byRef(ref);
    if (!r || r.stage !== 'review') return null;
    r.rejectedReason = reason;
    advance(r, 'rejected', by);
    log(by + ' (Officer)', 'Returned request to the student — ' + reason, ref);
    return r;
  }

  function printBatch(by) {
    var list = batch();
    list.forEach(function (r) {
      r.serial = serial();
      advance(r, 'ready', by);
    });
    if (list.length) {
      log(by + ' (Officer)', 'Printed a batch of ' + list.length + ' card' + (list.length === 1 ? '' : 's'), '—');
    }
    return list;
  }

  function collect(ref, by) {
    var r = byRef(ref);
    if (!r || r.stage !== 'ready') return null;
    advance(r, 'collected', by);
    log(by + ' (Officer)', 'Recorded collection; previous card deactivated', ref);
    return r;
  }

  return {
    STAGES: STAGES, REASONS: REASONS, ME: ME, FEE: FEE,
    stageIndex: stageIndex, labelOf: labelOf, eventAt: eventAt,
    all: all, mine: mine, active: active, byRef: byRef, queue: queue, batch: batch, at: at,
    metrics: metrics,
    notifications: function () { return state.notifications; },
    audit: function () { return state.audit; },
    users: function () { return state.users; },
    create: create, confirmPayment: confirmPayment, queueForReview: queueForReview,
    approve: approve, reject: reject, printBatch: printBatch, collect: collect,
    reset: reset
  };
})();
