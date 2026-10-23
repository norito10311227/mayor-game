// 台本：タイトル → オープニング → 名前 → 市長室 → 15問 → 結果 → タイトル
(function (root) {
  const { data, scoring, game, input, layout, art, audio, ui } = root.MG;
  const { QUESTIONS, PARAMS, ENDINGS, INTRO, OFFICE, CLOSING, NAME_CANDIDATES } = data;

  // ステージ上の人物の配置（1280x720 基準）
  const CENTER = { x: 565, y: 290, w: 150 };
  const LEFT = { x: 280, y: 290, w: 150 };
  const RIGHT = { x: 850, y: 290, w: 150 };

  // 結果画面に並ぶ市民：[何問目, x, y]（右上のゲージと下のウィンドウを避けて地面に立たせる）
  // 街の絵を隠しすぎないよう小さめにして、足もとはウィンドウのすぐ上に置く
  const RESULT_CROWD = [[0, 60, 408], [3, 260, 414], [6, 460, 406], [9, 660, 412], [12, 860, 406], [14, 1080, 412]];

  let atTitle = true;
  let confirming = false;

  async function title() {
    atTitle = true;
    audio.playBgm('town');
    ui.setScene(art.titleScene());
    // タッチ端末には「PRESS SPACE」の代わりに案内を出す
    if (document.body.classList.contains('is-touch')) ui.show('▶ 画面を タップして スタート！');
    await ui.waitOk();
    atTitle = false;
  }

  async function opening() {
    ui.setScene(art.introScene());
    ui.setSprites([{ svg: art.secretary(), ...CENTER }]);
    for (const line of INTRO) await ui.say(line);

    ui.setSprites([{ svg: art.mayor(), ...CENTER }]);
    const name = game.normalizeName(await ui.askName(NAME_CANDIDATES));

    ui.setScene(art.officeScene());
    for (const line of OFFICE) await ui.say(line.replace('{name}', name));
    return name;
  }

  // n 問目の a/b の市民の絵。名札が60代・70代なら白髪にする
  function citizenSvg(n, side) {
    const elder = /^[67]0代/.test(QUESTIONS[n][side].speaker);
    return art.citizen(n * 2 + (side === 'a' ? 0 : 1), { elder });
  }

  function showCitizens(q, n, focus, jump) {
    const people = [['a', LEFT, citizenSvg(n, 'a')], ['b', RIGHT, citizenSvg(n, 'b')]];
    ui.setSprites(people.map(([side, pos, svg]) => ({
      svg, ...pos,
      dim: focus != null && focus !== side,
      label: focus === side ? q[side].speaker : null,
      jump: jump === side,
    })));
  }

  async function chooseOrBack(q, run) {
    ui.setBackEnabled(run.history.length > 0);
    try {
      for (;;) {
        const i = await ui.menu([`A ${q.a.policy}`, `B ${q.b.policy}`], { notes: [`${q.a.speaker}の要望`, `${q.b.speaker}の要望`] });
        if (i !== 'back') return i === 0 ? 'a' : 'b';
        if (run.history.length > 0) return 'back';
      }
    } finally {
      ui.setBackEnabled(false);
    }
  }

  async function questions(name) {
    let run = game.newRun(name);
    ui.setScene(art.officeScene());
    while (!game.isFinished(run, QUESTIONS)) {
      const n = run.qIndex;
      const q = QUESTIONS[n];
      ui.setHeader(`Q${n + 1}/${QUESTIONS.length} ${q.title}`);
      showCitizens(q, n, null);
      await ui.say('市民が ふたり やってきた！');
      showCitizens(q, n, 'a');
      await ui.say(q.a.line, { speaker: q.a.speaker });
      showCitizens(q, n, 'b');
      await ui.say(q.b.line, { speaker: q.b.speaker });
      showCitizens(q, n, null);

      const side = await chooseOrBack(q, run);
      if (side === 'back') { run = game.undo(run); continue; }
      showCitizens(q, n, side, side);
      await ui.say(`「${q[side].policy}」に 決定！`);
      run = game.choose(run, side, QUESTIONS);
    }
    ui.setHeader(null);
    return run;
  }

  async function result(run) {
    const d = scoring.diagnose(run.scores);
    const ending = d.kind === 'balance' ? ENDINGS.balance : ENDINGS[d.kind][d.key];
    // ゲージは全パラメータ共通の目盛り（最も登場回数の多いパラメータの範囲）にして、
    // 診断（素点の大小）とゲージの長さの順番がそろうようにする
    const range = Math.max(...Object.values(scoring.paramCounts(QUESTIONS)));

    // 要望を選んだ市民たちが、できあがった街で喜んでいる
    const sides = game.chosenSides(run, QUESTIONS);
    ui.setSprites(RESULT_CROWD.map(([n, x, y]) => ({ svg: citizenSvg(n, sides[n]), x, y, w: 80, jump: true })));
    ui.setScene(art.townScene(d.kind === 'balance' ? 'balance' : d.key));
    audio.playBgm('result');
    audio.fanfare();
    // 街をお披露目するあいだはゲージを出さず、絵全体を見せる
    await ui.say(`${run.name}市長が つくった 社会は…`);
    await ui.say(`${ending.type}「${ending.catch}」`);
    ui.showGauges(PARAMS.map(p => ({ name: p.name, color: p.color, ratio: scoring.gaugeRatio(run.scores[p.key], range) })));
    for (const para of ending.body) await ui.say(para);
    for (const para of CLOSING) await ui.say(para);
  }

  async function playOnce() {
    await title();
    const name = await opening();
    const run = await questions(name);
    await result(run);
  }

  async function loop() {
    for (;;) {
      try {
        await playOnce();
      } catch (e) {
        if (e.message !== 'reset') throw e;
      }
      ui.clear();
    }
  }

  async function askReset() {
    confirming = true;
    const yes = await ui.confirm('タイトルに もどりますか？');
    confirming = false;
    if (yes) ui.clear();
  }

  // キー入力とタップ・クリックの共通の行き先
  function dispatch(action) {
    audio.unlock();
    if (action === 'mute') { ui.setMuted(audio.toggleMute()); return; }
    if (action === 'escape' && !confirming) {
      if (!atTitle) askReset();
      return;
    }
    ui.handleAction(action);
  }

  document.addEventListener('keydown', ev => {
    const action = input.keyToAction({
      key: ev.key,
      repeat: ev.repeat,
      isComposing: ev.isComposing || ev.keyCode === 229,
      targetIsTextInput: ev.target.tagName === 'INPUT',
      modalOpen: confirming,
    });
    if (!action) return;
    ev.preventDefault();
    dispatch(action);
  });

  const stageEl = document.getElementById('stage');
  // ボタンにフォーカスを残さない（残るとキーボードの Enter／スペースで二重に押される）
  stageEl.addEventListener('mousedown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
  stageEl.addEventListener('click', ev => {
    const actEl = ev.target.closest('[data-act]');
    const item = ev.target.closest('.item');
    if (actEl && actEl.disabled) return;
    const action = input.clickToAction({
      act: actEl ? actEl.dataset.act : undefined,
      menuIndex: item ? Number(item.dataset.index) : undefined,
      isTextInput: ev.target.tagName === 'INPUT',
      inBar: !!ev.target.closest('#touchbar'),
    });
    if (action) dispatch(action);
  });

  ui.init(stageEl);

  // 縦持ち／横持ち・タッチ端末かどうかでレイアウトを切り替える（遊んでいる途中の回転にも追従）
  const portraitQuery = matchMedia('(orientation: portrait)');
  const coarseQuery = matchMedia('(pointer: coarse)');
  const relayout = () => ui.applyLayout(layout.layoutFor({ portrait: portraitQuery.matches, coarse: coarseQuery.matches }));
  portraitQuery.addEventListener('change', relayout);
  coarseQuery.addEventListener('change', relayout);
  addEventListener('resize', relayout); // 端末によっては回転で change が来ないことがあるため
  relayout();
  loop();
})(window);
