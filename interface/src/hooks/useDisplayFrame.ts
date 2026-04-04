import { useTelemetryStore } from "../store/useTelemetryStore";

/** Возвращает кадр для отображения: исторический (replay) или текущий (live) */
export function useDisplayFrame() {
  const frame       = useTelemetryStore((s) => s.frame);
  const snapshots   = useTelemetryStore((s) => s.snapshots);
  const replayIndex = useTelemetryStore((s) => s.replayIndex);

  if (replayIndex !== null && snapshots[replayIndex]) {
    return snapshots[replayIndex];
  }
  return frame;
}
