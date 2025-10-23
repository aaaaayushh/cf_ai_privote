## Prompts used for this project

#### Getting Whisper Transcription to work

- can you help debug @whisper-client.js ? when I try to record audio, I get the error: transcription failed. it might be because the audio file is not being passed correctly, or the whisper executable is not being found.
- can you write the basic server-side logic according to the requirements in the @README.md for @privote-worker? Use Hono.js for the server. Use @schema.sql for the database schema.

#### Privote Desktop App

- Create a sleek, minimalistic UI for the desktop app using electron.js, by going through the @README.md. Use lucide for the icons. Keep it simple and clean.
- Help me debug this "Export to Markdown" feature, it's not working as expected. @privote-desktop.
- can you refactor @renderer so it follows best practices? Split up the code into smaller files, and make the functions modular. Focus on the css please.
- Can you add a "pause recording" option when the recording is in progress, and a confirmation dialog when the user wants to stop the recording?

#### Blackhole Setup

- I need to set up a multi-output device to route meeting audio to both my speakers and BlackHole, so that Privote can capture the audio and transcribe it. Write down the steps for this process in @README.md.

#### Documentation

- Combine the scattered notes in the readmes across this project into a single, cohesive @README.md. Properly highlight the steps for the user to setup whisper, the worker, and Blackhole. Clearly define the steps for securing the worker with an API key.
