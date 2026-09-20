import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  aiProvider: process.env.AI_PROVIDER || 'mock',
  typesafeApiKey: process.env.TYPESAFE_API_KEY || '',
  jevModel: process.env.JEV_MODEL || 'jev-latest',
  jevBaseUrl: process.env.JEV_BASE_URL || 'https://api.typesafe.ai/v1/systemone',
  awsRegion: process.env.AWS_REGION || '',
  bedrockModelId: process.env.BEDROCK_MODEL_ID || ''
};
