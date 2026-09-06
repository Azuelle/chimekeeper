/**
 * 排座位（F-02）：人数输入 → 生成座位圈；增座/删座/换位（F-22 原语的 UI 面板）。
 * 换位交互 = 点选两个座位（再点同一个取消）。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../stores/game';
import { useScriptStore } from '../../stores/script';
import { SeatGrid } from './SeatGrid';

const MIN_COUNT = 5;
const MAX_COUNT = 99;

export function SeatSetup({ onChangeScript }: { onChangeScript: () => void }) {
  const { t } = useTranslation();
  const script = useScriptStore((s) => s.script);
  const game = useGameStore((s) => s.game);
  const createGame = useGameStore((s) => s.createGame);
  const addSeat = useGameStore((s) => s.addSeat);
  const swapSeats = useGameStore((s) => s.swapSeats);

  const [countText, setCountText] = useState('7');
  const [pendingSwap, setPendingSwap] = useState<number | null>(null);

  if (!script) return null;

  /** 生成时才解析 clamp；输入过程保持原始文本，避免边打边改写光标处的值 */
  const parsedCount = (() => {
    const n = Number(countText);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(MAX_COUNT, Math.floor(n));
  })();

  const handleSwapPick = (seatNumber: number) => {
    if (pendingSwap === seatNumber) {
      setPendingSwap(null); // 再点同一个 = 取消
      return;
    }
    if (pendingSwap === null) {
      setPendingSwap(seatNumber);
      return;
    }
    swapSeats(pendingSwap, seatNumber);
    setPendingSwap(null);
  };

  const handleRegenerate = () => {
    if (!window.confirm(t('seats.regenerateConfirm'))) return;
    // setup 阶段尚无历史事件，重建座位圈安全；M2 起夜后不再提供此入口
    setPendingSwap(null);
    createGame(script, parsedCount);
  };

  return (
    <section className="panel" aria-label={t('seats.title')}>
      <h2>{t('seats.title')}</h2>

      <div className="seat-toolbar">
        <label htmlFor="seat-count">{t('setup.playerCount')}</label>
        <input
          id="seat-count"
          className="seat-count-input"
          type="number"
          min={MIN_COUNT}
          max={MAX_COUNT}
          value={countText}
          onChange={(e) => setCountText(e.target.value)}
        />
        {!game ? (
          <button type="button" className="btn btn--primary" onClick={() => createGame(script, parsedCount)}>
            {t('seats.generate')}
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={handleRegenerate}>
              {t('seats.regenerate')}
            </button>
            <button type="button" className="btn" onClick={addSeat}>
              {t('seats.add')}
            </button>
          </>
        )}
      </div>

      {game && (
        <>
          {pendingSwap !== null && <p className="seat-hint">{t('seats.swapHint')}</p>}
          <SeatGrid seats={game.seats} pendingSwap={pendingSwap} onSwapPick={handleSwapPick} />
          <div className="btn-row">
            <button type="button" className="btn" onClick={onChangeScript}>
              {t('seats.changeScript')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
