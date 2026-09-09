/**
 * 剧本快照角色索引（纯函数，无 React 依赖）。
 * SeatGrid / NightPanel / Timeline 三处曾各自手写同款循环，统一收口于此。
 */
import type { Role } from '../types/script';

/** 角色数组 → 以角色 id 为键的索引（需整份 Role 时用） */
export function roleById(roles: readonly Role[]): Map<string, Role> {
  return new Map(roles.map((r) => [r.id, r]));
}

/** 角色数组 → 角色 id → 显示名（只需展示名时用） */
export function roleNameById(roles: readonly Role[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of roles) map.set(r.id, r.name);
  return map;
}
