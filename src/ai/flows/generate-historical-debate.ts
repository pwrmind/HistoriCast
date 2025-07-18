
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
import personas from '@/ai/personas.js';
import { ollama } from 'genkitx-ollama';
import { googleAI } from '@genkit-ai/googleai';

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
  generateAudio: z.boolean().describe('Whether to generate audio for the debate.'),
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
        audioFile: z.string().optional(),
      })
    ),
    podcast: z.string(),
    duration: z.string(),
    audioGenerated: z.boolean(),
  }),
});

export type GenerateHistoricalDebateOutput = z.infer<typeof GenerateHistoricalDebateOutputSchema>;

// Define the tool to synthesize speech using ElevenLabs API
const synthesizeSpeechElevenLabs = ai.defineTool(
  {
    name: 'synthesizeSpeechElevenLabs',
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
      const pcmBuffer = await convertMp3ToPcm(buffer);
      return await toWav(pcmBuffer);
    } catch (error: any) {
      console.error('ElevenLabs API error:', error);
      throw new Error(`Failed to synthesize speech: ${error.message}`);
    }
  }
);


const synthesizeSpeechLocal = ai.defineTool(
  {
    name: 'synthesizeSpeechLocal',
    description: 'Synthesizes speech from text using a local Gemini TTS model.',
    inputSchema: z.object({
      text: z.string().describe('The text to synthesize.'),
      voiceId: z.string().describe('The prebuilt voice name to use (e.g., Algenib, Achernar).'),
    }),
    outputSchema: z.string().describe('The base64 encoded audio data in WAV format.'),
  },
  async input => {
    try {
      const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: input.voiceId },
            },
          },
        },
        prompt: input.text,
      });
      if (!media) {
        throw new Error('No media returned from local TTS model.');
      }
      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );
      return await toWav(audioBuffer);
    } catch (error: any) {
        console.error('Local TTS error:', error);
        throw new Error(`Failed to synthesize speech locally: ${error.message}`);
    }
  }
);


async function convertMp3ToPcm(mp3Data: Buffer): Promise<Buffer> {
    const tempInPath = path.join(process.cwd(), `temp-in-${Date.now()}.mp3`);
    const tempOutPath = path.join(process.cwd(), `temp-out-${Date.now()}.s16le`);
    try {
        await fs.writeFile(tempInPath, mp3Data);
        // Use ffmpeg to convert mp3 to pcm s16le
        const command = `ffmpeg -i ${tempInPath} -f s16le -acodec pcm_s16le -ar 24000 -ac 1 ${tempOutPath}`;
        await execAsync(command);
        const pcmData = await fs.readFile(tempOutPath);
        return pcmData;
    } catch (e) {
        console.error('Error converting MP3 to PCM', e);
        throw e;
    } finally {
        await fs.unlink(tempInPath).catch(console.error);
        await fs.unlink(tempOutPath).catch(console.error);
    }
}


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

    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d: Buffer) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

const debatePrompt = ai.definePrompt({
  name: 'debatePrompt',
  input: {
    schema: z.object({
      topic: z.string(),
      persona: PersonaSchema,
      round: z.number(),
      transcript: z.array(
        z.object({
          speaker: z.string(),
          text: z.string(),
          audioFile: z.string().optional(),
        })
      ),
    })
  },
  output: {
    schema: z.string(),
  },
  prompt: `{{{persona.systemPrompt}}}\n
You are participating in a debate about {{{topic}}}. This is round {{{round}}}.\n
Previous turns:
{{#each transcript}}
{{{speaker}}}: {{{text}}}
{{/each}}

Respond with 1-2 sentences.`,
});

const generateHistoricalDebateFlow = ai.defineFlow(
  {
    name: 'generateHistoricalDebateFlow',
    inputSchema: GenerateHistoricalDebateInputSchema,
    outputSchema: GenerateHistoricalDebateOutputSchema,
  },
  async input => {
    const {topic, rounds, participants, generateAudio} = input;
    const useLocalTTS = process.env.USE_LOCAL_TTS === 'true';

    const transcript: {speaker: string; text: string; audioFile?: string}[] = [];

    for (const participantId of participants) {
      if (!(personas as any)[participantId]) {
        throw new Error(`Invalid participant ID: ${participantId}`);
      }
    }

    for (let round = 1; round <= rounds; round++) {
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);

      for (const agentId of shuffledParticipants) {
        const persona = (personas as any)[agentId];
        const promptInput = {
          topic: topic,
          persona: persona,
          round: round,
          transcript: transcript,
        };

        const response = await ai.generate({
          model: ollama(persona.ollamaModel),
          prompt: await debatePrompt.render(promptInput),
          output: {
            format: 'text'
          }
        });

        const text = response.text;
        const turnData: {speaker: string; text: string; audioFile?: string} = {
            speaker: persona.name,
            text: text,
        };

        if (generateAudio) {
            let audioBase64: string | undefined;
            try {
                if (useLocalTTS) {
                     audioBase64 = await synthesizeSpeechLocal({
                        text: text,
                        voiceId: persona.voiceId,
                     });
                } else {
                     audioBase64 = await synthesizeSpeechElevenLabs({
                        text: text,
                        voiceId: persona.voiceId,
                    });
                }
                
                if (audioBase64) {
                    const audioFile = `clip_${transcript.length}.wav`;
                    const audioFilePath = path.join(process.cwd(), 'public', audioFile);
                    const buffer = Buffer.from(audioBase64, 'base64');
                    await fs.writeFile(audioFilePath, buffer);
                    turnData.audioFile = audioFile;
                } else {
                     console.error(`Skipping audio for ${persona.name} because audio data is empty.`);
                }

            } catch (error) {
                console.error(`Skipping audio for ${persona.name} due to TTS error:`, error);
            }
        }
        transcript.push(turnData);
      }
    }
    
    let podcastFile = '';
    let duration = '0:00';

    if (generateAudio && transcript.some(t => t.audioFile)) {
        const audioFilesToConcat = transcript.filter(t => t.audioFile);
        if (audioFilesToConcat.length > 0) {
            podcastFile = 'final_debate.mp3';
            const concatListPath = path.join(process.cwd(), 'public', 'concat_list.txt');
            const podcastFilePath = path.join(process.cwd(), 'public', podcastFile);

            const concatListContent = audioFilesToConcat
              .map(turn => `file '${path.join(process.cwd(), 'public', turn.audioFile!)}'`)
              .join('\n');
            await fs.writeFile(concatListPath, concatListContent);

            try {
              await fs.unlink(podcastFilePath).catch(() => {});
              const command = `ffmpeg -f concat -safe 0 -i ${concatListPath} -c:a libmp3lame -q:a 2 ${podcastFilePath}`;
              await execAsync(command);
              duration = '12:45'; // Dummy duration for now
            } catch (e) {
              console.error('Error running ffmpeg', e);
              podcastFile = ''; // Reset if ffmpeg fails
            } finally {
              await fs.unlink(concatListPath).catch(console.error);
            }
        }
    }
    
    return {
      status: 'success',
      data: {
        transcript: transcript,
        podcast: podcastFile,
        duration: duration,
        audioGenerated: generateAudio,
      },
    };
  }
);

export async function generateHistoricalDebate(input: GenerateHistoricalDebateInput): Promise<GenerateHistoricalDebateOutput> {
  return generateHistoricalDebateFlow(input);
}
