import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Pause, X, Check, FileAudio } from 'lucide-react';
import api from '@/services/api';

interface AudioRecorderProps {
    onTranscriptionComplete: (text: string) => void;
    onAudioSaved: (audioData: { url: string; name: string; duration: number }) => void;
    onCancel: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete, onAudioSaved, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure you have granted permission.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsPaused(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTranscribe = async () => {
        if (!audioBlob) return;

        setIsTranscribing(true);
        try {
            // 1. Convert Blob to Base64 for saving as attachment
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;

                // Save audio attachment
                onAudioSaved({
                    url: base64data,
                    name: `Recording ${new Date().toLocaleTimeString()}`,
                    duration: duration
                });

                // 2. Send to backend for transcription
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');

                try {
                    // Check if API Key exists
                    const apiKey = localStorage.getItem('GEMINI_API_KEY');
                    if (!apiKey) {
                        alert("⚠️ API Key Missing\n\nPlease set your Gemini API key in Settings to use audio transcription.");
                        setIsTranscribing(false);
                        return;
                    }

                    const response = await api.post('/transcribe/', formData, {
                        headers: {
                            'X-Gemini-API-Key': apiKey
                        }
                    });

                    if (response.data.text) {
                        onTranscriptionComplete(response.data.text);
                    }
                } catch (error) {
                    console.error("Transcription failed", error);
                    alert("Transcription failed. The audio was saved, but text could not be generated.");
                } finally {
                    setIsTranscribing(false);
                }
            };
        } catch (error) {
            console.error("Error processing audio", error);
            setIsTranscribing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center">
                        <Mic className="w-6 h-6 mr-2 text-purple-600" />
                        Record Audio
                    </h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                    {isRecording ? (
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
                                <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                                    <Mic className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="mt-6 text-3xl font-mono font-bold text-slate-700">
                                {formatTime(duration)}
                            </div>
                            <p className="text-sm text-slate-500 mt-2 animate-pulse">Recording...</p>
                        </div>
                    ) : audioBlob ? (
                        <div className="w-full">
                            <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center gap-4 border border-slate-200">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <FileAudio className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="h-1 bg-slate-200 rounded-full w-full mb-2 overflow-hidden">
                                        <div className="h-full bg-purple-500 w-1/2"></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                                        <span>0:00</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                            </div>
                            <audio src={audioUrl!} controls className="w-full mb-4 hidden" />
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                                <Mic className="w-10 h-10 text-purple-300" />
                            </div>
                            <p className="text-slate-600">Click start to begin recording</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-4">
                    {!isRecording && !audioBlob && (
                        <button
                            onClick={startRecording}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-95 flex items-center justify-center"
                        >
                            <div className="w-3 h-3 rounded-full bg-white mr-2 animate-pulse"></div>
                            Start Recording
                        </button>
                    )}

                    {isRecording && (
                        <button
                            onClick={stopRecording}
                            className="w-full py-4 bg-white border-2 border-red-500 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center"
                        >
                            <Square className="w-5 h-5 mr-2 fill-current" />
                            Stop Recording
                        </button>
                    )}

                    {audioBlob && !isRecording && (
                        <>
                            <button
                                onClick={() => { setAudioBlob(null); setDuration(0); }}
                                className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold transition-all"
                            >
                                Retake
                            </button>
                            <button
                                onClick={handleTranscribe}
                                disabled={isTranscribing}
                                className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isTranscribing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        Transcribing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5 mr-2" />
                                        Save & Transcribe
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
