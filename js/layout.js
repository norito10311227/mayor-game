// 画面の向きとタッチ端末かどうかから、レイアウトのモードを決める。純粋関数。
(function (root) {
  const PANEL_ASPECT = 720 / 1280;

  // portrait：縦長の画面か / coarse：指で操作する端末か（スマホ・タブレット）
  function layoutFor({ portrait, coarse }) {
    return { mode: portrait ? 'portrait' : 'landscape', touchBar: !!coarse };
  }

  const api = { PANEL_ASPECT, layoutFor };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MG = root.MG || {}).layout = api;
})(typeof window !== 'undefined' ? window : globalThis);
