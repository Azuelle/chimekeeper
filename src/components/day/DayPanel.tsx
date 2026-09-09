/**
 * 白天面板（F-05 / F-06c / F-08）
 * - 提名 / 投票（可选） / 处决 / 死亡 / 复活 / 备注
 * - 入夜 / 返回上一阶段
 * - ended 阶段显示结局与复盘导出
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../stores/game';
import { RecapExport } from '../recap/RecapExport';

type FormMode = 'nominate' | 'death' | 'revive' | 'note' | 'end' | null;

function seatLabel(seat: { seatNumber: number; playerName?: string }): string {
  return seat.playerName ? `${seat.seatNumber} 号（${seat.playerName}）` : `${seat.seatNumber} 号`;
}

export function DayPanel() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const registerNomination = useGameStore((s) => s.registerNomination);
  const registerVote = useGameStore((s) => s.registerVote);
  const registerExecution = useGameStore((s) => s.registerExecution);
  const registerExecutionAndDeath = useGameStore((s) => s.registerExecutionAndDeath);
  const registerDeath = useGameStore((s) => s.registerDeath);
  const registerRevival = useGameStore((s) => s.registerRevival);
  const addNote = useGameStore((s) => s.addNote);
  const endGame = useGameStore((s) => s.endGame);
  const enterNextNight = useGameStore((s) => s.enterNextNight);
  const rewindPhase = useGameStore((s) => s.rewindPhase);

  const [mode, setMode] = useState<FormMode>(null);
  const [nominatorSeat, setNominatorSeat] = useState<number | ''>('');
  const [nominatedSeat, setNominatedSeat] = useState<number | ''>('');
  const [votesFor, setVotesFor] = useState<string>('');
  const [targetSeat, setTargetSeat] = useState<number | ''>('');
  const [deathCause, setDeathCause] = useState<'night' | 'execution' | 'other'>('other');
  const [noteText, setNoteText] = useState('');
  const [winningTeam, setWinningTeam] = useState<'good' | 'evil'>('good');
  const [reason, setReason] = useState('');

  if (!game) return null;

  const isDay = game.phase === 'day';
  const isEnded = game.phase === 'ended';

  const aliveCount = game.seats.filter((s) => s.alive).length;
  const needed = aliveCount > 0 ? Math.ceil(aliveCount / 2) : 0;

  const resetNomination = () => {
    setNominatorSeat('');
    setNominatedSeat('');
    setVotesFor('');
    setMode(null);
  };

  const handleNominateOnly = () => {
    if (nominatorSeat === '' || nominatedSeat === '') return;
    registerNomination(Number(nominatorSeat), Number(nominatedSeat));
    resetNomination();
  };

  const handleRecordVote = () => {
    if (nominatedSeat === '') return;
    const v = votesFor.trim() === '' ? undefined : Number(votesFor);
    registerVote(Number(nominatedSeat), v);
    setVotesFor('');
  };

  const handleExecuteSurvived = () => {
    if (nominatedSeat === '') return;
    registerExecution(Number(nominatedSeat), false);
    resetNomination();
  };

  const handleExecuteAndDie = () => {
    if (nominatedSeat === '') return;
    registerExecutionAndDeath(Number(nominatedSeat));
    resetNomination();
  };

  const handleDeath = () => {
    if (targetSeat === '') return;
    registerDeath(Number(targetSeat), deathCause);
    setTargetSeat('');
    setDeathCause('other');
    setMode(null);
  };

  const handleRevive = () => {
    if (targetSeat === '') return;
    registerRevival(Number(targetSeat));
    setTargetSeat('');
    setMode(null);
  };

  const handleNote = () => {
    const text = noteText.trim();
    if (!text) return;
    addNote(text);
    setNoteText('');
    setMode(null);
  };

  const handleEndGame = () => {
    endGame(winningTeam, reason.trim() || undefined);
    setMode(null);
  };

  const handleEnterNight = () => {
    if (!window.confirm(t('dayPanel.enterNightConfirm', { round: String(game.round + 1) }))) return;
    enterNextNight();
  };

  const aliveOptions = game.seats.filter((s) => s.alive);
  const allOptions = game.seats;

  return (
    <section className="panel day-panel" aria-label={t('dayPanel.title', { round: String(game.round) })}>
      <h2>{isEnded ? t('phase.ended') : t('dayPanel.title', { round: String(game.round) })}</h2>

      {(isDay || isEnded) && (
        <div className="day-stats">
          <span>{t('dayPanel.aliveCount', { count: String(aliveCount) })}</span>
          <span>{t('dayPanel.votesNeeded', { count: String(needed) })}</span>
        </div>
      )}

      {isEnded && game.outcome && (
        <div className="day-outcome">
          <strong>
            {t('home.outcome', { team: t(`dayPanel.outcome.${game.outcome.winningTeam}`) })}
          </strong>
          {game.outcome.reason && <p>{game.outcome.reason}</p>}
        </div>
      )}

      {isEnded && <RecapExport />}

      {isDay && (
        <>
          <div className="day-actions">
            <button type="button" className="btn" onClick={() => setMode('nominate')}>
              {t('dayPanel.nominate')}
            </button>
            <button type="button" className="btn" onClick={() => setMode('death')}>
              {t('dayPanel.death')}
            </button>
            <button type="button" className="btn" onClick={() => setMode('revive')}>
              {t('dayPanel.revive')}
            </button>
            <button type="button" className="btn" onClick={() => setMode('note')}>
              {t('dayPanel.note')}
            </button>
            <button type="button" className="btn" onClick={() => setMode('end')}>
              {t('dayPanel.endGame')}
            </button>
          </div>

          {mode === 'nominate' && (
            <div className="day-form">
              <label>
                {t('dayPanel.nominator')}
                <select value={nominatorSeat} onChange={(e) => setNominatorSeat(Number(e.target.value) || '')}>
                  <option value="">--</option>
                  {aliveOptions.map((s) => (
                    <option key={s.seatNumber} value={s.seatNumber}>
                      {seatLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('dayPanel.nominated')}
                <select value={nominatedSeat} onChange={(e) => setNominatedSeat(Number(e.target.value) || '')}>
                  <option value="">--</option>
                  {allOptions.map((s) => (
                    <option key={s.seatNumber} value={s.seatNumber}>
                      {seatLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('dayPanel.votesFor')}
                <input
                  type="number"
                  min={0}
                  value={votesFor}
                  onChange={(e) => setVotesFor(e.target.value)}
                  placeholder={t('dayPanel.votesFor')}
                />
              </label>
              <div className="btn-row">
                <button type="button" className="btn" onClick={handleNominateOnly}>
                  {t('dayPanel.nominate')}
                </button>
                <button type="button" className="btn" onClick={handleRecordVote}>
                  {t('dayPanel.vote')}
                </button>
                <button type="button" className="btn" onClick={handleExecuteSurvived}>
                  {t('dayPanel.execution')}
                </button>
                <button type="button" className="btn btn--danger" onClick={handleExecuteAndDie}>
                  {t('dayPanel.executionAndDeath')}
                </button>
                <button type="button" className="btn" onClick={() => setMode(null)}>
                  {t('seats.cancel')}
                </button>
              </div>
            </div>
          )}

          {mode === 'death' && (
            <div className="day-form">
              <label>
                {t('dayPanel.nominated')}
                <select value={targetSeat} onChange={(e) => setTargetSeat(Number(e.target.value) || '')}>
                  <option value="">--</option>
                  {allOptions.map((s) => (
                    <option key={s.seatNumber} value={s.seatNumber}>
                      {seatLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('dayPanel.cause')}
                <select value={deathCause} onChange={(e) => setDeathCause(e.target.value as typeof deathCause)}>
                  <option value="night">{t('dayPanel.cause.night')}</option>
                  <option value="execution">{t('dayPanel.cause.execution')}</option>
                  <option value="other">{t('dayPanel.cause.other')}</option>
                </select>
              </label>
              <p className="day-hint">{t('dayPanel.voteTokenHint')}</p>
              <div className="btn-row">
                <button type="button" className="btn btn--danger" onClick={handleDeath}>
                  {t('dayPanel.death')}
                </button>
                <button type="button" className="btn" onClick={() => setMode(null)}>
                  {t('seats.cancel')}
                </button>
              </div>
            </div>
          )}

          {mode === 'revive' && (
            <div className="day-form">
              <label>
                {t('dayPanel.nominated')}
                <select value={targetSeat} onChange={(e) => setTargetSeat(Number(e.target.value) || '')}>
                  <option value="">--</option>
                  {allOptions.map((s) => (
                    <option key={s.seatNumber} value={s.seatNumber}>
                      {seatLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" onClick={handleRevive}>
                  {t('dayPanel.revive')}
                </button>
                <button type="button" className="btn" onClick={() => setMode(null)}>
                  {t('seats.cancel')}
                </button>
              </div>
            </div>
          )}

          {mode === 'note' && (
            <div className="day-form">
              <label>
                {t('dayPanel.note')}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={t('dayPanel.notePlaceholder')}
                  rows={3}
                />
              </label>
              <div className="btn-row">
                <button type="button" className="btn" onClick={handleNote}>
                  {t('dayPanel.note')}
                </button>
                <button type="button" className="btn" onClick={() => setMode(null)}>
                  {t('seats.cancel')}
                </button>
              </div>
            </div>
          )}

          {mode === 'end' && (
            <div className="day-form">
              <label>
                {t('home.outcome', { team: '' })}
                <select value={winningTeam} onChange={(e) => setWinningTeam(e.target.value as 'good' | 'evil')}>
                  <option value="good">{t('dayPanel.outcome.good')}</option>
                  <option value="evil">{t('dayPanel.outcome.evil')}</option>
                </select>
              </label>
              <label>
                {t('dayPanel.notePlaceholder')}
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('dayPanel.notePlaceholder')}
                />
              </label>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" onClick={handleEndGame}>
                  {t('dayPanel.endGame')}
                </button>
                <button type="button" className="btn" onClick={() => setMode(null)}>
                  {t('seats.cancel')}
                </button>
              </div>
            </div>
          )}

          <div className="btn-row">
            <button type="button" className="btn" onClick={rewindPhase}>
              {t('dayPanel.rewind')}
            </button>
            <button type="button" className="btn btn--primary" onClick={handleEnterNight}>
              {t('dayPanel.enterNight')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
