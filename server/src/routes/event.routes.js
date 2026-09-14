import { Router } from 'express';
import { createEvent } from '../controllers/event.controller.js';
const router=Router(); router.post('/',createEvent); export default router;
