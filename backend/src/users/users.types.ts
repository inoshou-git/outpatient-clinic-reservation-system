
export interface User {
  userId: string;
  password?: string;
  name: string;
  department: string;
  email: string;
  role: 'admin' | 'general' | 'viewer';
  mustChangePassword?: boolean;
  isDeleted?: boolean;
  lastUpdatedBy?: string;
  email_status?: string; 
}
