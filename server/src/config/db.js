import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.mongoUri) {
    console.log('MongoDB URI not configured. Running with in-memory fallback.');
    return false;
  }
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB connected: ${env.mongoUri}`);
    return true;
  } catch (err) {
    console.warn(`MongoDB connection failed (${err.message}). Running with in-memory fallback.`);
    return false;
  }
}

export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
