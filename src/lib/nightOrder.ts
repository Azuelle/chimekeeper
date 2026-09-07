/**
 * 夜晚行动排序（F-04）
 *
 * ADR-006：夜晚面板 = 系统锚点步骤 + 角色步骤的双层结构。
 * 系统步骤（黄昏/爪牙信息/恶魔信息/黎明）内置，不来自剧本数据。
 * 角色对系统步骤的改写（罂粟种植者等）v1 仅以提示文案展示，不自动改写。
 */
import type { Role } from '../types/script';
import { normalizeRoleId } from './roleDb';

/** 系统锚点步骤 */
export type SystemStepKind = 'dusk' | 'minion_info' | 'demon_info' | 'dawn';

export type NightStep =
  | { kind: 'system'; system: SystemStepKind }
  | { kind: 'role'; roleId: string; roleName: string; reminder: string; order: number };

/** 在场角色中已知会改写首夜系统步骤的角色 → 提示文案（i18n key） */
const SYSTEM_STEP_OVERRIDES: Record<string, string> = {
  poppygrower: 'nightOrder.hint.poppyGrower', // 跳过爪牙信息/恶魔信息
  magician: 'nightOrder.hint.magician', // 爪牙/恶魔信息内容需调整
  snitch: 'nightOrder.hint.snitch', // 爪牙信息时向爪牙展示三个不在场善良角色
};

/** 角色行动项 */
export interface NightActionItem {
  roleId: string;
  roleName: string;
  /** 官方提示词（说书人唤醒时的指引，来自剧本 JSON 或注水数据） */
  reminder: string;
  order: number;
}

export function buildRoleSteps(inPlayRoles: Role[], firstNight: boolean): NightActionItem[] {
  return inPlayRoles
    .map((r) => {
      const order = firstNight ? r.firstNight : r.otherNight;
      const reminder = firstNight ? (r.firstNightReminder ?? '') : (r.otherNightReminder ?? '');
      return { roleId: r.id, roleName: r.name, reminder, order };
    })
    .filter((item) => item.order > 0)
    .sort((a, b) => a.order - b.order);
}

/**
 * 构建完整夜晚面板步骤。
 * 首夜（≥7 人）：黄昏 → 爪牙信息 → 恶魔信息 → 角色步骤 → 黎明
 * 其他夜晚或 <7 人：黄昏 → 角色步骤 → 黎明
 */
export function buildNightOrder(
  inPlayRoles: Role[],
  firstNight: boolean,
  playerCount: number,
): NightStep[] {
  const steps: NightStep[] = [{ kind: 'system', system: 'dusk' }];

  if (firstNight && playerCount >= 7) {
    steps.push({ kind: 'system', system: 'minion_info' }, { kind: 'system', system: 'demon_info' });
  }

  for (const item of buildRoleSteps(inPlayRoles, firstNight)) {
    steps.push({ kind: 'role', ...item });
  }

  steps.push({ kind: 'system', system: 'dawn' });
  return steps;
}

/** 步骤唯一 key（ADR-017 夜单进度持久化）：system→system:${kind}，role→role:${roleId} */
export function stepKey(step: NightStep): string {
  return step.kind === 'system' ? `system:${step.system}` : `role:${step.roleId}`;
}

/** 返回在场角色触发的系统步骤改写提示（i18n keys），供面板顶部展示 */
export function systemStepOverrideHints(inPlayRoles: Role[], firstNight: boolean): string[] {
  if (!firstNight) return [];
  return inPlayRoles
    .filter((r) => normalizeRoleId(r.id) in SYSTEM_STEP_OVERRIDES)
    .map((r) => SYSTEM_STEP_OVERRIDES[normalizeRoleId(r.id)]!);
}
