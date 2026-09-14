import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import eventRoutes from './routes/event.routes.js';
import contextRoutes from './routes/context.routes.js';

dotenv.config();
if (process.env.MONGODB_URI) {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
}
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_, res) => res.json({ success:true, service:'ambient-server', status:'ok' }));
app.use('/api/events', eventRoutes);
app.use('/api/context', contextRoutes);
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Ambient server running on http://localhost:${port}`));

