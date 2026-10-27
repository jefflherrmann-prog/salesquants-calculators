/*
 * SalesQuants — Amplified Rep model (added to the app 2026-10-27).
 *
 * The amplification case: same team, no replacement. AI levers raise the
 * output of every existing rep/SDR through the same funnel the suite's
 * other calculators use (touches -> replies -> meetings -> opportunities
 * -> wins -> revenue -> gross profit).
 *
 * Each uplift lever is discounted by a realization factor (the share of
 * the theoretical uplift a team actually captures after adoption,
 * deliverability limits, and change management) before it is applied,
 * stage by stage, so the funnel compounds the way it does in the field:
 *   amplified stage rate/volume = baseline x (1 + uplift x realization)
 *
 * Pure functions only — no DOM access — so this file loads unchanged in
 * the browser (window.SQAmpModel) and in Node (module.exports) for
 * testing, matching the suite's other models.
 */
(function (global) {
  'use strict';

  var defaults = {
    reps: 5, touches: 1200, replyRate: 6, meetingRate: 15,
    oppRate: 35, winRate: 25, acv: 20000, margin: 80,
    volumeUplift: 40, replyUplift: 25, meetingUplift: 10, realization: 60,
    aiSeat: 500, platformFee: 15000
  };

  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
  function safeDiv(a, b) { return b > 0 ? a / b : 0; }

  function sanitizeInputs(raw) {
    var v = {};
    Object.keys(defaults).forEach(function (id) { v[id] = Math.max(0, Number(raw[id]) || 0); });
    v.reps = clamp(v.reps, 1, 10000);
    ['replyRate', 'meetingRate', 'oppRate', 'winRate', 'margin', 'realization'].forEach(function (id) {
      v[id] = clamp(v[id], 0, 100);
    });
    ['volumeUplift', 'replyUplift', 'meetingUplift'].forEach(function (id) {
      v[id] = clamp(v[id], 0, 500);
    });
    return v;
  }

  function funnel(touchesPerYear, replyRate, meetingRate, v) {
    var replies = touchesPerYear * replyRate;
    var meetings = replies * meetingRate;
    var opps = meetings * (v.oppRate / 100);
    var wins = opps * (v.winRate / 100);
    var revenue = wins * v.acv;
    return {
      touches: touchesPerYear, replies: replies, meetings: meetings,
      opps: opps, wins: wins, revenue: revenue,
      pipeline: opps * v.acv, grossProfit: revenue * (v.margin / 100)
    };
  }

  function computeModel(raw) {
    var v = sanitizeInputs(raw);
    var realization = v.realization / 100;

    var base = funnel(v.touches * 12, v.replyRate / 100, v.meetingRate / 100, v);

    var ampTouches = v.touches * 12 * (1 + (v.volumeUplift / 100) * realization);
    var ampReplyRate = (v.replyRate / 100) * (1 + (v.replyUplift / 100) * realization);
    var ampMeetingRate = (v.meetingRate / 100) * (1 + (v.meetingUplift / 100) * realization);
    var amp = funnel(ampTouches, ampReplyRate, ampMeetingRate, v);

    var aiCost = v.reps * v.aiSeat * 12 + v.platformFee;
    var incrGpPerRep = amp.grossProfit - base.grossProfit;
    var incrGpTeam = incrGpPerRep * v.reps;
    var netGain = incrGpTeam - aiCost;
    var netPerRep = safeDiv(netGain, v.reps);
    var roi = safeDiv(netGain, aiCost);
    var payback = safeDiv(aiCost, safeDiv(incrGpTeam, 12));
    var meetingLift = safeDiv(amp.meetings - base.meetings, base.meetings);
    var equivReps = v.reps * safeDiv(amp.meetings, base.meetings);

    return {
      v: v, base: base, amp: amp, aiCost: aiCost,
      incrGpPerRep: incrGpPerRep, incrGpTeam: incrGpTeam,
      incrPipelinePerRep: amp.pipeline - base.pipeline,
      netGain: netGain, netPerRep: netPerRep, roi: roi,
      payback: payback, meetingLift: meetingLift, equivReps: equivReps,
      ampWins: netGain >= 0
    };
  }

  var api = { defaults: defaults, computeModel: computeModel, sanitizeInputs: sanitizeInputs, clamp: clamp, safeDiv: safeDiv };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.SQAmpModel = api;
})(typeof window !== 'undefined' ? window : globalThis);
