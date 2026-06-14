'use server';
/**
 * @fileOverview This file implements a Genkit flow for a voice-assisted farming consultant.
 * It handles speech-to-text input, processes it with an LLM, and provides a text response
 * along with a Text-to-Speech audio output in the user's selected regional language.
 *
 * - voiceAssistedFarmingConsultation - The main function to interact with the farming consultant.
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
  responseText: z.string().describe("The AI's text response to the farmer's query, formatted with bullet points for readability."),
  followUpQuestions: z.array(z.string()).optional().describe("Suggested follow-up questions for the farmer related to their query."),
});
type VoiceAssistedFarmingConsultationLLMOutput = z.infer<typeof VoiceAssistedFarmingConsultationLLMOutputSchema>;

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

// Map languages to specific prebuilt voices (best effort, actual availability may vary)
const languageToVoiceName: Record<VoiceAssistedFarmingConsultationInput['selectedLanguage'], string> = {
  'en': 'Algenib', // English
  'hi': 'Achernar', // Hindi
  'bn': 'Deneb',   // Bengali
  'ta': 'Fomalhaut', // Tamil
  'mr': 'Sirius',   // Marathi
};

// Define the main consultation prompt
const farmingConsultantPrompt = ai.definePrompt({
  name: 'farmingConsultantPrompt',
  input: { schema: VoiceAssistedFarmingConsultationInputSchema },
  output: { schema: VoiceAssistedFarmingConsultationLLMOutputSchema },
  // Tools could be added here later for RAG or external data lookups.
  prompt: `You are an expert natural farming consultant for Indian farmers. Your goal is to provide accurate, practical, and empathetic advice on natural farming.\nAlways respond strictly in the language specified by '{{selectedLanguage}}'.\n\nIf the 'chatHistory' is empty, your first response should be a friendly greeting asking how you can help, such as "Hi, what can I help you with?". Subsequently, if 'chatHistory' is not empty, assume the user is asking a direct question.\n\nBased on the farmer's input, provide detailed, actionable advice.\nOrganize different pieces of information (e.g., month, irrigation, seeds, rates) using bullet points for clarity and easy readability.\n\nAfter providing the main answer, proactively suggest one or two relevant follow-up questions that the farmer might find useful. These follow-up questions should be outputted as a JSON array of strings in the 'followUpQuestions' field.\n\nOutput your response in JSON format, strictly adhering to the following schema:\n{{ai.outputSchema.json}}\n\nCurrent conversation history:\n{{#if chatHistory}}\n  {{#each chatHistory}}\n    {{this.role}}: {{this.content}}\n  {{/each}}\n{{/if}}\n\nUser's query: {{{userInputText}}}`,
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
