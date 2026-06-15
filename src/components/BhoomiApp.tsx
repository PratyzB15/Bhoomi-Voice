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
  Square,
  Sprout
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
  CartesianGrid 
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
    error: "I'm sorry, I encountered an error. Please try again.",
    analyzing: "Checking crop health...",
    diseaseLabel: "Disease Identification",
    marketLabel: "Market Prices",
    weatherLabel: "Weather Forecast",
    guideLabel: "Help Guide",
    diseasePrompt: "What plant or crop disease do you want to know about? If your crop is facing any diseases, please upload a picture using the paperclip icon or describe the problem so that I can help. I can also help you protect your harvest from insects and pests.",
    marketPrompt: "Current Mandi rates are listed below. Which crop market price do you want to know?",
    weatherPrompt: "Weather is vital for a good harvest. Here is a guide on which crops grow best in each season. Would you like to know if today's weather is suitable for planting, or do you have a specific crop in mind? I will suggest the best weather.",
    guidePrompt: "Bhoomi Voice is your personal farming assistant. You can speak to me by clicking the Mic button, or type your questions below. Click the Paperclip to upload photos of sick crops for instant diagnosis. Use the buttons above for quick Market and Weather updates. I will speak all my answers back to you!",
    cropHeader: "Crop",
    priceHeader: "Price (₹/Qtl)",
    seasonHeader: "Season",
    bestCrops: "Best Crops",
    trendLabel: "Market Trend",
    greeting: "Hi, I am Bhoomi. How can I help u today?"
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
    error: "क्षमा करें, मुझे एक त्रुटि मिली। कृपया पुनः प्रयास करें।",
    analyzing: "फसल के स्वास्थ्य की जाँच हो रही है...",
    diseaseLabel: "रोग पहचान",
    marketLabel: "बाजार भाव",
    weatherLabel: "मौसम का पूर्वानुमान",
    guideLabel: "सहायता मार्गदर्शिका",
    diseasePrompt: "आप किस पौधे या फसल के रोग के बारे में जानना चाहते हैं? यदि आपकी फसल किसी बीमारी का सामना कर रही है, तो कृपया पेपरक्लिप आइकन का उपयोग करके एक फोटो अपलोड करें या समस्या का वर्णन करें ताकि मैं आपकी मदद कर सकूं। मैं कीटों और कीड़ों से बचाव में भी आपकी मदद कर सकता हूँ।",
    marketPrompt: "वर्तमान मंडी दरें नीचे सूचीबद्ध हैं। आप किस फसल का बाजार भाव जानना चाहते हैं?",
    weatherPrompt: "अच्छी फसल के लिए मौसम बहुत महत्वपूर्ण है। यहाँ प्रत्येक मौसम में सबसे अच्छी उगने वाली फसलों की जानकारी दी गई है। क्या आप जानना चाहते हैं कि आज का मौसम बुवाई के लिए उपयुक्त है, या आपके मन में एक विशेष फसल है? मैं आपको सबसे अच्छा मौसम बताऊंगा।",
    guidePrompt: "भूमि वॉइस आपका व्यक्तिगत खेती सहायक है। आप माइक बटन पर क्लिक करके मुझसे बात कर सकते हैं, या अपने प्रश्न टाइप कर सकते हैं। तुरंत बीमारी की पहचान के लिए पेपरक्लिप का उपयोग करके बीमार फसलों की फोटो अपलोड करें। बाजार और मौसम के अपडेट के लिए ऊपर दिए गए बटनों का उपयोग करें। मैं अपने सभी जवाब आपको बोलकर सुनाऊंगा!",
    cropHeader: "फसल",
    priceHeader: "भाव (₹/क्विंटल)",
    seasonHeader: "सीजन",
    bestCrops: "बेहतरीन फसलें",
    trendLabel: "बाजार का रुझान",
    greeting: "नमस्ते, मैं भूमि हूँ। मैं आज आपकी क्या मदद कर सकता हूँ?"
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
    error: "দুঃখিত, আমি একটি কিছত্রुটির সম্মুখীন হয়েছি। দয়া করে फिर से চেষ্টা করুন।",
    analyzing: "ফসলের স্বাস্থ্য পরীক্ষা করা হচ্ছে...",
    diseaseLabel: "রোগ শনাক্তকরণ",
    marketLabel: "বাজার দর",
    weatherLabel: "আবহাওয়ার পূর্বাভাস",
    guideLabel: "সাহায্য নির্দেশিকা",
    diseasePrompt: "আপনি কোন উদ্ভিদ বা ফসলের রোগ সম্পর্কে জানতে চান? যদি আপনার ফসল কোন রোগের সম্মুখীন হয়, তবে দয়া করে পেপারক্লিপ আইকন ব্যবহার করে একটি ছবি আপলোড করুন বা সমস্যাটি বর্ণনা করুন যাতে আমি আপনাকে সাহায্য করতে পারি। আমি আপনাকে পোকামাকড় এবং কীট থেকে ফসল রক্ষা করতেও সাহায্য করতে পারি।",
    marketPrompt: "বর্তমান মান্ডি রেটগুলি নীচে দেওয়া হয়েছে। আপনি কোন ফসলের বাজার দর জানতে চান?",
    weatherPrompt: "ভালো ফসলের জন্য আবহাওয়া অত্যন্ত গুরুত্বপূর্ণ। প্রতিটি ঋতুতে কোন ফসল সবচেয়ে ভালো জন্মায় তার একটি নির্দেশিকা এখানে দেওয়া হলো। আপনি কি জানতে চান আজকের আবহাওয়া চাষের জন্য উপযুক্ত কি না, নাকি আপনার মনে অন্য কোনো নির্দিষ্ট ফসল আছে? আমি আপনাকে সেরা আবহাওয়ার পরামর্শ দেব।",
    guidePrompt: "ভূমি ভয়েস আপনার ব্যক্তিগত চাষের সহকারী। আপনি মাইক বাটনে ক্লিক করে আমার সাথে কথা বলতে পারেন, অথবা আপনার প্রশ্ন টাইপ করতে পারেন। তাৎক্ষণিক রোগ নির্ণয়ের জন্য পেপারক্লিপ ব্যবহার করে অসুস্থ ফসলের ছবি আপলোড করুন। দ্রুত বাজার এবং আবহাওয়ার আপডেটের জন্য উপরের বোতামগুলি ব্যবহার করুন। আমি আমার সব উত্তর আপনাকে পড়ে শোনাব!",
    cropHeader: "ফসল",
    priceHeader: "দাম (টাকা/কুইন্টাল)",
    seasonHeader: "ঋতু",
    bestCrops: "সেরা ফসল",
    trendLabel: "বাজারের প্রবণতা",
    greeting: "হাই, আমি ভূমি। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?"
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
    error: "மன்னிக்கவும், நான் ஒரு பிழையைச் சந்தித்தேன். மீண்டும் முயற்சிக்கவும்.",
    analyzing: "பயிர் ஆரோக்கியத்தை சரிபார்க்கிறது...",
    diseaseLabel: "நோய் அடையாளம்",
    marketLabel: "சந்தை விலைகள்",
    weatherLabel: "வானிலை முன்னறிவிப்பு",
    guideLabel: "உதவி வழிகாட்டி",
    diseasePrompt: "எந்த தாவர அல்லது பயிர் நோய் பற்றி நீங்கள் தெரிந்து கொள்ள விரும்புகிறீர்கள்? உங்கள் பயிர் ஏதேனும் நோயால் பாதிக்கப்பட்டிருந்தால், தயவுசெய்து பேப்பர்க்ளிப் ஐகானைப் பயன்படுத்தி ஒரு புகைப்படத்தைப் பதிவேற்றவும் அல்லது சிக்கலை விவரிக்கவும், அதனால் நான் உங்களுக்கு உதவ முடியும். பூச்சிகள் மற்றும் கிருமிகளிடமிருந்து பயிரைப் பாதுகாக்கவும் நான் உங்களுக்கு உதவ முடியும்.",
    marketPrompt: "தற்போதைய மண்டி விலைகள் கீழே பட்டியலிடப்பட்டுள்ளன. எந்த பயிர் சந்தை விலையை நீங்கள் தெரிந்து கொள்ள விரும்புகிறீர்கள்?",
    weatherPrompt: "நல்ல அறுவடைக்கு வானிலை மிகவும் முக்கியமானது. ஒவ்வொரு பருவத்திலும் எந்த பயிர்கள் சிறப்பாக வளரும் என்பதற்கான வழிகாட்டி இங்கே உள்ளது. இன்றைய வானிலை நடவு செய்ய ஏற்றதா என்பதை அறிய விரும்புகிறீர்களா அல்லது உங்கள் மனதில் ஏதேனும் குறிப்பிட்ட பயிர் உள்ளதா? நான் சிறந்த வானிலையை பரிந்துரைப்பேன்.",
    guidePrompt: "பூமி வாய்ஸ் உங்கள் தனிப்பட்ட விவசாய உதவியாளர். மைக் பட்டனை கிளிக் செய்வதன் மூலம் நீங்கள் என்னுடன் பேசலாம் அல்லது உங்கள் கேள்விகளைத் தட்டச்சு செய்யலாம். பயிர் நோய்களைக் கண்டறிய புகைப்படங்களைப் பதிவேற்ற பேப்பர்க்ளிப்பைப் பயன்படுத்தவும். விரைவான சந்தை மற்றும் வானிலை அறிவிப்புகளுக்கு மேலே உள்ள பொத்தான்களைப் इस्तेमालவும். எனது பதில்கள் அனைத்தையும் நான் உங்களுக்குப் பேசிக் காட்டுவேன்!",
    cropHeader: "பயிர்",
    priceHeader: "விலை (₹/குவிண்டால்)",
    seasonHeader: "பருவம்",
    bestCrops: "சிறந்த பயிர்கள்",
    trendLabel: "சந்தை போக்கு",
    greeting: "வணக்கம், நான் பூமி. இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?"
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
    error: "क्षमस्व, मला एक त्रुटी आली. कृपया पुन्हा प्रयत्न करा.",
    analyzing: "पिकाच्या आरोग्याची तपासणी होत आहे...",
    diseaseLabel: "रोग ओळख",
    marketLabel: "बाजार भाव",
    weatherLabel: "हवामान अंदाज",
    guideLabel: "मदत मार्गदर्शक",
    diseasePrompt: "तुम्हाला कोणत्या झाडाच्या किंवा पिकाच्या रोगाबद्दल जाणून घ्यायचे आहे? जर तुमच्या पिकावर कोणताही रोग पडला असेल तर कृपया पेपरक्लिप आयकॉन वापरून फोटो अपलोड करा या समस्येचे वर्णन करा जेणेकरून मी तुम्हाला मदत करू शकेन. मी कीड आणि कीटकांपासून संरक्षण कसे करावे यातही मदत करू शकतो.",
    marketPrompt: "सध्याचे मंडी दर खाली सूचीबद्ध आहेत. तुम्हाला कोणत्या पिकाचा बाजार भाव जाणून घ्यायचे आहे?",
    weatherPrompt: "चांगल्या कापणीसाठी हवामान अत्यंत महत्त्वाचे आहे. प्रत्येक हंगामात कोणती पिके उत्तम येतात याची माहिती येथे आहे. तुम्हाला आजचे हवामान पेरणीसाठी योग्य आहे का हे जाणून घ्यायचे आहे का, की तुमच्या मनात एखादे विशिष्ट पीक आहे? मी तुम्हाला सर्वोत्तम हवामानाचा सल्ला देईन.",
    guidePrompt: "भूमी व्हॉइस आपला वैयक्तिक शेती सहाय्यक आहे. आपण माइक बटणावर क्लिक करून माझ्याशी बोलू शकता किंवा आपले प्रश्न टाइप करू शकता. पिकांच्या रोगाचे त्वरित निदान करण्यासाठी पेपरक्लिप वापरून फोटो अपलोड करा. बाजार और हवामानाच्या अपडेट्ससाठी वरील बटणे वापरा. मी माझी सर्व उत्तरे तुम्हाला बोलून दाखवेन!",
    cropHeader: "पीक",
    priceHeader: "दर (₹/क्विंटल)",
    seasonHeader: "हवामान",
    bestCrops: "सर्वोत्तम पिके",
    trendLabel: "बाजार कल",
    greeting: "नमस्कार, मी भूमी आहे. मी आज तुम्हाला कशी मदत करू शकतो?"
  }
};

const getLocalizedMarketData = (lang: string) => {
  const data: Record<string, any[]> = {
    en: [
      { name: 'Rice', price: 2180 }, { name: 'Wheat', price: 2275 },
      { name: 'Cotton', price: 6800 }, { name: 'Maize', price: 1950 },
      { name: 'Mustard', price: 5450 }
    ],
    hi: [
      { name: 'चावल', price: 2180 }, { name: 'गेहूं', price: 2275 },
      { name: 'कपास', price: 6800 }, { name: 'मक्का', price: 1950 },
      { name: 'सरसों', price: 5450 }
    ],
    bn: [
      { name: 'চাল', price: 2180 }, { name: 'গম', price: 2275 },
      { name: 'তুলা', price: 6800 }, { name: 'ভুট্টা', price: 1950 },
      { name: 'সরিষা', price: 5450 }
    ],
    ta: [
      { name: 'அரிசி', price: 2180 }, { name: 'கோதுமை', price: 2275 },
      { name: 'பருத்தி', price: 6800 }, { name: 'சோளம்', price: 1950 },
      { name: 'கடுகு', price: 5450 }
    ],
    mr: [
      { name: 'तांदूळ', price: 2180 }, { name: 'गहू', price: 2275 },
      { name: 'कापूस', price: 6800 }, { name: 'मका', price: 1950 },
      { name: 'मोहरी', price: 5450 }
    ]
  };
  return data[lang] || data.en;
};

const getLocalizedSeasonData = (lang: string) => {
  const data: Record<string, any[]> = {
    en: [
      { season: 'Kharif (Jun-Oct)', crops: 'Rice, Maize, Cotton' },
      { season: 'Rabi (Nov-Mar)', crops: 'Wheat, Mustard, Peas' },
      { season: 'Zaid (Mar-Jun)', crops: 'Watermelon, Moong' }
    ],
    hi: [
      { season: 'खरीफ (जून-अक्टूबर)', crops: 'चावल, मक्का, कपास' },
      { season: 'रबी (नवंबर-मार्च)', crops: 'गेहूं, सरसों, मटर' },
      { season: 'जायद (मार्च-जून)', crops: 'तरबूज, मूंग' }
    ],
    bn: [
      { season: 'খরিফ (জুন-অক্টোবর)', crops: 'চাল, ভুট্টা, তুলা' },
      { season: 'রবি (নভেম্বর-মার्च)', crops: 'গম, সরিষা, মটর' },
      { season: 'জায়েদ (মার্চ-জুন)', crops: 'তরমুজ, মুগ' }
    ],
    ta: [
      { season: 'காரிஃப் (ஜூன்-அக்டோபர்)', crops: 'அரிசி, சோளம், பருத்தி' },
      { season: 'ரபி (நவம்பர்-மார்ச்)', crops: 'கோதுமை, கடுகு, பட்டாணி' },
      { season: 'சையத் (மார்ச்-ஜூன்)', crops: 'தர்பூசணி, பாசிப்பயறு' }
    ],
    mr: [
      { season: 'खरीप (जून-ऑक्टोबर)', crops: 'तांदूळ, मका, कापूस' },
      { season: 'रब्बी (नोव्हेंबर-मार्च)', crops: 'गहू, मोहरी, मटार' },
      { season: 'जायद (मार्च-जून)', crops: 'कलिंगड, मूग' }
    ]
  };
  return data[lang] || data.en;
};

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

  const playAudio = useCallback((base64Audio: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(base64Audio);
    audioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  const triggerAudioOnly = useCallback(async (text: string) => {
    try {
      const result = await voiceAssistedFarmingConsultation({
        userInputText: text,
        selectedLanguage: language.id as any,
      });
      if (result.responseAudio) playAudio(result.responseAudio);
    } catch (e) {
      console.error("Audio trigger failed", e);
    }
  }, [language.id, playAudio]);

  const processResponse = useCallback(async (text: string, silentUserMsg: boolean = false, specialType?: 'market_data' | 'weather_data' | 'guide_data') => {
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
        chatHistory: messages.slice(-4).map(m => ({ 
          role: m.role === 'assistant' ? 'model' : 'user', 
          content: m.content 
        }))
      });

      addMessage({ 
        role: 'assistant', 
        content: result.responseText,
        type: specialType || 'text',
        suggestions: result.followUpQuestions
      });

      if (result.responseAudio) {
        playAudio(result.responseAudio);
      }
    } catch (error) {
      addMessage({ role: 'assistant', content: t.error });
    } finally {
      setIsProcessing(false);
    }
  }, [language.id, messages, t.error, isProcessing, playAudio]);

  const addMessage = useCallback((msg: Omit<Message, 'id'>) => {
    const newMsg = { ...msg, id: Math.random().toString(36).substr(2, 9) };
    setMessages(prev => [...prev, newMsg]);
    return newMsg.id;
  }, []);

  useEffect(() => {
    const initApp = async () => {
      // Hardcoded greeting as requested, skipping LLM connection for content
      const welcomeText = t.greeting;
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcomeText,
          suggestions: []
        }
      ]);
      
      // Still trigger TTS for the localized greeting so it's read out
      triggerAudioOnly(welcomeText);
    };

    initApp();

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
  }, [language.id, triggerAudioOnly, t.greeting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  const handleAction = async (action: string) => {
    if (isProcessing) return;

    if (action === t.diseaseLabel) {
      await processResponse(`Assistant here. ${t.diseasePrompt}`, true);
    } else if (action === t.marketLabel) {
      const marketData = getLocalizedMarketData(language.id);
      const dataSummary = marketData.map(d => `${d.name} is ₹${d.price}`).join(", ");
      await processResponse(`Mandi updates. ${dataSummary}. ${t.marketPrompt}`, true, 'market_data');
    } else if (action === t.weatherLabel) {
      const seasonData = getLocalizedSeasonData(language.id);
      const dataSummary = seasonData.map(d => `In ${d.season}, best crops are ${d.crops}`).join(". ");
      await processResponse(`Weather overview. ${dataSummary}. ${t.weatherPrompt}`, true, 'weather_data');
    } else if (action === t.guideLabel) {
      await processResponse(`Here is how to use Bhoomi. ${t.guidePrompt}`, true, 'guide_data');
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
        
        const audioRes = await voiceAssistedFarmingConsultation({
          userInputText: result.responseInSelectedLanguage + " Do you need help with treatments?",
          selectedLanguage: language.id as any
        });
        
        addMessage({ role: 'assistant', content: result.responseInSelectedLanguage });
        if (audioRes.responseAudio) playAudio(audioRes.responseAudio);
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

      return <p key={i} className="text-sm leading-relaxed my-2 text-foreground/90 break-words">{trimmedLine}</p>;
    });
  };

  const renderSpecialContent = (msg: Message) => {
    if (msg.type === 'market_data') {
      const marketData = getLocalizedMarketData(language.id);
      return (
        <div className="space-y-4 w-full overflow-hidden mb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-primary/10 overflow-hidden shadow-sm w-full">
            <Table className="w-full">
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-xs font-bold text-primary px-3">{t.cropHeader}</TableHead>
                  <TableHead className="text-xs font-bold text-primary text-right px-3">{t.priceHeader}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketData.map((crop) => (
                  <TableRow key={crop.name} className="hover:bg-transparent">
                    <TableCell className="text-xs py-2 px-3">{crop.name}</TableCell>
                    <TableCell className="text-xs py-2 px-3 text-right font-medium">₹{crop.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-primary/10 shadow-sm h-48 w-full overflow-hidden">
            <h4 className="text-[10px] font-bold text-primary/60 uppercase mb-2">{t.trendLabel}</h4>
            <div className="h-32 w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ReChartsBarChart data={marketData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis fontSize={9} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="price" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                </ReChartsBarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'weather_data') {
      const seasonData = getLocalizedSeasonData(language.id);
      return (
        <div className="space-y-4 w-full overflow-hidden mb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-primary/10 overflow-hidden shadow-sm w-full">
            <Table className="w-full">
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-[10px] font-bold text-primary px-2">{t.seasonHeader}</TableHead>
                  <TableHead className="text-[10px] font-bold text-primary px-2">{t.bestCrops}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonData.map((row) => (
                  <TableRow key={row.season} className="hover:bg-transparent">
                    <TableCell className="text-[10px] py-2 px-2 font-medium">{row.season}</TableCell>
                    <TableCell className="text-[10px] py-2 px-2 text-muted-foreground">{row.crops}</TableCell>
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
        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3 w-full backdrop-blur-sm mb-4">
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
    <div className="mobile-stage flex flex-col bg-white nature-bg relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-10 w-32 h-32 opacity-10 animate-float-nature text-blue-400">
          <CloudSun className="w-full h-full" />
        </div>
        <div className="absolute top-1/4 right-5 w-16 h-16 opacity-10 animate-sway text-primary">
          <Leaf className="w-full h-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-40 flex items-end justify-around px-8 opacity-20 z-0">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className="w-10 h-32 animate-sway-intense text-primary" 
              style={{ 
                animationDelay: `${i * 0.7}s`, 
                transformOrigin: 'bottom center',
                opacity: 0.15 + (i % 3) * 0.1
              }}
            >
              <Sprout className="w-full h-full stroke-[1.5]" />
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 flex items-center justify-between border-b bg-primary text-white z-20 shrink-0">
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

      <div className="p-4 grid grid-cols-4 gap-2 bg-white/40 backdrop-blur-sm shrink-0 z-20">
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

      <ScrollArea className="flex-1 p-4 bg-transparent w-full z-10 overflow-x-hidden">
        <div className="space-y-6 pb-6 w-full max-w-full overflow-x-hidden">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col w-full ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[90%] rounded-2xl p-4 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 break-words relative z-20 overflow-hidden ${
                  msg.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none ml-auto' 
                  : 'bg-white/95 backdrop-blur-md text-foreground rounded-tl-none border border-primary/10 mr-auto shadow-lg'
                } ${msg.type && msg.type !== 'text' ? 'w-full max-w-[95%]' : ''}`}
              >
                {msg.type === 'image' && msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Uploaded crop" className="w-full rounded-lg mb-3 shadow-sm object-cover" />
                )}
                
                {renderSpecialContent(msg)}

                <div className="whitespace-pre-line w-full text-sm leading-relaxed overflow-hidden">
                  {msg.role === 'assistant' ? formatMessageContent(msg.content) : msg.content}
                </div>
              </div>
              
              {msg.suggestions && msg.suggestions.length > 0 && !isProcessing && (
                <div className="mt-3 flex flex-wrap gap-2 justify-start max-w-[95%] relative z-20">
                  {msg.suggestions.map((suggestion, idx) => (
                    <Button 
                      key={idx} 
                      variant="outline" 
                      size="sm" 
                      className="text-[10px] h-7 rounded-full bg-white/90 backdrop-blur-sm border-primary/20 text-primary hover:bg-primary/10 hover:border-primary transition-all whitespace-normal text-left px-3 shadow-sm"
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
            <div className="flex justify-start relative z-20">
              <div className="bg-white/95 backdrop-blur-md border border-primary/10 rounded-2xl rounded-tl-none p-3 shadow-md flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-[10px] text-muted-foreground animate-pulse">Bhoomi is thinking...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>

      <div className="p-4 bg-white/70 backdrop-blur-md border-t space-y-3 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input 
              placeholder={t.placeholder} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processResponse(input)}
              className="pr-10 h-12 rounded-2xl bg-white/90 border-primary/10 focus-visible:ring-primary shadow-inner text-sm"
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