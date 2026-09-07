/**
 * 白天占位面板（M3 前的 day 阶段落地页，ADR-017 #4）：
 * 显示第几个白天 + 入夜入口（day → night，round 不变）。
 * 计票/处决 UI 属 M3（F-05），此处仅占位。
 */
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../stores/game';

export function DayPlaceholder() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const enterNextNight = useGameStore((s) => s.enterNextNight);

  if (!game || game.phase !== 'day') return null;

  const handleEnterNight = () => {
    if (!window.confirm(t('dayPanel.enterNightConfirm', { round: String(game.round + 1) }))) return;
    enterNextNight();
  };

  return (
    <section className="panel" aria-label={t('phase.day', { round: String(game.round) })}>
      <h2>{t('phase.day', { round: String(game.round) })}</h2>
      <p className="day-placeholder-note">{t('dayPanel.m3Placeholder')}</p>
      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={handleEnterNight}>
          {t('dayPanel.enterNight')}
        </button>
      </div>
    </section>
  );
}
