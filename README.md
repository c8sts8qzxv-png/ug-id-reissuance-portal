# SIRTS — Student ID Card Reissuance Tracking System

A working front-end prototype of a portal for replacing a lost, stolen or damaged
student ID card at the University of Ghana, Legon.

Coursework prototype for **INFS 328 System Analysis & Design**, Department of
Information Studies. It is not an official University service, and every name,
record, receipt and figure in it is illustrative test data.

**Live demo:** https://c8sts8qzxv-png.github.io/ug-id-reissuance-portal/

---

## The problem it addresses

Replacing a student ID card at Legon is manual and paper-based. A student fills in a
paper form, pays the fee, and hands the bundle over a counter, where it waits in a tray
for manual verification and an irregular print batch.

The delay students complain about is two problems, not one:

- a **processing** delay — manual checks and batch printing, and
- an **information** delay — no reference number, no status, no notification. The only
  way to find out anything is to walk back to the office and ask.

The second one is what this prototype is built around. Every screen is organised so
that the current stage of a request, and the time it has been sitting there, is the
first thing anyone sees.

## What it does

| Role | What they can do |
| --- | --- |
| **Student** | Submit a replacement request with a reason and a supporting document, pay the fee, get a reference number, watch the request move through five stages, read every message the system sent them, see request history |
| **ID Card Officer** | Work an oldest-first queue, open a request, approve it or return it with a written reason, print a batch (which assigns card serials and produces a printable batch list), record collection at the counter |
| **Administrator** | Average turnaround computed from real timestamps, backlog by stage, cards issued, fees processed, full audit trail of who did what and when, user accounts |

The three roles share one data store, so the workflow is genuinely connected: approve a
request as the officer, switch to the student, and the card has moved on.

## Running it

Any static file server, or just open `index.html` in a browser — there is no build step
and no backend.

```bash
python3 -m http.server 8123
```

Then open http://localhost:8123.

State lives in `localStorage` under the key `sirts.v5`. **Reset demo data** in the
Administrator view restores the sample queue.

## Suggested two-minute demo

1. Open the front page — the hero card mints itself through the five stages.
2. Sign in as **Student**: request a replacement card, choose "Lost card", pay. Watch the
   reference number appear, then the payment confirmation land a moment later.
3. Open **Messages sent** in the masthead — these are the SMS and e-mails the student
   would have received. This is the feedback loop the counter process does not have.
4. Switch to **ID Card Officer**: the new request is at the bottom of the queue. Open it,
   check the document, approve it.
5. Press **Print batch** — serials are assigned, the students are messaged, and a
   printable batch list is produced.
6. Switch back to **Student**: the card is now printed, with its serial, ready for
   collection.
7. Switch to **Administrator**: turnaround, backlog and the audit trail have all moved.

## How it maps to the Phase 2 requirements

| Requirement | Where it is |
| --- | --- |
| FR2 Submit request with reason | Student → *Request a replacement card* |
| FR3 Upload supporting document | Same form; required for a lost or stolen card |
| FR4 Unique reference number | Issued on submission, shown on every screen |
| FR5 Verify fee payment | Simulated payment-platform confirmation after submission |
| FR6 Approve or reject with a reason | Officer → detail panel; the reason is mandatory |
| FR7 Print batch queue | Officer → *Print batch*, with a print stylesheet for the list |
| FR8 Track request status | Student → five-stage rail with timestamps and elapsed time |
| FR9 Notifications at every stage | *Messages sent* in the masthead |
| FR10 Confirm collection | Officer → *Waiting at the counter* → *Record collection* |
| FR11 Deactivate old card, record serial | On collection; serial assigned at printing |
| FR12 Management reports | Administrator → turnaround, backlog, volumes |
| FR13 Manage user accounts | Administrator → user accounts |
| NFR6 Mobile-first, low bandwidth | No framework, no images; three stylesheets and three scripts |
| NFR4 Audit trail | Administrator → audit trail |

## What is real and what is simulated

Real in this prototype:

- the state machine and every stage transition
- turnaround, backlog and volume figures, computed from the stored timestamps
- the notification log and the audit trail, written as actions happen
- persistence across reloads, and the printable batch list

Simulated, because there is no backend:

- payment confirmation, which arrives on a timer rather than from a payment platform
- uploaded documents, whose filenames are kept but whose contents are not stored
- authentication — the role switcher stands in for signing in
- SMS and e-mail, which are written to the message log instead of being sent

## Hosting

It is already hosted, free, at the link above. GitHub Pages serves it from a public URL
over HTTPS, so it opens on **any device, on any network** — a phone on mobile data, a
lecture-hall projector, the examiner's own laptop. Nothing needs to be installed and the
machine that built it does not need to be switched on. There is no expiry and no card on
file; free Pages is unmetered for normal use, with a soft limit of 100 GB of traffic a
month and 10 builds an hour, neither of which a site this size will approach.

Every push to `main` republishes it within about a minute.

If you ever want to move it, the site is plain static files, so any of these will serve
it unchanged and for free:

| Host | Free tier | Worth knowing |
| --- | --- | --- |
| **GitHub Pages** (current) | Unlimited public sites | Deploys straight from the repo; no separate account |
| **Cloudflare Pages** | Unlimited sites and bandwidth | Fastest in Ghana — Cloudflare has an Accra edge; connect the repo and set the build output to `/` |
| **Netlify** | 100 GB/month | Deploy previews per branch; drag-and-drop upload also works |
| **Vercel** | 100 GB/month | Same idea; overkill for a static site |
| **Surge.sh** | Unlimited | One command, `surge .` — no account linking, no repo needed |

All of them accept a custom domain later (`sirts.example.gh`) if the Department ever
wanted one.

## Layout

```
index.html          front page: the problem, the five stages, and the way in
app.html            the portal: student, officer and administrator views
assets/css/base.css design tokens, shared components, the ID-card artifact
assets/css/home.css front page
assets/css/app.css  portal
assets/js/store.js  seed data, state transitions, persistence, metrics
assets/js/app.js    view rendering and interactions
assets/js/home.js   the hero card animation
```

## Notes on the design

The interface is built around the physical thing at the centre of the process: the card.
It is drawn as a blueprint while the request is open, gains a gold foil seal when it is
approved, and resolves to a printed card with a serial number when it is ready — so the
progress of the request is legible before you read a single word.

Typography is the IBM Plex superfamily in three roles: Sans Condensed for headings,
Sans for interface text, and Mono for anything that behaves like a serial number —
references, receipts, timestamps and card serials.

The palette is the University's own three colours, each given one job:

| Colour | Value | Used for |
| --- | --- | --- |
| Midnight Blue | `#191970` | Structure — masthead, hero and section fields, primary actions |
| Lemon Yellow | `#FFF200` | What has already happened — completed stages, the highlight, the "ready" message |
| Vegas Gold | `#C5B358` | The card and its seal, and the rule under the masthead |

The colour names are the University's; the hex values are the standard values for those
names, adjusted only where screen legibility demanded it. Lemon yellow is about 1.1:1
against white, so it never carries text on a light background — where text sits on lemon
it is midnight blue, which is about 13:1.

Motion is used where it explains something. The hero mints the card and delivers its four
messages in one run, because that sequence *is* the argument the project makes. The stage
rail fills and lights its stations as it scrolls into view. In the portal motion is kept
short: figures count up so a change reads as a change, the queue fills from the top, and a
stage mark lands with a little weight when a request reaches it. All of it is disabled
under `prefers-reduced-motion`.
