'use server';
/**
 * @fileOverview This file implements a Genkit flow for crop disease image analysis.
 *
 * - cropDiseaseImageAnalysis - A function that handles identifying crop diseases from an image and suggesting organic remedies.
 * - CropDiseaseImageAnalysisInput - The input type for the cropDiseaseImageAnalysis function.
 * - CropDiseaseImageAnalysisOutput - The return type for the cropDiseaseImageAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CropDiseaseImageAnalysisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a diseased crop, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z
    .string()
    .describe(
      'The desired output language for the response (e.g., "English", "Hindi", "Bengali", "Tamil", "Marathi").'
    ),
});
export type CropDiseaseImageAnalysisInput = z.infer<typeof CropDiseaseImageAnalysisInputSchema>;

const CropDiseaseImageAnalysisOutputSchema = z.object({
  diseaseIdentification: z
    .string()
    .describe('The identified disease of the crop.'),
  organicRemedies: z
    .array(z.string())
    .describe('A list of organic remedies for the identified disease.'),
  responseInSelectedLanguage: z
    .string()
    .describe(
      'A human-readable, well-formatted, and translated response in the specified language, including the disease identification and organic remedies as bullet points.'
    ),
});
export type CropDiseaseImageAnalysisOutput = z.infer<typeof CropDiseaseImageAnalysisOutputSchema>;

export async function cropDiseaseImageAnalysis(
  input: CropDiseaseImageAnalysisInput
): Promise<CropDiseaseImageAnalysisOutput> {
  return cropDiseaseImageAnalysisFlow(input);
}

const cropDiseaseImageAnalysisPrompt = ai.definePrompt({
  name: 'cropDiseaseImageAnalysisPrompt',
  input: { schema: CropDiseaseImageAnalysisInputSchema },
  output: { schema: CropDiseaseImageAnalysisOutputSchema },
  prompt: `You are an expert agricultural scientist specializing in natural farming and organic pest control.
Your task is to identify the disease present in the provided crop image and suggest effective organic remedies.
Translate your entire response, including the disease identification and the organic remedies, into the {{language}} language.
The 'responseInSelectedLanguage' field should contain a well-formatted, easy-to-read text in the specified language, incorporating the disease identification and listing the organic remedies using bullet points for clarity.

Image of the crop: {{media url=photoDataUri}}

Provide your response strictly in the following JSON format:
{{jsonSchema CropDiseaseImageAnalysisOutputSchema}}`,
});

const cropDiseaseImageAnalysisFlow = ai.defineFlow(
  {
    name: 'cropDiseaseImageAnalysisFlow',
    inputSchema: CropDiseaseImageAnalysisInputSchema,
    outputSchema: CropDiseaseImageAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await cropDiseaseImageAnalysisPrompt(input);
    if (!output) {
      throw new Error('Failed to get a response from the AI model.');
    }
    return output;
  }
);
