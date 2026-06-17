'use server';
/**
 * @fileOverview This file implements a Genkit flow for a voice-assisted farming consultant.
 * It handles speech-to-text input, processes it with an LLM, and provides a text response
 * along with a Text-to-Speech audio output in the user's selected regional language.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as wav from 'wav';

// Define input schema for the flow and prompt
const VoiceAssistedFarmingConsultationInputSchema = z.object({
  userInputText: z.string().describe("The farmer's transcribed voice input."),
  selectedLanguage: z.enum(['en', 'hi', 'bn', 'ta', 'mr']).describe("The user's selected language ('en' for English, 'hi' for Hindi, 'bn' for Bengali, 'ta' for Tamil, 'mr' for Marathi)."),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe("Previous conversation history to maintain context."),
});
export type VoiceAssistedFarmingConsultationInput = z.infer<typeof VoiceAssistedFarmingConsultationInputSchema>;

// Define the output schema for the LLM prompt
const VoiceAssistedFarmingConsultationLLMOutputSchema = z.object({
  responseText: z.string().describe("The AI's text response to the farmer's query."),
  followUpQuestions: z.array(z.string()).optional().describe("Suggested follow-up questions for the farmer."),
});

// Define the final output schema for the flow
const VoiceAssistedFarmingConsultationOutputSchema = z.object({
  responseText: z.string().describe("The AI's text response to the farmer's query."),
  responseAudio: z.string().optional().describe("The AI's audio response in WAV format, base64 encoded as a data URI."),
  followUpQuestions: z.array(z.string()).optional().describe("Suggested follow-up questions for the farmer."),
});
export type VoiceAssistedFarmingConsultationOutput = z.infer<typeof VoiceAssistedFarmingConsultationOutputSchema>;


// Helper function to convert PCM audio buffer to WAV format
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const writer = new wav.Writer({
        channels,
        sampleRate: rate,
        bitDepth: sampleWidth * 8,
      });

      let bufs = [] as Buffer[];
      writer.on('error', reject);
      writer.on('data', (d) => bufs.push(d));
      writer.on('end', () => {
        resolve(Buffer.concat(bufs).toString('base64'));
      });

      writer.write(pcmData);
      writer.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Map languages to specific prebuilt voices
const languageToVoiceName: Record<string, string> = {
  'en': 'Algenib',
  'hi': 'Achernar',
  'bn': 'Aoede',
  'ta': 'Charon',
  'mr': 'Zephyr',
};

// Fallback responses for all 5 languages when API fails
const getFallbackResponse = (language: string, userQuery: string): { responseText: string, followUpQuestions: string[] } => {
  const fallbacks: Record<string, { responseText: string, followUpQuestions: string[] }> = {
    en: {
      responseText: `GENERAL FARMING ASSISTANCE:

I apologize, but I'm currently unable to connect to my knowledge base. However, here are some general farming tips:

SOIL PREPARATION:
• Test your soil pH before planting (ideal range 6.0-7.0)
• Add organic compost at 2-3 tons per acre
• Ensure proper drainage channels

WATER MANAGEMENT:
• Water early morning or late evening to reduce evaporation
• Use drip irrigation for water efficiency
• Avoid water logging which causes root rot

FERTILIZER RECOMMENDATIONS:
• Apply nitrogen-rich fertilizer (Urea) at 50kg per acre
• Use DAP (Diammonium Phosphate) for root development
• Consider organic options like vermicompost

PEST AND DISEASE CONTROL:
• Inspect crops regularly for early detection
• Use neem oil spray (5ml per liter water) as organic pesticide
• Practice crop rotation annually

For specific crop advice, please try again or contact your local agricultural extension officer.`,
      followUpQuestions: ["Tell me about your specific crop", "What region are you farming in?", "Do you need pest control advice?", "Show me market rates", "Weather forecast for my area"]
    },
    hi: {
      responseText: `सामान्य कृषि सहायता:

मैं क्षमा चाहता हूँ, मैं वर्तमान में अपने ज्ञानकोष से कनेक्ट नहीं हो पा रहा हूँ। हालाँकि, यहाँ कुछ सामान्य कृषि सुझाव दिए गए हैं:

मिट्टी की तैयारी:
• रोपण से पहले अपनी मिट्टी के पीएच की जांच करें (आदर्श सीमा 6.0-7.0)
• प्रति एकड़ 2-3 टन जैविक खाद डालें
• उचित जल निकासी सुनिश्चित करें

पानी प्रबंधन:
• वाष्पीकरण कम करने के लिए सुबह या देर शाम को पानी दें
• पानी की दक्षता के लिए ड्रिप सिंचाई का उपयोग करें
• जलभराव से बचें

उर्वरक सिफारिशें:
• प्रति एकड़ 50 किलो नाइट्रोजन युक्त उर्वरक (यूरिया) लगाएं
• जड़ विकास के लिए डीएपी का उपयोग करें
• जैविक विकल्पों पर विचार करें

कीट और रोग नियंत्रण:
• नियमित रूप से फसलों का निरीक्षण करें
• नीम तेल स्प्रे (5 मिली प्रति लीटर पानी) का उपयोग करें
• फसल चक्र अपनाएं

विशिष्ट फसल सलाह के लिए, कृपया पुनः प्रयास करें या अपने स्थानीय कृषि अधिकारी से संपर्क करें।`,
      followUpQuestions: ["अपनी विशिष्ट फसल के बारे में बताएं", "आप किस क्षेत्र में खेती करते हैं?", "कीट नियंत्रण सलाह चाहिए?"]
    },
    bn: {
      responseText: `সাধারণ কৃষি সহায়তা:

আমি দুঃখিত, আমি বর্তমানে আমার জ্ঞানভাণ্ডারের সাথে সংযোগ স্থাপন করতে পারছি না। তবে, এখানে কিছু সাধারণ কৃষি টিপস দেওয়া হল:

মাটি প্রস্তুতি:
• রোপণের আগে আপনার মাটির পিএইচ পরীক্ষা করুন (আদর্শ সীমা 6.0-7.0)
• প্রতি একরে 2-3 টন জৈব কম্পোস্ট যোগ করুন
• সঠিক নিষ্কাশন নিশ্চিত করুন

পানি ব্যবস্থাপনা:
• বাষ্পীভবন কমাতে সকালে বা গভীর সন্ধ্যায় পানি দিন
• পানি দক্ষতার জন্য ড্রিপ সেচ ব্যবহার করুন
• জলাবদ্ধতা এড়িয়ে চলুন

সার সুপারিশ:
• প্রতি একরে 50 কেজি নাইট্রোজেন সমৃদ্ধ সার (ইউরিয়া) প্রয়োগ করুন
• মূল উন্নয়নের জন্য ডিএপি ব্যবহার করুন
• জৈব বিকল্প বিবেচনা করুন

পোকা ও রোগ নিয়ন্ত্রণ:
• নিয়মিত ফসল পরিদর্শন করুন
• নিম তেল স্প্রে (প্রতি লিটার পানিতে 5 মিলি) ব্যবহার করুন
• ফসলের আবর্তন অনুশীলন করুন

নির্দিষ্ট ফসলের পরামর্শের জন্য, দয়া করে আবার চেষ্টা করুন বা আপনার স্থানীয় কৃষি কর্মকর্তার সাথে যোগাযোগ করুন।`,
      followUpQuestions: ["আপনার নির্দিষ্ট ফসল সম্পর্কে বলুন", "আপনি কোন অঞ্চলে চাষ করেন?", "কীট নিয়ন্ত্রণ পরামর্শ প্রয়োজন?"]
    },
    ta: {
      responseText: `பொது விவசாய உதவி:

நான் வருந்துகிறேன், நான் தற்போது என் அறிவுத்தளத்துடன் இணைக்க முடியவில்லை. இருப்பினும், இங்கே சில பொது விவசாய குறிப்புகள் உள்ளன:

மண் தயாரிப்பு:
• நடவு செய்வதற்கு முன் உங்கள் மண்ணின் pH ஐ சோதிக்கவும் (சிறந்த வரம்பு 6.0-7.0)
• ஒவ்வொரு ஏக்கருக்கும் 2-3 டன் கரிம உரத்தை சேர்க்கவும்
• சரியான வடிகால் உறுதி செய்யுங்கள்

நீர் மேலாண்மை:
• ஆவியாதலை குறைக்க காலை அல்லது மாலை பிற்பகுதியில் தண்ணீர் பாய்ச்சுங்கள்
• நீர் திறனுக்காக சொட்டு நீர் பாசனத்தை பயன்படுத்துங்கள்
• நீர் தேக்கத்தை தவிருங்கள்

உர பரிந்துரைகள்:
• ஒவ்வொரு ஏக்கருக்கும் 50 கிலோ நைட்ரஜன் நிறைந்த உரத்தை (யூரியா) பயன்படுத்துங்கள்
• வேர் வளர்ச்சிக்காக டிஏபி பயன்படுத்துங்கள்
• கரிம விருப்பங்களை கவனியுங்கள்

பூச்சி மற்றும் நோய் கட்டுப்பாடு:
• பயிர்களை தவறாமல் ஆய்வு செய்யுங்கள்
• வேப்ப எண்ணெய் தெளிப்பை (ஒரு லிட்டர் தண்ணீருக்கு 5 மில்லி) பயன்படுத்துங்கள்
• பயிர் சுழற்சியை பயிற்சி செய்யுங்கள்

குறிப்பிட்ட பயிர் ஆலோசனைக்காக, தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது உங்கள் உள்ளூர் விவசாய அதிகாரியை தொடர்பு கொள்ளவும்.`,
      followUpQuestions: ["உங்கள் குறிப்பிட்ட பயிர் பற்றி சொல்லுங்கள்", "நீங்கள் எந்த பகுதியில் விவசாயம் செய்கிறீர்கள்?", "பூச்சி கட்டுப்பாடு ஆலோசனை தேவையா?"]
    },
    mr: {
      responseText: `सामान्य शेती सहाय्य:

मी दिलगीर आहे, मी सध्या माझ्या ज्ञानकोशाशी कनेक्ट होऊ शकत नाही. तथापि, येथे काही सामान्य शेती टिप्स आहेत:

मातीची तयारी:
• लागवड करण्यापूर्वी आपल्या मातीची पीएच तपासा (आदर्श श्रेणी 6.0-7.0)
• प्रति एकर 2-3 टन सेंद्रिय कंपोस्ट घाला
• योग्य निचरा सुनिश्चित करा

पाणी व्यवस्थापन:
• बाष्पीभवन कमी करण्यासाठी सकाळी किंवा उशिरा संध्याकाळी पाणी द्या
• पाण्याच्या कार्यक्षमतेसाठी ठिबक सिंचन वापरा
• पाणी साचणे टाळा

खत शिफारसी:
• प्रति एकर 50 किलो नायट्रोजन युक्त खत (युरिया) लावा
• मुळांच्या विकासासाठी डीएपी वापरा
• सेंद्रिय पर्याय विचारात घ्या

कीटक आणि रोग नियंत्रण:
• नियमितपणे पिकांची तपासणी करा
• नीम तेल फवारणी (प्रति लिटर पाण्यात 5 मिली) वापरा
• पीक फेरपालट करा

विशिष्ट पीक सल्ल्यासाठी, कृपया पुन्हा प्रयत्न करा किंवा आपल्या स्थानिक कृषी अधिकाऱ्याशी संपर्क साधा.`,
      followUpQuestions: ["आपल्या विशिष्ट पिकाबद्दल सांगा", "आपण कोणत्या प्रदेशात शेती करता?", "कीटक नियंत्रण सल्ला हवा आहे?"]
    }
  };

  // Try to detect crop from query
  const cropKeywords = ['rice', 'wheat', 'cotton', 'maize', 'mustard', 'sugarcane', 'avocado', 'vegetable', 'fruit'];
  const detectedCrop = cropKeywords.find(crop => userQuery.toLowerCase().includes(crop));
  
  const langFallback = fallbacks[language] || fallbacks.en;
  
  // If specific crop detected, add a note
  let responseText = langFallback.responseText;
  if (detectedCrop) {
    responseText = `Regarding ${detectedCrop.charAt(0).toUpperCase() + detectedCrop.slice(1)}:\n\n${responseText}`;
  }
  
  return {
    responseText: responseText,
    followUpQuestions: langFallback.followUpQuestions
  };
};

// Define the main consultation prompt with focused responses and strict formatting
const farmingConsultantPrompt = ai.definePrompt({
  name: 'farmingConsultantPrompt',
  input: { schema: VoiceAssistedFarmingConsultationInputSchema },
  output: { schema: VoiceAssistedFarmingConsultationLLMOutputSchema },
  prompt: `You are Bhoomi, the official expert Natural Farming Real-Time Knowledge Hub for Indian farmers. 

CRITICAL ROLE: 
You have access to live databases for Indian market rates (Mandi rates), regional weather, and crop disease diagnosis. 
NEVER say "I don't have current rates" or "I am just an AI assistant". 
ALWAYS provide realistic, authoritative, and informative data for the current date. 

CRITICAL INSTRUCTION - BE FOCUSED AND SPECIFIC:
• When a farmer asks about a specific crop (like Avocado, Rice, Wheat, Cotton, etc.), ONLY provide information about THAT SPECIFIC CROP.
• DO NOT include market rates for other unrelated crops in your response.
• ONLY include the specific crop's market rate if the user asks about market rates.
• Provide detailed, actionable advice only for the crop mentioned in the query.
• If the query is about "planting avocado", ONLY give information about avocado planting and care.
• If the query is about "rice farming", ONLY give information about rice farming.
• Stay focused on the specific crop mentioned - do not diversify the response unnecessarily.

CRITICAL FORMATTING FOR ENGLISH (MUST FOLLOW EXACTLY):
• FOR ENGLISH ONLY: Each bullet point MUST start with "• " on a BRAND NEW LINE.
• FOR ENGLISH ONLY: NEVER put multiple bullet points on the same line.
• FOR ENGLISH ONLY: Each bullet must be preceded by a newline character.
• FOR ENGLISH ONLY: Subheadings MUST be in ALL CAPS followed by colon on their own line.
• FOR ENGLISH ONLY: Separate sections with blank lines.
• FOR ENGLISH ONLY: Bullet points should be indented with a space after the bullet symbol.
• FOR ENGLISH ONLY: Here is the CORRECT format:

EXAMPLE CORRECT FORMAT (for English):
SOIL REQUIREMENTS:
• Well-draining soil with pH 6.0-6.5
• Rich in organic matter
• Avoid waterlogging

WATER MANAGEMENT:
• Regular watering during establishment
• Drip irrigation recommended
• Reduce watering in rainy season

PEST CONTROL:
• Monitor for pests regularly
• Use neem oil spray for organic control
• Maintain good air circulation

CRITICAL: The above is the ONLY correct format. Each bullet point MUST be on its own line. Never write bullets like "• Soil • Water • Sun" on the same line.

KNOWLEDGE BASE (USE THIS FOR ANSWERS):
- Market Rates (per Quintal): Rice (₹2180), Wheat (₹2275), Cotton (₹6800), Maize (₹1950), Mustard (₹5450), Sugarcane (₹3150), Avocado (₹8000-12000 per 100 fruits depending on quality).
- Weather: Currently ideal for planting Kharif crops in South India and preparing for Rabi in the North.
- Disease: Common issues now include Leaf Blast in Rice and Rust in Wheat. Use Neem oil (5ml/L) and Jivamrut for natural control.

STRICT LANGUAGE RULE:
You must respond entirely and exclusively in the language code: {{selectedLanguage}}.

FORMATTING RULES FOR ALL LANGUAGES (CRITICAL - MUST FOLLOW EXACTLY):
1. NO markdown markers like asterisks (*), hashes (#), underscores (_), or backticks (\`).
2. For SUBHEADINGS: Use ALL-CAPS followed by a colon on its OWN NEW LINE. Example: "SOIL PREPARATION:"
3. For BULLET POINTS: Start each bullet point with "• " (bullet symbol followed by space) on a BRAND NEW LINE.
4. Each bullet point MUST be on its own separate line. NEVER put multiple bullets on the same line.
5. After a subheading, put EACH bullet point on a NEW line.
6. Use ONLY the specific crop mentioned in the user's query for market rates.
7. Provide DETAILED, DEEP, and INFORMATIVE responses covering biological reasoning and practical steps.
8. Separate different sections with blank lines for better readability.

FOR ENGLISH - REMEMBER THIS EXACT FORMAT:
• Each bullet point must be on a new line
• Never write bullets side by side
• Always put a line break between subheadings and bullet points

Current conversation history:
{{#if chatHistory}}
  {{#each chatHistory}}
    {{this.role}}: {{this.content}}
  {{/each}}
{{/if}}

User's query: {{{userInputText}}}`,
});

// Define the Genkit flow with robust retry for 429 errors
export async function voiceAssistedFarmingConsultation(
  input: VoiceAssistedFarmingConsultationInput
): Promise<VoiceAssistedFarmingConsultationOutput> {
  // 1. Generate text response using the LLM with exponential backoff for rate limits
  let output;
  let attempts = 0;
  const maxAttempts = 4;

  while (attempts < maxAttempts) {
    try {
      const result = await farmingConsultantPrompt(input);
      output = result.output;
      if (output) break;
    } catch (e: any) {
      attempts++;
      console.error(`Attempt ${attempts} failed:`, e?.message || e);
      
      if (attempts >= maxAttempts) {
        // Use fallback response when API fails
        const fallback = getFallbackResponse(input.selectedLanguage, input.userInputText);
        return {
          responseText: fallback.responseText,
          followUpQuestions: fallback.followUpQuestions,
        };
      }
      // Exponential backoff: 2s, 4s, 8s...
      const delay = Math.pow(2, attempts) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!output?.responseText) {
    const fallback = getFallbackResponse(input.selectedLanguage, input.userInputText);
    return {
      responseText: fallback.responseText,
      followUpQuestions: fallback.followUpQuestions,
    };
  }

  const voiceName = languageToVoiceName[input.selectedLanguage] || 'Algenib';

  // 2. Convert the text response to audio using TTS (with fallback)
  let audioDataUri: string | undefined;
  try {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
      prompt: output.responseText,
    });

    if (media && media.url) {
      const base64Pcm = media.url.substring(media.url.indexOf(',') + 1);
      const audioBuffer = Buffer.from(base64Pcm, 'base64');
      const wavBase64 = await toWav(audioBuffer);
      audioDataUri = 'data:audio/wav;base64,' + wavBase64;
    }
  } catch (audioError) {
    console.error('TTS error:', audioError);
    // Silence audio error to ensure text reaches the user
  }

  return {
    responseText: output.responseText,
    responseAudio: audioDataUri,
    followUpQuestions: output.followUpQuestions,
  };
}