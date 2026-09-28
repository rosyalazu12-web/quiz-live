import { useState } from "react";
import "./App.css";
import { HostFlow } from "./components/HostFlow";
import { PlayerFlow } from "./components/PlayerFlow";

type View = "home" | "host" | "player";

function codeFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return (params.get("join") ?? "").toUpperCase();
}

export default function App() {
  const initialJoinCode = codeFromUrl();
  const [view, setView] = useState<View>(initialJoinCode ? "player" : "home");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quiz Live</h1>
        <p>Trivia en vivo, opción múltiple, con temporizador y ranking. Sin descargar nada.</p>
      </header>

      <main className="app-main">
        {view === "home" && (
          <div className="home-view">
            <button type="button" className="primary big" onClick={() => setView("host")}>
              Crear sala (host)
            </button>
            <button type="button" className="secondary big" onClick={() => setView("player")}>
              Unirme con código
            </button>
          </div>
        )}

        {view === "host" && <HostFlow onExit={() => setView("home")} />}
        {view === "player" && <PlayerFlow initialCode={initialJoinCode} onExit={() => setView("home")} />}
      </main>
    </div>
  );
}
