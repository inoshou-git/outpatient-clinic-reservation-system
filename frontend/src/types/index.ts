export interface Appointment {
  id: number;
  patientId?: string;
  patientName?: string;
  date: string;
  time?: string;
  consultation?: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
  reservationType?: "outpatient" | "visit" | "rehab" | "special";
  facilityName?: string;
  startTimeRange?: string;
  endTimeRange?: string;
  reason?: string;
  sendNotification?: boolean;
}

export interface SpecialAppointment {
  id: number;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  reason: string;
  reservationType: "special";
}

export interface BlockedSlot {
  id: number;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

export interface User {
  userId: string;
  password?: string;
  name: string;
  department: string;
  email: string;
  role: "admin" | "general" | "viewer";
  mustChangePassword?: boolean;
  isDeleted?: boolean;
  lastUpdatedBy?: string;
  email_status?: string;
}
