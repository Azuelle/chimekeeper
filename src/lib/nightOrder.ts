/**
 * 夜晚行动排序（F-04）
 */
import type { Role } from '../types/script';

export interface NightActionItem {
  roleId: string;
  roleName: string;
  /** 官方提示词（说书人唤醒时的台词/指引） */
  reminder: string;
  order: number;
}

/** 按 firstNight / otherNight 排序在场角色，0（不行动）被排除 */
export function buildNightOrder(inPlayRoles: Role[], firstNight: boolean): NightActionItem[] {
  return inPlayRoles
    .map((r) => {
      const order = firstNight ? r.firstNight : r.otherNight;
      const reminder = firstNight ? (r.firstNightReminder ?? '') : (r.otherNightReminder ?? '');
      return { roleId: r.id, roleName: r.name, reminder, order };
    })
    .filter((item) => item.order > 0)
    .sort((a, b) => a.order - b.order);
}
