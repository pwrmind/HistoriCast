
'use server';

import { generateHistoricalDebate, GenerateHistoricalDebateInput } from '@/ai/flows/generate-historical-debate';
import { z } from 'zod';

const DebateInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  rounds: z.coerce.number().int().min(1).max(5),
  participants: z.array(z.string()).min(2, "Select at least two participants.").max(5, "Select at most five participants."),
});

export async function createDebate(input: GenerateHistoricalDebateInput) {
  const validationResult = DebateInputSchema.safeParse(input);

  if (!validationResult.success) {
    return {
      status: 'error' as const,
      message: validationResult.error.errors.map((e) => e.message).join(', '),
    };
  }

  try {
    const result = await generateHistoricalDebate(validationResult.data);
    if (result.status === 'success') {
        return { status: 'success' as const, data: result.data };
    } else {
      // This case might not happen based on the flow's output schema, but good to have
      return { status: 'error' as const, message: 'The generation flow failed to return a success status.' };
    }
  } catch (error) {
    console.error('Error in createDebate server action:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during debate generation.';
    return { status: 'error' as const, message };
  }
}
