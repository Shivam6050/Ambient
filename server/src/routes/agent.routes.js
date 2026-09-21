import { Router } from 'express';
import { evaluateAgent, generateInsight, getAgentStatus } from '../controllers/agent.controller.js';
const router = Router();
router.get('/status', getAgentStatus);
router.post('/evaluate', evaluateAgent);
router.post('/insight', generateInsight);
export default router;
