'use server';

/**
 * @fileOverview Generates a historical debate podcast between specified figures.
 *
 * - generateHistoricalDebate - A function to generate the debate podcast.
 * - GenerateHistoricalDebateInput - The input type for the generateHistoricalDebate function.
 * - GenerateHistoricalDebateOutput - The return type for the generateHistoricalDebate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {promises as fs} from 'fs';
import path from 'path';
import {promisify} from 'util';
import {exec} from 'child_process';
import wav from 'wav';
import personas from '../personas.js';

const execAsync = promisify(exec);

const PersonaSchema = z.object({
  name: z.string(),
  systemPrompt: z.string(),
  voiceId: z.string(),
  ollamaModel: z.string(),
});

const PersonasSchema = z.record(PersonaSchema);

// Define the input schema
const GenerateHistoricalDebateInputSchema = z.object({
  topic: z.string().describe('The topic of the debate.'),
  rounds: z.number().int().min(1).describe('The number of debate rounds.'),
  participants: z.array(z.string()).min(2).describe('An array of participant IDs (keys from the personas object).'),
});

export type GenerateHistoricalDebateInput = z.infer<typeof GenerateHistoricalDebateInputSchema>;

// Define the output schema
const GenerateHistoricalDebateOutputSchema = z.object({
  status: z.string(),
  data: z.object({
    transcript: z.array(
      z.object({
        speaker: z.string(),
        text: z.string(),
        audioFile: z.string(),
      })
    ),
    podcast: z.string(),
    duration: z.string(),
  }),
});

export type GenerateHistoricalDebateOutput = z.infer<typeof GenerateHistoricalDebateOutputSchema>;

// Define the tool to synthesize speech using ElevenLabs API
const synthesizeSpeech = ai.defineTool(
  {
    name: 'synthesizeSpeech',
    description: 'Synthesizes speech from text using the ElevenLabs API.',
    inputSchema: z.object({
      text: z.string().describe('The text to synthesize.'),
      voiceId: z.string().describe('The ID of the ElevenLabs voice to use.'),
    }),
    outputSchema: z.string().describe('The base64 encoded audio data in WAV format.'),
  },
  async input => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key is missing. Set the ELEVENLABS_API_KEY environment variable.');
    }
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}/stream`;
    const headers = {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    };
    const body = JSON.stringify({
      text: input.text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return await toWav(buffer);
    } catch (error: any) {
      console.error('ElevenLabs API error:', error);
      throw new Error(`Failed to synthesize speech: ${error.message}`);
    }
  }
);

async function toWav(
  mp3Data: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  // Convert mp3 to pcm
  const tempPcmPath = path.join(process.cwd(), 'temp.pcm');
  const tempWavPath = path.join(process.cwd(), 'temp.wav');

  try {
    await fs.writeFile(tempPcmPath, mp3Data);
    // Use ffmpeg to convert mp3 to wav
    const command = `ffmpeg -f mp3 -i ${tempPcmPath} -acodec pcm_s16le -ac 1 -ar 24000 ${tempWavPath}`;
    await execAsync(command);

    const fileContent = await fs.readFile(tempWavPath);
    return fileContent.toString('base64');
  } catch (e) {
    console.error('Error converting to wav', e);
    throw e;
  } finally {
    // await fs.unlink(tempPcmPath);
    // await fs.unlink(tempWavPath);
  }
}

const buildPrompt = (topic: string, persona: any, round: number, transcript: any) => {
  let history = '';
  for (const turn of transcript) {
    history += `${turn.speaker}: ${turn.text}\n`;
  }
  return `${persona.systemPrompt}\n\nYou are participating in a debate about ${topic}. This is round ${round}.\n\nPrevious turns:\n${history}\n\nRespond with 1-2 sentences.`;
};

const debatePrompt = ai.definePrompt({
  name: 'debatePrompt',
  input: z.object({
    topic: z.string(),
    persona: PersonaSchema,
    round: z.number(),
    transcript: z.array(
      z.object({
        speaker: z.string(),
        text: z.string(),
      })
    ),
  }),
  output: z.string(),
  tools: [synthesizeSpeech],
  prompt: `{{{persona.systemPrompt}}}\n
You are participating in a debate about {{{topic}}}. This is round {{{round}}}.\n
Previous turns:
{{#each transcript}}
{{{speaker}}}: {{{text}}}
{{/each}}

Respond with 1-2 sentences.`, // Corrected Handlebars syntax
});

const generateHistoricalDebateFlow = ai.defineFlow(
  {
    name: 'generateHistoricalDebateFlow',
    inputSchema: GenerateHistoricalDebateInputSchema,
    outputSchema: GenerateHistoricalDebateOutputSchema,
  },
  async input => {
    const {topic, rounds, participants} = input;

    const transcript: {speaker: string; text: string; audioFile: string}[] = [];

    // Validate participants against available personas
    for (const participantId of participants) {
      if (!personas[participantId]) {
        throw new Error(`Invalid participant ID: ${participantId}`);
      }
    }

    // Debate loop
    for (let round = 1; round <= rounds; round++) {
      // Shuffle participants for turn order
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);

      for (const agentId of shuffledParticipants) {
        const persona = (personas as any)[agentId];
        const promptInput = {
          topic: topic,
          persona: persona,
          round: round,
          transcript: transcript,
        };

        const response = await debatePrompt(promptInput);
        const text = response.output!;

        // Synthesize speech using the ElevenLabs tool
        const audioBase64 = await synthesizeSpeech({
          text: text,
          voiceId: persona.voiceId,
        });

        const audioFile = `clip_${transcript.length}.wav`; // Changed to WAV
        //Save the file to the public directory
        const audioFilePath = path.join(process.cwd(), 'public', audioFile);
        const buffer = Buffer.from(audioBase64, 'base64');
        await fs.writeFile(audioFilePath, buffer);

        transcript.push({
          speaker: persona.name,
          text: text,
          audioFile: audioFile,
        });
      }
    }

    // Concatenate audio files using FFmpeg
    const podcastFile = 'final_debate.mp3';
    const concatListPath = path.join(process.cwd(), 'public', 'concat_list.txt');
    const podcastFilePath = path.join(process.cwd(), 'public', podcastFile);
    const concatListContent = transcript
      .map(turn => `file '${path.join(process.cwd(), 'public', turn.audioFile)}'`)
      .join('\n');
    await fs.writeFile(concatListPath, concatListContent);

    try {
      const command = `ffmpeg -f concat -safe 0 -i ${concatListPath} -c copy ${podcastFilePath}`;
      await execAsync(command);
    } catch (e) {
      console.error('Error running ffmpeg', e);
      throw e;
    } finally {
      await fs.unlink(concatListPath);
    }

    // Calculate the duration of the podcast (dummy implementation)
    const duration = '12:45';

    return {
      status: 'success',
      data: {
        transcript: transcript,
        podcast: podcastFile,
        duration: duration,
      },
    };
  }
);

export async function generateHistoricalDebate(input: GenerateHistoricalDebateInput): Promise<GenerateHistoricalDebateOutput> {
  return generateHistoricalDebateFlow(input);
}
