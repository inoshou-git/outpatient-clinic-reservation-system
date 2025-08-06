
import { Request, Response } from 'express';
import * as appointmentService from './appointments.service';

export const getAllAppointments = async (req: Request, res: Response) => {
    const appointments = await appointmentService.getAllAppointments();
    res.json(appointments);
};

export const createAppointment = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約を作成できません。' });
    }
    const result = await appointmentService.createAppointment(req.body, (req as any).user.name);
    if (result.error) {
        return res.status(400).json({ message: result.error });
    }
    res.status(201).json(result.appointment);
};

export const updateAppointment = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約を更新できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const result = await appointmentService.updateAppointment(id, req.body, (req as any).user.name);

    if (result.error) {
        return res.status(result.status || 400).json({ message: result.error });
    }
    if (result.appointment) {
        res.json(result.appointment);
    } else {
        res.status(404).json({ message: 'Appointment not found' });
    }
};

export const deleteAppointment = async (req: Request, res: Response) => {
    if ((req as any).user.role === 'viewer') {
        return res.status(403).json({ message: '閲覧ユーザーは予約を削除できません。' });
    }
    const id = parseInt(req.params.id, 10);
    const success = await appointmentService.deleteAppointment(id, (req as any).user.name);
    if (success) {
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Appointment not found' });
    }
};
