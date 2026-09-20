import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB, isDBConnected } from './config/db.js';
import eventRoutes from './routes/event.routes.js';
import contextRoutes from './routes/context.routes.js';
import agentRoutes from './routes/agent.routes.js';
import actionRoutes from './routes/action.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const app = express();

app.use(cors({ origin: env.clientOrigin || '*' }));
app.use(express.json());

// Unified Health Check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'ambient-server',
    status: 'ok',
    storage: isDBConnected() ? 'mongodb' : 'in-memory',
    aiProvider: env.aiProvider
  });
});

// Mounted feature routers
app.use('/api/events', eventRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/actions', actionRoutes);

// Centralized error handling
app.use(errorMiddleware);

// Server startup for non-test environments
if (process.env.NODE_ENV !== 'test') {
  connectDB().catch((err) => {
    console.error('Initial MongoDB connection attempt error:', err.message);
  });
  app.listen(env.port, () => {
    console.log(`Ambient server ready on http://localhost:${env.port} (AI: ${env.aiProvider})`);
  });
}

export default app;
