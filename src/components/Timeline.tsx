/**
 * 时间线 / 事件日志（F-06b 最小视图）：按 round + phase 分组渲染事件流。
 * night_action 的 system:* 前缀特判显示「爪牙信息 / 恶魔信息」（ADR-017）；
 * M3 的事件类型（提名/投票/处决等）落地前显示原始类型名兜底。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../stores/game';
import { useEventStore } from '../stores/events';
import type { GameEvent } from '../types/events';

interface Section {
  key: string;
  label: string;
  events: GameEvent[];
}

export function Timeline() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const events = useEventStore((s) => s.events);

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of game?.scriptSnapshot.roles ?? []) map.set(r.id, r.name);
    return map;
  }, [game]);

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

  if (sections.length === 0) return null;

  return (
    <section className="panel timeline" aria-label={t('timeline.title')}>
      <h2>{t('timeline.title')}</h2>
      {sections.map((section) => (
        <div key={section.key} className="timeline__section">
          <h3>{section.label}</h3>
          <ul>
            {section.events.map((e) => (
              <li key={e.id} className="timeline__event">
                {eventText(e, roleNameById, t)}
              </li>
            ))}
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
  return t('phase.day', { round: String(e.round) });
}

function eventText(
  e: GameEvent,
  roleNameById: Map<string, string>,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  switch (e.type) {
    case 'night_action': {
      const roleId = typeof e.payload.roleId === 'string' ? e.payload.roleId : '';
      const name = roleId.startsWith('system:')
        ? t(`nightPanel.system.${roleId.slice('system:'.length)}`)
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
    default:
      // M3 类型（提名/投票/处决…）落地前的兜底
      return t('timeline.event.unknown', { type: e.type });
  }
}
