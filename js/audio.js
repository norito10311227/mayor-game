// 8bit 風の効果音とBGM。Web Audio の矩形波・三角波で鳴らす（曲はこのゲームのためのオリジナル）。
// ブラウザの自動再生制限があるため、AudioContext は最初のキー入力（unlock）で作る。
(function (root) {
  let ctx = null;
  let muted = false;

  // ---- 楽譜 ----
  // "C5/2" ＝ C5 を8分音符2つぶん。"-" は休符。/ を省くと8分音符1つ
  const NOTE_INDEX = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };

  function noteToFreq(name) {
    if (name === '-') return 0;
    const m = /^([A-G]#?)(\d)$/.exec(name);
    const semis = NOTE_INDEX[m[1]] + (Number(m[2]) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  function parseScore(score) {
    return score.split(/[\s|]+/).filter(Boolean).map(token => {
      const [name, len] = token.split('/');
      return { freq: noteToFreq(name), len: len ? Number(len) : 1 };
    });
  }

  // 街の曲（タイトル〜問題）：明るい C メジャー、132 BPM
  // 結果の曲：ゆったりした F メジャー、92 BPM
  const TRACKS = {
    town: {
      bpm: 132,
      voices: [
        { type: 'square', volume: 0.035, score:
          'C5 E5 G5/2 E5 G5 C6/2 | A5 G5 E5/2 D5/2 - - | F5 A5 C6/2 A5 F5 E5/2 | D5 E5 F5 G5/4 - |' +
          'C5 E5 G5/2 E5 G5 C6/2 | D6 C6 A5/2 G5/2 E5 G5 | F5 E5 D5/2 G5 F5 E5 D5 | C5/6 - -' },
        { type: 'triangle', volume: 0.08, score:
          'C3/2 G3/2 C3/2 G3/2 | A2/2 E3/2 A2/2 E3/2 | F2/2 C3/2 F2/2 C3/2 | G2/2 D3/2 G2/2 D3/2 |' +
          'C3/2 G3/2 C3/2 G3/2 | A2/2 E3/2 A2/2 E3/2 | F2/2 C3/2 G2/2 D3/2 | C3/2 G3/2 C3/4' },
      ],
    },
    result: {
      bpm: 92,
      voices: [
        { type: 'square', volume: 0.03, score: 'A4/2 C5/2 F5/4 | G5/2 F5/2 E5/2 C5/2 | D5/2 F5/2 A5/4 | G5/6 -/2' },
        { type: 'triangle', volume: 0.08, score: 'F2/4 C3/4 | C3/4 G2/4 | D3/4 A2/4 | C3/8' },
      ],
    },
  };

  // ---- 効果音 ----
  function tone(freq, start, dur, type, volume, dest) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(dest);
    osc.start(start);
    osc.stop(start + dur);
  }

  // notes: [周波数Hz, 長さ秒] の列を順に鳴らす
  function play(notes, volume = 0.06) {
    if (!ctx || muted) return;
    let t = ctx.currentTime;
    for (const [freq, dur] of notes) {
      tone(freq, t, dur, 'square', volume, ctx.destination);
      t += dur;
    }
  }

  // ---- BGM：先読みしながら少しずつ音を予約するループ ----
  const LOOKAHEAD = 0.25;
  let bgmName = null;
  let bgm = null; // { gain, timer, voices: [{ notes, i, time, type, volume }] }

  function startBgm() {
    const track = TRACKS[bgmName];
    const eighth = 60 / track.bpm / 2;
    const gain = ctx.createGain();
    gain.gain.value = muted ? 0 : 1;
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.05;
    const voices = track.voices.map(v => ({ notes: parseScore(v.score), i: 0, time: t0, type: v.type, volume: v.volume }));
    const schedule = () => {
      for (const v of voices) {
        while (v.time < ctx.currentTime + LOOKAHEAD) {
          const n = v.notes[v.i];
          const dur = n.len * eighth;
          if (n.freq) tone(n.freq, v.time, dur * 0.9, v.type, v.volume, gain);
          v.time += dur;
          v.i = (v.i + 1) % v.notes.length;
        }
      }
    };
    schedule();
    bgm = { gain, timer: setInterval(schedule, 50) };
  }

  function stopBgm() {
    bgmName = null;
    if (!bgm) return;
    clearInterval(bgm.timer);
    bgm.gain.disconnect();
    bgm = null;
  }

  // 同じ曲が流れていれば何もしない。AudioContext がまだなら unlock 後に始める
  function playBgm(name) {
    if (bgmName === name && (bgm || !ctx)) return;
    stopBgm();
    bgmName = name;
    if (ctx) startBgm();
  }

  // 最初のキー入力・タップで呼ぶ。止まっている（suspended、iPhone の通話や画面ロック後の interrupted）ときは再開する
  function unlock() {
    if (ctx) {
      if (ctx.state !== 'running') ctx.resume();
      return;
    }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    if (bgmName) startBgm();
  }

  const api = {
    noteToFreq, parseScore, TRACKS,
    unlock, playBgm, stopBgm,
    blip: () => play([[880, 0.03]], 0.025),
    select: () => play([[660, 0.05]]),
    confirm: () => play([[880, 0.06], [1320, 0.08]]),
    fanfare: () => play([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.36]]),
    toggleMute() {
      muted = !muted;
      if (bgm) bgm.gain.gain.value = muted ? 0 : 1;
      return muted;
    },
    isMuted() { return muted; },
    _ctxForTest: () => ctx,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MG = root.MG || {}).audio = api;
})(typeof window !== 'undefined' ? window : globalThis);
