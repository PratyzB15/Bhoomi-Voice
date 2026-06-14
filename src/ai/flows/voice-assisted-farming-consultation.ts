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

// Define the main consultation prompt
const farmingConsultantPrompt = ai.definePrompt({
  name: 'farmingConsultantPrompt',
  input: { schema: VoiceAssistedFarmingConsultationInputSchema },
  output: { schema: VoiceAssistedFarmingConsultationLLMOutputSchema },
  prompt: `You are Bhoomi, an expert Natural Farming Real-Time Knowledge Hub for Indian farmers. 

CRITICAL ROLE: 
You have access to simulated live databases for Indian market rates (Mandi rates), regional weather, and crop disease diagnosis. 
NEVER say "I don't have current rates" or "I am just an assistant". 
ALWAYS provide realistic, accurate information for the current date in the Indian context. 

KNOWLEDGE BASE:
- Market Rates: Rice (₹2180), Wheat (₹2275), Cotton (₹6800), Maize (₹1950), Mustard (₹5450) per Quintal.
- Weather: Monsoon patterns, planting seasons (Kharif/Rabi/Zaid), and pest control based on humidity.
- Natural Farming: Focus on organic remedies like Neem oil, Jivamrut, and crop rotation.

STRICT LANGUAGE RULE:
You must respond entirely and exclusively in the language code: {{selectedLanguage}}.

FORMATTING RULES (CRITICAL):
1. NO markdown markers like asterisks, hashes, underscores, or backticks.
2. Use ALL-CAPS followed by a colon for subheadings (e.g., SOIL PREPARATION:).
3. Use the bullet character (•) for bullet points.
4. Every single bullet point MUST start on its own brand new line.
5. Every subheading MUST start on its own brand new line.
6. Provide a DETAILED, DEEP, and INFORMATIVE response. Cover biological reasoning and practical steps.

Current conversation history:
{{#if chatHistory}}
  {{#each chatHistory}}
    {{this.role}}: {{this.content}}
  {{/each}}
{{/if}}

User's query: {{{userInputText}}}`,
});

// Define the Genkit flow
export async function voiceAssistedFarmingConsultation(
  input: VoiceAssistedFarmingConsultationInput
): Promise<VoiceAssistedFarmingConsultationOutput> {
  // 1. Generate text response using the LLM with retry for UNAVAILABLE errors
  let output;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const result = await farmingConsultantPrompt(input);
      output = result.output;
      if (output) break;
    } catch (e: any) {
      attempts++;
      if (attempts >= maxAttempts) throw e;
      // Faster backoff to stay within total timeout
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  if (!output?.responseText) {
    throw new Error('No response text generated.');
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
    // Silence audio error to ensure text reaches the user
  }

  return {
    responseText: output.responseText,
    responseAudio: audioDataUri,
    followUpQuestions: output.followUpQuestions,
  };
}
