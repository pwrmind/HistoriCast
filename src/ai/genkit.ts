import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama';

export const ai = genkit({
  plugins: [
    googleAI(),
    ollama({
      models: [{name: 'mistral'}, {name: 'llama3'}],
      serverAddress: 'http://127.0.0.1:11434',
    }),
  ],
});
