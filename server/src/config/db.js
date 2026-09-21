import mongoose from 'mongoose';
import { env } from './env.js';

let warned = false;

export async function connectDB() {
  if (!env.mongoUri) return false;
  if (mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('Ambient: MongoDB connected.');
    return true;
  } catch (error) {
    if (!warned) {
      console.warn(`Ambient: MongoDB unavailable (${error.message}). Using in-memory storage.`);
      warned = true;
    }
    return false;
  }
}

export const isDBConnected = () => mongoose.connection.readyState === 1;
