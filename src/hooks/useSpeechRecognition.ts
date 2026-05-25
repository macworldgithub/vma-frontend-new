import { useEffect, useRef, useState } from 'react';

interface UseSpeechRecognitionProps {
  roomId: string;
  audioEnabled: boolean;
  transcriptionEnabled: boolean;
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
}

export const useSpeechRecognition = ({
  roomId,
  audioEnabled,
  transcriptionEnabled,
  onInterimResult,
  onFinalResult,
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Desired state (what we WANT)
  const shouldBeListeningRef = useRef(false);

  // Actual runtime state (what browser THINKS)
  const isRunningRef = useRef(false);

  // Prevent duplicate start calls
  const isStartingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const rec = new SpeechRecognition();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-AU';

    rec.onstart = () => {
      isRunningRef.current = true;
      isStartingRef.current = false;

      setIsListening(true);
      setError(null);

      console.log('Speech recognition started');
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        return;
      }

      setError(event.error);
    };

    rec.onend = () => {
      console.log('Speech recognition ended');

      isRunningRef.current = false;
      setIsListening(false);

      // Auto-restart ONLY if still desired
      if (shouldBeListeningRef.current) {
        try {
          isStartingRef.current = true;
          rec.start();
        } catch (err: any) {
          isStartingRef.current = false;

          if (err?.name !== 'InvalidStateError') {
            console.error('Failed to restart speech recognition:', err);
          }
        }
      }
    };

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript.trim()) {
        onInterimResult(interimTranscript);
      }

      if (finalTranscript.trim()) {
        onFinalResult(finalTranscript);
      }
    };

    recognitionRef.current = rec;

    return () => {
      shouldBeListeningRef.current = false;

      try {
        rec.abort();
      } catch { }
    };
  }, [roomId, onInterimResult, onFinalResult]);

  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    const shouldListen = audioEnabled && transcriptionEnabled;
    shouldBeListeningRef.current = shouldListen;

    if (shouldListen) {
      // START ONLY if not running or starting
      if (!isRunningRef.current && !isStartingRef.current) {
        try {
          isStartingRef.current = true;
          rec.start();
        } catch (err: any) {
          isStartingRef.current = false;

          if (err?.name !== 'InvalidStateError') {
            console.error('Error starting speech recognition:', err);
          }
        }
      }
    } else {
      // STOP
      try {
        rec.stop();
      } catch (err) {
        console.error('Error stopping speech recognition:', err);
      }
    }
  }, [audioEnabled, transcriptionEnabled]);

  return {
    isListening,
    error,
    supported: !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    ),
  };
};