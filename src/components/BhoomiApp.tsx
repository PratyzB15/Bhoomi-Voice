"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Mic, 
  Send, 
  Leaf, 
  CloudSun, 
  LineChart, 
  HelpCircle,
  MoreVertical,
  Paperclip,
  ChevronLeft,
  Volume2,
  Loader2,
  Square
} from 'lucide-react';
import { voiceAssistedFarmingConsultation } from '@/ai/flows/voice-assisted-farming-consultation';
import { cropDiseaseImageAnalysis } from '@/ai/flows/crop-disease-image-analysis';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'audio';
  imageUrl?: string;
  suggestions?: string[];
};

interface BhoomiAppProps {
  language: {
    id: string;
    label: string;
    native: string;
    flowCode: string;
  };
}

const UI_STRINGS: Record<string, any> = {
  en: { 
    appName: "Bhoomi Voice", 
    disease: "Disease", 
    market: "Market", 
    weather: "Weather", 
    guide: "Guide", 
    placeholder: "Ask anything...", 
    verified: "Verified", 
    liveRates: "Live Rates",
    error: "I'm sorry, I encountered an error.",
    analyzing: "Checking crop health...",
    diseaseLabel: "Disease Identification",
    marketLabel: "Market Prices",
    weatherLabel: "Weather Forecast",
    guideLabel: "Help Guide"
  },
  hi: { 
    appName: "भूमि वॉइस", 
    disease: "रोग", 
    market: "बाजार", 
    weather: "मौसम", 
    guide: "सहायता", 
    placeholder: "कुछ भी पूछें...", 
    verified: "सत्यापित", 
    liveRates: "ताजा दर",
    error: "क्षमा करें, मुझे एक त्रुटि मिली।",
    analyzing: "फसल के स्वास्थ्य की जाँच हो रही है...",
    diseaseLabel: "रोग पहचान",
    marketLabel: "बाजार भाव",
    weatherLabel: "मौसम का पूर्वानुमान",
    guideLabel: "सहायता मार्गदर्शिका"
  },
  bn: { 
    appName: "ভূমি ভয়েস", 
    disease: "রোগ", 
    market: "বাজার", 
    weather: "আবহাওয়া", 
    guide: "গাইড", 
    placeholder: "কিছু জিজ্ঞাসা করুন...", 
    verified: "যাচাইকৃত", 
    liveRates: "লাইভ রেট",
    error: "দুঃখিত, আমি একটি ত্রুটির সম্মুখীন হয়েছি।",
    analyzing: "ফসলের স্বাস্থ্য পরীক্ষা করা হচ্ছে...",
    diseaseLabel: "রোগ শনাক্তকরণ",
    marketLabel: "বাজার দর",
    weatherLabel: "আবহাওয়ার পূর্বাভাস",
    guideLabel: "সাহায্য নির্দেশিকা"
  },
  ta: { 
    appName: "பூமி வாய்ஸ்", 
    disease: "நோய்", 
    market: "சந்தை", 
    weather: "வானிலை", 
    guide: "வழிகாட்டி", 
    placeholder: "எதையும் கேளுங்கள்...", 
    verified: "சரிபார்க்கப்பட்டது", 
    liveRates: "நேரடி விலைகள்",
    error: "மன்னிக்கவும், நான் ஒரு பிழையைச் சந்தித்தேன்.",
    analyzing: "பயிர் ஆரோக்கியத்தை சரிபார்க்கிறது...",
    diseaseLabel: "நோய் அடையாளம்",
    marketLabel: "சந்தை விலைகள்",
    weatherLabel: "வானிலை முன்னறிவிப்பு",
    guideLabel: "உதவி வழிகாட்டி"
  },
  mr: { 
    appName: "भूमी व्हॉइस", 
    disease: "रोग", 
    market: "बाजार", 
    weather: "हवामान", 
    guide: "मार्गदर्शक", 
    placeholder: "काहीही विचारा...", 
    verified: "सत्यापित", 
    liveRates: "थेट दर",
    error: "क्षमस्व, मला एक त्रुटी आली.",
    analyzing: "पिकाच्या आरोग्याची तपासणी होत आहे...",
    diseaseLabel: "रोग ओळख",
    marketLabel: "बाजार भाव",
    weatherLabel: "हवामान अंदाज",
    guideLabel: "मदत मार्गदर्शक"
  }
};

export function BhoomiApp({ language }: BhoomiAppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = UI_STRINGS[language.id] || UI_STRINGS.en;

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
          t.diseaseLabel,
          t.marketLabel,
          "PM Kisan Scheme",
          "Organic Fertilizer"
        ]
      }
    ]);

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = language.id === 'en' ? 'en-US' : language.id === 'hi' ? 'hi-IN' : language.id === 'bn' ? 'bn-BD' : language.id === 'ta' ? 'ta-IN' : 'mr-IN';

        recognitionRef.current.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInput(text);
          processResponse(text);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, [language, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

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

  const processResponse = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    addMessage({ role: 'user', content: text });
    setInput('');
    
    try {
      const result = await voiceAssistedFarmingConsultation({
        userInputText: text,
        selectedLanguage: language.id as any,
        chatHistory: messages.map(m => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          content: m.content 
        }))
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
      addMessage({ role: 'assistant', content: t.error });
    } finally {
      setIsProcessing(false);
    }
  }, [language, messages, t]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      addMessage({ role: 'user', content: t.analyzing, type: 'image', imageUrl: dataUri });
      
      setIsProcessing(true);
      try {
        const result = await cropDiseaseImageAnalysis({
          photoDataUri: dataUri,
          language: language.label
        });
        
        addMessage({ role: 'assistant', content: result.responseInSelectedLanguage });
      } catch (error) {
        addMessage({ role: 'assistant', content: t.error });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAction = async (action: string) => {
    await processResponse(action);
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-2" />;

      // Detect subheadings (Uppercase ending with colon)
      // matches things like "SOIL PREPARATION:"
      if (trimmedLine.match(/^[A-Z\s]+:$/)) {
        return (
          <div key={i} className="font-bold text-primary mt-6 mb-2 uppercase tracking-widest text-xs border-b border-primary/20 pb-1.5">
            {trimmedLine}
          </div>
        );
      }

      // Detect bullet points
      if (trimmedLine.startsWith('•')) {
        return (
          <div key={i} className="flex gap-3 ml-1 my-2.5 items-start">
            <span className="text-primary mt-1 text-base">•</span>
            <span className="text-sm leading-relaxed text-foreground font-medium">{trimmedLine.substring(1).trim()}</span>
          </div>
        );
      }

      // Standard paragraph
      return <p key={i} className="text-sm leading-relaxed my-2 text-foreground/90">{trimmedLine}</p>;
    });
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
            <h2 className="font-headline text-lg leading-tight">{t.appName}</h2>
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
        {[
          { icon: Leaf, label: t.disease, action: t.diseaseLabel, color: 'bg-green-100 text-green-700' },
          { icon: LineChart, label: t.market, action: t.marketLabel, color: 'bg-amber-100 text-amber-700' },
          { icon: CloudSun, label: t.weather, action: t.weatherLabel, color: 'bg-blue-100 text-blue-700' },
          { icon: HelpCircle, label: t.guide, action: t.guideLabel, color: 'bg-purple-100 text-purple-700' }
        ].map((item, idx) => (
          <button key={idx} onClick={() => handleAction(item.action)} className="flex flex-col items-center gap-1 group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-active:scale-95 transition-transform ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-center">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 bg-[#F9FBF8]">
        <div className="space-y-6">
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
                  <img src={msg.imageUrl} alt="Uploaded crop" className="w-full rounded-lg mb-3 shadow-sm" />
                )}
                <div className="whitespace-pre-line">
                  {msg.role === 'assistant' ? formatMessageContent(msg.content) : msg.content}
                </div>
              </div>
              
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 justify-start">
                  {msg.suggestions.map((suggestion, idx) => (
                    <Button 
                      key={idx} 
                      variant="outline" 
                      size="sm" 
                      className="text-[10px] h-7 rounded-full bg-white border-primary/20 text-primary hover:bg-primary/5 hover:border-primary transition-all"
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
              <div className="bg-white border border-primary/10 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-[10px] text-muted-foreground animate-pulse">Bhoomi is fetching detailed advice...</span>
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
              placeholder={t.placeholder} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processResponse(input)}
              className="pr-10 h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary shadow-inner"
            />
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
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
            onClick={input ? () => processResponse(input) : toggleRecording}
          >
            {input ? <Send className="w-5 h-5" /> : (isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />)}
          </Button>
        </div>
        
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Leaf className="w-3 h-3 text-primary/60" /> {t.verified}
          </p>
          <button className="text-[10px] text-primary font-bold hover:underline" onClick={() => handleAction(t.marketLabel)}>
            {t.liveRates}
          </button>
        </div>
      </div>
    </div>
  );
}
