// 1プレイ分の状態（名前・何問目・点数・戻る履歴）。すべて純粋関数。
(function (root) {
  const scoring = (typeof module === 'object' && module.exports) ? require('./scoring.js') : root.MG.scoring;

  const NAME_MAX = 6;
  const NAME_DEFAULT = 'ななし';

  function newRun(name) {
    return { name, qIndex: 0, scores: scoring.zeroScores(), history: [] };
  }

  function choose(run, side, questions) {
    const q = questions[run.qIndex];
    return {
      ...run,
      qIndex: run.qIndex + 1,
      scores: scoring.applyEffects(run.scores, q[side].effects),
      history: [...run.history, { qIndex: run.qIndex, scores: run.scores }],
    };
  }

  function undo(run) {
    if (run.history.length === 0) return run;
    const prev = run.history[run.history.length - 1];
    return { ...run, qIndex: prev.qIndex, scores: prev.scores, history: run.history.slice(0, -1) };
  }

  function isFinished(run, questions) {
    return run.qIndex >= questions.length;
  }

  // 各問でどちらを選んだか（'a' | 'b' の配列）。履歴の点数の差から求める
  function chosenSides(run, questions) {
    const snapshots = [...run.history.map(h => h.scores), run.scores];
    return run.history.map((h, i) => {
      const [key] = Object.keys(questions[h.qIndex].a.effects);
      return snapshots[i + 1][key] > snapshots[i][key] ? 'a' : 'b';
    });
  }

  function normalizeName(raw) {
    const name = [...String(raw).trim()].slice(0, NAME_MAX).join('');
    return name || NAME_DEFAULT;
  }

  const api = { newRun, choose, undo, isFinished, chosenSides, normalizeName };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MG = root.MG || {}).game = api;
})(typeof window !== 'undefined' ? window : globalThis);
