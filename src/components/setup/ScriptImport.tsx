/**
 * 剧本导入 UI（F-01）：内置三版 / 粘贴 / 上传 / URL 四个入口。
 * 只读 store + 转发事件，解析逻辑全在 scriptParser。
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScriptStore } from '../../stores/script';
import { BUILTIN_SCRIPT_IDS, type BuiltinScriptId } from '../../data/builtin-scripts';

const BUILTIN_I18N_KEY: Record<BuiltinScriptId, string> = {
  tb: 'builtin.tb',
  bmr: 'builtin.bmr',
  snv: 'builtin.snv',
};

export function ScriptImport() {
  const { t } = useTranslation();
  const error = useScriptStore((s) => s.error);
  const importFromText = useScriptStore((s) => s.importFromText);
  const importFromFile = useScriptStore((s) => s.importFromFile);
  const importFromUrl = useScriptStore((s) => s.importFromUrl);
  const selectBuiltin = useScriptStore((s) => s.selectBuiltin);

  const [pasteText, setPasteText] = useState('');
  const [url, setUrl] = useState('');
  const [urlBusy, setUrlBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panel" aria-label={t('scriptImport.title')}>
      <h2>{t('scriptImport.title')}</h2>

      <h3>{t('builtin.title')}</h3>
      <div className="builtin-list">
        {BUILTIN_SCRIPT_IDS.map((id) => (
          <button key={id} type="button" className="btn" onClick={() => selectBuiltin(id)}>
            {t(BUILTIN_I18N_KEY[id])}
          </button>
        ))}
      </div>

      <h3>{t('scriptImport.fromClipboard')}</h3>
      <div className="field">
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={t('scriptImport.pastePlaceholder')}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={pasteText.trim().length === 0}
          onClick={() => importFromText(pasteText)}
        >
          {t('scriptImport.import')}
        </button>
      </div>

      <h3>{t('scriptImport.fromFile')}</h3>
      <div className="field">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await importFromFile(file);
            e.target.value = ''; // 允许重复选择同一文件
          }}
        />
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
          {t('scriptImport.fromFile')}
        </button>
      </div>

      <h3>{t('scriptImport.fromUrl')}</h3>
      <div className="field">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('scriptImport.urlPlaceholder')}
        />
        <button
          type="button"
          className="btn"
          disabled={urlBusy || url.trim().length === 0}
          onClick={async () => {
            setUrlBusy(true);
            try {
              await importFromUrl(url.trim());
            } finally {
              setUrlBusy(false);
            }
          }}
        >
          {t('scriptImport.import')}
        </button>
      </div>

      {error && (
        <div className="error-box" role="alert">
          {t(error.code, error.params)}
        </div>
      )}
    </section>
  );
}
