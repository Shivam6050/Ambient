import { Router } from 'express';
import { createEvent, getEventsList, getEventHistory, dismiss } from '../controllers/event.controller.js';
const router = Router();
router.get('/history', getEventHistory);
router.get('/', getEventsList);
router.post('/', createEvent);
router.post('/:id/dismiss', dismiss);
export default router;
