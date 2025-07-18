import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama';

// Note: The ollama plugin in genkitx-ollama@0.5.2 is an object, not a function.
// It is configured via environment variables or a local `~/.ollama/config.json` file,
// not by passing a configuration object here.
export const ai = genkit({
  plugins: [googleAI(), ollama],
});
