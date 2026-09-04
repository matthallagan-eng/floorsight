import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";

interface SimulationCtx {
  live: boolean;
  toggle: () => void;
  stop: () => void;
  tickCount: number;
  error: string | null;
}

const Ctx = createContext<SimulationCtx>(null!);
export const useSimulation = () => useContext(Ctx);

const INTERVAL_MS = 3000;

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => setLive(false), []);
  const toggle = useCallback(() => setLive((v) => !v), []);

  useEffect(() => {
    if (!live) {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }

    let cancelled = false;

    async function tick() {
      try {
        await api.simulate();
        if (!cancelled) {
          setTickCount((n) => n + 1);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Simulation failed");
          setLive(false);
        }
      }
    }

    tick();
    timer.current = window.setInterval(tick, INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [live]);

  return (
    <Ctx.Provider value={{ live, toggle, stop, tickCount, error }}>
      {children}
    </Ctx.Provider>
  );
}