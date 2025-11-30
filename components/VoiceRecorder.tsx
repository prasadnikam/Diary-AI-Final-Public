import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
    onTranscript: (text: string) => void;
    isActive?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscript, isActive = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        // Check if browser supports Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                onTranscript(finalTranscript);
            }
        };

        recognitionInstance.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        setRecognition(recognitionInstance);

        return () => {
            if (recognitionInstance) {
                recognitionInstance.stop();
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    if (!isSupported) {
        return null; // Hide button if not supported
    }

    return (
        <button
            onClick={toggleListening}
            disabled={!isActive}
            className={`relative p-3 rounded-full transition-all duration-300 ${isListening
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 scale-110'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
        >
            {isListening ? (
                <>
                    <MicOff className="w-5 h-5" />
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                </>
            ) : (
                <Mic className="w-5 h-5" />
            )}
        </button>
    );
};
