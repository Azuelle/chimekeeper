/**
 * 应用外壳与阶段路由（M2/M3）：挂载 hydrate 恢复（F-07a）后按 game.phase 路由——
 * 夜（firstNight/night）→ 夜晚行动顺序；day/ended → 白天/复盘面板；
 * setup 阶段保留 M1 线性流程：导入 → 预览 → 排座位 → 角色分配；
 * 无对局时渲染首页（F-07b 历史列表 / 新建对局）。
 * 恢复后 scriptStore 为空时从 game.scriptSnapshot 重建（ADR-017）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScriptImport } from './components/setup/ScriptImport';
import { ScriptPreview } from './components/setup/ScriptPreview';
import { SeatSetup } from './components/setup/SeatSetup';
import { SeatGrid } from './components/setup/SeatGrid';
import { Drawing } from './components/setup/Drawing';
import { NightPanel } from './components/night/NightPanel';
import { DayPanel } from './components/day/DayPanel';
import { Timeline } from './components/Timeline';
import { Home } from './components/home/Home';
import { useScriptStore } from './stores/script';
import { useGameStore } from './stores/game';

type Step = 'import' | 'preview' | 'seats' | 'drawing';

export function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('import');
  const [showSetup, setShowSetup] = useState(false);
  const script = useScriptStore((s) => s.script);
  const clearScript = useScriptStore((s) => s.clear);
  const restoreScript = useScriptStore((s) => s.restoreFromSnapshot);
  const game = useGameStore((s) => s.game);
  const seats = game?.seats ?? [];
  const hydrated = useGameStore((s) => s.hydrated);
  const hydrate = useGameStore((s) => s.hydrate);
  const resetGame = useGameStore((s) => s.reset);
  const closeGame = useGameStore((s) => s.closeGame);
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
      setShowSetup(true);
      setStep(game.composition !== undefined ? 'drawing' : 'seats');
    }
  }, [hydrated, game]);

  const startNewGame = () => {
    clearScript();
    setStep('import');
    setShowSetup(true);
  };

  const goHome = () => {
    closeGame();
    setShowSetup(false);
    setStep('import');
  };

  const handleChangeScript = () => {
    resetGame();
    startNewGame();
  };

  // 剧本未导入一律回导入页，防止状态漂移；导入成功自动从 import 进入 preview
  const setupStep: Step = !script ? 'import' : step === 'import' ? 'preview' : step;

  /** setup 线性流程四个子页（game.phase==='setup' 与无对局两条状态路径共用，防漂移） */
  const renderSetup = () =>
    setupStep === 'import' ? (
      <ScriptImport />
    ) : setupStep === 'preview' ? (
      <ScriptPreview onArrange={() => setStep('seats')} />
    ) : setupStep === 'seats' ? (
      <SeatSetup onChangeScript={handleChangeScript} onAssign={() => setStep('drawing')} />
    ) : (
      <Drawing onBack={() => setStep('seats')} />
    );

  const phase = game?.phase;
  const nightView = phase === 'firstNight' || phase === 'night';

  return (
    <>
      <header className="app-header">
        <div className="app-header__title">
          <h1>{t('app.title')}</h1>
          <small>{t('app.communityNotice')}</small>
        </div>
        {hydrated && game && (
          <button type="button" className="btn btn--small app-header__home" onClick={goHome}>
            {t('app.home')}
          </button>
        )}
      </header>
      <main className="app-main">
        {!hydrated ? null : game?.phase === 'setup' ? (
          renderSetup()
        ) : game ? (
          nightView ? (
            <>
              <SeatGrid seats={seats} />
              <NightPanel />
              <Timeline />
            </>
          ) : (
            <>
              <SeatGrid seats={seats} />
              <DayPanel />
              <Timeline />
            </>
          )
        ) : showSetup ? (
          renderSetup()
        ) : (
          <Home onNewGame={startNewGame} />
        )}
      </main>
      <footer className="app-footer">
        <small>{t('app.communityNotice')}</small>
      </footer>
    </>
  );
}
