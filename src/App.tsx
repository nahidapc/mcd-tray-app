import { useCallback, useEffect, useState } from "react";
import { MODES, getMode } from "./data/modes";
import HomePage from "./pages/HomePage";
import SelectPage from "./pages/SelectPage";

/** 用 URL 查询参数记录模式：/?mode=taste */
function readModeId(): string | null {
  const id = new URLSearchParams(window.location.search).get("mode");
  return getMode(id) ? id : null;
}

export default function App() {
  const [modeId, setModeId] = useState<string | null>(readModeId);

  useEffect(() => {
    const onPopState = () => setModeId(readModeId());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openMode = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", id);
    window.history.pushState({}, "", url);
    setModeId(id);
    window.scrollTo(0, 0);
  }, []);

  const goHome = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.pushState({}, "", url);
    setModeId(null);
    window.scrollTo(0, 0);
  }, []);

  const mode = getMode(modeId);

  if (!mode) {
    return <HomePage modes={MODES} onSelect={openMode} />;
  }

  // key 绑定模式 id：切换模式时重建状态，自动按新模式初始化套餐
  return <SelectPage key={mode.id} mode={mode} onBack={goHome} />;
}
