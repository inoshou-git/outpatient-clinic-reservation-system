import express from "express";
import {
  getAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  createSpecialAppointment,
  updateSpecialAppointment,
} from "./appointments.controller";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.get("/", getAllAppointments);
router.post("/", authenticateToken, createAppointment);
router.post("/special", authenticateToken, createSpecialAppointment);
router.put("/special/:id", authenticateToken, updateSpecialAppointment);
router.put("/:id", authenticateToken, updateAppointment);
router.delete("/:id", authenticateToken, deleteAppointment);

export default router;
