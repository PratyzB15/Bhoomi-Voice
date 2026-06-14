'use server';
/**
 * @fileOverview This file implements a Genkit flow that acts as an Intelligent Natural Farming Consultant.
 * It takes a farmer's query and selected language, provides a comprehensive answer,
 * and intelligently suggests follow-up questions or related essential information.
 *
 * - intelligentGuidanceAndSuggestions - A function that handles the intelligent guidance and suggestions process.
 * - IntelligentGuidanceAndSuggestionsInput - The input type for the intelligentGuidanceAndSuggestions function.
 * - IntelligentGuidanceAndSuggestionsOutput - The return type for the intelligentGuidanceAndSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentGuidanceAndSuggestionsInputSchema = z.object({
  query: z.string().describe("The farmer's specific query about a crop or farming need."),
  language: z.string().describe("The farmer's selected language for the response (e.g., 'English', 'Hindi', 'Bengali', 'Tamil', 'Marathi')."),
});
export type IntelligentGuidanceAndSuggestionsInput = z.infer<typeof IntelligentGuidanceAndSuggestionsInputSchema>;

const IntelligentGuidanceAndSuggestionsOutputSchema = z.object({
  answer: z.string().describe("The comprehensive answer to the farmer's query, formatted with bullet points for readability."),
  suggestedQuestions: z.array(z.string()).describe("A list of intelligently suggested follow-up questions or related essential information for the farmer."),
});
export type IntelligentGuidanceAndSuggestionsOutput = z.infer<typeof IntelligentGuidanceAndSuggestionsOutputSchema>;

export async function intelligentGuidanceAndSuggestions(input: IntelligentGuidanceAndSuggestionsInput): Promise<IntelligentGuidanceAndSuggestionsOutput> {
  return intelligentGuidanceAndSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentGuidanceAndSuggestionsPrompt',
  input: {schema: IntelligentGuidanceAndSuggestionsInputSchema},
  output: {schema: IntelligentGuidanceAndSuggestionsOutputSchema},
  prompt: `You are an expert Multilevel Natural Farming Consultant for farmers in India.
Your goal is to provide comprehensive and helpful advice in the requested language.
First, directly answer the farmer's query. Then, proactively suggest related essential information or follow-up questions that would be beneficial for the farmer, considering common farming needs in India (e.g., best seeds, government schemes, irrigation timing, market prices, local weather, and specific crop considerations for different months).

Ensure your answer is well-structured, easy to read, and uses bullet points for different pieces of information like months, irrigation, seeds, and selling rates.

Farmer's Query (in {{{language}}}): {{{query}}}

Respond in {{{language}}} and provide your answer in the following JSON format:
{{jsonSchema IntelligentGuidanceAndSuggestionsOutputSchema}}
`,
});

const intelligentGuidanceAndSuggestionsFlow = ai.defineFlow(
  {
    name: 'intelligentGuidanceAndSuggestionsFlow',
    inputSchema: IntelligentGuidanceAndSuggestionsInputSchema,
    outputSchema: IntelligentGuidanceAndSuggestionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('No output received from the model.');
    }
    return output;
  }
);
