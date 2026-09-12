import type { TranscribeError, Transcriber } from "@/lib/speech/transcribe";

interface BrowserRecognitionAlternative {
  transcript: string;
}

interface BrowserRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: BrowserRecognitionAlternative;
}

interface BrowserRecognitionResultList {
  readonly length: number;
  readonly [index: number]: BrowserRecognitionResult;
}

interface BrowserRecognitionEvent {
  readonly resultIndex: number;
  readonly results: BrowserRecognitionResultList;
}

interface BrowserRecognitionErrorEvent {
  readonly error: string;
}

interface BrowserRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: BrowserRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface BrowserRecognitionConstructor {
  new (): BrowserRecognition;
}

type RecognitionWindow = Window & {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

function getConstructor(): BrowserRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const recognitionWindow = window as RecognitionWindow;
  return recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
}

function mapError(error: string): TranscribeError {
  if (error === "not-allowed" || error === "service-not-allowed") return "permission_denied";
  if (error === "no-speech") return "no_speech";
  if (error === "network") return "network";
  return "unknown";
}

export const webSpeechTranscriber: Transcriber = {
  isAvailable() {
    return getConstructor() !== undefined;
  },

  start({ locale, onResult, onError }) {
    const Recognition = getConstructor();
    if (!Recognition) {
      onError("unsupported");
      return () => {};
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = locale === "hi" ? "hi-IN" : "en-IN";
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result?.[0];
        if (result && alternative) onResult(alternative.transcript, result.isFinal);
      }
    };
    recognition.onerror = (event) => onError(mapError(event.error));
    recognition.start();

    return () => recognition.stop();
  },
};
