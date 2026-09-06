/**
 * 座位环（ADR-005 玩家卡）：圆桌环 + 点击弹菜单。
 *
 * - 环形：`ringLayout(count, cols)` 按容器宽度自适应列数（手机竖屏 2 列，
 *   桌面 3–8），座位按阅读顺序（顶行 → 右 rail → 底行右→左 → 左 rail）围成一圈，
 *   DOM 顺序始终为 displayOrder 序。
 * - 卡片：左上角编号小字 + token 圆环（阵营着色见 ui/tokenSkin）+ 名牌 + 右侧
 *   提示标记区；整卡点击弹出菜单。
 * - 菜单：顶部 = 改名文本框（直改昵称，字号略小）；其下**单行三个单色图标** =
 *   交换座位 / 平移座位（涟漪式）/ 移除座位（细节由选中后的提示文案承担）；
 *   M2 角色类 / M3 白天类项目置灰占位、带单色图标并标注阶段。
 * - 纯渲染 + 事件转发，座位变更全走 gameStore（底层 lib/seats 原语）。
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ringLayout } from '../../lib/ringLayout';
import { useGameStore } from '../../stores/game';
import type { Seat } from '../../types/game';
import { ringSkinFor } from '../../ui/tokenSkin';
import { SeatGlyph, type SeatGlyphName } from '../../ui/icons';

interface SeatGridProps {
  seats: Seat[];
}

type MenuView = 'root' | 'remove';

/** 单个开放中的菜单：座位 + 视图 */
interface OpenMenu {
  seatNumber: number;
  view: MenuView;
}

/** 平移/换位的"选目标"流程 */
interface MovePick {
  kind: 'swap' | 'ripple';
  from: number;
}

/** M2/M3 门控：置灰占位行（ADR-005：未到里程碑标注原因，不可点） */
const LOCKED_ITEMS: Array<{ key: string; glyph: SeatGlyphName; lock: 'afterNight' | 'day' }> = [
  { key: 'seats.menu.assignRole', glyph: 'assignRole', lock: 'afterNight' },
  { key: 'seats.menu.changeRole', glyph: 'changeRole', lock: 'afterNight' },
  { key: 'seats.menu.addReminder', glyph: 'addReminder', lock: 'afterNight' },
  { key: 'seats.menu.setAlignment', glyph: 'setAlignment', lock: 'afterNight' },
  { key: 'seats.menu.logNight', glyph: 'logNight', lock: 'afterNight' },
  { key: 'seats.menu.markDead', glyph: 'markDead', lock: 'day' },
  { key: 'seats.menu.markVote', glyph: 'markVote', lock: 'day' },
  { key: 'seats.menu.nominate', glyph: 'nominate', lock: 'day' },
];

const MIN_COLS = 2;
const MAX_COLS = 8;
/** 每列估算宽度（px）：决定列数 = clamp(floor(容器宽 / 该值)) */
const COL_WIDTH = 172;
const FALLBACK_COLS = 2;

function colsForWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return FALLBACK_COLS;
  return Math.max(MIN_COLS, Math.min(MAX_COLS, Math.floor(width / COL_WIDTH)));
}

export function SeatGrid({ seats }: SeatGridProps) {
  const { t } = useTranslation();
  const renameSeat = useGameStore((s) => s.renameSeat);
  const swapSeats = useGameStore((s) => s.swapSeats);
  const removeSeat = useGameStore((s) => s.removeSeat);
  const rippleShiftSeat = useGameStore((s) => s.rippleShiftSeat);

  const ringRef = useRef<HTMLOListElement | null>(null);
  const [cols, setCols] = useState<number>(FALLBACK_COLS);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [move, setMove] = useState<MovePick | null>(null);
  const [reuseChecked, setReuseChecked] = useState(false);

  const sorted = [...seats].sort((a, b) => a.displayOrder - b.displayOrder);
  const layout = ringLayout(sorted.length, cols);

  // 容器宽度 → 列数（ADR-005 自适应）。jsdom 无 ResizeObserver 时用回退列数。
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const update = () => setCols(colsForWidth(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const closeAll = () => {
    setMenu(null);
    setMove(null);
  };

  // 点击卡片外部 / Esc：关闭菜单并取消进行中的换位/平移
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ringRef.current?.contains(e.target as Node)) return;
      setMenu(null);
      setMove(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleFaceClick = (seatNumber: number) => {
    if (move) {
      // 换位/平移：再点原点 = 取消，点他座 = 完成
      if (seatNumber === move.from) {
        setMove(null);
        return;
      }
      if (move.kind === 'swap') swapSeats(move.from, seatNumber);
      else rippleShiftSeat(move.from, seatNumber);
      setMove(null);
      return;
    }
    // 菜单开合（同一张卡再点关闭；他卡则切过去）
    setMenu((m) => (m?.seatNumber === seatNumber ? null : { seatNumber, view: 'root' }));
  };

  const openRemove = () => {
    if (!menu) return;
    setReuseChecked(false);
    setMenu({ ...menu, view: 'remove' });
  };

  const startMove = (kind: MovePick['kind']) => {
    if (!menu) return;
    setMove({ kind, from: menu.seatNumber });
    setMenu(null);
  };

  const confirmRemove = () => {
    if (!menu) return;
    removeSeat(menu.seatNumber, reuseChecked);
    setMenu(null);
  };

  const showHint = move !== null;
  const hint = move
    ? move.kind === 'swap'
      ? t('seats.select.swap', { seat: String(move.from) })
      : t('seats.select.ripple', { seat: String(move.from) })
    : null;

  return (
    <>
      {showHint && hint && (
        <p className="seat-hint" role="status">
          {hint}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="seat-hint">{t('seats.empty')}</p>
      ) : (
        <ol
          ref={ringRef}
          className="seat-ring"
          aria-label={t('seats.title')}
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, auto)`,
          }}
        >
          {sorted.map((seat, i) => {
            const pos = layout.positions[i];
            const origin = move?.from === seat.seatNumber;
            return (
              <li
                key={seat.seatNumber}
                className={`seat-cell${origin ? ' is-origin' : ''}${move ? ' is-target' : ''}`}
                style={pos ? { gridRow: pos.row + 1, gridColumn: pos.col + 1 } : undefined}
              >
                <SeatCard
                  seat={seat}
                  menuOpen={menu?.seatNumber === seat.seatNumber}
                  onFaceClick={() => handleFaceClick(seat.seatNumber)}
                />
                {menu?.seatNumber === seat.seatNumber && (
                  <div
                    className="seat-menu"
                    role="dialog"
                    aria-label={t('seats.cardMenuLabel', { seat: String(seat.seatNumber) })}
                  >
                    {menu.view === 'remove' ? (
                      <div className="seat-menu__remove">
                        <p className="seat-menu__remove-title">
                          {t('seats.removeTitle', { seat: String(seat.seatNumber) })}
                        </p>
                        <p className="seat-menu__remove-desc">{t('seats.removeDesc')}</p>
                        <label className="seat-menu__reuse">
                          <input
                            type="checkbox"
                            checked={reuseChecked}
                            onChange={(e) => setReuseChecked(e.target.checked)}
                          />
                          {t('seats.reuseSeat')}
                        </label>
                        <div className="seat-menu__footer">
                          <button type="button" className="btn btn--compact" onClick={() => setMenu(null)}>
                            {t('seats.cancel')}
                          </button>
                          <button type="button" className="btn btn--compact btn--danger" onClick={confirmRemove}>
                            {t('seats.confirmRemove')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="seat-menu__name"
                          value={seat.playerName ?? ''}
                          aria-label={`${t('seats.seatNumberLabel')} ${String(seat.seatNumber)} ${t('seats.nicknamePlaceholder')}`}
                          placeholder={t('seats.nicknamePlaceholder')}
                          onChange={(e) => renameSeat(seat.seatNumber, e.target.value)}
                        />
                        {/* 可用操作：单行三图标（细节见选中后的提示文案） */}
                        <div className="seat-menu__actions" role="group" aria-label={t('seats.title')}>
                          {(
                            [
                              { key: 'swapSeats', glyph: 'swap' as SeatGlyphName, run: () => startMove('swap') },
                              { key: 'rippleSeat', glyph: 'ripple' as SeatGlyphName, run: () => startMove('ripple') },
                              { key: 'removeSeat', glyph: 'remove' as SeatGlyphName, run: openRemove },
                            ] as const
                          ).map((item) => (
                            <button
                              type="button"
                              key={item.key}
                              className="seat-menu__action"
                              aria-label={t(`seats.menu.${item.key}`)}
                              title={t(`seats.menu.${item.key}`)}
                              onClick={item.run}
                            >
                              <SeatGlyph name={item.glyph} />
                            </button>
                          ))}
                        </div>
                        <div className="seat-menu__divider" />
                        {LOCKED_ITEMS.map((item) => (
                          <button
                            type="button"
                            key={item.key}
                            className="seat-menu__item is-locked"
                            disabled
                            title={t(`seats.lock.${item.lock}`)}
                          >
                            <span className="seat-menu__glyph" aria-hidden="true">
                              <SeatGlyph name={item.glyph} />
                            </span>
                            <span className="seat-menu__label">{t(item.key)}</span>
                            <span className="seat-menu__tag">{t(`seats.lock.${item.lock}`)}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

interface SeatCardProps {
  seat: Seat;
  menuOpen: boolean;
  onFaceClick: () => void;
}

/** 单张玩家卡（ADR-005）：token 主体 + 名牌 + 右侧提示标记区；整卡点击弹菜单 */
function SeatCard({ seat, menuOpen, onFaceClick }: SeatCardProps) {
  const { t } = useTranslation();
  const ringSkin = ringSkinFor(seat.alignment);

  return (
    <button
      type="button"
      className={`seat-face${menuOpen ? ' has-menu' : ''}`}
      aria-label={`${t('seats.seatNumberLabel')} ${String(seat.seatNumber)}`}
      aria-haspopup="dialog"
      aria-expanded={menuOpen}
      onClick={onFaceClick}
    >
      <span className="seat-face__top">
        <span className="seat-face__number" aria-hidden="true">
          {seat.seatNumber}
        </span>
      </span>
      <span className="seat-face__mid">
        <span className="seat-face__token">
          <span
            className="token-ring"
            data-alignment={seat.alignment}
            style={ringSkin}
            aria-hidden="true"
          >
            <span className="token-ring__core" />
          </span>
        </span>
        <span className="reminder-rail" aria-hidden="true">
          {seat.reminderTokens.length > 0 ? (
            seat.reminderTokens.map((tok, i) => (
              <span key={`${tok.label}-${i}`} className="reminder-chip" title={tok.label}>
                {tok.label}
              </span>
            ))
          ) : (
            <span className="reminder-rail__empty">{t('seats.reminderPlaceholder')}</span>
          )}
        </span>
      </span>
      <span className="seat-face__name">{seat.playerName ?? ''}</span>
    </button>
  );
}
