/**
 * 剧本预览（F-01e）：角色按阵营分组 + 相克规则 + 导入问题（只展示 warning 级，
 * 需要说书人关注；info 级（角色注水/自定义字段透传）属 debug——在设置面板出现前
 * 一律不进 UI，避免刷屏）。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScriptStore } from '../../stores/script';
import { normalizeRoleId } from '../../lib/roleDb';
import { RoleIcon } from '../../ui/RoleIcon';
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

  /** 只展示 warning（需要说书人关注）；info 级 = debug（注水等），不进 UI */
  const issues = script?.warnings.filter((w) => w.level === 'warning') ?? [];

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

      {issues.length > 0 && (
        <details className="notices">
          <summary>{t('scriptPreview.warningsSummary', { count: issues.length })}</summary>
          <ul>
            {issues.map((w, i) => (
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
                <RoleIcon roleId={role.id} team={role.team} size="1.05rem" />
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
