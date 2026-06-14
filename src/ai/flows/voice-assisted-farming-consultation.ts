'use server';
/**
 * @fileOverview This file implements a Genkit flow for a voice-assisted farming consultant.
 * It handles speech-to-text input, processes it with an LLM, and provides a text response
 * along with a Text-to-Speech audio output in the user's selected regional language.
 *
 * - voiceAssistedFarmingConsultation - The main function to interact with the consultation.
 * - VoiceAssistedFarmingConsultationInput - The input type for the consultation.
 * - VoiceAssistedFarmingConsultationOutput - The return type for the consultation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav'; // For converting PCM audio to WAV

// Define input schema for the flow and prompt
const VoiceAssistedFarmingConsultationInputSchema = z.object({
  userInputText: z.string().describe("The farmer's transcribed voice input."),
  selectedLanguage: z.enum(['en', 'hi', 'bn', 'ta', 'mr']).describe("The user's selected language code."),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe("Previous conversation history to maintain context."),
});
export type VoiceAssistedFarmingConsultationInput = z.infer<typeof VoiceAssistedFarmingConsultationInputSchema>;

// Define the output schema for the LLM prompt (only text and follow-ups)
const VoiceAssistedFarmingConsultationLLMOutputSchema = z.object({
  responseText: z.string().describe("The AI's text response to the farmer's query."),
  followUpQuestions: z.array(z.string()).optional().describe("Suggested follow-up questions for the farmer."),
});

// Define the final output schema for the flow (includes audio)
const VoiceAssistedFarmingConsultationOutputSchema = z.object({
  responseText: z.string().describe("The AI's text response to the farmer's query."),
  responseAudio: z.string().describe("The AI's audio response in WAV format, base64 encoded as a data URI."),
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
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
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
  prompt: `You are an expert natural farming consultant specializing in the Indian agricultural context. 
Your goal is to provide high-quality, comprehensive, and detailed advice to farmers transitioning to or practicing natural farming.

STRICT LANGUAGE RULE:
You must respond entirely and exclusively in the following language: {{selectedLanguage}} ({{#if (eq selectedLanguage "en")}}English{{/if}}{{#if (eq selectedLanguage "hi")}}Hindi{{/if}}{{#if (eq selectedLanguage "bn")}}Bengali{{/if}}{{#if (eq selectedLanguage "ta")}}Tamil{{/if}}{{#if (eq selectedLanguage "mr")}}Marathi{{/if}}).

FORMATTING RULES (CRITICAL):
1. DO NOT use any markdown markers like '*', '#', '_', or '\`'.
2. Use ALL-CAPS followed by a colon for subheadings (e.g., SOIL PREPARATION:).
3. Use the '•' character for bullet points.
4. Every bullet point MUST start on its own brand new line.
5. Do not indent sub-points; keep everything left-aligned.

CONTENT RULES:
1. Provide a DETAILED, INFORMATIVE, and COMPREHENSIVE response. Do not shorten or over-simplify the technical farming advice. 
2. Ensure the farmer gets all the necessary steps, biological reasoning, and practical tips.
3. If the query is about a specific crop, provide detailed information about soil, irrigation, seeds, and pest control.

Current conversation history:
{{#if chatHistory}}
  {{#each chatHistory}}
    {{this.role}}: {{this.content}}
  {{/each}}
{{/if}}

User's query: {{{userInputText}}}`,
});

// Define the Genkit flow
const voiceAssistedFarmingConsultationFlow = ai.defineFlow(
  {
    name: 'voiceAssistedFarmingConsultationFlow',
    inputSchema: VoiceAssistedFarmingConsultationInputSchema,
    outputSchema: VoiceAssistedFarmingConsultationOutputSchema,
  },
  async (input) => {
    // 1. Generate text response using the LLM
    const { output } = await farmingConsultantPrompt(input);
    if (!output?.responseText) {
      throw new Error('Failed to get a text response from the farming consultant.');
    }

    const voiceName = languageToVoiceName[input.selectedLanguage] || 'Algenib';

    // 2. Convert the text response to audio using TTS
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

    if (!media) {
      throw new Error('No audio media returned from TTS.');
    }

    // Extract base64 encoded PCM data
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    // Convert PCM to WAV
    const wavBase64 = await toWav(audioBuffer);

    // Return both text and audio
    return {
      responseText: output.responseText,
      responseAudio: 'data:audio/wav;base64,' + wavBase64,
      followUpQuestions: output.followUpQuestions,
    };
  }
);

/**
 * Initiates a voice-assisted farming consultation.
 *
 * @param input - The input containing the farmer's transcribed query, selected language, and optional chat history.
 * @returns A promise that resolves to the AI's text and audio response, along with suggested follow-up questions.
 */
export async function voiceAssistedFarmingConsultation(
  input: VoiceAssistedFarmingConsultationInput
): Promise<VoiceAssistedFarmingConsultationOutput> {
  return voiceAssistedFarmingConsultationFlow(input);
}
