import { Request, Response } from "express";
import * as appointmentService from "./appointments.service";

export const getAllAppointments = async (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  const appointments = await appointmentService.getAllAppointments(date);
  res.json(appointments);
};

export const createAppointment = async (req: Request, res: Response) => {
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を作成できません。" });
  }
  try {
    const appointment = await appointmentService.createAppointment(
      req.body,
      (req as any).user.name
    );
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を更新できません。" });
  }
  try {
    const id = parseInt(req.params.id, 10);
    const appointment = await appointmentService.updateAppointment(
      id,
      req.body,
      (req as any).user.name
    );
    res.json(appointment);
  } catch (error: any) {
    if (error.message === "Appointment not found") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を削除できません。" });
  }
  const id = parseInt(req.params.id, 10);
  const { sendNotification } = req.body;
  const success = await appointmentService.deleteAppointment(
    id,
    (req as any).user.name,
    sendNotification
  );
  if (success) {
    res.status(204).send();
  } else {
    res.status(404).json({ message: "Appointment not found" });
  }
};

export const createSpecialAppointment = async (req: Request, res: Response) => {
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を作成できません。" });
  }
  try {
    const appointment = await appointmentService.createSpecialAppointment(
      req.body,
      (req as any).user.name
    );
    res.status(201).json(appointment);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateSpecialAppointment = async (req: Request, res: Response) => {
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を更新できません。" });
  }
  try {
    const id = parseInt(req.params.id, 10);
    const appointment = await appointmentService.updateSpecialAppointment(
      id,
      req.body,
      (req as any).user.name
    );
    res.json(appointment);
  } catch (error: any) {
    if (error.message === "Special Appointment not found") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
};

export const bulkUpdateAppointments = async (req: Request, res: Response) => {
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を更新できません。" });
  }
  try {
    const { appointmentIds, consultation } = req.body;
    const count = await appointmentService.bulkUpdateAppointments(
      appointmentIds,
      consultation,
      (req as any).user.name
    );
    res.json({ count });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
