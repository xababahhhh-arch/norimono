// 画面用の小さな補助関数。

/** 要素を作る。attrs の on* はイベント、text は textContent、html は使わない（XSS防止）。 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

let announceTimer = null;
/** ステータスメッセージ（WCAG 4.1.3）。role="status" の領域に書く。 */
export function announce(message) {
  const el = document.getElementById('status-message');
  if (!el) return;
  el.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { el.textContent = message; }, 50);
}

export async function copyText(text, label = '') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { 'aria-hidden': 'true', class: 'visually-hidden' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  announce(`${label ? `${label}を` : ''}コピーしました。`);
}

export function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`${filename} を保存しました。`);
}

let uid = 0;
export function nextId(prefix = 'f') {
  uid += 1;
  return `${prefix}-${uid}`;
}

export function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
export function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch { /* 何もしない */ }
}
