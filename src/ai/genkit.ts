import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {ollama} from 'genkitx-ollama';
import * as dotenv from 'dotenv';

dotenv.config();

const plugins: GenkitPlugin[] = [];
let googleConfigured = false;

// Use Google AI if an API key is available
if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
  googleConfigured = true;
  console.log('Using Google AI Gemini model.');
}

// In a local development environment, add Ollama.
// It can be used alongside Google AI or as a fallback.
if (process.env.NODE_ENV === 'development') {
  console.log('Development environment detected. Configuring Ollama.');
  // In genkitx-ollama@0.5.2, `ollama` is the plugin object itself, not a function.
  plugins.unshift(ollama);
  
  if (!googleConfigured) {
    console.log('Defaulting to Ollama for AI generation.');
  } else {
    console.log(
      'Ollama is available, but Google AI is also configured and may be used.'
    );
  }
}

if (plugins.length === 0) {
  throw new Error(
    'No AI plugins configured. Please set GOOGLE_API_KEY or ensure you are in a development environment with Ollama running.'
  );
}

export const ai = genkit({
  plugins,
  // The 'logLevel' option is deprecated in Genkit v1.x and should not be used.
  // Logging can be configured through environment variables if needed.
});
