import express from "express";
import {
  login,
  setPassword,
  getCurrentUser,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "./users.controller";
import { authenticateToken, adminOnly } from "../middleware/auth";

const router = express.Router();

router.post("/login", login);
router.post("/users/set-password", authenticateToken, setPassword);
router.get("/me", authenticateToken, getCurrentUser);
router.get("/users", authenticateToken, adminOnly, getAllUsers);
router.post("/users/create", authenticateToken, adminOnly, createUser);
router.put("/users/:userId", authenticateToken, adminOnly, updateUser);
router.delete("/users/:userId", authenticateToken, adminOnly, deleteUser);

export default router;
