// 画面まわり（DOM）。台本（main.js）は say / menu などを await して進む。
// キー入力は main.js から handleAction で渡され、いま待っているものだけが受け取る。
(function (root) {
  const PAGE_CHARS = 90;       // メッセージウィンドウ1枚に収める文字数（32px・3行）
  const TYPE_MS = 30;          // 1文字の表示間隔
  const MENU_GUARD_MS = 400;   // メニューが出た直後の連打で誤選択しないための待ち
  const TITLE_GUARD_MS = 1500; // 結果を送り切ってタイトルに戻った直後の連打で、次のゲームが始まらないための待ち
  const BOUNDARY = '。！？!?';
  const CLOSERS = '」』）)';

  // 文の切れ目（句点など＋直後の閉じかっこ）で区切り、max 文字以内のページに詰める
  function paginate(text, max) {
    const chars = [...text];
    const segments = [];
    let cur = '';
    for (let i = 0; i < chars.length; i++) {
      cur += chars[i];
      if (BOUNDARY.includes(chars[i])) {
        while (i + 1 < chars.length && CLOSERS.includes(chars[i + 1])) cur += chars[++i];
        segments.push(cur);
        cur = '';
      }
    }
    if (cur) segments.push(cur);

    const pages = [];
    let page = '';
    for (const seg of segments) {
      const segLen = [...seg].length;
      if ([...page].length + segLen <= max) { page += seg; continue; }
      if (page) pages.push(page);
      page = '';
      const segChars = [...seg];
      while (segChars.length > max) pages.push(segChars.splice(0, max).join(''));
      page = segChars.join('');
    }
    if (page) pages.push(page);
    return pages;
  }

  function acceptAfter(elapsedMs, guardMs) {
    return elapsedMs >= guardMs;
  }

  // 「じぶんで きめる」直後の連打 Enter で空のまま送信されないようにする
  function shouldSubmitName(value, elapsedMs) {
    return value.trim() !== '' || acceptAfter(elapsedMs, MENU_GUARD_MS);
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { paginate, shouldSubmitName, acceptAfter, TITLE_GUARD_MS };
    return;
  }

  const $ = id => document.getElementById(id);
  let stage;
  // 待ち受け中のハンドラ。confirm は一時的に上に積む
  const waiters = [];
  const pending = new Set();
  let timers = [];

  function wait(handler) {
    return new Promise((resolve, reject) => {
      const entry = { reject };
      entry.handle = action => handler(action, value => {
        remove(entry);
        resolve(value);
      });
      waiters.push(entry);
      pending.add(entry);
    });
  }
  function remove(entry) {
    const i = waiters.indexOf(entry);
    if (i >= 0) waiters.splice(i, 1);
    pending.delete(entry);
  }

  function handleAction(action) {
    const top = waiters[waiters.length - 1];
    if (top) top.handle(action);
  }

  function later(fn, ms) {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  }

  let layoutMode = 'landscape';

  // 横長：ステージ全体を拡縮して中央へ。縦長：ステージは画面いっぱいの縦並びにし、絵のパネルだけ画面幅に合わせる
  function fit() {
    const view = $('view');
    if (layoutMode === 'portrait') {
      const s = stage.clientWidth / 1280;
      stage.style.transform = '';
      view.style.transform = `scale(${s})`;
      $('view-frame').style.height = 720 * s + 'px';
      return;
    }
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `translate(${(innerWidth - 1280 * s) / 2}px, ${(innerHeight - 720 * s) / 2}px) scale(${s})`;
    view.style.transform = '';
    $('view-frame').style.height = '';
  }

  function applyLayout({ mode, touchBar }) {
    layoutMode = mode;
    document.body.classList.toggle('is-portrait', mode === 'portrait');
    document.body.classList.toggle('is-touch', touchBar);
    fit();
  }

  function init(stageEl) {
    stage = stageEl;
    setBackEnabled(false);
    fit();
    addEventListener('resize', fit);
  }

  function setScene(svg) { $('scene').innerHTML = svg || ''; }

  function setSprites(list) {
    $('sprites').innerHTML = '';
    for (const s of list) {
      const el = document.createElement('div');
      el.className = 'sprite' + (s.dim ? ' dim' : '') + (s.jump ? ' jump' : '');
      Object.assign(el.style, { left: s.x + 'px', top: s.y + 'px', width: s.w + 'px' });
      el.innerHTML = s.svg;
      if (s.label) {
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = s.label;
        el.appendChild(label);
      }
      $('sprites').appendChild(el);
    }
  }

  function setHeader(text) {
    const h = $('header');
    if (!text) { h.hidden = true; return; }
    const [num, ...rest] = text.split(' ');
    h.innerHTML = '';
    for (const [cls, t] of [['num', num], ['title', rest.join(' ')]]) {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = t;
      h.appendChild(span);
    }
    h.hidden = false;
  }

  // 1ページを1文字ずつ表示。ok 1回目で全文、2回目で次へ
  function typePage(page, speaker) {
    const win = $('window');
    const textEl = win.querySelector('.text');
    const more = win.querySelector('.more');
    const sp = win.querySelector('.speaker');
    sp.hidden = !speaker;
    sp.textContent = speaker || '';
    textEl.textContent = '';
    more.hidden = true;
    win.hidden = false;

    const chars = [...page];
    let shown = 0;
    let done = false;
    const finish = () => {
      done = true;
      textEl.textContent = page;
      more.hidden = false;
    };
    const tick = () => {
      if (done) return;
      shown++;
      textEl.textContent = chars.slice(0, shown).join('');
      if (shown % 3 === 1 && root.MG.audio) root.MG.audio.blip();
      if (shown >= chars.length) finish();
      else later(tick, TYPE_MS);
    };
    tick();

    return wait((action, resolve) => {
      if (action !== 'ok' && action !== 'tap') return;
      if (!done) { finish(); return; }
      resolve();
    });
  }

  async function say(text, opts = {}) {
    for (const page of paginate(text, PAGE_CHARS)) await typePage(page, opts.speaker);
  }

  // 文字送りなしでウィンドウに出しておく（メニューの問いかけ用）
  function show(text) {
    const win = $('window');
    win.querySelector('.speaker').hidden = true;
    win.querySelector('.more').hidden = true;
    win.querySelector('.text').textContent = text;
    win.hidden = false;
  }

  // notes：各項目の下に小さく添える注記（縦長レイアウトで表示）
  function renderMenu(el, items, index, notes = []) {
    el.innerHTML = '';
    items.forEach((t, i) => {
      const div = document.createElement('div');
      div.className = 'item' + (i === index ? ' on' : '');
      div.dataset.index = i;
      div.textContent = t;
      if (notes[i]) {
        const small = document.createElement('small');
        small.textContent = notes[i];
        div.appendChild(small);
      }
      el.appendChild(div);
    });
  }

  // 'pick:2' → 2 / それ以外 → null
  function pickedIndex(action, count) {
    if (!action.startsWith('pick:')) return null;
    const i = Number(action.slice(5));
    return i >= 0 && i < count ? i : null;
  }

  function menu(items, opts = {}) {
    const el = $('menu');
    el.className = 'box ' + (opts.layout || 'window');
    let index = 0;
    const openedAt = Date.now();
    renderMenu(el, items, index, opts.notes);
    el.hidden = false;
    if (opts.layout !== 'side') $('window').hidden = true;

    const close = (resolve, value) => {
      el.hidden = true;
      if (root.MG.audio) root.MG.audio.confirm();
      resolve(value);
    };
    return wait((action, resolve) => {
      if (action === 'back') { el.hidden = true; resolve('back'); return; }
      if (Date.now() - openedAt < MENU_GUARD_MS) return;
      const picked = pickedIndex(action, items.length);
      if (picked !== null) return close(resolve, picked);
      if (action === 'up' || action === 'left') index = (index + items.length - 1) % items.length;
      else if (action === 'down' || action === 'right') index = (index + 1) % items.length;
      else if (action === 'ok') return close(resolve, index);
      else if ((action === 'a' || action === 'b') && items.length === 2) return close(resolve, action === 'a' ? 0 : 1);
      else return;
      if (root.MG.audio) root.MG.audio.select();
      renderMenu(el, items, index, opts.notes);
    });
  }

  async function askName(candidates) {
    for (;;) {
      show('あたらしい 市長の なまえを おしえてください！');
      const i = await menu(['じぶんで きめる', ...candidates], { layout: 'side' });
      if (i === 'back') continue;
      if (i > 0) return candidates[i - 1];

      const box = $('name-entry');
      const input = $('name-input');
      input.value = '';
      box.hidden = false;
      show(document.body.classList.contains('is-touch') ? 'なまえを 入力して「けってい」' : 'なまえを 入力して Enter');
      input.focus({ preventScroll: true });
      const openedAt = Date.now();
      const value = await wait((action, resolve) => {
        if (action === 'ok' && shouldSubmitName(input.value, Date.now() - openedAt)) resolve(input.value);
      });
      input.blur();
      box.hidden = true;
      return value;
    }
  }

  function confirm(text) {
    const el = $('confirm');
    const items = ['はい', 'いいえ'];
    let index = 1;
    const render = () => {
      el.textContent = '';
      const p = document.createElement('div');
      p.textContent = text;
      el.appendChild(p);
      const m = document.createElement('div');
      m.id = 'confirm-menu';
      renderMenu(m, items, index);
      m.querySelectorAll('.item').forEach(n => { n.style.display = 'inline-block'; n.style.marginRight = '1em'; });
      el.appendChild(m);
    };
    render();
    el.hidden = false;
    return wait((action, resolve) => {
      const picked = pickedIndex(action, items.length);
      if (picked !== null) { el.hidden = true; resolve(picked === 0); return; }
      if (['left', 'right', 'up', 'down'].includes(action)) { index = 1 - index; render(); return; }
      if (action === 'ok') { el.hidden = true; resolve(index === 0); }
      if (action === 'escape' || action === 'back') { el.hidden = true; resolve(false); }
    });
  }

  // 下部バーの「1問もどる」は、問題の選択中で戻れるときだけ押せる
  function setBackEnabled(enabled) {
    $('touchbar').querySelector('[data-act=back]').disabled = !enabled;
  }

  function setMuted(muted) {
    $('touchbar').querySelector('[data-act=mute]').textContent = muted ? '♪ 消音中' : '♪ 音';
  }

  function showGauges(rows) {
    const el = $('gauges');
    el.innerHTML = '';
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'gauge';
      row.innerHTML = '<b></b><i><s></s></i>';
      row.querySelector('b').textContent = r.name;
      const bar = row.querySelector('s');
      bar.style.background = r.color;
      bar.style.width = '0%';
      el.appendChild(row);
      later(() => { bar.style.width = Math.max(4, r.ratio * 100) + '%'; }, 50);
    }
    el.hidden = false;
  }
  function hideGauges() { $('gauges').hidden = true; }

  function isWaiting() { return waiters.length > 0; }

  // タイトル画面用：ok が押されるまで待つ。出た直後の連打は無視する
  function waitOk() {
    const openedAt = Date.now();
    return wait((action, resolve) => {
      if ((action === 'ok' || action === 'tap') && acceptAfter(Date.now() - openedAt, TITLE_GUARD_MS)) resolve();
    });
  }

  // すべて消して、待っているものは 'reset' で打ち切る
  function clear() {
    timers.forEach(clearTimeout);
    timers = [];
    for (const entry of [...pending]) { remove(entry); entry.reject(new Error('reset')); }
    setScene('');
    setSprites([]);
    setHeader(null);
    hideGauges();
    for (const id of ['window', 'menu', 'name-entry', 'confirm']) $(id).hidden = true;
    $('name-input').blur();
  }

  (root.MG = root.MG || {}).ui = {
    paginate, init, applyLayout, setScene, setSprites, setHeader, say, show, menu, askName, confirm,
    setBackEnabled, setMuted, showGauges, hideGauges, handleAction, isWaiting, waitOk, clear,
  };
})(typeof window !== 'undefined' ? window : globalThis);
