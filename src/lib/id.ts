/**
 * 本地 id 生成（local-first，无后端）。
 *
 * 优先 crypto.randomUUID；jsdom / 旧环境可能缺方法，逐级兜底：
 * randomUUID → getRandomValues（自组随机串）→ Math.random（极少触达）。
 */
export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `g-${hex}`;
  }
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
