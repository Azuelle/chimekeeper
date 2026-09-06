/**
 * 剧本预览（F-01e）：角色按阵营分组 + 相克规则 + 导入提示（warning 默认折叠，
 * 防注水类 info 提示刷屏）。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScriptStore } from '../../stores/script';
import { normalizeRoleId } from '../../lib/roleDb';
import type { Role, Team } from '../../types/script';

const TEAM_ORDER: Team[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric'];
const EVIL_TEAMS = new Set<Team>(['minion', 'demon']);

export function ScriptPreview({ onArrange }: { onArrange: () => void }) {
  const { t } = useTranslation();
  const script = useScriptStore((s) => s.script);

  const groups = useMemo(() => {
    const map = new Map<Team, Role[]>(TEAM_ORDER.map((team) => [team, []]));
    for (const role of script?.roles ?? []) {
      map.get(role.team)?.push(role);
    }
    return [...map.entries()].filter(([, roles]) => roles.length > 0);
  }, [script]);

  /** jinx 里的角色 id 转显示名（双写法规范化匹配，查不到回退原 id） */
  const roleName = (id: string) => {
    const norm = normalizeRoleId(id);
    return script?.roles.find((r) => normalizeRoleId(r.id) === norm)?.name ?? id;
  };

  if (!script) return null;

  return (
    <section className="panel" aria-label={t('scriptPreview.title')}>
      <h2 className="script-name">{script.name || t('scriptPreview.unnamed')}</h2>
      <p className="script-meta">
        {script.author && <span>{t('scriptPreview.author', { author: script.author })} · </span>}
        <span>{t('scriptPreview.roleCount', { count: script.roles.length })}</span>
      </p>

      {script.warnings.length > 0 && (
        <details className="notices">
          <summary>{t('scriptPreview.warningsSummary', { count: script.warnings.length })}</summary>
          <ul>
            {script.warnings.map((w, i) => (
              <li key={i}>{t(w.code, w.params)}</li>
            ))}
          </ul>
        </details>
      )}

      {groups.map(([team, roles]) => (
        <div className="team-group" key={team}>
          <h3>
            {t(`team.${team}`)} · {roles.length}
          </h3>
          <div className="role-chips">
            {roles.map((role) => (
              <span
                key={role.id}
                className={EVIL_TEAMS.has(role.team) ? 'role-chip role-chip--evil' : 'role-chip'}
              >
                {role.name}
                {role.setup && <span className="badge-setup">{t('scriptPreview.setupBadge')}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}

      {script.jinxes.length > 0 && (
        <>
          <h3>{t('scriptPreview.jinxes')}</h3>
          <ul className="jinx-list">
            {script.jinxes.map((jinx) => (
              <li key={`${jinx.id}-${jinx.target}`}>
                <span className="jinx-pair">
                  {roleName(jinx.id)} × {roleName(jinx.target)}
                </span>
                {jinx.reason ? `：${jinx.reason}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={onArrange}>
          {t('scriptPreview.arrangeSeats')}
        </button>
      </div>
    </section>
  );
}
