/**
 * Agent Runs Hooks
 * Sprint 2 - useRunPolling with Exponential Backoff & Timeout
 */

import { useEffect, useRef, useState } from "react";
import { Run } from "./types";

const INITIAL_INTERVAL = 1000; // 1s
const BACKOFF_FACTOR = 1.2;
const MAX_INTERVAL = 5000; // 5s
const TIMEOUT_MS = 20000; // 20s

interface UseRunPollingOptions {
  onComplete?: (run: Run) => void;
  onError?: (run: Run) => void;
  onTimeout?: () => void;
}

export function useRunPolling(runId: string | null, options: UseRunPollingOptions = {}) {
  const [run, setRun] = useState<Run | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();
  const currentIntervalRef = useRef(INITIAL_INTERVAL);

  useEffect(() => {
    if (!runId) {
      setRun(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    setError(null);
    startTimeRef.current = Date.now();
    currentIntervalRef.current = INITIAL_INTERVAL;

    const poll = async () => {
      try {
        // Timeout guard
        if (Date.now() - startTimeRef.current! > TIMEOUT_MS) {
          setIsPolling(false);
          setError("Polling timeout exceeded (20s)");
          options.onTimeout?.();
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }

        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: Run = await res.json();
        setRun(data);

        // Terminal states: stop polling
        if (data.status === "success" || data.status === "error" || data.status === "cancelled") {
          setIsPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);

          if (data.status === "success") {
            options.onComplete?.(data);
          } else if (data.status === "error") {
            options.onError?.(data);
          }
          return;
        }

        // Exponential backoff
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * BACKOFF_FACTOR,
          MAX_INTERVAL
        );
      } catch (err: any) {
        console.error("Poll error:", err);
        setError(err.message);
      }
    };

    // Initial poll
    poll();

    // Start interval
    intervalRef.current = setInterval(() => {
      poll();
    }, currentIntervalRef.current);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runId]);

  return { run, isPolling, error };
}
