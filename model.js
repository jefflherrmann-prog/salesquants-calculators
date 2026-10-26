/*
 * SalesQuants — Agent vs. SDR ROI model.
 *
 * Ported verbatim (math only) from the live standalone calculator:
 *   agent-vs-sdr-roi-calculator/agent-vs-sdr-roi-calculator.html
 *
 * Every formula, helper and default below matches the source page exactly,
 * so app results are numerically identical to the web calculator.
 * Verified by a Node DOM-stub comparison run (see README.md).
 *
 * Pure functions only — no DOM access — so this file loads unchanged in
 * the browser (window.SQModel) and in Node (module.exports) for testing,
 * and will survive the later Capacitor wrap untouched.
 */
(function (global) {
  'use strict';

  // Defaults copied 1:1 from the source page's `defaults` object.
  var defaults = {
    sdrSeats: 1, sdrSalary: 60000, sdrBurden: 1.35, sdrTools: 12000, sdrMeetings: 12, sdrRamp: 3,
    agentAnnual: 36000, agentSetup: 15000, oversightHours: 5, oversightRate: 75, agentMeetings: 18, agentRamp: 1,
    oppRate: 35, winRate: 25, acv: 20000, grossMargin: 80
  };

  // Helpers copied 1:1 from the source page.
  function safeDiv(a, b) { return b > 0 ? a / b : 0; }
  function productiveMonths(ramp) { return Math.max(0, 12 - Math.min(12, ramp) / 2); }

  /*
   * The source page's calculate() body, with DOM reads replaced by the
   * `inputs` argument and DOM writes replaced by the returned object.
   * Field names on the returned object match the source's window.latest.
   */
  function computeModel(v) {
    var seats = v.sdrSeats;
    var sdrCost = seats * (v.sdrSalary * v.sdrBurden + v.sdrTools);
    var agentCost = v.agentAnnual + v.agentSetup + v.oversightHours * v.oversightRate * 52;
    var sdrMeetings = seats * v.sdrMeetings * productiveMonths(v.sdrRamp);
    var agentMeetings = v.agentMeetings * productiveMonths(v.agentRamp);
    var closeFactor = (v.oppRate / 100) * (v.winRate / 100);
    var marginFactor = v.grossMargin / 100;
    var sdrRevenue = sdrMeetings * closeFactor * v.acv;
    var agentRevenue = agentMeetings * closeFactor * v.acv;
    var sdrGp = sdrRevenue * marginFactor;
    var agentGp = agentRevenue * marginFactor;
    var sdrNet = sdrGp - sdrCost;
    var agentNet = agentGp - agentCost;
    var agentRoi = safeDiv(agentNet, agentCost);
    var monthlyAgentGp = safeDiv(agentGp, 12);
    var payback = safeDiv(agentCost, monthlyAgentGp);
    var advantage = agentNet - sdrNet;
    var agentWins = advantage >= 0;

    return {
      sdrCost: sdrCost, agentCost: agentCost,
      sdrMeetings: sdrMeetings, agentMeetings: agentMeetings,
      sdrRevenue: sdrRevenue, agentRevenue: agentRevenue,
      sdrGp: sdrGp, agentGp: agentGp,
      sdrNet: sdrNet, agentNet: agentNet,
      agentRoi: agentRoi, payback: payback,
      advantage: advantage, agentWins: agentWins
    };
  }

  var api = { defaults: defaults, computeModel: computeModel, safeDiv: safeDiv, productiveMonths: productiveMonths };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.SQModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
