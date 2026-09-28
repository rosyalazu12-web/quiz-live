import { useEffect, useState } from "react";

interface Props {
  startedAt: number;
  timeLimitSec: number;
}

export function Timer({ startedAt, timeLimitSec }: Props) {
  const [remainingMs, setRemainingMs] = useState(timeLimitSec * 1000);

  useEffect(() => {
    const totalMs = timeLimitSec * 1000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemainingMs(Math.max(0, totalMs - elapsed));
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt, timeLimitSec]);

  const totalMs = timeLimitSec * 1000;
  const fraction = Math.max(0, remainingMs / totalMs);
  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="timer">
      <div className="timer-bar-track">
        <div
          className="timer-bar-fill"
          style={{ width: `${fraction * 100}%`, background: fraction < 0.25 ? "#e74c3c" : "#2ecc71" }}
        />
      </div>
      <span className="timer-seconds">{seconds}s</span>
    </div>
  );
}
