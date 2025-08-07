import { promises as fs } from "fs";
import path from "path";
import { Appointment } from "../appointments/appointments.types";
import { BlockedSlot } from "../blocked-slots/blocked-slots.types";
import { User } from "../users/users.types";

const dbPath = path.join(__dirname, "../../db.json");

export interface DbData {
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  users: User[];
}

export const readDb = async (): Promise<DbData> => {
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(data) as DbData;
  } catch (error) {
    console.error("Error reading db.json, returning empty data.", error);
    return { appointments: [], blockedSlots: [], users: [] };
  }
};

export const writeDb = async (data: DbData): Promise<void> => {
  try {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to db.json", error);
  }
};
