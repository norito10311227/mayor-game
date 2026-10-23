// 点数計算と診断。すべて純粋関数。
(function (root) {
  const KEYS = ['L', 'E', 'P', 'D', 'G', 'C'];

  function zeroScores() {
    return Object.fromEntries(KEYS.map(k => [k, 0]));
  }

  function applyEffects(scores, effects) {
    const next = { ...scores };
    for (const [k, v] of Object.entries(effects)) next[k] += v;
    return next;
  }

  // 各パラメータが登場する問の数（＝取りうる最大値）
  function paramCounts(questions) {
    const counts = zeroScores();
    for (const q of questions) for (const k of Object.keys(q.a.effects)) counts[k]++;
    return counts;
  }

  function gaugeRatio(score, count) {
    return (score + count) / (2 * count);
  }

  // 企画書スライド29〜30の方式：素点が最も高いパラメータの理想型。
  // 最大値が複数あるときは「パラメータ変動小（バランス型）」。
  // 戻り値は { kind: 'ideal' | 'neglected' | 'balance', key?: string } の形で固定。
  function diagnose(scores) {
    const max = Math.max(...KEYS.map(k => scores[k]));
    const top = KEYS.filter(k => scores[k] === max);
    return top.length === 1 ? { kind: 'ideal', key: top[0] } : { kind: 'balance' };
  }

  const api = { KEYS, zeroScores, applyEffects, paramCounts, gaugeRatio, diagnose };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MG = root.MG || {}).scoring = api;
})(typeof window !== 'undefined' ? window : globalThis);
