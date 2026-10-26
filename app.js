/*
 * SalesQuants calculator app — UI logic.
 * The calculator's result rendering, executive summary and CSV export are
 * ported from the live page (agent-vs-sdr-roi-calculator.html); all math
 * lives in model.js (window.SQModel) and is verified identical to the source.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var money = function (value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value); };
  var pct = function (value) { return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format(value); };
  var safeDiv = window.SQModel.safeDiv;

  /* ---------------- View routing (hash-based, back-button friendly) ---------------- */
  var views = { home: $('view-home'), sdr: $('view-sdr'), rep: $('view-rep') };

  function showView(name) {
    Object.keys(views).forEach(function (key) { views[key].hidden = key !== name; });
    $('backBtn').hidden = name === 'home';
    window.scrollTo(0, 0);
  }
  function route() {
    var hash = window.location.hash;
    showView(hash === '#/sdr' ? 'sdr' : hash === '#/rep' ? 'rep' : 'home');
  }
  window.addEventListener('hashchange', route);
  $('openSdr').addEventListener('click', function () { window.location.hash = '#/sdr'; });
  $('openRep').addEventListener('click', function () { window.location.hash = '#/rep'; });
  $('backBtn').addEventListener('click', function () { window.location.hash = '#/'; });
  route();

  /* ---------------- Agent vs. SDR calculator ---------------- */
  var defaults = window.SQModel.defaults;
  var ids = Object.keys(defaults);
  var num = function (id) { return Number($(id).value) || 0; };
  var latest = null;

  function readInputs() {
    var v = {};
    ids.forEach(function (id) { v[id] = num(id); });
    return v;
  }
  function writeInputs(v) {
    ids.forEach(function (id) { if (v[id] !== undefined) $(id).value = v[id]; });
  }

  // Result rendering mirrors the source page's calculate() DOM updates.
  function calculate() {
    var r = window.SQModel.computeModel(readInputs());
    latest = r;

    $('agentRoi').textContent = pct(r.agentRoi);
    $('payback').textContent = safeDiv(r.agentGp, 12) > 0 ? 'Payback: ' + r.payback.toFixed(1) + ' months' : 'Payback: not reached';
    $('agentNet').textContent = money(r.agentNet);
    $('sdrNet').textContent = money(r.sdrNet);
    $('agentCost').textContent = money(r.agentCost);
    $('sdrCost').textContent = money(r.sdrCost);
    $('agentCpm').textContent = r.agentMeetings ? money(r.agentCost / r.agentMeetings) : '—';
    $('sdrCpm').textContent = r.sdrMeetings ? money(r.sdrCost / r.sdrMeetings) : '—';
    $('agentGp').textContent = money(r.agentGp);
    $('sdrGp').textContent = money(r.sdrGp);
    $('verdictTitle').textContent = r.agentWins ? 'The agent leads on first-year net value.' : 'The SDR motion leads on first-year net value.';
    $('verdictCopy').textContent = r.agentWins
      ? 'That advantage depends on meeting quality holding up at your entered conversion rates.'
      : 'At these inputs, the human motion creates more gross profit after first-year costs.';
    $('advantage').textContent = (r.advantage >= 0 ? '+' : '−') + money(Math.abs(r.advantage)) + ' ' + (r.agentWins ? 'agent advantage' : 'SDR advantage');

    var maxPositive = Math.max(1, r.agentNet, r.sdrNet);
    $('agentBar').style.width = (Math.max(0, r.agentNet) / maxPositive * 100) + '%';
    $('sdrBar').style.width = (Math.max(0, r.sdrNet) / maxPositive * 100) + '%';

    persistLastInputs();
  }

  function summary() {
    var r = latest;
    var winner = r.agentWins ? 'Agent' : 'SDR';
    return 'Agent vs. SDR — first-year model\n\nRecommendation: ' + winner + ' leads on net value by ' + money(Math.abs(r.advantage)) + '.\n\nAgent: ' + money(r.agentCost) + ' first-year cost, ' + Math.round(r.agentMeetings) + ' meetings, ' + money(r.agentGp) + ' gross profit, ' + money(r.agentNet) + ' net value, ' + pct(r.agentRoi) + ' ROI' + (r.payback > 0 ? ', ' + r.payback.toFixed(1) + '-month payback' : '') + '.\nSDR: ' + money(r.sdrCost) + ' first-year cost, ' + Math.round(r.sdrMeetings) + ' meetings, ' + money(r.sdrGp) + ' gross profit, ' + money(r.sdrNet) + ' net value.\n\nAssumptions: ' + num('oppRate') + '% meeting-to-opportunity, ' + num('winRate') + '% win rate, ' + money(num('acv')) + ' ACV, ' + num('grossMargin') + '% gross margin. Planning model only; validate assumptions before making a decision.';
  }

  function flashStatus(el, msg) {
    el.textContent = msg;
    setTimeout(function () { el.textContent = ''; }, 2500);
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary());
      flashStatus($('status'), 'Executive summary copied.');
    } catch (_) {
      var area = document.createElement('textarea');
      area.value = summary(); document.body.appendChild(area); area.select();
      document.execCommand('copy'); area.remove();
      flashStatus($('status'), 'Executive summary copied.');
    }
  }

  function downloadCsv() {
    var r = latest;
    var rows = [
      ['Metric', 'Agent', 'SDR'],
      ['First-year cost', r.agentCost, r.sdrCost],
      ['Productive meetings', r.agentMeetings, r.sdrMeetings],
      ['Modeled revenue', r.agentRevenue, r.sdrRevenue],
      ['Modeled gross profit', r.agentGp, r.sdrGp],
      ['Net value', r.agentNet, r.sdrNet],
      ['Cost per meeting', safeDiv(r.agentCost, r.agentMeetings), safeDiv(r.sdrCost, r.sdrMeetings)]
    ];
    var csv = rows.map(function (row) { return row.map(function (v) { return '"' + String(v).replaceAll('"', '""') + '"'; }).join(','); }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'agent-vs-sdr-roi.csv'; link.click();
    URL.revokeObjectURL(link.href);
    flashStatus($('status'), 'CSV downloaded.');
  }

  ids.forEach(function (id) { $(id).addEventListener('input', calculate); });
  $('copyBtn').addEventListener('click', copySummary);
  $('csvBtn').addEventListener('click', downloadCsv);
  $('resetBtn').addEventListener('click', function () {
    writeInputs(defaults);
    calculate();
    flashStatus($('status'), 'Defaults restored.');
  });

  /* ---------------- Saved scenarios (localStorage) ---------------- */
  var SCENARIOS_KEY = 'sq.agentVsSdr.scenarios.v1';
  var LAST_KEY = 'sq.agentVsSdr.lastInputs.v1';

  function loadScenarios() {
    try {
      var parsed = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }
  function storeScenarios(list) {
    try { localStorage.setItem(SCENARIOS_KEY, JSON.stringify(list)); } catch (_) { /* storage unavailable */ }
  }
  function persistLastInputs() {
    try { localStorage.setItem(LAST_KEY, JSON.stringify(readInputs())); } catch (_) { /* storage unavailable */ }
  }
  function restoreLastInputs() {
    try {
      var saved = JSON.parse(localStorage.getItem(LAST_KEY) || 'null');
      if (saved) writeInputs(saved);
    } catch (_) { /* start from defaults */ }
  }

  function renderScenarios() {
    var list = loadScenarios();
    var ul = $('scenarioList');
    ul.innerHTML = '';
    $('scenarioEmpty').hidden = list.length > 0;
    list.forEach(function (entry, index) {
      var li = document.createElement('li');
      li.className = 'scenario-item';

      var name = document.createElement('span');
      name.className = 'scenario-name';
      name.textContent = entry.name;

      var load = document.createElement('button');
      load.type = 'button'; load.className = 'btn'; load.textContent = 'Load';
      load.addEventListener('click', function () {
        writeInputs(entry.inputs);
        calculate();
        flashStatus($('scenarioStatus'), 'Loaded "' + entry.name + '".');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      var del = document.createElement('button');
      del.type = 'button'; del.className = 'btn'; del.textContent = 'Delete';
      del.addEventListener('click', function () {
        var next = loadScenarios();
        next.splice(index, 1);
        storeScenarios(next);
        renderScenarios();
        flashStatus($('scenarioStatus'), 'Deleted "' + entry.name + '".');
      });

      li.appendChild(name); li.appendChild(load); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $('saveScenarioBtn').addEventListener('click', function () {
    var name = $('scenarioName').value.trim();
    if (!name) { flashStatus($('scenarioStatus'), 'Give the scenario a name first.'); return; }
    var list = loadScenarios().filter(function (e) { return e.name !== name; });
    list.push({ name: name, inputs: readInputs(), savedAt: new Date().toISOString() });
    storeScenarios(list);
    $('scenarioName').value = '';
    renderScenarios();
    flashStatus($('scenarioStatus'), 'Saved "' + name + '".');
  });

  // Email capture is a live Beehiiv iframe embed in index.html — no JS needed.

  restoreLastInputs();
  renderScenarios();
  calculate();

  /* ---------------- Agent vs. Rep calculator ----------------
   * Ported from agent-vs-rep-roi-calculator.html. All math lives in
   * model-rep.js (window.SQRepModel); the formatters and the result
   * rendering below mirror the source page exactly (its compact $K/$M
   * money style, plain-percent and months formatters included).
   * Result element ids carry a `rep` prefix to avoid colliding with
   * the SDR view's ids in the shared document. */
  var repDefaults = window.SQRepModel.defaults;
  var repIds = Object.keys(repDefaults);
  var repNum = function (id) { return Number($(id).value) || 0; };
  var repLatest = null;

  // Formatters copied 1:1 from the source page.
  var moneyCompact = function (value) {
    var abs = Math.abs(value);
    var sign = value < 0 ? '−' : '';
    if (abs >= 1000000) return sign + '$' + (abs / 1000000).toFixed(abs >= 10000000 ? 1 : 2).replace(/\.0+$|0+$/, '').replace(/\.$/, '') + 'M';
    if (abs >= 1000) return sign + '$' + Math.round(abs / 1000).toLocaleString() + 'K';
    return sign + '$' + Math.round(abs).toLocaleString();
  };
  var pctPlain = function (value) { return Number.isFinite(value) ? Math.round(value).toLocaleString() + '%' : '—'; };
  var monthsFmt = function (value) { return Number.isFinite(value) && value >= 0 ? Math.min(value, 999).toFixed(1) + ' mo' : 'No payback'; };

  function readRepInputs() {
    var v = {};
    repIds.forEach(function (id) { v[id] = repNum(id); });
    return v;
  }
  function writeRepInputs(v) {
    repIds.forEach(function (id) { if (v[id] !== undefined) $(id).value = v[id]; });
  }

  // Result rendering mirrors the source page's calculate() DOM updates.
  function calculateRep() {
    var r = window.SQRepModel.computeModel(readRepInputs());
    repLatest = r;

    $('repAssistNet').textContent = moneyCompact(r.assistNet);
    $('repAssistRevenue').textContent = moneyCompact(r.incrementalRevenue);
    $('repAssistGross').textContent = moneyCompact(r.grossProfit);
    $('repAssistROI').textContent = pctPlain(r.assistROI);
    $('repAssistPayback').textContent = monthsFmt(r.assistPayback);

    $('repCapacityNet').textContent = moneyCompact(r.capacityNet);
    $('repCapacityFte').textContent = r.fte.toFixed(1) + ' FTE';
    $('repCapacityValue').textContent = moneyCompact(r.capacityValue);
    $('repCapacityROI').textContent = pctPlain(r.capacityROI);
    $('repCapacityPayback').textContent = monthsFmt(r.capacityPayback);

    $('repRecurringCost').textContent = moneyCompact(r.recurring);
    $('repTotalCost').textContent = moneyCompact(r.total);
    $('repHoursReturned').textContent = Math.round(r.hoursReturned).toLocaleString();

    $('repVerdictTitle').textContent = r.assistWins ? 'Assist the team first' : 'Prioritize capacity first';
    $('repVerdictText').textContent = r.assistWins
      ? 'The modeled gross-profit lift is stronger than the value of capacity alone. Pilot the workflow before treating time saved as revenue.'
      : 'The modeled value of reusable capacity is stronger than the revenue-lift case. Tie the pilot to workload moved or hiring avoided.';
    $('repVerdictDelta').textContent = '+' + moneyCompact(r.delta).replace('−', '');
    $('repAssistTag').textContent = r.assistWins ? 'Stronger case' : 'Second case';
    $('repCapacityTag').textContent = r.assistWins ? 'Second case' : 'Stronger case';

    $('repPilotScope').textContent = 'Start with ' + r.pilotReps + ' rep' + (r.pilotReps === 1 ? '' : 's') + ' for 60–90 days';
    $('repTimeThreshold').textContent = 'Require ' + r.weeklyPerRep.toFixed(1) + ' hours returned per rep each week';
    $('repRevenueThreshold').textContent = r.v.margin > 0
      ? 'Prove at least ' + moneyCompact(r.breakEvenRevenue) + ' in annualized revenue lift'
      : 'Set a gross-margin assumption to calculate break-even revenue';

    persistRepLastInputs();
  }

  // The source page's summaryText(), rendered from the latest model run.
  function repSummary() {
    var r = repLatest;
    return [
      'AI Agent ROI — Year-One Decision Summary',
      '',
      'Modeled signal: ' + (r.assistWins ? 'Assist the team first' : 'Prioritize capacity first'),
      'Assist reps: ' + moneyCompact(r.assistNet) + ' net value, ' + pctPlain(r.assistROI) + ' ROI, ' + moneyCompact(r.incrementalRevenue) + ' incremental revenue',
      'Automate work: ' + moneyCompact(r.capacityNet) + ' net value, ' + pctPlain(r.capacityROI) + ' ROI, ' + r.fte.toFixed(1) + ' FTE-equivalent capacity',
      'Investment: ' + moneyCompact(r.total) + ' in year one (' + moneyCompact(r.recurring) + ' recurring)',
      'Time returned: ' + Math.round(r.hoursReturned).toLocaleString() + ' hours per year',
      '',
      'Pilot: ' + r.pilotReps + ' rep' + (r.pilotReps === 1 ? '' : 's') + ' for 60–90 days; require ' + r.weeklyPerRep.toFixed(1) + ' useful hours returned per rep per week.',
      '',
      'Decision model only. Do not add the assist and capacity cases together.'
    ].join('\n');
  }

  async function copyRepSummary() {
    try {
      await navigator.clipboard.writeText(repSummary());
      flashStatus($('repStatus'), 'Summary copied.');
    } catch (_) {
      var area = document.createElement('textarea');
      area.value = repSummary(); document.body.appendChild(area); area.select();
      document.execCommand('copy'); area.remove();
      flashStatus($('repStatus'), 'Summary copied.');
    }
  }

  repIds.forEach(function (id) { $(id).addEventListener('input', calculateRep); });
  $('repCopyBtn').addEventListener('click', copyRepSummary);
  $('repResetBtn').addEventListener('click', function () {
    writeRepInputs(repDefaults);
    calculateRep();
    flashStatus($('repStatus'), 'Defaults restored.');
  });

  /* ---------------- Rep saved scenarios (localStorage) ---------------- */
  var REP_SCENARIOS_KEY = 'sq.agentVsRep.scenarios.v1';
  var REP_LAST_KEY = 'sq.agentVsRep.lastInputs.v1';

  function loadRepScenarios() {
    try {
      var parsed = JSON.parse(localStorage.getItem(REP_SCENARIOS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }
  function storeRepScenarios(list) {
    try { localStorage.setItem(REP_SCENARIOS_KEY, JSON.stringify(list)); } catch (_) { /* storage unavailable */ }
  }
  function persistRepLastInputs() {
    try { localStorage.setItem(REP_LAST_KEY, JSON.stringify(readRepInputs())); } catch (_) { /* storage unavailable */ }
  }
  function restoreRepLastInputs() {
    try {
      var saved = JSON.parse(localStorage.getItem(REP_LAST_KEY) || 'null');
      if (saved) writeRepInputs(saved);
    } catch (_) { /* start from defaults */ }
  }

  function renderRepScenarios() {
    var list = loadRepScenarios();
    var ul = $('repScenarioList');
    ul.innerHTML = '';
    $('repScenarioEmpty').hidden = list.length > 0;
    list.forEach(function (entry, index) {
      var li = document.createElement('li');
      li.className = 'scenario-item';

      var name = document.createElement('span');
      name.className = 'scenario-name';
      name.textContent = entry.name;

      var load = document.createElement('button');
      load.type = 'button'; load.className = 'btn'; load.textContent = 'Load';
      load.addEventListener('click', function () {
        writeRepInputs(entry.inputs);
        calculateRep();
        flashStatus($('repScenarioStatus'), 'Loaded "' + entry.name + '".');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      var del = document.createElement('button');
      del.type = 'button'; del.className = 'btn'; del.textContent = 'Delete';
      del.addEventListener('click', function () {
        var next = loadRepScenarios();
        next.splice(index, 1);
        storeRepScenarios(next);
        renderRepScenarios();
        flashStatus($('repScenarioStatus'), 'Deleted "' + entry.name + '".');
      });

      li.appendChild(name); li.appendChild(load); li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $('repSaveScenarioBtn').addEventListener('click', function () {
    var name = $('repScenarioName').value.trim();
    if (!name) { flashStatus($('repScenarioStatus'), 'Give the scenario a name first.'); return; }
    var list = loadRepScenarios().filter(function (e) { return e.name !== name; });
    list.push({ name: name, inputs: readRepInputs(), savedAt: new Date().toISOString() });
    storeRepScenarios(list);
    $('repScenarioName').value = '';
    renderRepScenarios();
    flashStatus($('repScenarioStatus'), 'Saved "' + name + '".');
  });

  // Email capture is a live Beehiiv iframe embed in index.html — no JS needed.

  restoreRepLastInputs();
  renderRepScenarios();
  calculateRep();

  /* ---------------- Service worker (offline shell) ---------------- */
  if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support unavailable */ });
    });
  }
})();
