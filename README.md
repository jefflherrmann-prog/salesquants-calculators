# SalesQuants — Agent vs. Calculators (PWA)

The SalesQuants calculator mobile app, green-lit by Jeff on 2026-10-25:
a dependency-free PWA (vanilla HTML/CSS/JS, no build step) that can later
wrap with Capacitor unchanged for the App Store / Google Play.
Step 1 (2026-10-25): app skeleton + Agent vs. SDR. Step 2 (2026-10-25):
Agent vs. Rep ported in, same extract-and-verify method. Step 3 (2026-10-25):
the real Beehiiv subscribe form wired into every calculator view.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | Mobile-first app shell: brand header, calculator picker, and the SDR, Rep and Amplified calculator views. |
| `model.js` | The SDR model — pure functions, no DOM. Loads in the browser (`window.SQModel`) and in Node (`module.exports`) for testing. |
| `model-rep.js` | The Rep model — same pattern (`window.SQRepModel`): sanitized inputs (the source's `read()` clamps) plus `computeModel()`. |
| `model-amplified.js` | The Amplified Rep model — same pattern (`window.SQAmpModel`): baseline funnel plus AI uplift levers discounted by a realization rate. |
| `app.js` | UI logic: hash routing (`#/` picker, `#/sdr`, `#/rep`, `#/amp`), result rendering, executive summaries, CSV export (SDR, Amplified), saved scenarios. |
| `styles.css` | The live calculators' color system and components (panels, verdict, bars, mini-grid, Rep scenario cards, CTA blocks), single-column mobile layout. |
| `manifest.webmanifest` | `SalesQuants — Agent vs. Calculators`, `display: standalone`, theme `#172c1c`, background `#f5f6f2`. |
| `sw.js` | Service worker: cache-first app shell for full offline use. Currently `sq-calc-app-v4` (v2 added `model-rep.js`; v3 wired the live Beehiiv form; v4 added the Amplified Rep calculator, `model-amplified.js`). Bump `CACHE_VERSION` when any shell file changes. |
| `icons/` | `icon.svg` source + rendered `icon-192.png` / `icon-512.png` (lime SQ monogram + keypad dots on ink green `#172c1c`, matching the brand palette). |

## The app today

- **Picker** with three entries:
  - **Agent vs. SDR — Live.** Full port of the live web calculator: same 16 inputs,
    same defaults, same sections, same results presentation (verdict, ROI hero,
    payback, net-value bars, six mini metrics, notes), plus Copy executive summary,
    Download CSV and Reset, all working.
  - **Agent vs. Rep — Live.** Full port of the standalone Rep calculator: same 12
    inputs, defaults and input clamping, same two-case results presentation
    (verdict with net-value delta, "Assist the reps" vs. "Automate the work" cards,
    shared investment metrics, pilot guardrails), plus Copy summary and Reset.
    Its formatters are the source page's own (compact $K/$M money, plain percent,
    months), and its result element ids carry a `rep` prefix inside the app.
  - **Agent vs. RevOps Analyst — Coming soon.** Deliberately **not** wired in:
    that calculator is still a draft pending Jeff's review.
- **Conversion blocks** sit in the same positions as the web pages, immediately after
  the results. SDR: the Instantly affiliate CTA (same heading, copy, referral link and
  commission disclosure as the live suite pages) followed by the email capture block.
  Rep: the email capture block only — no affiliate CTA (Instantly is SDR-page only),
  matching the live Rep page's arrangement.
- **Saved scenarios** (all calculators): name and save the current inputs, load or
  delete them later. Stored in `localStorage` on-device only — SDR under
  `sq.agentVsSdr.scenarios.v1`, Rep under `sq.agentVsRep.scenarios.v1`. Each
  calculator also quietly restores your last-used inputs on reopen
  (`sq.agentVsSdr.lastInputs.v1` / `sq.agentVsRep.lastInputs.v1`).

## How the math port was verified

The model was extracted, not reinvented: every formula, helper (`safeDiv`,
`productiveMonths`) and default in `model.js` matches the source page
(`../agent-vs-sdr-roi-calculator/agent-vs-sdr-roi-calculator.html`) line for line.

A Node harness then ran the **source page's own script** in a DOM stub and compared
its `window.latest` output against `computeModel()` on four input sets:

1. The source defaults — identical (agent net $219,300, SDR net $83,400, ROI 311.1%, payback 2.92 mo)
2. A scaled 5-seat team with a pricier agent — identical
3. An SDR-favorable case (expensive agent, low agent volume; SDR wins) — identical
4. An edge case (zero agent meetings, zero ACV, full-year ramp) — identical

All 14 output fields matched exactly on every case, as did the 16-key defaults
object and all 16 HTML input default values. A second DOM-stub run of the real
`model.js` + `app.js` exercised initial render, live recalculation, scenario
save/load/delete and reset — all passing.

### Rep (step 2)

The Rep model was extracted the same way from
`../agent-vs-rep-roi-calculator/agent-vs-rep-roi-calculator.html` — whose script
and input defaults are byte-identical in the `-embed.html` variant. The port
includes the source's `read()` input sanitizing (non-negative coercion plus
clamps: reps 1–10000, attainment 0–200, other percentages 0–100, weekHours
1–100, autoHours ≤ weekHours), copied into `model-rep.js`.

A Node harness ran the **source page's own script** in a DOM stub and compared
its `calculate()` return object against `computeModel()` on five input sets:

1. The source defaults — identical (assist net $321,800, capacity net $117,000,
   assist ROI 279.8%, total investment $115,000, 1.6 FTE, delta $204,800)
2. A small 3-rep team (both cases negative; capacity "wins") — identical
3. A capacity-wins case (high loaded cost, low capture) — identical
4. An edge case (zeros throughout plus out-of-range values exercising every
   clamp; NaN paybacks, zero-division ROI branches) — identical
5. Decimal inputs throughout — identical

All 19 output fields (including the sanitized-inputs object) matched exactly on
every case, as did the 12 defaults across the source HTML, the embed variant,
the app model and the app HTML. A second DOM-stub run of the real app then
compared all 22 rendered Rep result strings against the source page's own
rendered strings for both the defaults and the capacity-wins case — identical,
including the copied executive summary (byte-identical to the source's
`summaryText()`) — and exercised picker routing to `#/rep`, live recalculation,
scenario save/load/delete, reset, and an SDR smoke check (defaults render,
navigation, recalculation) after the changes. All passing.

### Beehiiv (step 3)

The email capture is the publication's real subscribe form, taken from the
live Agent vs. Rep web page: a Beehiiv v3 iframe embed,
`https://subscribe-forms.beehiiv.com/v3/forms/8625f60e-2189-474d-aa23-2497c6e48e3c`
(form ID `8625f60e-2189-474d-aa23-2497c6e48e3c`), used identically in both
calculator views — the SDR web page carries no form of its own, so this one
publication form serves the whole suite. The live page passes a referrer
pointing at its own page URL; the app instead passes
`referrer=https%3A%2F%2Fsalesquants.com%2F` (the site root) in both views,
because the app is a single page with hash routes and has no per-calculator
page URL to attribute. The iframe is styled in `styles.css`
(`.email-capture .beehiiv-embed`: width 100%, height 400px, no border) inside
the existing capture block, `loading="lazy"` with a descriptive `title`, and
the block's heading/copy now match the live form's copy ("Get the Agent vs.
playbook in your inbox" / "The model guide, honest benchmarks, and new
calculators as we build them. We model, we don't market." / button "Send it
to me"). The placeholder forms and their dead submit handlers in `app.js`
were removed; the form needs no app JS.

Verification: the form URL returns HTTP 200 and its HTML contains the form
(the "Send it to me" button and the playbook heading); a static check of the
served app confirms one iframe per calculator view with the correct `src`, no
`BEEHIIV EMBED PLACEHOLDER` markers or placeholder element ids left anywhere,
and balanced section tags; both models still produce the verified step-1/2
default outputs (SDR agent net $219,300, SDR net $83,400, ROI 311.1%,
payback 2.92 mo; Rep assist net $321,800, capacity net $117,000, total
investment $115,000) and recalculate on changed inputs. The form was never
submitted during verification — no subscription was created.

**Standing note:** the **live SDR web page itself currently has no Beehiiv
form at all** (only the Rep page carries the embed). That's a website gap,
flagged to Jeff separately — this step changed the app only, not the site.

## What's placeholder
- **Fonts.** The web pages load DM Sans / Libre Franklin from Google Fonts; the app
  uses the same family names with a system-font fallback stack so it works fully
  offline and stays dependency-free. Self-hosting the fonts is an option at wrap time.
- **Icons** are a clean generated monogram, not final brand art.

## Run it

Serve this folder over HTTP (service workers don't run from `file://`):

```sh
cd calculator-app && python3 -m http.server 8080
# open http://localhost:8080
```

## Next steps

1. Publish the PWA at salesquants.com (install prompt from the calculator pages).
2. Capacitor wrap: `npx @capacitor/cli init`, point `webDir` at this folder,
   add iOS/Android, submit. No app code changes expected.
3. Wire **Agent vs. RevOps Analyst** only after Jeff approves the draft calculator.
4. Separately (website, not the app): consider adding the Beehiiv form to the
   live SDR web page, which currently has none.
