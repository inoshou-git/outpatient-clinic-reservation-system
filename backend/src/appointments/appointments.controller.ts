import { Request, Response } from "express";
import * as appointmentService from "./appointments.service";

export const getAllAppointments = async (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  const appointments = await appointmentService.getAllAppointments(date);
  res.json(appointments);
};

export const createAppointment = async (req: Request, res: Response) => {
  console.log("createAppointment req.body:", req.body);
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を作成できません。" });
  }
  try {
    const result = await appointmentService.createAppointment(
      req.body,
      (req as any).user.name
    );
    if (result.error) {
      console.error("Error creating appointment:", result.error);
      return res.status(400).json({ message: result.error });
    }
    res.status(201).json(result.appointment);
  } catch (error) {
    console.error("Unhandled error creating appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  console.log("updateAppointment req.body:", req.body);
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を更新できません。" });
  }
  const id = parseInt(req.params.id, 10);
  try {
    const result = await appointmentService.updateAppointment(
      id,
      req.body,
      (req as any).user.name
    );

    if (result.error) {
      console.error("Error updating appointment:", result.error);
      return res.status(result.status || 400).json({ message: result.error });
    }
    if (result.appointment) {
      res.json(result.appointment);
    } else {
      res.status(404).json({ message: "Appointment not found" });
    }
  } catch (error) {
    console.error("Unhandled error updating appointment:", error);
    res.status(500).json({ message: "Internal server error" });
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
  console.log("createSpecialAppointment req.body:", req.body);
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を作成できません。" });
  }
  try {
    const result = await appointmentService.createSpecialAppointment(
      req.body,
      (req as any).user.name
    );
    if (result.error) {
      console.error("Error creating special appointment:", result.error);
      return res.status(400).json({ message: result.error });
    }
    res.status(201).json(result.appointment);
  } catch (error) {
    console.error("Unhandled error creating special appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSpecialAppointment = async (req: Request, res: Response) => {
  console.log("updateSpecialAppointment req.body:", req.body);
  if ((req as any).user.role === "viewer") {
    return res
      .status(403)
      .json({ message: "閲覧ユーザーは予約を更新できません。" });
  }
  const id = parseInt(req.params.id, 10);
  try {
    const result = await appointmentService.updateSpecialAppointment(
      id,
      req.body,
      (req as any).user.name
    );

    if (result.error) {
      console.error("Error updating special appointment:", result.error);
      return res.status(result.status || 400).json({ message: result.error });
    }
    if (result.appointment) {
      res.json(result.appointment);
    } else {
      res.status(404).json({ message: "Appointment not found" });
    }
  } catch (error) {
    console.error("Unhandled error updating special appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
