"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Leaf, ArrowRight } from 'lucide-react';
import { BhoomiApp } from '@/components/BhoomiApp';
import { PlantBackground } from '@/components/PlantBackground';

const LANGUAGES = [
  { id: 'en', label: 'English', native: 'English', flowCode: 'english' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी', flowCode: 'hindi' },
  { id: 'bn', label: 'Bengali', native: 'বাংলা', flowCode: 'bengali' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்', flowCode: 'tamil' },
  { id: 'mr', label: 'Marathi', native: 'मराठी', flowCode: 'marathi' }
];

const TRANSLATIONS: Record<string, any> = {
  en: { title: "Bhoomi Voice", subtitle: "Your Natural Farming Companion", choose: "Choose your language", start: "Start Journey", footer: "Empowering farmers through AI & Empathy" },
  hi: { title: "भूमि वॉइस", subtitle: "आपका प्राकृतिक खेती साथी", choose: "अपनी भाषा चुनें", start: "यात्रा शुरू करें", footer: "एआई और सहानुभूति के माध्यम से किसानों को सशक्त बनाना" },
  bn: { title: "ভূমি ভয়েস", subtitle: "আপনার প্রাকৃতিক চাষের সঙ্গী", choose: "আপনার ভাষা চয়ন করুন", start: "যাত্রা শুরু করুন", footer: "AI এবং সহানুভূতির মাধ্যমে কৃষকদের ক্ষমতায়ন" },
  ta: { title: "பூமி வாய்ஸ்", subtitle: "உங்கள் இயற்கை விவசாயத் தோழன்", choose: "உங்கள் மொழியைத் தேர்வுசெய்க", start: "பயணத்தைத் தொடங்குங்கள்", footer: "AI மற்றும் பச்சாதாபம் மூலம் விவசாயிகளுக்கு அதிகாரம் அளித்தல்" },
  mr: { title: "भूमी व्हॉइस", subtitle: "तुमचा नैसर्गिक शेती सोबती", choose: "आपली भाषा निवडा", start: "प्रवास सुरू करा", footer: "AI आणि सहानुभूतीद्वारे शेतकऱ्यांना सक्षम करणे" }
};

export function LandingClient() {
  const [selectedLang, setSelectedLang] = useState<typeof LANGUAGES[0] | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  const t = selectedLang ? TRANSLATIONS[selectedLang.id] : TRANSLATIONS.en;

  if (isStarted && selectedLang) {
    return <BhoomiApp language={selectedLang} />;
  }

  return (
    <div className="w-full max-w-lg relative">
      <PlantBackground />
      <Card className="glass-morphism border-none z-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Leaf className="w-20 h-20 text-primary" />
        </div>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full animate-float">
              <Leaf className="w-12 h-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-4xl font-headline text-primary mb-2">{t.title}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {t.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 text-primary/80">
              <Globe className="w-4 h-4" />
              {t.choose}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang.id}
                  variant={selectedLang?.id === lang.id ? "default" : "outline"}
                  className={`h-16 flex flex-col items-center justify-center rounded-2xl transition-all duration-300 ${
                    selectedLang?.id === lang.id 
                    ? "bg-primary border-primary shadow-lg scale-105" 
                    : "hover:border-primary/50 hover:bg-primary/5"
                  }`}
                  onClick={() => setSelectedLang(lang)}
                >
                  <span className="text-lg font-bold">{lang.native}</span>
                  <span className="text-xs opacity-70">{lang.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full h-14 rounded-2xl text-lg group transition-all"
            disabled={!selectedLang}
            onClick={() => setIsStarted(true)}
          >
            {t.start}
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
      
      <p className="text-center mt-6 text-sm text-primary/40 font-medium">
        {t.footer}
      </p>
    </div>
  );
}
