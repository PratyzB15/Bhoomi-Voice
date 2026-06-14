"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Mic, 
  Send, 
  Image as ImageIcon, 
  Leaf, 
  CloudSun, 
  LineChart, 
  HelpCircle,
  MoreVertical,
  Paperclip,
  ChevronLeft,
  Volume2,
  Loader2
} from 'lucide-react';
import { voiceAssistedFarmingConsultation } from '@/ai/flows/voice-assisted-farming-consultation';
import { cropDiseaseImageAnalysis } from '@/ai/flows/crop-disease-image-analysis';
import { intelligentGuidanceAndSuggestions } from '@/ai/flows/intelligent-guidance-and-suggestions';
import { explainMultilevelFarming } from '@/ai/flows/multilevel-farming-education';
import { regionalFarmingDataRetrieval } from '@/ai/flows/regional-farming-data-retrieval';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'audio';
  imageUrl?: string;
  suggestions?: string[];
  isLoading?: boolean;
};

interface BhoomiAppProps {
  language: {
    id: string;
    label: string;
    native: string;
    flowCode: string;
  };
}

export function BhoomiApp({ language }: BhoomiAppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const greetings: Record<string, string> = {
    en: "Hi, what can I help you with?",
    hi: "नमस्ते, मैं आपकी क्या मदद कर सकता हूँ?",
    bn: "হাই, আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    ta: "வணக்கம், நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    mr: "नमस्कार, मी तुम्हाला कशी मदत करू शकतो?"
  };

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: greetings[language.id] || greetings.en,
        suggestions: [
          "Disease Identification",
          "Market Prices",
          "Government Subsidies",
          "Natural Farming Tips"
        ]
      }
    ]);
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const playAudio = (base64Audio: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    audio.play();
  };

  const addMessage = (msg: Omit<Message, 'id'>) => {
    const newMsg = { ...msg, id: Math.random().toString(36).substr(2, 9) };
    setMessages(prev => [...prev, newMsg]);
    return newMsg.id;
  };

  const handleVoiceInput = async () => {
    // Simulate STT for this prototype, as full Web Speech API requires more complex browser setup
    // In a real app, we'd use navigator.mediaDevices.getUserMedia and SpeechRecognition
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      // Dummy transcription for demo if empty
      if (!input) setInput("Tell me about natural farming");
    }, 2000);
  };

  const processResponse = async (text: string) => {
    setIsProcessing(true);
    const userMsgId = addMessage({ role: 'user', content: text });
    
    try {
      // Use the comprehensive voice flow which includes audio
      const result = await voiceAssistedFarmingConsultation({
        userInputText: text,
        selectedLanguage: language.id as any,
        chatHistory: messages.map(m => ({ role: m.role as any, content: m.content }))
      });

      addMessage({ 
        role: 'assistant', 
        content: result.responseText,
        suggestions: result.followUpQuestions
      });

      if (result.responseAudio) {
        playAudio(result.responseAudio);
      }
    } catch (error) {
      console.error(error);
      addMessage({ role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." });
    } finally {
      setIsProcessing(false);
      setInput('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      addMessage({ role: 'user', content: "Checking crop health...", type: 'image', imageUrl: dataUri });
      
      setIsProcessing(true);
      try {
        const result = await cropDiseaseImageAnalysis({
          photoDataUri: dataUri,
          language: language.label
        });
        
        addMessage({ role: 'assistant', content: result.responseInSelectedLanguage });
      } catch (error) {
        addMessage({ role: 'assistant', content: "Failed to analyze image." });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAction = async (action: string) => {
    setInput(action);
    await processResponse(action);
  };

  return (
    <div className="mobile-stage flex flex-col bg-white">
      {/* App Header */}
      <div className="p-4 flex items-center justify-between border-b bg-primary text-white z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.location.reload()}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h2 className="font-headline text-lg leading-tight">Bhoomi Voice</h2>
            <p className="text-[10px] opacity-70 tracking-widest uppercase">{language.label}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Volume2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Quick Access Tiles */}
      <div className="p-4 grid grid-cols-4 gap-2 bg-muted/30">
        <button onClick={() => handleAction("Disease Identification")} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold text-center">Disease</span>
        </button>
        <button onClick={() => handleAction("Market Prices")} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <LineChart className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold text-center">Market</span>
        </button>
        <button onClick={() => handleAction("Weather Forecast")} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <CloudSun className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold text-center">Weather</span>
        </button>
        <button onClick={() => handleAction("Help Guide")} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
            <HelpCircle className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-bold text-center">Guide</span>
        </button>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 bg-[#F9FBF8]">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                  msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white text-foreground rounded-tl-none border border-primary/10'
                }`}
              >
                {msg.type === 'image' && msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded crop" className="w-full rounded-lg mb-2" />
                )}
                <div className="whitespace-pre-line text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
              
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 justify-start">
                  {msg.suggestions.map((suggestion, idx) => (
                    <Button 
                      key={idx} 
                      variant="outline" 
                      size="sm" 
                      className="text-[10px] h-7 rounded-full bg-white border-primary/20 text-primary hover:bg-primary/5"
                      onClick={() => handleAction(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border border-primary/10 rounded-2xl rounded-tl-none p-3 shadow-sm">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 bg-white border-t space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input 
              placeholder="Ask anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processResponse(input)}
              className="pr-10 h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary"
            />
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>
          <Button 
            size="icon" 
            className={`h-12 w-12 rounded-2xl shadow-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}
            onClick={input ? () => processResponse(input) : handleVoiceInput}
          >
            {input ? <Send className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        </div>
        
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Leaf className="w-3 h-3" /> Natural Farming Data Verified
          </p>
          <button className="text-[10px] text-primary font-bold hover:underline" onClick={() => handleAction("Show current market prices")}>
            Live Rates
          </button>
        </div>
      </div>
    </div>
  );
}