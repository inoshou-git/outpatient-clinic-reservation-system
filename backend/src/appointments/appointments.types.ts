export interface Appointment {
  id: number;
  patientId?: string;
  patientName?: string;
  date: string;
  time?: string;
  consultation?: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
  reservationType: "outpatient" | "visit" | "rehab";
  facilityName?: string;
  startTimeRange?: string;
  endTimeRange?: string;
}
