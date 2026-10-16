import mongoose from 'mongoose';
import { env } from './env.js';
mongoose.set('bufferCommands', false);
let connecting;
export function storageStatus() {
  const configured = Boolean(env.mongoUri);
  const ready = !configured || mongoose.connection.readyState === 1;
  return { mode: configured ? 'mongodb' : 'in-memory', ready, durable: configured && ready };
}
export function isDBConnected() {
  if (!env.mongoUri) return false;
  if (mongoose.connection.readyState !== 1) throw Object.assign(new Error('MongoDB unavailable. No changes were saved to temporary memory. Check database connectivity and retry.'), { statusCode: 503 });
  return true;
}
export async function connectDB() {
  if (!env.mongoUri) return false;
  if (mongoose.connection.readyState === 1) return true;
  if (!connecting) {
    connecting = mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, writeConcern: { w: 1, j: true } })
      .then(() => true)
      .catch(() => { throw Object.assign(new Error('MongoDB connection failed. Check network access, database credentials, and MONGODB_URI.'), { statusCode: 503 }); })
      .finally(() => { connecting = null; });
  }
  return connecting;
}
