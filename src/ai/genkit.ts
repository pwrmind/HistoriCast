import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama';

export const ai = genkit({
  plugins: [
    googleAI(),
    ollama,
  ],
});
