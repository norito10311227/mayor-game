// KeyboardEvent をゲームのアクション名に変換する。純粋関数。
(function (root) {
  const KEYMAP = {
    'Enter': 'ok', ' ': 'ok',
    'ArrowLeft': 'left', 'ArrowRight': 'right', 'ArrowUp': 'up', 'ArrowDown': 'down',
    'a': 'a', 'A': 'a', 'b': 'b', 'B': 'b',
    'Backspace': 'back', 'Escape': 'escape',
    'm': 'mute', 'M': 'mute',
  };
  // 名前入力欄にフォーカスがあるときは、文字入力を邪魔しないようこれだけを拾う
  const TEXT_INPUT_KEYS = { 'Enter': 'ok', 'Escape': 'escape' };

  // modalOpen：確認ダイアログが出ているときは、入力欄にフォーカスがあっても通常のキーで操作する
  function keyToAction({ key, repeat, isComposing, targetIsTextInput, modalOpen }) {
    if (repeat || isComposing) return null;
    const map = targetIsTextInput && !modalOpen ? TEXT_INPUT_KEYS : KEYMAP;
    return map[key] || null;
  }

  // タップ・クリックした場所 → アクション名
  // act：下部バーなどのボタン / menuIndex：メニューの項目 / isTextInput：名前の入力欄 / inBar：下部バーの中
  // それ以外の場所は 'tap'（文字送り。メニューの選択にはならない）
  function clickToAction({ act, menuIndex, isTextInput, inBar }) {
    if (act) return act;
    if (inBar) return null; // ボタンのすき間を押しても文字送りにしない
    if (typeof menuIndex === 'number') return 'pick:' + menuIndex;
    if (isTextInput) return null;
    return 'tap';
  }

  const api = { keyToAction, clickToAction };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MG = root.MG || {}).input = api;
})(typeof window !== 'undefined' ? window : globalThis);
