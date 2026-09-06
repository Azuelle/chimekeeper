/**
 * 应用外壳与线性流程（M1）：导入剧本 → 剧本预览 → 排座位。
 * 无路由依赖，步骤由 script/game store 状态 + 本地 step 派生。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScriptImport } from './components/setup/ScriptImport';
import { ScriptPreview } from './components/setup/ScriptPreview';
import { SeatSetup } from './components/setup/SeatSetup';
import { useScriptStore } from './stores/script';
import { useGameStore } from './stores/game';

type Step = 'import' | 'preview' | 'seats';

export function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('import');
  const script = useScriptStore((s) => s.script);
  const clearScript = useScriptStore((s) => s.clear);
  const resetGame = useGameStore((s) => s.reset);

  // 剧本未导入一律回导入页，防止状态漂移；导入成功自动从 import 进入 preview
  const current: Step = !script ? 'import' : step === 'import' ? 'preview' : step;

  const handleChangeScript = () => {
    clearScript();
    resetGame();
    setStep('import');
  };

  return (
    <>
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <small>{t('app.communityNotice')}</small>
      </header>
      <main className="app-main">
        {current === 'import' && <ScriptImport />}
        {current === 'preview' && <ScriptPreview onArrange={() => setStep('seats')} />}
        {current === 'seats' && <SeatSetup onChangeScript={handleChangeScript} />}
      </main>
      <footer className="app-footer">
        <small>{t('app.communityNotice')}</small>
      </footer>
    </>
  );
}
