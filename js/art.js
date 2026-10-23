// ドット絵。背景は 160x90 のドット座標、人物は 12x14 のマップから SVG 文字列を作る。
(function (root) {
  const FONT = "DotGothic16, 'Hiragino Maru Gothic ProN', sans-serif";
  const R = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const scene = body => `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">${body}</svg>`;

  // ---- 人物 ----
  // k=輪郭 h=髪 s=肌 b=服 w=服のアクセント p=ズボン e=目
  const SHORT_HAIR = [
    '....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khssssshk.', '..ksesseskk.', '..kssssssk..', '...kssssk...',
    '..kbbbbbbk..', '.kbbbwwbbbk.', '.ksbbbbbbsk.', '..kbbbbbbk..', '..kppkkppk..', '..kppk.kppk.', '..kkk...kkk.',
  ];
  const LONG_HAIR = [
    '....kkkk....', '...khhhhk...', '..khhhhhhk..', '.khhssssshk.', '.khsesseshk.', '.khsssssshk.', '.khhkssskhhk',
    '..kbbbbbbk..', '.kbbbwwbbbk.', '.ksbbbbbbsk.', '..kbbbbbbk..', '..kppkkppk..', '..kppk.kppk.', '..kkk...kkk.',
  ];
  const MAYOR = [
    '....kkkk....', '...khhhhk...', '..khhhhhhk..', '..khssssshk.', '..ksesseskk.', '..kssssssk..', '...kssssk...',
    '..kbbwwbbk..', '.kbbbwrbbbk.', '.ksbbwrbbsk.', '..kbbbbbbk..', '..kppkkppk..', '..kppk.kppk.', '..kkk...kkk.',
  ];
  const SECRETARY = [
    '...kkkkkk...', '..khhhhhhk..', '.khhhhhhhhk.', '.khssssssk..', '.khseeesk...', '.khssssssk..', '..khssssk...',
    '..kwwbbwwk..', '.kwwwbbwwwk.', '.kswwwwwwsk.', '..kwwwwwwk..', '..kbbbbbbk..', '...kk..kk...', '..kkk..kkk..',
  ];

  const HAIR = ['#583828', '#985830', '#282828', '#c87838', '#784020'];
  const ELDER_HAIR = ['#c8c8c8', '#f0f0f0', '#a8a8a8', '#d8d0c8', '#b8b8b8'];
  const SHIRT = ['#58b048', '#f8b030', '#3870d0', '#f86048', '#a058c8', '#f878a8', '#38a8a8', '#d0a040'];
  const SKIN = ['#f8d0a8', '#e8b088'];

  function sprite(map, pal) {
    let r = '';
    map.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c !== '.') r += R(x, y, 1, 1, pal[c]);
      }
    });
    return `<svg viewBox="0 0 ${map[0].length} ${map.length}" shape-rendering="crispEdges">${r}</svg>`;
  }

  // seed（0〜39）ごとに髪色・服の色・髪型の組み合わせが変わる
  function citizen(seed, opts = {}) {
    const h = seed % 5;
    const s = (seed * 3) % 8; // 隣どうしの seed（同じ問の2人）で服の色が必ず違う
    const map = (h + s) % 2 ? LONG_HAIR : SHORT_HAIR;
    return sprite(map, {
      k: '#383838', e: '#383838', p: '#585858', w: '#fff',
      h: (opts.elder ? ELDER_HAIR : HAIR)[h],
      s: SKIN[Math.floor(seed / 3) % 2],
      b: SHIRT[s],
    });
  }
  const mayor = () => sprite(MAYOR, { k: '#383838', e: '#383838', h: '#282828', s: '#f8d0a8', b: '#303878', w: '#fff', r: '#f86048', p: '#303040' });
  const secretary = () => sprite(SECRETARY, { k: '#383838', e: '#383838', h: '#583828', s: '#f8d0a8', b: '#3870d0', w: '#fff', p: '#585858' });

  // ---- 背景用の小物 ----
  function person(x, y, shirt, hair = '#583828') {
    return R(x, y, 3, 3, '#f8d0a8') + R(x, y, 3, 1, hair) + R(x, y + 3, 3, 3, shirt) + R(x, y + 6, 1, 2, '#585858') + R(x + 2, y + 6, 1, 2, '#585858');
  }
  function tree(x, y, c = '#389838') {
    return R(x + 2, y + 6, 2, 4, '#785030') + R(x, y + 2, 6, 5, c) + R(x + 1, y, 4, 2, c) + R(x + 1, y + 2, 1, 1, '#88d070');
  }
  function building(x, y, w, h, c, lit = '#f8f8a0') {
    let s = R(x, y, w, h, c);
    for (let yy = y + 3; yy < y + h - 4; yy += 5)
      for (let xx = x + 2; xx < x + w - 2; xx += 4) s += R(xx, yy, 2, 3, lit);
    return s;
  }
  function house(x, y, wall, roof) {
    return R(x - 1, y, 14, 2, roof) + R(x, y - 2, 12, 2, roof) + R(x + 2, y - 4, 8, 2, roof) +
      R(x, y + 2, 12, 8, wall) + R(x + 5, y + 5, 3, 5, '#704830') + R(x + 1, y + 4, 3, 3, '#a0d8f8') + R(x + 9, y + 4, 2, 3, '#a0d8f8');
  }
  function shop(x, y, awning) {
    let s = R(x, y + 2, 15, 14, '#f8e8c8');
    for (let j = 0; j < 15; j += 3) s += R(x + j, y, 3, 4, (j / 3) % 2 ? '#fff' : awning);
    return s + R(x + 4, y + 8, 7, 8, '#704830') + R(x + 1, y + 5, 3, 3, '#a0d8f8') + R(x + 11, y + 5, 3, 3, '#a0d8f8');
  }
  function bubble(x, y, ch) {
    return R(x, y, 7, 7, '#fff') + R(x - 1, y + 1, 1, 5, '#383838') + R(x + 7, y + 1, 1, 5, '#383838') +
      R(x + 1, y - 1, 5, 1, '#383838') + R(x + 1, y + 7, 5, 1, '#383838') + R(x + 2, y + 8, 2, 2, '#fff') +
      `<text x="${x + 3.5}" y="${y + 6}" font-size="6" text-anchor="middle" fill="#f86048" font-family="${FONT}">${ch}</text>`;
  }
  function citizenAt(x, y, seed, scale = 1) {
    return `<g transform="translate(${x} ${y}) scale(${scale})">${citizen(seed).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
  }
  const sky = (top, bottom) => R(0, 0, 160, 90, bottom) + R(0, 0, 160, 30, top);
  const ground = (y, c = '#88d070') => R(0, y, 160, 90 - y, c);
  const road = y => R(0, y, 160, 6, '#b8b8b8') + R(0, y + 2, 160, 1, '#f8f8f8');

  // ---- 場面 ----
  function titleScene() {
    let s = R(0, 0, 160, 90, '#f8a058') + R(0, 0, 160, 18, '#f87848') + R(0, 18, 160, 6, '#f88850');
    s += ground(62) + R(40, 62, 80, 28, '#d8c8a0');
    // 市役所
    s += R(42, 34, 76, 28, '#f0e8d8') + R(40, 32, 80, 3, '#a89880') + R(70, 22, 20, 12, '#f0e8d8') + R(68, 20, 24, 3, '#a89880');
    s += R(76, 24, 8, 8, '#fff') + R(79, 25, 2, 4, '#383838') + R(80, 8, 1, 12, '#585858') + R(81, 8, 7, 4, '#f86048');
    for (let i = 0; i < 6; i++) s += R(46 + i * 12, 40, 4, 22, '#d8d0c0');
    for (let i = 0; i < 5; i++) s += R(51 + i * 12, 42, 5, 6, '#78a8d8');
    s += R(74, 50, 12, 12, '#704830') + R(36, 62, 88, 2, '#a89880');
    s += `<text x="80" y="39" font-size="4" text-anchor="middle" fill="#383838" font-family="${FONT}">市役所</text>`;
    // 市長と押し寄せる市民
    s += `<g transform="translate(74 58) scale(1)">${mayor().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
    [[18, 64, 2, '！'], [32, 70, 9, '？'], [118, 68, 14, '！'], [134, 62, 21, '？'], [50, 74, 6, '！'], [102, 74, 27, '？']].forEach(([x, y, seed, ch]) => {
      s += citizenAt(x, y, seed, 0.9) + bubble(x + 2, y - 11, ch);
    });
    // ロゴ
    s += `<text x="80.8" y="17.8" font-size="15" text-anchor="middle" fill="#101840" font-family="${FONT}">市長診断RPG</text>`;
    s += `<text x="80" y="17" font-size="15" text-anchor="middle" fill="#f8d030" stroke="#303878" stroke-width="1.2" paint-order="stroke" font-family="${FONT}">市長診断RPG</text>`;
    s += `<text x="80" y="25" font-size="4.6" text-anchor="middle" fill="#fff" stroke="#a03020" stroke-width=".6" paint-order="stroke" font-family="${FONT}">〜あなたはどんな市長？〜</text>`;
    s += `<text x="80" y="87" font-size="4.6" text-anchor="middle" fill="#fff" stroke="#383838" stroke-width=".6" paint-order="stroke" font-family="${FONT}"><animate attributeName="opacity" values="1;1;0;0" dur="1.2s" repeatCount="indefinite"/>▶ PRESS SPACE</text>`;
    return scene(s);
  }

  function officeScene() {
    let s = R(0, 0, 160, 90, '#e8d8b8');
    for (let x = 0; x < 160; x += 8) s += R(x, 0, 1, 52, '#d8c8a0');
    s += R(0, 52, 160, 38, '#a87850') + R(0, 52, 160, 2, '#785030');
    s += R(56, 56, 48, 34, '#c84838') + R(58, 58, 44, 32, '#d85848');
    // 窓と街の景色
    s += R(56, 8, 48, 30, '#785030') + R(58, 10, 44, 26, '#a0d8f8');
    s += building(60, 22, 8, 14, '#9090b8') + building(70, 18, 10, 18, '#a8a8c8') + building(84, 24, 8, 12, '#9090b8') + building(94, 20, 7, 16, '#a8a8c8');
    s += R(79, 10, 2, 26, '#785030') + R(58, 22, 44, 2, '#785030');
    // 本棚と旗と観葉植物
    s += R(8, 14, 30, 38, '#785030');
    const books = ['#f86048', '#3870d0', '#58b048', '#f8b030', '#a058c8'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) s += R(10 + i * 4.5, 17 + r * 12, 3, 9, books[(r + i) % 5]);
    s += R(126, 10, 1, 42, '#585858') + R(127, 10, 14, 9, '#fff') + R(132, 13, 4, 3, '#f86048');
    s += R(146, 40, 8, 12, '#a86030') + tree(144, 28, '#389838');
    return scene(s);
  }

  // オープニング（秘書の話）：白い部屋に床だけ
  function introScene() {
    return scene(R(0, 0, 160, 90, '#f8f8f8') + R(0, 52, 160, 38, '#e8e0d0') + R(0, 52, 160, 1, '#d0c8b8'));
  }

  function blankScene(color) {
    return scene(R(0, 0, 160, 90, color));
  }

  // 街ごとに空と地面の色を変え、主役の建物を大きく描いて、ひと目で別の街だとわかるようにする。
  // 結果画面では右上にゲージ、下にウィンドウが重なるので、主役は左〜中央（x 0〜110, y 10〜52）に置く。
  const big = (x, y, s, body) => `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
  function sign(x, y, w, text, bg, fg = '#fff') {
    return R(x, y, w, 9, '#383838') + R(x + 1, y + 1, w - 2, 7, bg) + R(x + w / 2 - 1, y + 9, 2, 6, '#585858') +
      `<text x="${x + w / 2}" y="${y + 6.6}" font-size="5" text-anchor="middle" fill="${fg}" font-family="${FONT}">${text}</text>`;
  }
  function cherry(x, y) {
    return R(x + 2, y + 6, 2, 5, '#785030') + R(x, y + 1, 7, 6, '#f8a8c8') + R(x + 1, y, 5, 1, '#f8a8c8') + R(x + 2, y + 2, 1, 1, '#fff') + R(x + 5, y + 4, 1, 1, '#fff');
  }

  const TOWN = {
    // 生活防衛：朝焼けの住宅街と、にぎわう朝市
    L: () => {
      let s = sky('#f8c860', '#f8e8b0') + R(124, 4, 10, 10, '#f8f0a0') + ground(52, '#a8d870') + road(62);
      s += big(0, 18, 1.6, house(2, 12, '#f8e8c8', '#f86048') + house(18, 12, '#fff', '#3870d0') + house(34, 12, '#f8e0b0', '#58b048'));
      [[78, '#f86048'], [94, '#3870d0']].forEach(([x, c]) => {
        s += big(x, 34, 1.3, R(0, 0, 14, 3, c) + R(1, 3, 1, 8, '#785030') + R(12, 3, 1, 8, '#785030') + R(1, 8, 12, 3, '#d8b878') +
          R(3, 6, 2, 2, '#f86048') + R(6, 6, 2, 2, '#f8d030') + R(9, 6, 2, 2, '#58b048'));
      });
      s += sign(80, 22, 30, 'あんしん朝市', '#f86048');
      return s;
    },
    // 環境・防災：真っ青な空に風車、太陽光パネル、堤防のある川
    E: () => {
      let s = sky('#2890f0', '#a0e0f8') + ground(48, '#58a840');
      s += R(0, 54, 160, 8, '#4888e0') + R(0, 52, 160, 2, '#b8b8b8') + R(0, 62, 160, 2, '#b8b8b8');
      for (let x = 4; x < 160; x += 16) s += R(x, 57, 6, 1, '#a0d8f8');
      [[14, 8], [36, 4], [58, 10]].forEach(([x, y]) => {
        s += R(x, y, 2, 48 - y, '#f8f8f8') + R(x - 8, y - 1, 18, 2, '#f8f8f8') + R(x, y - 9, 2, 18, '#f8f8f8') + R(x - 1, y - 2, 4, 4, '#d0d0d0');
      });
      for (let i = 0; i < 3; i++) s += R(70 + i * 15, 38, 13, 7, '#203870') + R(71 + i * 15, 39, 11, 1, '#88a8e8') + R(71 + i * 15, 41, 11, 1, '#88a8e8') + R(75 + i * 15, 45, 2, 3, '#585858');
      [4, 26, 48, 112].forEach(x => { s += tree(x, 38, '#287828'); });
      s += sign(68, 24, 34, 'みどりの風', '#389838');
      return s;
    },
    // 参加・透明性：石畳の広場に噴水、大きな掲示板、集まって話す市民
    P: () => {
      let s = sky('#78c8f8', '#d0ecf8') + ground(44, '#d8c8a0');
      for (let x = 0; x < 160; x += 8) for (let y = 46; y < 90; y += 6) s += R(x + ((y / 6) % 2) * 4, y, 7, 1, '#c8b890');
      s += big(4, 14, 1.4, R(0, 0, 34, 20, '#785030') + R(2, 2, 30, 16, '#f8f8e8') +
        [0, 1, 2, 3, 4, 5].map(i => R(4 + (i % 3) * 9, 4 + Math.floor(i / 3) * 7, 8, 5, ['#f8b030', '#a0d8f8', '#f878a8', '#88d070', '#f8d030', '#c8a0f8'][i])).join('') +
        R(5, 20, 2, 8, '#785030') + R(27, 20, 2, 8, '#785030'));
      s += R(64, 40, 24, 5, '#a8a8b8') + R(66, 36, 20, 4, '#78b8f8') + R(74, 26, 4, 10, '#a8a8b8') + R(72, 24, 8, 2, '#78b8f8') + R(75, 20, 2, 4, '#a0d8f8');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        s += person(Math.round(76 + Math.cos(a) * 18), Math.round(46 + Math.sin(a) * 4), SHIRT[i], HAIR[i % 5]);
      }
      s += sign(58, 6, 36, 'みんなの広場', '#3870d0');
      return s;
    },
    // デジタル改革：夜の街に光る大型ビジョンと Wi-Fi
    D: () => {
      let s = sky('#202850', '#404888') + ground(52, '#707090') + road(62);
      [[12, 8], [40, 14], [96, 4], [150, 10], [70, 3]].forEach(([x, y]) => { s += R(x, y, 1, 1, '#fff'); });
      s += building(2, 12, 24, 40, '#484878', '#80f0f8') + building(28, 20, 16, 32, '#585888', '#80f0f8');
      s += R(48, 10, 60, 32, '#101828') + R(50, 12, 56, 28, '#103050');
      s += `<text x="78" y="23" font-size="7" text-anchor="middle" fill="#60f8f8" font-family="${FONT}">オンライン申請</text>`;
      s += `<text x="78" y="34" font-size="6" text-anchor="middle" fill="#f8d030" font-family="${FONT}">待ち時間 0分</text>`;
      s += R(64, 42, 2, 10, '#585858') + R(90, 42, 2, 10, '#585858');
      s += big(10, 2, 1.5, R(0, 0, 8, 1, '#60f8f8') + R(-1, 1, 1, 1, '#60f8f8') + R(8, 1, 1, 1, '#60f8f8') + R(1, 3, 6, 1, '#60f8f8') + R(3, 5, 2, 2, '#60f8f8'));
      [[50, '#f86048'], [72, '#58b048'], [94, '#f8b030']].forEach(([x, c]) => { s += person(x, 48, c) + R(x + 3, 50, 2, 3, '#202838') + R(x + 3, 50, 2, 1, '#60f8f8'); });
      return s;
    },
    // 経済成長：夕焼けの高層ビル群、建設中のクレーン、商店街
    G: () => {
      let s = sky('#f87038', '#f8b878') + ground(52, '#b0a898') + road(58);
      s += building(2, 6, 18, 46, '#585878', '#f8e080') + building(22, 14, 14, 38, '#686888', '#f8e080') + building(38, 2, 16, 50, '#505070', '#f8e080');
      s += R(58, 4, 2, 48, '#f8b030') + R(58, 4, 34, 2, '#f8b030') + R(88, 6, 1, 14, '#585858') + R(86, 20, 5, 3, '#585858') + R(62, 20, 10, 32, '#a0a0b0');
      ['#f86048', '#3870d0', '#f8b030', '#58b048'].forEach((c, i) => { s += shop(60 + i * 16, 38, c); });
      s += sign(96, 22, 40, 'にぎわい商店街', '#f8b030', '#383838');
      return s;
    },
    // 包摂・ケア：桜の季節、ハートの看板の福祉施設と公園
    C: () => {
      let s = sky('#f8b8d0', '#fbe4ec') + ground(46, '#98d880');
      s += big(2, 12, 1.4, R(0, 10, 44, 24, '#fff8f0') + R(-2, 8, 48, 3, '#f878a8') + R(18, 22, 8, 12, '#a0d8f8') +
        [0, 1, 2, 3].map(i => R(3 + i * 11, 14, 6, 5, '#a0d8f8')).join('') +
        R(19, -4, 6, 2, '#f86048') + R(18, -3, 8, 3, '#f86048') + R(20, 0, 4, 2, '#f86048') + R(21, 2, 2, 1, '#f86048'));
      s += sign(14, 2, 34, 'みんなの家', '#f878a8');
      [70, 84, 98, 112, 140].forEach((x, i) => { s += cherry(x, 32 + (i % 2) * 3); });
      s += R(76, 40, 2, 8, '#f8b030') + R(76, 40, 8, 2, '#f8b030') + R(82, 42, 2, 2, '#f8b030') + R(84, 44, 2, 4, '#f8b030');
      s += person(92, 42, '#a058c8', '#f0f0f0') + person(97, 42, '#38a8a8', '#c8c8c8') + person(104, 44, '#f86048') + R(101, 47, 3, 1, '#f8d0a8');
      return s;
    },
    // バランス：ミント色の空に、6つの要素が少しずつ並ぶ
    balance: () => {
      let s = sky('#80d8c0', '#d0f4e8') + ground(50, '#88d070') + road(62);
      s += building(2, 18, 16, 32, '#a8a8c8') + shop(20, 34, '#f8b030') + house(38, 40, '#fff', '#f86048');
      s += R(54, 40, 12, 6, '#304880') + R(55, 41, 10, 1, '#88a8e8') + R(59, 46, 2, 4, '#585858');
      s += R(68, 24, 24, 14, '#202838') + `<text x="80" y="33" font-size="4.5" text-anchor="middle" fill="#60f8f8" font-family="${FONT}">ONLINE</text>` + R(79, 38, 2, 12, '#585858');
      s += R(94, 30, 24, 20, '#fff8f0') + R(92, 28, 28, 3, '#f878a8') + R(103, 40, 6, 10, '#a0d8f8');
      s += tree(120, 36) + tree(132, 38, '#58b048') + R(144, 30, 1, 20, '#585858') + R(145, 30, 8, 5, '#3870d0');
      s += sign(44, 8, 50, 'いろんな声が届く街', '#38a8a8');
      return s;
    },
  };

  function townScene(key) {
    return scene((TOWN[key] || TOWN.balance)());
  }

  const api = { sprite, blankScene, introScene, titleScene, officeScene, townScene, citizen, mayor, secretary };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MG = root.MG || {}).art = api;
})(typeof window !== 'undefined' ? window : globalThis);
