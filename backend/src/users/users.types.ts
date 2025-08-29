export interface User {
  userid: string;
  password?: string;
  name: string;
  department: string;
  email: string;
  role: "admin" | "general" | "viewer";
  mustChangePassword?: boolean;
  isDeleted?: boolean;
  lastUpdatedBy?: string | null;
  email_status?: string | null;
  createdAt?: string;
  lastUpdatedAt?: string;
}
