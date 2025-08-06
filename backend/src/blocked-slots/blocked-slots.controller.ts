
import { Request, Response } from 'express';
import * as blockedSlotService from './blocked-slots.service';

export const getAllBlockedSlots = async (req: Request, res: Response) => {
    const blockedSlots = await blockedSlotService.getAllBlockedSlots();
    res.json(blockedSlots);
};

export const createBlockedSlot = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約不可設定を作成できません。' });
    }
    const result = await blockedSlotService.createBlockedSlot(req.body, (req as any).user.name);
    res.status(201).json(result);
};

export const updateBlockedSlot = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約不可設定を更新できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const result = await blockedSlotService.updateBlockedSlot(id, req.body, (req as any).user.name);
    if (result) {
        res.json(result);
    } else {
        res.status(404).json({ message: 'Blocked slot not found' });
    }
};

export const deleteBlockedSlot = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約不可設定を削除できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const success = await blockedSlotService.deleteBlockedSlot(id, (req as any).user.name);
    if (success) {
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Blocked slot not found' });
    }
};

export const registerHolidays = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは操作できません。' });
    }
    try {
        const result = await blockedSlotService.registerHolidays((req as any).user.name);
        res.status(result.status).json({ message: result.message });
    } catch (error) {
        console.error('Error registering holidays:', error);
        res.status(500).json({ message: '祝日の登録中にエラーが発生しました。' });
    }
};
