/**
 * 座位圈网格（F-02c，ADR-005）：响应式网格（手机 2 列/平板 3/桌面 4+），
 * 大号座位编号 + 昵称输入；卡片间连接线表达顺时针邻座关系。
 * 纯渲染 + 事件转发，座位变更全走 gameStore（底层 lib/seats 原语）。
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../stores/game';
import type { Seat } from '../../types/game';

interface SeatGridProps {
  seats: Seat[];
  /** 换位流程中已选中的第一个座位（null = 未在换位） */
  pendingSwap: number | null;
  onSwapPick: (seatNumber: number) => void;
}

export function SeatGrid({ seats, pendingSwap, onSwapPick }: SeatGridProps) {
  const { t } = useTranslation();
  const renameSeat = useGameStore((s) => s.renameSeat);
  const removeSeat = useGameStore((s) => s.removeSeat);

  const sorted = [...seats].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      <ol className="seat-grid" aria-label={t('seats.title')}>
        {sorted.map((seat) => (
          <li
            key={seat.seatNumber}
            className={pendingSwap === seat.seatNumber ? 'seat-card swap-pending' : 'seat-card'}
          >
            <div className="seat-number" aria-label={t('seats.seatNumberLabel')}>
              {seat.seatNumber}
            </div>
            <input
              type="text"
              value={seat.playerName ?? ''}
              placeholder={t('seats.nicknamePlaceholder')}
              aria-label={`${t('seats.seatNumberLabel')} ${String(seat.seatNumber)} ${t('seats.nicknamePlaceholder')}`}
              onChange={(e) => renameSeat(seat.seatNumber, e.target.value)}
            />
            <div className="seat-actions">
              <button
                type="button"
                className="btn btn--compact"
                aria-pressed={pendingSwap === seat.seatNumber}
                onClick={() => onSwapPick(seat.seatNumber)}
              >
                {t('seats.swap')}
              </button>
              <button
                type="button"
                className="btn btn--compact btn--danger"
                onClick={() => {
                  if (window.confirm(t('seats.removeConfirm', { seat: String(seat.seatNumber) }))) {
                    removeSeat(seat.seatNumber);
                  }
                }}
              >
                {t('seats.remove')}
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p className="seat-hint">{t('seats.circularHint')}</p>
    </>
  );
}
