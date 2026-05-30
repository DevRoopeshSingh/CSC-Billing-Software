"use client";
import React, { useState, useEffect } from "react";
import { Mic, Loader2, Square } from "lucide-react";

interface VoiceMicProps {
  onDraftCreated: (draft: { customerName: string; services: { name: string; qty: number }[] }) => void;
}

export default function VoiceMic({ onDraftCreated }: VoiceMicProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      
      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            handleTranscriptReady(finalTranscript);
          } else {
            setTranscript(event.results[i][0].transcript);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleTranscriptReady = async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/ai/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text })
      });
      if (res.ok) {
        const data = await res.json();
        onDraftCreated(data);
      }
    } catch (error) {
      console.error("Error parsing voice intent", error);
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      recognition?.start();
      setIsRecording(true);
    }
  };

  if (!recognition) {
    return <div className="text-xs text-base-content/50">Voice input not supported in this browser.</div>;
  }

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={toggleRecording}
        disabled={isProcessing}
        className={`btn btn-circle shadow-md transition-all ${
          isRecording ? "btn-error animate-pulse" : "btn-primary hover:scale-105"
        }`}
      >
        {isProcessing ? <Loader2 size={24} className="animate-spin" /> : 
         isRecording ? <Square size={20} className="fill-current" /> : <Mic size={24} />}
      </button>

      {(isRecording || isProcessing) && (
        <div className="bg-base-200 px-4 py-2 rounded-lg text-sm flex items-center min-w-[200px] shadow-sm">
          {isProcessing ? (
            <span className="text-primary flex items-center gap-2 font-medium">
               <Loader2 size={16} className="animate-spin" /> AI is drafting invoice...
            </span>
          ) : (
            <span className="text-base-content/80 italic">
               {transcript || "Listening..."}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
