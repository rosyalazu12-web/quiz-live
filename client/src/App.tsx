import { useEffect, useState } from "react";
import "./App.css";
import { HostFlow } from "./components/HostFlow";
import { PlayerFlow } from "./components/PlayerFlow";
import { applyTheme } from "./theme";
import type { Theme } from "./types";

type View = "home" | "host" | "player";

const THEME_LABELS: Record<Theme, string> = {
  default: "Predeterminado (morado)",
  arellano: "Arellano (navy + verde)",
};

function codeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return (params.get("join") ?? "").toUpperCase();
}

export default function App() {
  const initialJoinCode = codeFromUrl();
  const [view, setView] = useState<View>(initialJoinCode ? "player" : "home");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "default");

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quiz Live</h1>
        <p>Trivia en vivo, opción múltiple, con temporizador y ranking. Sin descargar nada.</p>
      </header>

      <main className="app-main">
        {view === "home" && (
          <div className="home-view">
            <label className="theme-picker">
              Color de la sala:
              <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                {Object.entries(THEME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="primary big" onClick={() => setView("host")}>
              Crear sala (host)
            </button>
            <button type="button" className="secondary big" onClick={() => setView("player")}>
              Unirme con código
            </button>
          </div>
        )}

        {view === "host" && <HostFlow theme={theme} onExit={() => setView("home")} />}
        {view === "player" && <PlayerFlow initialCode={initialJoinCode} onExit={() => setView("home")} />}
      </main>
    </div>
  );
}
