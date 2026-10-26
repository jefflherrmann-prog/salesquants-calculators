/*
 * SalesQuants — Agent vs. Rep ROI model.
 *
 * Ported verbatim (math only) from the standalone calculator:
 *   agent-vs-rep-roi-calculator/agent-vs-rep-roi-calculator.html
 * (the -embed.html variant carries a byte-identical script and defaults).
 *
 * Every formula, the input clamping from the source's read(), and every
 * default below matches the source page exactly, so app results are
 * numerically identical to the web calculator. Verified by a Node
 * DOM-stub comparison run (see README.md).
 *
 * Pure functions only — no DOM access — so this file loads unchanged in
 * the browser (window.SQRepModel) and in Node (module.exports) for
 * testing, and will survive the later Capacitor wrap untouched.
 */
(function (global) {
  'use strict';

  // Defaults copied 1:1 from the source page's `defaults` object.
  var defaults = {
    reps: 10, cost: 145000, quota: 1200000, attainment: 65, margin: 70,
    weekHours: 45, autoHours: 15, automation: 60, capture: 50,
    adoption: 80, license: 10000, setup: 35000
  };

  // Helper copied 1:1 from the source page.
  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

  /*
   * The source page's read(): coerces each raw value with
   * Math.max(0, Number(value) || 0), then applies the source's clamps
   * (reps 1–10000, attainment 0–200, the other percentages 0–100,
   * weekHours 1–100, autoHours 0–weekHours).
   */
  function sanitizeInputs(raw) {
    var v = {};
    Object.keys(defaults).forEach(function (id) { v[id] = Math.max(0, Number(raw[id]) || 0); });
    v.reps = clamp(v.reps, 1, 10000);
    ['attainment', 'margin', 'automation', 'capture', 'adoption'].forEach(function (id) {
      v[id] = clamp(v[id], 0, id === 'attainment' ? 200 : 100);
    });
    v.weekHours = clamp(v.weekHours, 1, 100);
    v.autoHours = clamp(v.autoHours, 0, v.weekHours);
    return v;
  }

  /*
   * The source page's calculate() body, with DOM reads replaced by the
   * sanitized `inputs` argument and DOM writes replaced by the returned
   * object. Field names match the object the source's calculate()
   * returns (including `v`, the sanitized inputs).
   */
  function computeModel(raw) {
    var v = sanitizeInputs(raw);
    var adoption = v.adoption / 100;
    var automation = v.automation / 100;
    var capture = v.capture / 100;
    var attainment = v.attainment / 100;
    var margin = v.margin / 100;
    var timeShare = v.autoHours / v.weekHours;
    var activeReps = v.reps * adoption;

    var recurring = activeReps * v.license;
    var total = recurring + v.setup;
    var hoursReturned = activeReps * v.autoHours * automation * 52;
    var fte = activeReps * timeShare * automation;
    var capacityValue = fte * v.cost;
    var capacityNet = capacityValue - total;
    var capacityROI = total > 0 ? capacityNet / total * 100 : (capacityValue > 0 ? Infinity : 0);
    var capacityPayback = capacityValue > 0 ? total / (capacityValue / 12) : NaN;

    var baselineRevenue = v.reps * v.quota * attainment;
    var incrementalRevenue = baselineRevenue * timeShare * automation * capture * adoption;
    var grossProfit = incrementalRevenue * margin;
    var assistNet = grossProfit - total;
    var assistROI = total > 0 ? assistNet / total * 100 : (grossProfit > 0 ? Infinity : 0);
    var assistPayback = grossProfit > 0 ? total / (grossProfit / 12) : NaN;

    var assistWins = assistNet >= capacityNet;
    var delta = Math.abs(assistNet - capacityNet);

    var pilotReps = Math.max(1, Math.min(v.reps, Math.ceil(v.reps * .2)));
    var weeklyPerRep = v.autoHours * automation;
    var breakEvenRevenue = margin > 0 ? total / margin : 0;

    return {
      v: v, recurring: recurring, total: total, hoursReturned: hoursReturned, fte: fte,
      capacityValue: capacityValue, capacityNet: capacityNet, capacityROI: capacityROI,
      capacityPayback: capacityPayback, incrementalRevenue: incrementalRevenue,
      grossProfit: grossProfit, assistNet: assistNet, assistROI: assistROI,
      assistPayback: assistPayback, assistWins: assistWins, delta: delta,
      weeklyPerRep: weeklyPerRep, breakEvenRevenue: breakEvenRevenue, pilotReps: pilotReps
    };
  }

  var api = { defaults: defaults, computeModel: computeModel, sanitizeInputs: sanitizeInputs, clamp: clamp };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.SQRepModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
