/**
 * 夜晚行动顺序面板（F-04，ADR-006/017）：
 * 系统锚点步骤 + 在场角色步骤的 checklist；逐项打勾（nightProgress 持久化）；
 * 角色步骤与爪牙/恶魔信息步骤记 night_action 事件（含可选 info 自由文本），
 * 黄昏/黎明只打勾不记事件；勾「黎明」自动进入白天（round+1）。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';
import { buildNightOrder, stepKey, systemRoleId, systemStepOverrideHints } from '../../lib/nightOrder';
import { roleById as buildRoleById } from '../../lib/roleMap';
import { RoleIcon } from '../../ui/RoleIcon';
import { createEvent } from '../../lib/events';
import type { Role } from '../../types/script';
import type { Game, Seat } from '../../types/game';
import type { NightStep } from '../../lib/nightOrder';

export function NightPanel() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const setNightStepChecked = useGameStore((s) => s.setNightStepChecked);
  const finishNight = useGameStore((s) => s.finishNight);
  const rewindPhase = useGameStore((s) => s.rewindPhase);
  const events = useEventStore((s) => s.events);
  const appendEvent = useEventStore((s) => s.append);
  const removeEvent = useEventStore((s) => s.remove);

  const [infoDrafts, setInfoDrafts] = useState<Record<string, string>>({});

  const roleById = useMemo(
    () => buildRoleById(game?.scriptSnapshot.roles ?? []),
    [game],
  );

  const steps = useMemo<NightStep[]>(() => {
    if (!game) return [];
    const firstNight = game.phase === 'firstNight';
    const inPlay = inPlayRoles(game, roleById);
    return buildNightOrder(inPlay, firstNight, game.seats.length);
  }, [game, roleById]);

  const hints = useMemo(() => {
    if (!game) return [];
    return systemStepOverrideHints(inPlayRoles(game, roleById), game.phase === 'firstNight').map(
      (key) => t(key),
    );
  }, [game, roleById, t]);

  if (!game || (game.phase !== 'firstNight' && game.phase !== 'night')) return null;

  const checked = new Set(
    game.nightProgress?.round === game.round ? game.nightProgress.checked : [],
  );
  const done = steps.filter((s) => checked.has(stepKey(s))).length;

  const seatsForStep = (step: NightStep): Seat[] => {
    if (step.kind === 'system') {
      if (step.system !== 'minion_info' && step.system !== 'demon_info') return [];
      const team = step.system === 'minion_info' ? 'minion' : 'demon';
      return game.seats.filter((s) => s.roleId !== undefined && roleById.get(s.roleId)?.team === team);
    }
    return game.seats.filter((s) => s.roleId === step.roleId);
  };

  /** 找到该步骤在本夜已记录的 night_action 事件（取消打勾时删除） */
  const eventForStep = (key: string) =>
    events.find(
      (e) =>
        e.type === 'night_action' &&
        e.round === game.round &&
        e.phase === game.phase &&
        e.payload.stepKey === key,
    );

  const handleToggle = (step: NightStep, next: boolean): void => {
    const key = stepKey(step);
    setNightStepChecked(key, next);

    if (step.kind === 'system' && (step.system === 'dusk' || step.system === 'dawn')) {
      // 黄昏/黎明不产生事件（ADR-017）；黎明 = 夜晚收尾，自动进入白天
      if (step.system === 'dawn' && next) finishNight();
      return;
    }

    if (!next) {
      const existing = eventForStep(key);
      if (existing) removeEvent(existing.id);
      return;
    }

    const roleId = step.kind === 'role' ? step.roleId : systemRoleId(step.system);
    const info = (infoDrafts[key] ?? '').trim();
    appendEvent(
      createEvent(game, 'night_action', {
        seatNumbers: seatsForStep(step).map((s) => s.seatNumber),
        payload: { stepKey: key, roleId, ...(info ? { info } : {}) },
      }),
    );
  };

  const title = game.phase === 'firstNight' ? t('nightOrder.firstNight') : t('nightOrder.otherNight', { round: String(game.round + 1) });

  return (
    <section className="panel" aria-label={t('nightPanel.title')}>
      <h2>
        {t('nightPanel.title')} · {title}
      </h2>
      <p className="night-progress" role="status">
        {t('nightPanel.progress', { done: String(done), total: String(steps.length) })}
      </p>

      {hints.length > 0 && (
        <ul className="night-hints">
          {hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      )}

      <ol className="night-steps">
        {steps.map((step) => {
          const key = stepKey(step);
          const isChecked = checked.has(key);
          const seatNumbers = seatsForStep(step).map((s) => s.seatNumber);
          const recorded = eventForStep(key);
          const info = infoDrafts[key] ?? (typeof recorded?.payload.info === 'string' ? recorded.payload.info : '');
          const name =
            step.kind === 'system'
              ? t(`nightPanel.system.${step.system}`)
              : step.roleName;
          return (
            <li key={key} className={`night-step${isChecked ? ' is-done' : ''}`}>
              <label className="night-step__main">
                <input
                  type="checkbox"
                  aria-label={name}
                  checked={isChecked}
                  onChange={(e) => handleToggle(step, e.target.checked)}
                />
                <span className="night-step__name">
                  {step.kind === 'role' && (
                    <RoleIcon roleId={step.roleId} team={roleById.get(step.roleId)?.team} size="1.1rem" />
                  )}
                  {name}
                </span>
                {seatNumbers.length > 0 && (
                  <span className="night-step__seats">
                    {t('nightPanel.seatsLabel', { seats: seatNumbers.join('、') })}
                  </span>
                )}
              </label>
              {step.kind === 'role' && step.reminder && (
                <p className="night-step__reminder">{step.reminder}</p>
              )}
              {!(step.kind === 'system' && (step.system === 'dusk' || step.system === 'dawn')) && (
                <input
                  type="text"
                  className="night-step__info"
                  value={info}
                  placeholder={t('nightPanel.infoPlaceholder')}
                  aria-label={`${name} ${t('nightPanel.infoPlaceholder')}`}
                  disabled={isChecked}
                  onChange={(e) => setInfoDrafts((d) => ({ ...d, [key]: e.target.value }))}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="night-finish-hint">{t('nightPanel.finishHint')}</p>
      <div className="btn-row">
        <button type="button" className="btn" onClick={rewindPhase}>
          {game.phase === 'firstNight' ? t('nightPanel.rewindToSetup') : t('nightPanel.rewind')}
        </button>
      </div>
    </section>
  );
}

/** 在场角色（去重，保留剧本快照定义） */
function inPlayRoles(game: Game, roleById: Map<string, Role>): Role[] {
  const ids = new Set(game.seats.map((s) => s.roleId).filter((id): id is string => id !== undefined));
  return [...ids].map((id) => roleById.get(id)).filter((r): r is Role => r !== undefined);
}
