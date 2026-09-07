/**
 * 剧本状态（F-01 读剧本）：加载 / 解析 / 选择剧本。
 * 动作 = 调 scriptParser 纯函数；错误以 {code, params} 存，UI 层经 i18n 渲染中文提示。
 */
import { create } from 'zustand';
import { parseScript } from '../lib/scriptParser';
import type { Script } from '../types/script';
import { builtinScriptJson, type BuiltinScriptId } from '../data/builtin-scripts';

export interface ScriptImportError {
  code: string;
  params?: Record<string, string>;
}

interface ScriptState {
  /** 当前剧本（null = 尚未导入） */
  script: Script | null;
  /** 最近一次导入失败原因（i18n code）；导入成功时清空 */
  error: ScriptImportError | null;
  importFromText(text: string): boolean;
  importFromFile(file: File): Promise<boolean>;
  importFromUrl(url: string): Promise<boolean>;
  selectBuiltin(id: BuiltinScriptId): boolean;
  /**
   * 从对局快照恢复剧本状态（F-07a 杀后台恢复）：hydrate 后 scriptStore 为空，
   * App 用 game.scriptSnapshot 重建，预览/抽袋/夜单组件才能拿到角色数据。
   * 快照不含 jinxes/warnings——展示层仅消费 roles，属可接受降级。
   */
  restoreFromSnapshot(snapshot: { name: string; author?: string; roles: Script['roles'] }): void;
  clear(): void;
}

export const useScriptStore = create<ScriptState>()((set, get) => ({
  script: null,
  error: null,

  importFromText(text) {
    const result = parseScript(text);
    if (result.ok) {
      set({ script: result.script, error: null });
      return true;
    }
    set({ error: result.error });
    return false;
  },

  async importFromFile(file) {
    return get().importFromText(await file.text());
  },

  async importFromUrl(url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      set({ error: { code: 'scriptImport.error.invalidUrl' } });
      return false;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      set({ error: { code: 'scriptImport.error.invalidUrl' } });
      return false;
    }
    let text: string;
    try {
      const res = await fetch(parsed.toString());
      if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
      text = await res.text();
    } catch {
      // 网络 / CORS / 非 2xx 一律归为拉取失败，引导改用粘贴或上传（F-01a 兜底）
      set({ error: { code: 'scriptImport.error.fetchFailed' } });
      return false;
    }
    return get().importFromText(text);
  },

  selectBuiltin(id) {
    // 与文件导入走同一条解析链路，零特判（ADR-015）
    return get().importFromText(builtinScriptJson(id));
  },

  restoreFromSnapshot(snapshot) {
    set({ script: { name: snapshot.name, author: snapshot.author, roles: snapshot.roles, jinxes: [], warnings: [] }, error: null });
  },

  clear() {
    set({ script: null, error: null });
  },
}));
