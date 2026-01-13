"use client";
import { useEffect, useMemo, useState } from "react";

// Keys used in localStorage to persist timer state across navigations
const START_KEY = "files_timer_start_at"; // epoch ms number
const STOP_KEY = "files_timer_stopped";   // '1' when we should stop showing timer

function format(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function ElapsedTimer({ active }: { active: boolean }) {
  const [now, setNow] = useState<number>(Date.now());

  // Initialize start time if not present and timer should be active
  useEffect(() => {
    const stopFlag = localStorage.getItem(STOP_KEY) === '1';
    if (!stopFlag && active) {
      const existing = localStorage.getItem(START_KEY);
      if (!existing) {
        localStorage.setItem(START_KEY, String(Date.now()));
      }
    }
  }, [active]);

  // Keep ticking while not stopped and active
  useEffect(() => {
    const stopFlag = localStorage.getItem(STOP_KEY) === '1';
    if (stopFlag || !active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const elapsed = useMemo(() => {
    const stopFlag = localStorage.getItem(STOP_KEY) === '1';
    const startedAtStr = localStorage.getItem(START_KEY);
    const startedAt = startedAtStr ? Number(startedAtStr) : null;
    if (!startedAt) return 0;
    if (stopFlag) {
      // If stopped, compute against the time it was last updated. We don't store the end time
      // to keep it simple; still shows increasing time until STOP is set, but we won't tick.
      return (startedAt ? (Date.now() - startedAt) : 0);
    }
    return now - startedAt;
  }, [now, active]);

  if (!active) return null;

  return (
    <div className="mb-4 text-sm text-gray-600">
      Elapsed time waiting for files: <span className="font-mono">{format(elapsed)}</span>
    </div>
  );
}

// Helpers to be called elsewhere when callback received
export function markFilesReady() {
  try {
    localStorage.setItem(STOP_KEY, '1');
  } catch {}
}

export function resetFilesTimer() {
  try {
    localStorage.removeItem(STOP_KEY);
    localStorage.removeItem(START_KEY);
  } catch {}
}
