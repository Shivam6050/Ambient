import { Router } from 'express';
import { evaluateAgent, generateInsight, getAgentStatus } from '../controllers/agent.controller.js';

const router = Router();
router.post('/evaluate', evaluateAgent);
router.post('/insight', generateInsight);
router.get('/status', getAgentStatus);

export default router;
