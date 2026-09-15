import { agentStatus } from './services/agent/decisionService.js';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import eventRoutes from './routes/event.routes.js';
import contextRoutes from './routes/context.routes.js';
import { readContext } from './services/context/contextService.js';
import { reevaluateDeferred } from './services/events/eventService.js';
import { serialize } from './services/serialize.js';
dotenv.config();
mongoose.set('bufferCommands', false);
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ambient', { serverSelectionTimeoutMS: 5000, writeConcern: { w: 1, j: true } });
await reevaluateDeferred(await readContext());
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ success: mongoose.connection.readyState === 1, service: 'ambient-server', storage: 'mongodb' }));
app.get('/api/agent/status', (_, res) => res.json({ success: true, data: agentStatus() }));
app.use('/api/events', eventRoutes);
app.use('/api/context', contextRoutes);
app.use((error, req, res, next) => {
  console.error(error.name, error.message);
  res.status(503).json({ success: false, message: 'Could not save or load data. Check MongoDB and retry.' });
});
// Repair a partial context-update/re-evaluation if the DB briefly disconnects.
const recovery = setInterval(() => serialize(async () => reevaluateDeferred(await readContext())).catch(error => console.error('Recovery:', error.message)), 5000);
const server = app.listen(process.env.PORT || 5000, () => console.log('Ambient server ready with MongoDB persistence'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  clearInterval(recovery);
  server.close(async () => { await serialize(async () => {}); await mongoose.disconnect(); process.exit(0); });
});
