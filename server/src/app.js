import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB, isDBConnected } from './config/db.js';
import agentRoutes from './routes/agent.routes.js';
import contextRoutes from './routes/context.routes.js';
import eventRoutes from './routes/event.routes.js';
import actionRoutes from './routes/action.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: env.clientOrigin || true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ success: true, service: 'ambient-server', status: 'ok', storage: isDBConnected() ? 'mongodb' : 'in-memory', aiProvider: env.aiProvider }));
app.use('/api/agent', agentRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/actions', actionRoutes);
app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  await connectDB();
  app.listen(env.port, () => console.log(`Ambient API running at http://localhost:${env.port}`));
}

export default app;
