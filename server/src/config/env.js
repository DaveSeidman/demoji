import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: resolve(configDir, '../../.env')
});

export const env = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  falKey: process.env.FAL_KEY || '',
  falModelId: process.env.FAL_MODEL_ID || 'fal-ai/nano-banana',
  falTimeoutMs: Number(process.env.FAL_TIMEOUT_MS || 120000),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
};
