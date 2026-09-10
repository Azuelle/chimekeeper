/**
 * 时间线 / 事件日志（F-06b + F-06c + F-06d）：按 round + phase 分组渲染事件流。
 * - note 全文可编辑；night_action 的 info 自由文本可编辑（F-06d，STATUS M2 已知边界）
 * - 可删除 = 不改写 Game 状态的事件（note/nomination/vote/execution）：
 *   death/revival 会双写 seat 状态，删除会导致日志与状态失同步（DATA-MODEL 双写一致性），
 *   说书人纠错走白天面板的登记死亡/复活反向动作；night_action/phase_change/seat 事件/game_end 不开放删除
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../stores/game';
import { useEventStore } from '../stores/events';
import { createEvent, nightActionRoleId, realRoleId } from '../lib/events';
import { systemStepKind } from '../lib/nightOrder';
import { roleById as buildRoleById, roleNameById as buildRoleNameMap } from '../lib/roleMap';
import { newId } from '../lib/id';
import { RoleIcon } from '../ui/RoleIcon';
import type { GameEvent } from '../types/events';

interface Section {
  key: string;
  label: string;
  events: GameEvent[];
}

/** 删除/撤销仅限不触碰 Game 状态的事件；状态变更事件删了会造成双写失同步 */
const DELETABLE_TYPES = new Set<GameEvent['type']>(['note', 'nomination', 'vote', 'execution']);

export function Timeline() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const events = useEventStore((s) => s.events);
  const remove = useEventStore((s) => s.remove);
  const append = useEventStore((s) => s.append);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [lastDeleted, setLastDeleted] = useState<GameEvent | null>(null);

  const roleNameById = useMemo(
    () => buildRoleNameMap(game?.scriptSnapshot.roles ?? []),
    [game],
  );
  const roleById = useMemo(
    () => buildRoleById(game?.scriptSnapshot.roles ?? []),
    [game],
  );

  const sections = useMemo<Section[]>(() => {
    const out: Section[] = [];
    for (const e of events) {
      const key = `${String(e.round)}:${e.phase}`;
      let section = out.at(-1);
      if (!section || section.key !== key) {
        section = { key, label: sectionLabel(e, t), events: [] };
        out.push(section);
      }
      section.events.push(e);
    }
    return out;
  }, [events, t]);

  const handleDelete = (e: GameEvent) => {
    if (!window.confirm(t('timeline.deleteConfirm'))) return;
    remove(e.id);
    setLastDeleted(e);
    window.setTimeout(() => {
      setLastDeleted((cur) => (cur?.id === e.id ? null : cur));
    }, 5000);
  };

  const handleUndo = () => {
    if (!lastDeleted) return;
    append({ ...lastDeleted, id: newId(), createdAt: Date.now() });
    setLastDeleted(null);
  };

  const startEdit = (e: GameEvent) => {
    setEditingId(e.id);
    const value =
      e.type === 'night_action'
        ? typeof e.payload.info === 'string'
          ? e.payload.info
          : ''
        : typeof e.payload.text === 'string'
          ? e.payload.text
          : '';
    setEditText(value);
  };

  const saveEdit = () => {
    if (!editingId || !game) return;
    const old = events.find((e) => e.id === editingId);
    if (!old) return;
    const text = editText.trim();
    const base = { id: old.gameId, round: old.round, phase: old.phase };

    if (old.type === 'note') {
      if (!text) return; // 空备注不保存，保持编辑态
      remove(editingId);
      append(createEvent(base, 'note', { payload: { text } }));
    } else if (old.type === 'night_action') {
      // F-06d：只改 info 自由文本，保留 stepKey/roleId/座位（清空 = 移除 info）
      const payload = { ...old.payload };
      if (text) payload.info = text;
      else delete payload.info;
      remove(editingId);
      append(
        createEvent(base, 'night_action', { seatNumbers: old.seatNumbers, payload }),
      );
    }

    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  if (sections.length === 0 && !lastDeleted) return null;

  return (
    <section className="panel timeline" aria-label={t('timeline.title')}>
      <h2>{t('timeline.title')}</h2>
      {lastDeleted && (
        <div className="timeline__undo">
          <span>{t('timeline.deleted')}</span>
          <button type="button" className="btn btn--small" onClick={handleUndo}>
            {t('timeline.undo')}
          </button>
        </div>
      )}
      {sections.map((section) => (
        <div key={section.key} className="timeline__section">
          <h3>{section.label}</h3>
          <ul>
            {section.events.map((e) => {
              const roleId = realRoleId(e);
              return (
                <li key={e.id} className="timeline__event">
                  {editingId === e.id ? (
                    <div className="timeline__edit">
                      <textarea value={editText} onChange={(ev) => setEditText(ev.target.value)} rows={2} />
                      <div className="btn-row">
                        <button type="button" className="btn btn--small" onClick={saveEdit}>
                          {t('timeline.save')}
                        </button>
                        <button type="button" className="btn btn--small" onClick={cancelEdit}>
                          {t('timeline.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {roleId && <RoleIcon roleId={roleId} team={roleById.get(roleId)?.team} size="1rem" />}
                      <span className="timeline__text">{eventText(e, roleNameById, t)}</span>
                      <span className="timeline__actions">
                        {(e.type === 'note' || e.type === 'night_action') && (
                          <button type="button" className="btn btn--small" onClick={() => startEdit(e)}>
                            {t('timeline.edit')}
                          </button>
                        )}
                        {DELETABLE_TYPES.has(e.type) && (
                          <button type="button" className="btn btn--small" onClick={() => handleDelete(e)}>
                            {t('timeline.delete')}
                          </button>
                        )}
                      </span>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function sectionLabel(e: GameEvent, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (e.phase === 'setup') return t('phase.setup');
  if (e.phase === 'firstNight') return t('nightOrder.firstNight');
  if (e.phase === 'night') return t('nightOrder.otherNight', { round: String(e.round + 1) });
  if (e.phase === 'ended') return t('phase.ended');
  return t('phase.day', { round: String(e.round) });
}

function eventText(
  e: GameEvent,
  roleNameById: Map<string, string>,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  switch (e.type) {
    case 'night_action': {
      const roleId = nightActionRoleId(e) ?? '';
      const kind = systemStepKind(roleId);
      const name = kind
        ? t(`nightPanel.system.${kind}`)
        : (roleNameById.get(roleId) ?? roleId);
      const seats = e.seatNumbers.length > 0 ? `（${t('nightPanel.seatsLabel', { seats: e.seatNumbers.join('、') })}）` : '';
      const info = typeof e.payload.info === 'string' && e.payload.info ? `：${e.payload.info}` : '';
      return `${name}${seats}${info}`;
    }
    case 'phase_change': {
      const to = e.payload.to;
      if (to === 'firstNight') return t('timeline.event.phaseToFirstNight');
      if (to === 'day') return t('timeline.event.phaseToDay');
      if (to === 'night') return t('timeline.event.phaseToNight');
      return t('timeline.event.unknown', { type: e.type });
    }
    case 'seat_add':
      return t('timeline.event.seatAdd', { seat: String(e.payload.seatNumber ?? '') });
    case 'seat_remove':
      return t('timeline.event.seatRemove', { seat: String(e.payload.seatNumber ?? '') });
    case 'seat_swap':
      return e.payload.ripple === true
        ? t('timeline.event.seatRipple', { a: String(e.payload.seatA ?? ''), b: String(e.payload.seatB ?? '') })
        : t('timeline.event.seatSwap', { a: String(e.payload.seatA ?? ''), b: String(e.payload.seatB ?? '') });
    case 'note':
      return typeof e.payload.text === 'string' ? e.payload.text : '';
    case 'nomination':
      // 提名以 payload 为唯一真相源（seatNumbers 不再重复写入，ADR/评论见 registerNomination）
      return t('timeline.event.nomination', {
        nominator: String(e.payload.nominatorSeat ?? ''),
        nominated: String(e.payload.nominatedSeat ?? ''),
      });
    case 'vote': {
      const votesFor = e.payload.votesFor;
      if (typeof votesFor !== 'number') return t('timeline.event.voteNoCount', { votesNeeded: String(e.payload.votesNeeded ?? '') });
      return t('timeline.event.vote', {
        votesFor: String(votesFor),
        votesNeeded: String(e.payload.votesNeeded ?? ''),
      });
    }
    case 'execution': {
      const seat = String(e.seatNumbers[0] ?? '');
      const diedSuffix = e.payload.died === true ? t('timeline.event.executionDied') : t('timeline.event.executionSurvived');
      return `${t('timeline.event.execution', { seat })} ${diedSuffix}`;
    }
    case 'death': {
      const seat = String(e.seatNumbers[0] ?? '');
      const cause = e.payload.cause;
      const causeText = typeof cause === 'string' ? ` ${t('timeline.event.deathCause', { cause: t(`dayPanel.cause.${cause}`) })}` : '';
      return `${t('timeline.event.death', { seat })}${causeText}`;
    }
    case 'revival':
      return t('timeline.event.revival', { seat: String(e.seatNumbers[0] ?? '') });
    case 'game_end': {
      const team = typeof e.payload.winningTeam === 'string' ? e.payload.winningTeam : '';
      return t('timeline.event.gameEnd', { team: t(`dayPanel.outcome.${team}`) });
    }
    default:
      return t('timeline.event.unknown', { type: e.type });
  }
}
