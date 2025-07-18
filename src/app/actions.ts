
'use server';

import { generateHistoricalDebate, GenerateHistoricalDebateInput } from '@/ai/flows/generate-historical-debate';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import personas from '@/ai/personas.js';

const DebateInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  rounds: z.coerce.number().int().min(1).max(5),
  participants: z.array(z.string())
    .min(2, "Select at least two participants.")
    .max(5, "Select at most five participants."),
  generateAudio: z.boolean(),
});

const AddPersonaSchema = z.object({
  id: z.string().min(3, "ID must be at least 3 characters long.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ID can only contain lowercase letters, numbers, and hyphens."),
  name: z.string().min(3, "Name must be at least 3 characters long."),
  systemPrompt: z.string().min(10, "System prompt must be at least 10 characters long."),
  voiceId: z.string().min(1, "Please select a voice."),
  ollamaModel: z.string().min(1, "Please select a model."),
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

export async function addPersona(values: z.infer<typeof AddPersonaSchema>) {
    const validationResult = AddPersonaSchema.safeParse(values);
    if (!validationResult.success) {
        return {
            status: 'error' as const,
            message: validationResult.error.errors.map((e) => e.message).join(', '),
        };
    }

    const { id, name, systemPrompt, voiceId, ollamaModel } = validationResult.data;

    if (Object.keys(personas).includes(id)) {
        return { status: 'error' as const, message: `Participant with ID '${id}' already exists.` };
    }

    const newPersona = {
        name,
        systemPrompt,
        voiceId,
        ollamaModel,
    };

    const personasFilePath = path.join(process.cwd(), 'src', 'ai', 'personas.js');

    try {
        const currentPersonas = { ...personas, [id]: newPersona };
        const fileContent = `const personas = ${JSON.stringify(currentPersonas, null, 2)};\n\nmodule.exports = personas;\n`;
        await fs.writeFile(personasFilePath, fileContent, 'utf-8');

        return { status: 'success' as const, message: 'Participant added successfully!', persona: {id, ...newPersona }};
    } catch (error) {
        console.error('Error adding new persona:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred while adding the participant.';
        return { status: 'error' as const, message };
    }
}
