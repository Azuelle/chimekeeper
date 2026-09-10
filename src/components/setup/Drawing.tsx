/**
 * 角色分配 / 盲抽袋（F-03，ADR-008）：
 * 官方默认构成展示 + setup 角色调整提示高亮 + 手动 +/-（总数不符醒目警告不阻止）
 * + 随机分配（lib/setup.assignRoles）+ 恶魔伪装推荐/手改 + 手动换角 + 入夜。
 * 纯渲染 + 事件转发，状态全走 gameStore。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../stores/game';
import { assignRoles, baseComposition, goodRolesNotInPlay, recommendDemonBluffs, setupRoleHints } from '../../lib/setup';
import { RoleIcon } from '../../ui/RoleIcon';
import type { TeamComposition } from '../../types/game';
import type { Role } from '../../types/script';

// Team 联合含 traveler/fabled/loric，盲抽袋只收四阵营
type BagTeam = 'townsfolk' | 'outsider' | 'minion' | 'demon';
const BAG_TEAMS: BagTeam[] = ['townsfolk', 'outsider', 'minion', 'demon'];

const ZERO: TeamComposition = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };

export function Drawing({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const assignRoleDraw = useGameStore((s) => s.assignRoleDraw);
  const setDemonBluffs = useGameStore((s) => s.setDemonBluffs);
  const changeSeatRole = useGameStore((s) => s.changeSeatRole);
  const enterFirstNight = useGameStore((s) => s.enterFirstNight);

  const [composition, setComposition] = useState<TeamComposition>(
    () => game?.composition ?? baseComposition(game?.seats.length ?? 0) ?? ZERO,
  );
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);

  const roles = useMemo(() => game?.scriptSnapshot.roles ?? [], [game]);
  const bagRoles = useMemo(() => roles.filter((r) => BAG_TEAMS.includes(r.team as BagTeam)), [roles]);
  const hints = useMemo(() => setupRoleHints(roles), [roles]);
  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  const seats = useMemo(
    () => (game ? [...game.seats].sort((a, b) => a.displayOrder - b.displayOrder) : []),
    [game],
  );
  const playerCount = seats.length;
  const drawn = game?.composition !== undefined;
  const allAssigned = seats.length > 0 && seats.every((s) => s.roleId !== undefined);
  const base = baseComposition(playerCount);

  const total = BAG_TEAMS.reduce((sum, k) => sum + composition[k], 0);
  const mismatch = total !== playerCount;

  const goodNotInPlay = useMemo(() => {
    if (!drawn) return [];
    const inPlay = new Set(
      seats.map((s) => s.roleId).filter((id): id is string => id !== undefined),
    );
    return goodRolesNotInPlay(bagRoles, inPlay);
  }, [bagRoles, seats, drawn]);

  if (!game) return null;

  const bump = (team: BagTeam, delta: number): void => {
    setComposition((c) => ({ ...c, [team]: Math.max(0, c[team] + delta) }));
    setError(null);
  };

  const handleDraw = (): void => {
    const assigned = assignRoles(bagRoles, composition);
    if (!assigned) {
      setError(t('setup.errorPoolTooSmall', { count: String(playerCount) }));
      return;
    }
    const bluffs = recommendDemonBluffs(bagRoles, assigned).map((r) => r.id);
    const byDisplay = [...seats].sort((a, b) => a.displayOrder - b.displayOrder);
    assignRoleDraw(
      byDisplay.map((seat, i) => ({ seatNumber: seat.seatNumber, roleId: assigned[i]!.id })),
      composition,
      bluffs,
    );
    setFlash((n) => n + 1);
  };

  const handleRedraw = (): void => {
    if (!window.confirm(t('drawing.redrawConfirm'))) return;
    handleDraw();
  };

  const handleEnterNight = (): void => {
    if (!window.confirm(t('drawing.enterNightConfirm'))) return;
    enterFirstNight();
  };

  const setBluff = (slot: number, roleId: string): void => {
    const next = [...bluffSlots];
    next[slot] = roleId;
    // 空槽不落库；槽位顺序对玩法无意义（三个伪装是集合）
    setDemonBluffs(next.filter((id) => id !== ''));
  };

  const bluffSlots = [0, 1, 2].map((i) => game.demonBluffs[i] ?? '');

  return (
    <section className="panel" aria-label={t('drawing.title')}>
      <h2>{t('drawing.title')}</h2>

      {base ? (
        <p className="drawing-base">
          {t('drawing.baseComposition', { count: String(playerCount) })}：
          {BAG_TEAMS.map((k) => `${base[k]} ${t(`team.${k}`)}`).join(' / ')}
        </p>
      ) : (
        <p className="error-box">{t('drawing.baseUnavailable', { count: String(playerCount) })}</p>
      )}

      {hints.length > 0 && (
        <div className="drawing-hints">
          <h3>{t('drawing.setupHintsTitle')}</h3>
          <ul>
            {hints.map((h) => (
              <li key={h.roleId}>
                <strong>{h.roleName}</strong>
                <span> {h.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="drawing-stepper" role="group" aria-label={t('drawing.title')}>
        {BAG_TEAMS.map((team) => (
          <div key={team} className="drawing-stepper__row">
            <span className="drawing-stepper__label">{t(`team.${team}`)}</span>
            <button type="button" className="btn btn--compact" onClick={() => bump(team, -1)} aria-label={`${t(`team.${team}`)} -1`}>
              −
            </button>
            <span className="drawing-stepper__count">{composition[team]}</span>
            <button type="button" className="btn btn--compact" onClick={() => bump(team, 1)} aria-label={`${t(`team.${team}`)} +1`}>
              +
            </button>
          </div>
        ))}
        <p className={`drawing-total${mismatch ? ' is-mismatch' : ''}`}>
          {t('drawing.bagTotal', { total: String(total), players: String(playerCount) })}
        </p>
        {mismatch && <p className="error-box">{t('drawing.totalMismatch', { total: String(total), players: String(playerCount) })}</p>}
      </div>

      <div className="btn-row">
        {!drawn ? (
          <button type="button" className="btn btn--primary" onClick={handleDraw}>
            {t('drawing.draw')}
          </button>
        ) : (
          <button type="button" className="btn" onClick={handleRedraw}>
            {t('drawing.redraw')}
          </button>
        )}
      </div>
      {error && <p className="error-box" role="alert">{error}</p>}

      {drawn && (
        <>
          <h3>{t('drawing.resultTitle')}</h3>
          <ol className={`drawing-result${flash % 2 === 1 ? ' is-flashing' : ''}`} key={flash}>
            {seats.map((seat) => (
              <li key={seat.seatNumber} className="drawing-result__row">
                <span className="drawing-result__seat">
                  {seat.seatNumber}
                  {seat.playerName ? ` · ${seat.playerName}` : ''}
                </span>
                <RoleIcon
                  roleId={seat.roleId}
                  alignment={seat.alignment}
                  team={seat.roleId ? roleById.get(seat.roleId)?.team : undefined}
                  size="1.3rem"
                />
                <select
                  className="drawing-result__role"
                  value={seat.roleId ?? ''}
                  aria-label={`${t('drawing.resultSeat')} ${String(seat.seatNumber)} ${t('drawing.resultRole')}`}
                  onChange={(e) => changeSeatRole(seat.seatNumber, e.target.value)}
                >
                  {!seat.roleId && <option value="">—</option>}
                  {bagRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleNameWithTeam(r, t)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ol>

          <h3>{t('drawing.bluffTitle')}</h3>
          <p className="drawing-bluff-hint">{t('drawing.bluffHint')}</p>
          {goodNotInPlay.length === 0 ? (
            <p className="drawing-bluff-hint">{t('drawing.bluffEmpty')}</p>
          ) : (
            <div className="drawing-bluffs">
              {bluffSlots.map((id, i) => (
                <select
                  key={i}
                  className="drawing-bluffs__slot"
                  value={id}
                  aria-label={`${t('drawing.bluffTitle')} ${String(i + 1)}`}
                  onChange={(e) => setBluff(i, e.target.value)}
                >
                  <option value="">—</option>
                  {goodNotInPlay.map((r) => (
                    <option key={r.id} value={r.id}>
                      {roleNameWithTeam(r, t)}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </>
      )}

      <div className="btn-row">
        <button type="button" className="btn" onClick={onBack}>
          {t('seats.title')}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!allAssigned}
          onClick={handleEnterNight}
        >
          {t('drawing.enterNight')}
        </button>
      </div>
    </section>
  );
}

function roleNameWithTeam(role: Role, t: (k: string) => string): string {
  return `${role.name}（${t(`team.${role.team}`)}）`;
}
