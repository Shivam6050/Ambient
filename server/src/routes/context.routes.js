import { Router } from 'express';
import { getContext, updateContext } from '../controllers/context.controller.js';
const router=Router(); router.get('/',getContext); router.patch('/',updateContext); export default router;
