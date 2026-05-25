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
  const shouldBeListeningRef = useRef(false);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-AU'; // Default to Australian English for Patterson Cheney

    rec.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Safe to ignore, we will restart on onend if needed
        return;
      }
      setError(event.error);
    };

    rec.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      
      // Auto-restart if we should still be listening (continuous mode helper)
      if (shouldBeListeningRef.current) {
        try {
          rec.start();
        } catch (err) {
          console.error('Failed to restart speech recognition:', err);
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
      } catch (e) {}
    };
  }, [roomId, onInterimResult, onFinalResult]);

  // Synchronize state with audio mute status & transcription enable status
  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    const shouldListen = audioEnabled && transcriptionEnabled;
    shouldBeListeningRef.current = shouldListen;

    if (shouldListen) {
      if (!isListening) {
        try {
          rec.start();
        } catch (err) {
          console.error('Error starting speech recognition:', err);
        }
      }
    } else {
      if (isListening) {
        try {
          rec.stop();
        } catch (err) {
          console.error('Error stopping speech recognition:', err);
        }
      }
    }
  }, [audioEnabled, transcriptionEnabled, isListening]);

  return {
    isListening,
    error,
    supported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
};
