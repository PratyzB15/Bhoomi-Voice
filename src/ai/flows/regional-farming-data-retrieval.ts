'use server';
/**
 * @fileOverview A Genkit flow for retrieving region-specific farming data, 
 * including optimal planting seasons, current market prices, irrigation schedules, 
 * and government subsidies for Indian farmers.
 *
 * - regionalFarmingDataRetrieval - A function that handles the data retrieval and response generation.
 * - RegionalFarmingDataRetrievalInput - The input type for the regionalFarmingDataRetrieval function.
 * - RegionalFarmingDataRetrievalOutput - The return type for the regionalFarmingDataRetrieval function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

// Helper to convert PCM audio buffer to WAV format
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

const RegionalFarmingDataRetrievalInputSchema = z.object({
  query: z.string().describe('The farmer\u0027s query regarding farming data.'),
  language: z.string().describe('The preferred language for the response (e.g., "English", "Hindi", "Bengali", "Tamil", "Marathi").'),
  region: z.string().optional().describe('The specific region in India for which information is requested.'),
});
export type RegionalFarmingDataRetrievalInput = z.infer<typeof RegionalFarmingDataRetrievalInputSchema>;

const RegionalFarmingDataRetrievalOutputSchema = z.object({
  textResponse: z.string().describe('The AI-generated text response, formatted with bullet points.'),
  audioResponse: z.string().optional().describe('Base64 encoded WAV audio of the text response.'),
});
export type RegionalFarmingDataRetrievalOutput = z.infer<typeof RegionalFarmingDataRetrievalOutputSchema>;

const regionalFarmingPrompt = ai.definePrompt({
  name: 'regionalFarmingDataRetrievalPrompt',
  input: { schema: RegionalFarmingDataRetrievalInputSchema },
  output: { schema: RegionalFarmingDataRetrievalOutputSchema.pick({ textResponse: true }) }, // Only prompt for text, then convert to speech
  prompt: `You are an expert Natural Farming Consultant for India, providing region-specific advice and data.
Your goal is to assist Indian farmers with accurate, up-to-date (simulated) information on optimal planting seasons, current market prices, irrigation schedules, and government subsidies.
Always respond in the requested language: {{{language}}}.

When answering, provide a clear, concise, and easy-to-understand response, using bullet points for different pieces of information or new topics.
Strictly adhere to providing information relevant to natural farming practices in India.

Simulate access to a comprehensive database of agricultural data for various regions in India.

Farmer's Query: {{{query}}}
${'{{#if region}}'}Region: {{{region}}}${'{{/if}}'}

Provide the most relevant information based on the query. If specific data is not available for a highly specific query, provide general best practices or relevant dummy data for India.`,
});

export async function regionalFarmingDataRetrieval(input: RegionalFarmingDataRetrievalInput): Promise<RegionalFarmingDataRetrievalOutput> {
  const { query, language, region } = input;

  // Generate the text response first
  const { output: promptOutput } = await regionalFarmingPrompt({ query, language, region });
  const textResponse = promptOutput!.textResponse; 

  // Generate audio response using TTS
  let audioResponse: string | undefined;
  try {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            // Using a generic prebuilt voice, model will synthesize in the requested language.
            // Specific language voices like 'hi-IN-Standard-A' are not directly configurable via prebuiltVoiceConfig for this model.
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, 
          },
        },
      },
      prompt: textResponse,
    });

    if (media) {
      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );
      audioResponse = 'data:audio/wav;base64,' + (await toWav(audioBuffer));
    }
  } catch (error) {
    console.error('Error generating audio response:', error);
    // Fallback: Continue without audio if TTS fails
  }

  return { textResponse, audioResponse };
}

const regionalFarmingDataRetrievalFlow = ai.defineFlow(
  {
    name: 'regionalFarmingDataRetrievalFlow',
    inputSchema: RegionalFarmingDataRetrievalInputSchema,
    outputSchema: RegionalFarmingDataRetrievalOutputSchema,
  },
  async (input) => {
    return regionalFarmingDataRetrieval(input);
  }
);
