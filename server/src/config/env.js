import dotenv from 'dotenv';
dotenv.config();

const bool = (value) => String(value ?? 'false').toLowerCase() === 'true';
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const env = Object.freeze({
  port: number(process.env.PORT, 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  aiProvider: process.env.AI_PROVIDER || 'mock',
  typesafeApiKey: process.env.TYPESAFE_API_KEY || '',
  jevModel: process.env.JEV_MODEL || 'jev-latest',
  jevBaseUrl: process.env.JEV_BASE_URL || 'https://api.typesafe.ai/v1/systemone',
  awsBedrockEnabled: bool(process.env.AWS_BEDROCK_ENABLED),
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0',
  autoThreshold: number(process.env.AMBIENT_AUTO_THRESHOLD, 0.80),
  reviewThreshold: number(process.env.AMBIENT_REVIEW_THRESHOLD, 0.55)
});

if (env.autoThreshold < env.reviewThreshold || env.reviewThreshold < 0 || env.autoThreshold > 1) {
  throw new Error('Invalid confidence thresholds. Require 0 <= review <= auto <= 1.');
}
