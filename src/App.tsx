/**
 * 应用外壳与阶段路由（M2）：挂载 hydrate 恢复（F-07a）后按 game.phase 路由——
 * 夜（firstNight/night）→ 夜晚行动顺序；day → 白天占位（M3）；
 * setup 阶段保留 M1 线性流程：导入 → 预览 → 排座位 → 角色分配。
 * 恢复后 scriptStore 为空时从 game.scriptSnapshot 重建（ADR-017）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScriptImport } from './components/setup/ScriptImport';
import { ScriptPreview } from './components/setup/ScriptPreview';
import { SeatSetup } from './components/setup/SeatSetup';
import { Drawing } from './components/setup/Drawing';
import { NightPanel } from './components/night/NightPanel';
import { DayPlaceholder } from './components/DayPlaceholder';
import { Timeline } from './components/Timeline';
import { useScriptStore } from './stores/script';
import { useGameStore } from './stores/game';

type Step = 'import' | 'preview' | 'seats' | 'drawing';

export function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('import');
  const script = useScriptStore((s) => s.script);
  const clearScript = useScriptStore((s) => s.clear);
  const restoreScript = useScriptStore((s) => s.restoreFromSnapshot);
  const game = useGameStore((s) => s.game);
  const hydrated = useGameStore((s) => s.hydrated);
  const hydrate = useGameStore((s) => s.hydrate);
  const resetGame = useGameStore((s) => s.reset);
  const stepInited = useRef(false);

  // 启动恢复：loadCurrentGame → 按相位路由（ADR-017 #4）
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // 恢复后 scriptStore 为空（内存态不落盘）→ 从对局快照重建，预览/抽袋/夜单才有角色数据
  useLayoutEffect(() => {
    if (game && !useScriptStore.getState().script) {
      restoreScript(game.scriptSnapshot);
    }
  }, [game, restoreScript]);

  // 恢复完成的 setup 对局：已抽过袋直接回抽袋页，否则回排座位页（一次性推导）
  useLayoutEffect(() => {
    if (!hydrated || stepInited.current) return;
    stepInited.current = true;
    if (game && game.phase === 'setup') {
      setStep(game.composition !== undefined ? 'drawing' : 'seats');
    }
  }, [hydrated, game]);

  const handleChangeScript = () => {
    clearScript();
    resetGame();
    setStep('import');
  };

  // 剧本未导入一律回导入页，防止状态漂移；导入成功自动从 import 进入 preview
  const setupStep: Step = !script ? 'import' : step === 'import' ? 'preview' : step;

  const phase = game?.phase;
  const nightView = phase === 'firstNight' || phase === 'night';

  return (
    <>
      <header className="app-header">
        <h1>{t('app.title')}</h1>
        <small>{t('app.communityNotice')}</small>
      </header>
      <main className="app-main">
        {!hydrated ? null : nightView ? (
          <>
            <NightPanel />
            <Timeline />
          </>
        ) : phase === 'day' || phase === 'ended' ? (
          <>
            <DayPlaceholder />
            <Timeline />
          </>
        ) : setupStep === 'import' ? (
          <ScriptImport />
        ) : setupStep === 'preview' ? (
          <ScriptPreview onArrange={() => setStep('seats')} />
        ) : setupStep === 'seats' ? (
          <SeatSetup onChangeScript={handleChangeScript} onAssign={() => setStep('drawing')} />
        ) : (
          <Drawing onBack={() => setStep('seats')} />
        )}
      </main>
      <footer className="app-footer">
        <small>{t('app.communityNotice')}</small>
      </footer>
    </>
  );
}
