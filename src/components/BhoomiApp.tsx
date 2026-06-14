
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Mic, 
  Send, 
  Leaf, 
  CloudSun, 
  BarChart3, 
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
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '@/components/ui/chart';
import { 
  Bar, 
  BarChart as ReChartsBarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer 
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'audio' | 'market_data' | 'weather_data' | 'guide_data';
  imageUrl?: string;
  suggestions?: string[];
  data?: any;
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
    guideLabel: "Help Guide",
    diseasePrompt: "What plant or crop disease do you want to know about? If your crop is facing any diseases, please upload a picture using the paperclip icon or describe the problem. I can also help you protect your harvest from insects and pests.",
    marketPrompt: "Which crop market price do you want to know? Here are the current rates and trends for major Indian crops.",
    weatherPrompt: "Weather is vital for a good harvest. Here is a guide on which crops grow best in each season. Would you like to know if today's weather is suitable for planting, or do you have a specific crop in mind?",
    guidePrompt: "Bhoomi Voice is your personal farming assistant. You can speak to me by clicking the Mic button, or type your questions below. Click the Paperclip to upload photos of sick crops for instant diagnosis. Use the buttons above for quick Market and Weather updates. I will speak all my answers back to you!",
    cropHeader: "Crop",
    priceHeader: "Price (₹/Qtl)",
    seasonHeader: "Season",
    bestCrops: "Best Crops",
    trendLabel: "Market Trend (Bar Chart)"
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
    guideLabel: "सहायता मार्गदर्शिका",
    diseasePrompt: "आप किस पौधे या फसल के रोग के बारे में जानना चाहते हैं? यदि आपकी फसल किसी बीमारी का सामना कर रही है, तो कृपया पेपरक्लिप आइकन का उपयोग करके एक फोटो अपलोड करें या समस्या का वर्णन करें। मैं कीटों से बचाव में भी आपकी मदद कर सकता हूँ।",
    marketPrompt: "आप किस फसल का बाजार भाव जानना चाहते हैं? यहाँ प्रमुख भारतीय फसलों की वर्तमान दरें और रुझान दिए गए हैं।",
    weatherPrompt: "अच्छी फसल के लिए मौसम बहुत महत्वपूर्ण है। यहाँ प्रत्येक मौसम में सबसे अच्छी उगने वाली फसलों की जानकारी दी गई है। क्या आप जानना चाहते हैं कि आज का मौसम बुवाई के लिए उपयुक्त है, या आपके मन में कोई विशेष फसल है?",
    guidePrompt: "भूमि वॉइस आपका व्यक्तिगत खेती सहायक है। आप माइक बटन पर क्लिक करके मुझसे बात कर सकते हैं, या अपने प्रश्न टाइप कर सकते हैं। तुरंत बीमारी की पहचान के लिए पेपरक्लिप का उपयोग करके बीमार फसलों की फोटो अपलोड करें। बाजार और मौसम के अपडेट के लिए ऊपर दिए गए बटनों का उपयोग करें। मैं अपने सभी जवाब आपको बोलकर सुनाऊंगा!",
    cropHeader: "फसल",
    priceHeader: "भाव (₹/क्विंटल)",
    seasonHeader: "सीजन",
    bestCrops: "बेहतरीन फसलें",
    trendLabel: "बाजार का रुझान (बार चार्ट)"
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
    guideLabel: "সাহায্য নির্দেশিকা",
    diseasePrompt: "আপনি কোন উদ্ভিদ বা ফসলের রোগ সম্পর্কে জানতে চান? যদি আপনার ফসল কোন রোগের সম্মুখীন হয়, তবে দয়া করে পেপারক্লিপ আইকন ব্যবহার করে একটি ছবি আপলোড করুন বা সমস্যাটি বর্ণনা করুন। আমি আপনাকে পোকামাকড় থেকে ফসল রক্ষা করতেও সাহায্য করতে পারি।",
    marketPrompt: "আপনি কোন ফসলের বাজার দর জানতে চান? এখানে প্রধান ভারতীয় ফসলের বর্তমান হার এবং প্রবণতা দেওয়া হলো।",
    weatherPrompt: "ভালো ফসলের জন্য আবহাওয়া অত্যন্ত গুরুত্বপূর্ণ। প্রতিটি ঋতুতে কোন ফসল সবচেয়ে ভালো জন্মায় তার একটি নির্দেশিকা এখানে দেওয়া হলো। আপনি কি জানতে চান আজকের আবহাওয়া চাষের জন্য উপযুক্ত কি না, নাকি আপনার মনে অন্য কোনো নির্দিষ্ট ফসল আছে?",
    guidePrompt: "ভূমি ভয়েস আপনার ব্যক্তিগত চাষের সহকারী। আপনি মাইক বাটনে ক্লিক করে আমার সাথে কথা বলতে পারেন, অথবা আপনার প্রশ্ন টাইপ করতে পারেন। তাৎক্ষণিক রোগ নির্ণয়ের জন্য পেপারক্লিপ ব্যবহার করে অসুস্থ ফসলের ছবি আপলোড করুন। দ্রুত বাজার এবং আবহাওয়ার আপডেটের জন্য উপরের বোতামগুলি ব্যবহার করুন। আমি আমার সব উত্তর আপনাকে পড়ে শোনাব!",
    cropHeader: "ফসল",
    priceHeader: "দাম (টাকা/কুইন্টাল)",
    seasonHeader: "ঋতু",
    bestCrops: "সেরা ফসল",
    trendLabel: "বাজারের প্রবণতা (বার চার্ট)"
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
    guideLabel: "உதவி வழிகாட்டி",
    diseasePrompt: "எந்த தாவர அல்லது பயிர் நோய் பற்றி நீங்கள் தெரிந்து கொள்ள விரும்புகிறீர்கள்? உங்கள் பயிர் ஏதேனும் நோயால் பாதிக்கப்பட்டிருந்தால், தயவுசெய்து பேப்பர்க்ளிப் ஐகானைப் பயன்படுத்தி ஒரு புகைப்படத்தைப் பதிவேற்றவும் அல்லது சிக்கலை விவரிக்கவும். பூச்சிகளிடமிருந்து பயிரைப் பாதுகாக்கவும் நான் உங்களுக்கு உதவ முடியும்.",
    marketPrompt: "எந்த பயிர் சந்தை விலையை நீங்கள் தெரிந்து கொள்ள விரும்புகிறீர்கள்? முக்கிய இந்திய பயிர்களின் தற்போதைய விலைகள் மற்றும் போக்குகள் இங்கே உள்ளன.",
    weatherPrompt: "நல்ல அறுவடைக்கு வானிலை மிகவும் முக்கியமானது. ஒவ்வொரு பருவத்திலும் எந்த பயிர்கள் சிறப்பாக வளரும் என்பதற்கான வழிகாட்டி இங்கே உள்ளது. இன்றைய வானிலை நடவு செய்ய ஏற்றதா என்பதை அறிய விரும்புகிறீர்களா அல்லது உங்கள் மனதில் ஏதேனும் குறிப்பிட்ட பயிர் உள்ளதா?",
    guidePrompt: "பூமி வாய்ஸ் உங்கள் தனிப்பட்ட விவசாய உதவியாளர். மைக் பட்டனை கிளிக் செய்வதன் மூலம் நீங்கள் என்னுடன் பேசலாம் அல்லது உங்கள் கேள்விகளைத் தட்டச்சு செய்யலாம். பயிர் நோய்களைக் கண்டறிய புகைப்படங்களைப் பதிவேற்ற பேப்பர்க்ளிப்பைப் பயன்படுத்தவும். விரைவான சந்தை மற்றும் வானிலை அறிவிப்புகளுக்கு மேலே உள்ள பொத்தான்களைப் பயன்படுத்தவும். எனது பதில்கள் அனைத்தையும் நான் உங்களுக்குப் பேசிக் காட்டுவேன்!",
    cropHeader: "பயிர்",
    priceHeader: "விலை (₹/குவிண்டால்)",
    seasonHeader: "பருவம்",
    bestCrops: "சிறந்த பயிர்கள்",
    trendLabel: "சந்தை போக்கு (பார் சார்ட்)"
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
    guideLabel: "मदत मार्गदर्शक",
    diseasePrompt: "तुम्हाला कोणत्या झाडाच्या किंवा पिकाच्या रोगाबद्दल जाणून घ्यायचे आहे? जर तुमच्या पिकावर कोणताही रोग पडला असेल तर कृपया पेपरक्लिप आयकॉन वापरून फोटो अपलोड करा किंवा समस्येचे वर्णन करा. मी कीड आणि कीटकांपासून संरक्षण कसे करावे यातही मदत करू शकतो.",
    marketPrompt: "तुम्हाला कोणत्या पिकाचा बाजार भाव जाणून घ्यायचा आहे? प्रमुख भारतीय पिकांचे सध्याचे दर आणि कल येथे दिले आहेत.",
    weatherPrompt: "चांगल्या कापणीसाठी हवामान अत्यंत महत्त्वाचे आहे. प्रत्येक हंगामात कोणती पिके उत्तम येतात याची माहिती येथे आहे. तुम्हाला आजचे हवामान पेरणीसाठी योग्य आहे का हे जाणून घ्यायचे आहे का, की तुमच्या मनात एखादे विशिष्ट पीक आहे?",
    guidePrompt: "भूमी व्हॉइस आपला वैयक्तिक शेती सहाय्यक आहे. आपण माइक बटणावर क्लिक करून माझ्याशी बोलू शकता किंवा आपले प्रश्न टाइप करू शकता. पिकांच्या रोगाचे त्वरित निदान करण्यासाठी पेपरक्लिप वापरून फोटो अपलोड करा. बाजार आणि हवामानाच्या अपडेट्ससाठी वरील बटणे वापरा. मी माझी सर्व उत्तरे तुम्हाला बोलून दाखवेन!",
    cropHeader: "पीक",
    priceHeader: "दर (₹/क्विंटल)",
    seasonHeader: "हवामान",
    bestCrops: "सर्वोत्तम पिके",
    trendLabel: "बाजार कल (बार चार्ट)"
  }
};

const GREETINGS: Record<string, string> = {
  en: "Hi, I am Bhoomi. How can I help you today?",
  hi: "नमस्ते, मैं भूमि हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?",
  bn: "হাই, আমি ভূমি। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
  ta: "வணக்கம், நான் பூமி. இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
  mr: "नमस्कार, मी भूमी आहे. आज मी तुम्हाला कशी मदत करू शकतो?"
};

const MARKET_DATA = [
  { name: 'Rice', price: 2180, trend: 1.2 },
  { name: 'Wheat', price: 2275, trend: 0.8 },
  { name: 'Cotton', price: 6800, trend: -0.5 },
  { name: 'Maize', price: 1950, trend: 1.5 },
  { name: 'Mustard', price: 5450, trend: 0.2 },
];

const SEASON_DATA = [
  { season: 'Kharif (Jun-Oct)', crops: 'Rice, Maize, Cotton, Soybean' },
  { season: 'Rabi (Nov-Mar)', crops: 'Wheat, Mustard, Barley, Peas' },
  { season: 'Zaid (Mar-Jun)', crops: 'Watermelon, Cucumber, Moong' },
];

const MARKET_CHART_DATA = [
  { name: 'Rice', price: 2180 },
  { name: 'Wheat', price: 2275 },
  { name: 'Cotton', price: 6800 },
  { name: 'Maize', price: 1950 },
  { name: 'Mustard', price: 5450 },
];

const chartConfig = {
  price: { label: "Price", color: "hsl(var(--primary))" },
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

  const t = useMemo(() => UI_STRINGS[language.id] || UI_STRINGS.en, [language.id]);

  useEffect(() => {
    const welcomeText = GREETINGS[language.id] || GREETINGS.en;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: welcomeText,
        suggestions: [
          t.diseaseLabel,
          t.marketLabel,
          t.weatherLabel,
          t.guideLabel
        ]
      }
    ]);

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        const localeMap: Record<string, string> = {
          en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', mr: 'mr-IN'
        };
        recognitionRef.current.lang = localeMap[language.id] || 'en-IN';

        recognitionRef.current.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInput(text);
          processResponse(text);
        };

        recognitionRef.current.onerror = () => setIsRecording(false);
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [language.id, t.diseaseLabel, t.marketLabel, t.weatherLabel, t.guideLabel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  const playAudio = (base64Audio: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    audio.play().catch(e => console.error("Audio playback blocked:", e));
  };

  const addMessage = (msg: Omit<Message, 'id'>) => {
    const newMsg = { ...msg, id: Math.random().toString(36).substr(2, 9) };
    setMessages(prev => [...prev, newMsg]);
    return newMsg.id;
  };

  const processResponse = useCallback(async (text: string, silentUserMsg: boolean = false) => {
    if (!text.trim() || isProcessing) return;
    
    setIsProcessing(true);
    if (!silentUserMsg) {
      addMessage({ role: 'user', content: text });
    }
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

      if (result.responseAudio) playAudio(result.responseAudio);
    } catch (error) {
      console.error("Consultation Flow Error:", error);
      addMessage({ role: 'assistant', content: t.error });
    } finally {
      setIsProcessing(false);
    }
  }, [language.id, messages, t.error, isProcessing]);

  const handleAction = async (action: string) => {
    if (isProcessing) return;

    if (action === t.diseaseLabel) {
      await processResponse(`Identify yourself as Bhoomi. Then say exactly: ${t.diseasePrompt}`, true);
    } else if (action === t.marketLabel) {
      addMessage({
        role: 'assistant',
        content: "",
        type: 'market_data'
      });
      await processResponse(`Identify yourself as Bhoomi. Then say exactly: ${t.marketPrompt}`, true);
    } else if (action === t.weatherLabel) {
      addMessage({
        role: 'assistant',
        content: "",
        type: 'weather_data'
      });
      await processResponse(`Identify yourself as Bhoomi. Then say exactly: ${t.weatherPrompt}`, true);
    } else if (action === t.guideLabel) {
      addMessage({
        role: 'assistant',
        content: "",
        type: 'guide_data'
      });
      await processResponse(`Identify yourself as Bhoomi. Then say exactly: ${t.guidePrompt}`, true);
    } else {
      await processResponse(action);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsRecording(false);
      }
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

  const formatMessageContent = (content: string) => {
    if (!content) return null;
    return content.split('\n').map((line, i) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={i} className="h-2" />;

      if (trimmedLine.match(/^[A-Z\s\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F]+:$/)) {
        return (
          <div key={i} className="font-bold text-primary mt-6 mb-2 uppercase tracking-widest text-xs border-b border-primary/20 pb-1.5">
            {trimmedLine}
          </div>
        );
      }

      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        const text = trimmedLine.substring(1).trim();
        return (
          <div key={i} className="flex gap-3 ml-1 my-2.5 items-start">
            <span className="text-primary mt-1 text-base">•</span>
            <span className="text-sm leading-relaxed text-foreground font-medium">{text}</span>
          </div>
        );
      }

      return <p key={i} className="text-sm leading-relaxed my-2 text-foreground/90">{trimmedLine}</p>;
    });
  };

  const renderSpecialContent = (msg: Message) => {
    if (msg.type === 'market_data') {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-primary/10 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-xs font-bold text-primary">{t.cropHeader}</TableHead>
                  <TableHead className="text-xs font-bold text-primary text-right">{t.priceHeader}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MARKET_DATA.map((crop) => (
                  <TableRow key={crop.name} className="hover:bg-transparent">
                    <TableCell className="text-xs py-2">{crop.name}</TableCell>
                    <TableCell className="text-xs py-2 text-right font-medium">₹{crop.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="bg-white p-3 rounded-xl border border-primary/10 shadow-sm h-48">
            <h4 className="text-[10px] font-bold text-primary/60 uppercase mb-2">{t.trendLabel}</h4>
            <ChartContainer config={chartConfig} className="h-32 w-full">
              <ReChartsBarChart data={MARKET_CHART_DATA}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 8000]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="price" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
              </ReChartsBarChart>
            </ChartContainer>
          </div>
        </div>
      );
    }

    if (msg.type === 'weather_data') {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-primary/10 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-xs font-bold text-primary">{t.seasonHeader}</TableHead>
                  <TableHead className="text-xs font-bold text-primary">{t.bestCrops}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SEASON_DATA.map((row) => (
                  <TableRow key={row.season} className="hover:bg-transparent">
                    <TableCell className="text-xs py-2 font-medium">{row.season}</TableCell>
                    <TableCell className="text-xs py-2 text-muted-foreground">{row.crops}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    if (msg.type === 'guide_data') {
      return (
        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <HelpCircle className="w-5 h-5" />
            <span className="font-bold text-sm">How to use Bhoomi</span>
          </div>
          <div className="space-y-2 text-xs leading-relaxed text-foreground/80">
            <p>• <b>Voice Chat:</b> Tap the Mic button and speak in your local language.</p>
            <p>• <b>Photo Upload:</b> Use the Paperclip icon to send photos of sick crops for identification.</p>
            <p>• <b>Fast Actions:</b> Use the top buttons for instant Market, Weather, and Disease help.</p>
            <p>• <b>Smart Suggestions:</b> Tap the bubbles below my messages for follow-up questions.</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mobile-stage flex flex-col bg-white">
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

      <div className="p-4 grid grid-cols-4 gap-2 bg-muted/30">
        {[
          { icon: Leaf, label: t.disease, action: t.diseaseLabel, color: 'bg-green-100 text-green-700' },
          { icon: BarChart3, label: t.market, action: t.marketLabel, color: 'bg-amber-100 text-amber-700' },
          { icon: CloudSun, label: t.weather, action: t.weatherLabel, color: 'bg-blue-100 text-blue-700' },
          { icon: HelpCircle, label: t.guide, action: t.guideLabel, color: 'bg-purple-100 text-purple-700' }
        ].map((item, idx) => (
          <button key={idx} onClick={() => handleAction(item.action)} className="flex flex-col items-center gap-1 group" disabled={isProcessing}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-active:scale-95 transition-transform ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold text-center">{item.label}</span>
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 p-4 bg-[#F9FBF8]">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                  msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white text-foreground rounded-tl-none border border-primary/10'
                } ${msg.type === 'market_data' || msg.type === 'weather_data' || msg.type === 'guide_data' ? 'w-full' : ''}`}
              >
                {msg.type === 'image' && msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded crop" className="w-full rounded-lg mb-3 shadow-sm" />
                )}
                
                {renderSpecialContent(msg)}

                <div className="whitespace-pre-line">
                  {msg.role === 'assistant' ? formatMessageContent(msg.content) : msg.content}
                </div>
              </div>
              
              {msg.suggestions && msg.suggestions.length > 0 && !isProcessing && (
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
                <span className="text-[10px] text-muted-foreground animate-pulse">Bhoomi is thinking...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input 
              placeholder={t.placeholder} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processResponse(input)}
              className="pr-10 h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary shadow-inner"
              disabled={isProcessing}
            />
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
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
            disabled={isProcessing}
          >
            {input ? <Send className="w-5 h-5" /> : (isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />)}
          </Button>
        </div>
        
        <div className="flex justify-between items-center px-1">
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Leaf className="w-3 h-3 text-primary/60" /> {t.verified}
          </p>
          <button className="text-[10px] text-primary font-bold hover:underline" onClick={() => handleAction(t.marketLabel)} disabled={isProcessing}>
            {t.liveRates}
          </button>
        </div>
      </div>
    </div>
  );
}
