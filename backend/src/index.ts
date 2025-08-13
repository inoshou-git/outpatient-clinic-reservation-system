import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server, Socket } from "socket.io";

import usersRouter from "./users/users.routes";
import appointmentsRouter from "./appointments/appointments.routes";
import blockedSlotsRouter from "./blocked-slots/blocked-slots.routes";

dotenv.config();

const app = express();
const port = 3334;

app.use(cors());
app.use(express.json());

app.use("/api", usersRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/blocked-slots", blockedSlotsRouter);

const httpServer = http.createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust this to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on http://localhost:${port}`);
});
