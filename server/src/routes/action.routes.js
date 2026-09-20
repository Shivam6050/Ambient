import { Router } from 'express';
import { getActionCapabilitiesController } from '../controllers/action.controller.js';

const router = Router();
router.get('/capabilities', getActionCapabilitiesController);

export default router;
