import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { webSpeechTranscriber } from "@/lib/speech/webspeech";

interface FakeRecognitionResult {
  0: { transcript: string };
  isFinal: boolean;
}

class FakeRecognition {
  static instances: FakeRecognition[] = [];

  continuous = true;
  interimResults = false;
  lang = "";
  onresult:
    ((event: { resultIndex: number; results: ArrayLike<FakeRecognitionResult> }) => void) | null =
    null;
  onerror: ((event: { error: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    FakeRecognition.instances.push(this);
  }
}

function installRecognition(name: "SpeechRecognition" | "webkitSpeechRecognition") {
  Object.defineProperty(window, name, { configurable: true, value: FakeRecognition });
}

afterEach(() => {
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "webkitSpeechRecognition");
  FakeRecognition.instances = [];
});

describe("webSpeechTranscriber", () => {
  it("reports unavailable without either browser recognition constructor", () => {
    expect(webSpeechTranscriber.isAvailable()).toBe(false);
  });

  it.each(["SpeechRecognition", "webkitSpeechRecognition"] as const)(
    "reports available with %s",
    (name) => {
      installRecognition(name);
      expect(webSpeechTranscriber.isAvailable()).toBe(true);
    },
  );

  it.each([
    ["en", "en-IN"],
    ["hi", "hi-IN"],
  ] as const)(
    "configures %s recognition and forwards interim and final results",
    (locale, lang) => {
      installRecognition("SpeechRecognition");
      const onResult = vi.fn();

      const stop = webSpeechTranscriber.start({ locale, onResult, onError: vi.fn() });
      const recognition = FakeRecognition.instances[0]!;

      expect(recognition).toMatchObject({ lang, continuous: false, interimResults: true });
      expect(recognition.start).toHaveBeenCalledOnce();

      recognition.onresult?.({
        resultIndex: 0,
        results: [
          { 0: { transcript: "namaste" }, isFinal: false },
          { 0: { transcript: "namaste ji" }, isFinal: true },
        ],
      });
      expect(onResult).toHaveBeenNthCalledWith(1, "namaste", false);
      expect(onResult).toHaveBeenNthCalledWith(2, "namaste ji", true);

      stop();
      expect(recognition.stop).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ["not-allowed", "permission_denied"],
    ["service-not-allowed", "permission_denied"],
    ["no-speech", "no_speech"],
    ["network", "network"],
    ["aborted", "unknown"],
  ] as const)("maps %s errors to %s", (browserError, expected) => {
    installRecognition("webkitSpeechRecognition");
    const onError = vi.fn();

    webSpeechTranscriber.start({ locale: "en", onResult: vi.fn(), onError });
    FakeRecognition.instances[0]!.onerror?.({ error: browserError });

    expect(onError).toHaveBeenCalledWith(expected);
  });

  it("reports unsupported if start is called after support disappears", () => {
    const onError = vi.fn();
    const stop = webSpeechTranscriber.start({ locale: "en", onResult: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith("unsupported");
    expect(stop).toBeTypeOf("function");
    expect(() => stop()).not.toThrow();
  });

  it("never retains audio data", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/speech/webspeech.ts"), "utf8");
    expect(source).not.toMatch(/Blob|MediaRecorder|chunks?|audioChunks?/);
  });
});
