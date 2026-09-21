import { Router } from 'express';
import { getContextController, patchContext } from '../controllers/context.controller.js';
const router = Router();
router.get('/', getContextController);
router.patch('/', patchContext);
export default router;
