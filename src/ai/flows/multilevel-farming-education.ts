'use server';
/**
 * @fileOverview This file implements a Genkit flow for explaining natural farming concepts like multi-level cropping.
 *
 * - explainMultilevelFarming - A function that provides clear, bulleted explanations of natural farming concepts in a chosen language.
 * - MultilevelFarmingEducationInput - The input type for the explainMultilevelFarming function.
 * - MultilevelFarmingEducationOutput - The return type for the explainMultilevelFarming function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MultilevelFarmingEducationInputSchema = z.object({
  topic: z
    .string()
    .describe('The natural farming concept to be explained, e.g., "multi-level cropping".'),
  language: z
    .enum(['english', 'hindi', 'bengali', 'tamil', 'marathi'])
    .describe('The language in which the explanation should be provided.'),
});
export type MultilevelFarmingEducationInput = z.infer<
  typeof MultilevelFarmingEducationInputSchema
>;

const MultilevelFarmingEducationOutputSchema = z.object({
  explanation: z
    .string()
    .describe('A detailed, bulleted explanation of the requested natural farming concept.'),
});
export type MultilevelFarmingEducationOutput = z.infer<
  typeof MultilevelFarmingEducationOutputSchema
>;

export async function explainMultilevelFarming(
  input: MultilevelFarmingEducationInput
): Promise<MultilevelFarmingEducationOutput> {
  return multilevelFarmingEducationFlow(input);
}

const multilevelFarmingEducationPrompt = ai.definePrompt({
  name: 'multilevelFarmingEducationPrompt',
  input: {schema: MultilevelFarmingEducationInputSchema},
  output: {schema: MultilevelFarmingEducationOutputSchema},
  prompt: `You are an expert natural farming consultant providing educational content.

Explain the concept of '{{{topic}}}' in detail, using bullet points for clarity and ease of understanding. Ensure the explanation is provided entirely in the '{{{language}}}' language.

Provide the response in a structured JSON format with a single 'explanation' field.`,
});

const multilevelFarmingEducationFlow = ai.defineFlow(
  {
    name: 'multilevelFarmingEducationFlow',
    inputSchema: MultilevelFarmingEducationInputSchema,
    outputSchema: MultilevelFarmingEducationOutputSchema,
  },
  async input => {
    const {output} = await multilevelFarmingEducationPrompt(input);
    return output!;
  }
);
