/**
 * 排座位（F-02）：人数输入 → 生成座位环；增座 / 重新生成 /
 * 退役编号一览与启用（复用池）。座位环卡片与其菜单见 SeatGrid。
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
  const enableAllRetiredSeats = useGameStore((s) => s.enableAllRetiredSeats);

  const [countText, setCountText] = useState('7');

  if (!script) return null;

  /** 生成时才解析 clamp；输入过程保持原始文本，避免边打边改写光标处的值 */
  const parsedCount = (() => {
    const n = Number(countText);
    if (!Number.isFinite(n)) return MIN_COUNT;
    return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.floor(n)));
  })();

  const handleRegenerate = () => {
    if (!window.confirm(t('seats.regenerateConfirm'))) return;
    // setup 阶段尚无历史事件，重建座位圈安全；M2 起夜后不再提供此入口
    createGame(script, parsedCount);
  };

  const retired = game ? [...game.retiredSeatNumbers].sort((a, b) => a - b) : [];
  const retiredText = retired.join(', ');

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
          {retired.length > 0 && (
            <div className="retired-bar">
              <span className="retired-bar__text">{t('seats.retiredSummary', { list: retiredText })}</span>
              <button type="button" className="btn btn--compact" onClick={enableAllRetiredSeats}>
                {t('seats.enableRetired')}
              </button>
            </div>
          )}
          <SeatGrid seats={game.seats} />
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
