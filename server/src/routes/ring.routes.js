import { Router } from 'express';
import { ringStatus, ringWebhook } from '../controllers/ring.controller.js';

const router = Router();
router.get('/status', ringStatus);
router.post('/webhook', ringWebhook);
export default router;
