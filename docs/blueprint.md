# **App Name**: HistoriCast

## Core Features:

- Debate Generation: Generate debate content for historical figures using locally run LLMs through Ollama, ensuring historically accurate and stylistically appropriate arguments. The tool accounts for persona details such as background, style, key concepts, and limitations.
- Voice Synthesis: Utilize the ElevenLabs API for realistic voice synthesis of debate participants, using voice IDs specified in persona configurations.
- Audio Assembly: Automatically assemble the debate audio using FFmpeg, concatenating speech segments and applying basic audio editing to create a seamless podcast episode.
- API Endpoint: Provide a REST API endpoint (/historicalDebate) that accepts parameters such as topic, rounds, and participants, returning the generated transcript and audio file.
- Transcript Display: Present debate transcripts with clear speaker attributions and timestamps, ensuring readability and easy navigation within the generated content.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to convey sophistication, intelligence, and historical depth. Purple is associated with royalty, wisdom, and creativity.
- Background color: Light gray (#EEEEEE), very slightly desaturated purple, to ensure readability and a subtle, non-distracting backdrop.
- Accent color: Muted blue (#3F51B5), an analogous color to purple, used for interactive elements and highlights, providing a sense of calm and authority.
- Headline font: 'Playfair', serif. Body font: 'PT Sans', sans-serif. Use 'Playfair' for headers to bring in an element of classic, old-fashioned style, and 'PT Sans' for the body to provide great readability in longer stretches of text.
- Use minimalist icons to represent speakers and topics, employing a consistent style that evokes historical imagery and intellectual discourse.
- Design a clean and structured layout that clearly distinguishes between speakers and their arguments, utilizing spacing and visual cues to enhance comprehension.
- Implement subtle transitions between debate rounds and speaker turns, adding a touch of dynamism without distracting from the content.