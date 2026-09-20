import { Router } from 'express';
import { getContext, patchContext } from '../controllers/context.controller.js';

const router = Router();
router.get('/', getContext);
router.patch('/', patchContext);

export default router;
