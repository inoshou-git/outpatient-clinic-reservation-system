
import express from 'express';
import { getAllBlockedSlots, createBlockedSlot, updateBlockedSlot, deleteBlockedSlot, registerHolidays } from './blocked-slots.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', getAllBlockedSlots);
router.post('/', authenticateToken, createBlockedSlot);
router.put('/:id', authenticateToken, updateBlockedSlot);
router.delete('/:id', authenticateToken, deleteBlockedSlot);
router.post('/register-holidays', authenticateToken, registerHolidays);

export default router;
