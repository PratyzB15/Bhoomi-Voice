Bhoomi Voice - Natural Farming Consultant
Tech Stack
• Frontend: Next.js 15.5 with React 18, TypeScript, and Tailwind CSS with shadcn/ui components
• AI Framework: Genkit with Google Gemini 2.5 Flash for text generation and image analysis
• Voice: Web Speech API for STT/TTS supporting 5 Indian languages (en-IN, hi-IN, bn-IN, ta-IN, mr-IN)
• Charts & Data: Recharts for market visualization with dynamic pricing based on current date
• Audio Processing: wav library for converting PCM audio to WAV format for playback

Prompt Design
• Focused Responses: Strict instructions to provide information ONLY about the specific crop mentioned in the query
• Structured Formatting: ALL CAPS subheadings on new lines with "•" bullet points, each on separate lines
• Knowledge Base: Pre-fed market rates, seasonal guidance, disease remedies (Neem oil, Jivamrut) for Indian farming
• Language Enforcement: Forces AI to respond exclusively in the user's selected language (en/hi/bn/ta/mr)
• Fallback System: Comprehensive fallback responses in all 5 languages when API fails or quota exhausted

 Localization
• 5 Indian Languages: Full support for English, Hindi, Bengali, Tamil, and Marathi across all UI elements
• Voice Localization: Speech recognition configured with regional codes (en-IN, hi-IN, bn-IN, ta-IN, mr-IN)
• Localized Content: Market data, crop names, seasons, and error messages translated to each language
• Dynamic UI: All buttons, labels, prompts, and responses switch instantly based on language selection
• Regional Accents: TTS voices automatically selected to match the target language with Indian pronunciation

How to Use Bhoomi Voice
Bhoomi Voice is a voice-first farming assistant designed for Indian farmers. Here's how to get started:

Getting Started
Select Your Language: Choose from English, Hindi, Bengali, Tamil, or Marathi from the top of the app
Start Chatting: Either type your question or click the Mic button to speak in your preferred language
Get Voice Responses: Bhoomi will respond with both text AND voice in your selected language

Key Features
Ask About Crops: "How to plant avocado?" or "Tell me about rice farming"
Get Market Rates: Click the Market button for current mandi rates with price trends
Check Weather: Click the Weather button for seasonal crop recommendations
Upload Photos: Use the Paperclip icon to upload crop photos for disease diagnosis
Follow-up Questions: Click on suggestion bubbles below responses to continue the conversation
