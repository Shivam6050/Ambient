import { Router } from 'express';
import { evaluateAgent, getAgentStatus } from '../controllers/agent.controller.js';

const router = Router();
router.post('/evaluate', evaluateAgent);
router.get('/status', getAgentStatus);

export default router;
