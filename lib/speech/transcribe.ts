import type { Locale } from "@/lib/config";

export type TranscribeError = "permission_denied" | "no_speech" | "network" | "unsupported" | "unknown";

export interface Transcriber {
  isAvailable(): boolean;
  /** Starts listening. Returns a stop function. Audio is never buffered or uploaded. */
  start(args: {
    locale: Locale;
    onResult: (text: string, isFinal: boolean) => void;
    onError: (reason: TranscribeError) => void;
  }): () => void;
}
