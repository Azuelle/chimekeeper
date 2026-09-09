/**
 * 战报导出（F-08）：ended 阶段提供 Markdown 复盘复制/下载
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateRecap, recapToMarkdown } from '../../lib/recap';
import { useGameStore } from '../../stores/game';
import { useEventStore } from '../../stores/events';

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function RecapExport() {
  const { t } = useTranslation();
  const game = useGameStore((s) => s.game);
  const events = useEventStore((s) => s.events);
  const [copied, setCopied] = useState(false);

  if (!game) return null;

  const recap = generateRecap(game, events);
  const roleName = (roleId: string): string => {
    const role = game.scriptSnapshot.roles.find((r) => r.id === roleId);
    return role?.name ?? roleId;
  };
  const markdown = recapToMarkdown(recap, roleName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const safeName = (recap.scriptName || 'recap').replace(/[^\w\u4e00-\u9fa5-]/g, '_');
    downloadMarkdown(`${safeName}_recap.md`, markdown);
  };

  return (
    <div className="recap-export">
      <h3>{t('recap.title')}</h3>
      <div className="btn-row">
        <button type="button" className="btn" onClick={handleCopy}>
          {copied ? t('recap.copied') : t('recap.copyMarkdown')}
        </button>
        <button type="button" className="btn" onClick={handleDownload}>
          {t('recap.download')}
        </button>
      </div>
    </div>
  );
}
