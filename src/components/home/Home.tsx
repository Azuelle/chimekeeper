/**
 * 真首页（M3）：新建对局 / 继续最近对局 / 历史对局列表（F-07b）。
 * 数据一律经 gameStore（组件不直连 persistence，见 ARCHITECTURE 分层）。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../stores/game';
import type { Game } from '../../types/game';

export interface HomeProps {
  onNewGame: () => void;
}

export function Home({ onNewGame }: HomeProps) {
  const { t } = useTranslation();
  const loadGame = useGameStore((s) => s.loadGame);
  const listGames = useGameStore((s) => s.listGames);
  const deleteGame = useGameStore((s) => s.deleteGame);
  const [games, setGames] = useState<Game[]>([]);

  const refreshHistory = async () => {
    setGames(await listGames());
  };

  useEffect(() => {
    void refreshHistory();
  }, [listGames]);

  const handleContinue = async (gameId: string) => {
    await loadGame(gameId);
  };

  const handleDelete = async (gameId: string) => {
    if (!window.confirm(t('home.deleteConfirm'))) return;
    await deleteGame(gameId);
    void refreshHistory();
  };

  const latest = games[0];

  return (
    <section className="panel home-panel" aria-label={t('home.title')}>
      <h2>{t('home.title')}</h2>
      <p className="home-subtitle">{t('home.subtitle')}</p>

      <div className="home-actions">
        <button type="button" className="btn btn--primary" onClick={onNewGame}>
          {t('home.newGame')}
        </button>
        {latest && (
          <button type="button" className="btn" onClick={() => handleContinue(latest.id)}>
            {t('home.continueGame')}
          </button>
        )}
      </div>

      <h3 className="home-history-title">{t('home.history')}</h3>
      {games.length === 0 ? (
        <p className="home-empty">{t('home.emptyHistory')}</p>
      ) : (
        <ul className="game-history">
          {games.map((g) => (
            <li key={g.id} className="game-history-item">
              <div className="game-history-info">
                <strong className="game-history-name">
                  {g.scriptSnapshot.name || t('scriptPreview.unnamed')}
                </strong>
                <small>{t('home.createdAt', { date: new Date(g.createdAt).toLocaleString() })}</small>
                <small>{t('home.phase', { phase: t(`phase.${g.phase}`, { round: String(g.round) }) })}</small>
                {g.outcome && (
                  <small>
                    {t('home.outcome', { team: t(`dayPanel.outcome.${g.outcome.winningTeam}`) })}
                  </small>
                )}
              </div>
              <div className="game-history-actions">
                <button type="button" className="btn" onClick={() => handleContinue(g.id)}>
                  {t('home.load')}
                </button>
                <button type="button" className="btn btn--danger" onClick={() => handleDelete(g.id)}>
                  {t('home.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
