import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB, storageStatus } from './config/db.js';
import agentRoutes from './routes/agent.routes.js';
import contextRoutes from './routes/context.routes.js';
import eventRoutes from './routes/event.routes.js';
import actionRoutes from './routes/action.routes.js';
import ringRoutes from './routes/ring.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: env.clientOrigin || true }));

// Ring signatures are calculated over the exact raw request bytes.
app.use('/api/integrations/ring/webhook', express.raw({ type: 'application/json', limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_req, res) => {
  try { await connectDB(); } catch {}
  const storage = storageStatus();
  res.status(storage.ready ? 200 : 503).json({ success: storage.ready, service: 'ambient-server', status: storage.ready ? 'ok' : 'storage-unavailable', storage: storage.mode, durable: storage.durable, aiProvider: env.aiProvider });
});
// Applies to local and serverless APIs. Never route configured database failures into memory.
app.use('/api', async (_req, _res, next) => {
  try { await connectDB(); next(); } catch (error) { next(error); }
});
app.use('/api/agent', agentRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/integrations/ring', ringRoutes);
app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  try { await connectDB(); } catch { console.warn('MongoDB unavailable; API will report 503 until connection is restored.'); }
  app.listen(env.port, () => console.log(`Ambient API running at http://localhost:${env.port}`));
}

export default app;
