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
import { googleAI } from '@genkit-ai/google-genai';

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
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: CropDiseaseImageAnalysisInputSchema },
  output: { schema: CropDiseaseImageAnalysisOutputSchema },
  prompt: `You are an expert agricultural scientist specializing in natural farming and organic pest control.

CRITICAL INSTRUCTION:
• Analyze the provided crop image carefully
• Identify the disease based on visible symptoms (spots, discoloration, wilting, etc.)
• Suggest ONLY organic remedies (neem oil, Jivamrut, compost tea, etc.)
• Format your response in the language: {{language}}

FORMATTING RULES:
• Each remedy MUST be listed as a bullet point starting with "• " on a NEW LINE
• DO NOT put multiple remedies on the same line
• Use simple, practical language that farmers can understand
• Provide clear, actionable steps

Image of the crop: {{media url=photoDataUri}}

EXAMPLE FORMAT (for English):
Disease: Leaf Blight

Organic Remedies:
• Apply neem oil spray (5ml per liter water) every 7 days
• Remove and destroy infected leaves
• Apply Jivamrut to boost plant immunity
• Ensure proper spacing for air circulation

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
    try {
      const { output } = await cropDiseaseImageAnalysisPrompt(input);
      if (!output) {
        throw new Error('Failed to get a response from the AI model.');
      }
      return output;
    } catch (error: any) {
      console.error('Disease detection error:', error.message);
      
      // Fallback responses when API fails
      const fallbackResponses: Record<string, string> = {
        'English': "DISEASE DETECTION UNAVAILABLE:\n\nI'm currently unable to analyze images. Please describe your crop symptoms in text:\n• What color are the spots or discoloration?\n• Are the leaves wilting or curling?\n• Is there any unusual growth or decay?\n• When did you first notice the problem?\n\nThis will help me provide you with organic treatment advice.",
        'Hindi': "रोग पहचान उपलब्ध नहीं:\n\nमैं वर्तमान में छवियों का विश्लेषण नहीं कर पा रहा हूँ। कृपया अपनी फसल के लक्षणों का वर्णन टेक्स्ट में करें:\n• धब्बे या मलिनकिरण किस रंग के हैं?\n• क्या पत्तियाँ मुरझा रही हैं या मुड़ रही हैं?\n• क्या कोई असामान्य वृद्धि या सड़न है?\n• आपने यह समस्या पहली बार कब देखी?\n\nइससे मैं आपको जैविक उपचार सलाह दे सकूंगा।",
        'Bengali': "রোগ সনাক্তকরণ উপলব্ধ নয়:\n\nআমি বর্তমানে ছবি বিশ্লেষণ করতে পারছি না। দয়া করে আপনার ফসলের লক্ষণগুলি টেক্সটে বর্ণনা করুন:\n• দাগ বা বিবর্ণতা কী রঙের?\n• পাতা কি শুকিয়ে যাচ্ছে বা কুঁকড়ে যাচ্ছে?\n• কোন অস্বাভাবিক বৃদ্ধি বা পচন আছে?\n• আপনি কখন প্রথম এই সমস্যাটি লক্ষ্য করেছিলেন?\n\nএটি আমাকে আপনাকে জৈব চিকিৎসা পরামর্শ দিতে সাহায্য করবে।",
        'Tamil': "நோய் கண்டறிதல் கிடைக்கவில்லை:\n\nநான் தற்போது படங்களை பகுப்பாய்வு செய்ய முடியவில்லை. தயவுசெய்து உங்கள் பயிரின் அறிகுறிகளை உரையில் விவரிக்கவும்:\n• புள்ளிகள் அல்லது நிறமாற்றம் என்ன நிறத்தில் உள்ளது?\n• இலைகள் வாடுகிறதா அல்லது சுருங்குகிறதா?\n• ஏதேனும் அசாதாரண வளர்ச்சி அல்லது அழுகல் உள்ளதா?\n• இந்த பிரச்சனையை நீங்கள் முதலில் எப்போது கவனித்தீர்கள்?\n\nஇது உங்களுக்கு இயற்கை சிகிச்சை ஆலோசனையை வழங்க எனக்கு உதவும்.",
        'Marathi': "रोग ओळख उपलब्ध नाही:\n\nमी सध्या प्रतिमांचे विश्लेषण करू शकत नाही. कृपया आपल्या पिकाची लक्षणे मजकुरात वर्णन करा:\n• डाग किंवा विरंगुळा कोणत्या रंगाचा आहे?\n• पाने कोमेजत आहेत किंवा वळत आहेत?\n• काही असामान्य वाढ किंवा सडणे आहे का?\n• तुम्हाला ही समस्या प्रथम कधी दिसली?\n\nयामुळे मी तुम्हाला सेंद्रिय उपचार सल्ला देऊ शकेन."
      };
      
      const lang = input.language || 'English';
      const fallbackText = fallbackResponses[lang] || fallbackResponses['English'];
      
      return {
        diseaseIdentification: "Analysis currently unavailable. Please provide text description.",
        organicRemedies: [
          "Describe symptoms in text",
          "Include color of spots",
          "Mention any wilting or curling",
          "Note when problem started"
        ],
        responseInSelectedLanguage: fallbackText
      };
    }
  }
);