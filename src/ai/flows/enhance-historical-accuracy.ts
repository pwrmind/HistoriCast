'use server';

/**
 * @fileOverview Flow to fine-tune the LLM on historical texts related to the debate topic.
 *
 * - enhanceHistoricalAccuracy - A function that enhances historical accuracy by fine-tuning the LLM.
 * - EnhanceHistoricalAccuracyInput - The input type for the enhanceHistoricalAccuracy function.
 * - EnhanceHistoricalAccuracyOutput - The return type for the enhanceHistoricalAccuracy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceHistoricalAccuracyInputSchema = z.object({
  topic: z.string().describe('The topic of the debate.'),
  historicalTexts: z
    .array(z.string())
    .describe(
      'An array of historical texts related to the debate topic for fine-tuning the LLM.'
    ),
  prompt: z.string().describe('The prompt to be used for the debate.'),
});
export type EnhanceHistoricalAccuracyInput = z.infer<
  typeof EnhanceHistoricalAccuracyInputSchema
>;

const EnhanceHistoricalAccuracyOutputSchema = z.object({
  enhancedPrompt: z.string().describe('The prompt after fine-tuning.'),
});
export type EnhanceHistoricalAccuracyOutput = z.infer<
  typeof EnhanceHistoricalAccuracyOutputSchema
>;

export async function enhanceHistoricalAccuracy(
  input: EnhanceHistoricalAccuracyInput
): Promise<EnhanceHistoricalAccuracyOutput> {
  return enhanceHistoricalAccuracyFlow(input);
}

const enhanceHistoricalAccuracyPrompt = ai.definePrompt({
  name: 'enhanceHistoricalAccuracyPrompt',
  input: {schema: EnhanceHistoricalAccuracyInputSchema},
  output: {schema: EnhanceHistoricalAccuracyOutputSchema},
  prompt: `You are an AI expert in refining prompts for historical accuracy.  Based on the provided historical texts related to the debate topic, refine the original prompt to minimize anachronisms and ensure the generated content is as historically accurate as possible.\n\nDebate Topic: {{{topic}}}\nOriginal Prompt: {{{prompt}}}\n\nHistorical Texts:\n{{#each historicalTexts}}\n{{{this}}}\n{{/each}}\n\nRevised Prompt:`, // Provide clear instructions for prompt refinement.
});

const enhanceHistoricalAccuracyFlow = ai.defineFlow(
  {
    name: 'enhanceHistoricalAccuracyFlow',
    inputSchema: EnhanceHistoricalAccuracyInputSchema,
    outputSchema: EnhanceHistoricalAccuracyOutputSchema,
  },
  async input => {
    const {output} = await enhanceHistoricalAccuracyPrompt(input);
    return {
      enhancedPrompt: output!.enhancedPrompt,
    };
  }
);
