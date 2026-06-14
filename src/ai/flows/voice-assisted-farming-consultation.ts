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
  selectedLanguage: z.enum(['en', 'hi', 'bn', 'ta', 'mr']).describe("The user's selected language ('en' for English, 'hi' for Hindi, 'bn' for Bengali, 'ta' for Tamil, 'mr' for Marathi)."),
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
const languageToVoiceName: Record<VoiceAssistedFarmingConsultationInput['selectedLanguage'], string> = {
  'en': 'Algenib',    // English
  'hi': 'Achernar',   // Hindi
  'bn': 'Aoede',      // Bengali
  'ta': 'Charon',     // Tamil
  'mr': 'Zephyr',     // Marathi
};

// Define the main consultation prompt
const farmingConsultantPrompt = ai.definePrompt({
  name: 'farmingConsultantPrompt',
  input: { schema: VoiceAssistedFarmingConsultationInputSchema },
  output: { schema: VoiceAssistedFarmingConsultationLLMOutputSchema },
  prompt: `You are an expert natural farming consultant for Indian farmers. 
Strictly respond in the language: {{selectedLanguage}}.

FORMATTING RULES:
1. DO NOT use any markdown markers like '*', '#', or '_'.
2. For subheadings, use UPPERCASE text followed by a colon (e.g., SOIL PREPARATION:).
3. For bullet points, start the line with the '•' character.
4. Keep the response EXTREMELY CONCISE (maximum 100 words) to ensure fast delivery. 
5. Focus only on the most critical information requested.

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

    const voiceName = languageToVoiceName[input.selectedLanguage];

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