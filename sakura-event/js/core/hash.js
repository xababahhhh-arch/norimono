// 入力資料の同一性の確認（SHA-256）。
// ハッシュは「同じファイルかどうか」の確認にだけ使う。最新版か・公開が承認された版かは判定しない。
export async function sha256Hex(data) {
  const buf = data instanceof ArrayBuffer ? data : data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : new TextEncoder().encode(String(data)).buffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** 入力資料の記録（event.json の meta.source_files に入れる） */
export function sourceRecord({ name, type, size, sha256, importedAt, pages = null }) {
  return { name, type: type ?? '', size: size ?? null, sha256, imported_at: importedAt, pages };
}

/** 2つの資料の組が同じか（ハッシュの集合で比べる。名前・順番は問わない） */
export function sameSources(a = [], b = []) {
  const x = [...new Set(a.map((s) => s.sha256).filter(Boolean))].sort();
  const y = [...new Set(b.map((s) => s.sha256).filter(Boolean))].sort();
  return x.length > 0 && x.length === y.length && x.every((h, i) => h === y[i]);
}
