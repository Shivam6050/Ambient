import { Router } from 'express';
import { createEvent, getEvents, dismiss } from '../controllers/event.controller.js';
const router = Router();
router.get('/', getEvents);
router.post('/', createEvent);
router.post('/:id/dismiss', dismiss);
export default router;
