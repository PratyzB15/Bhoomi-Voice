"use client";

import React, { useState, useEffect } from 'react';
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

export function LandingClient() {
  const [selectedLang, setSelectedLang] = useState<typeof LANGUAGES[0] | null>(null);
  const [isStarted, setIsStarted] = useState(false);

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
          <CardTitle className="text-4xl font-headline text-primary mb-2">Bhoomi Voice</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your Natural Farming Companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 text-primary/80">
              <Globe className="w-4 h-4" />
              Choose your language
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
            Start Journey
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
      
      <p className="text-center mt-6 text-sm text-primary/40 font-medium">
        Empowering farmers through AI & Empathy
      </p>
    </div>
  );
}