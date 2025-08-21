import { Appointment, BlockedSlot, User } from "../types";

const API_BASE_URL = "/api";

interface ApiConfig {
  method: string;
  headers: {
    "Content-Type": string;
    Authorization?: string;
  };
  body?: string;
}

const callApi = async <T>(
  endpoint: string,
  token: string | null,
  config: Partial<ApiConfig> = {}
): Promise<T> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...config,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "API call failed");
  }

  if (response.status === 204) {
    return {} as T; // または適切な空のオブジェクトを返す
  }

  return response.json();
};

// Appointments
export const getAppointments = (
  token: string | null,
  date?: string
): Promise<Appointment[]> => {
  const endpoint = date ? `/appointments?date=${date}` : "/appointments";
  return callApi<Appointment[]>(endpoint, token);
};

export const createAppointment = (
  appointment: Partial<Appointment>,
  token: string | null
): Promise<Appointment> => {
  return callApi<Appointment>("/appointments", token, {
    method: "POST",
    body: JSON.stringify(appointment),
  });
};

export const updateAppointment = (
  id: number,
  appointment: Partial<Appointment>,
  token: string | null
): Promise<Appointment> => {
  return callApi<Appointment>(`/appointments/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(appointment),
  });
};

export const deleteAppointment = (
  id: number,
  token: string | null
): Promise<void> => {
  return callApi<void>(`/appointments/${id}`, token, { method: "DELETE" });
};

export const createSpecialAppointment = (
  appointment: Partial<Appointment>,
  token: string | null
): Promise<Appointment> => {
  return callApi<Appointment>("/appointments/special", token, {
    method: "POST",
    body: JSON.stringify(appointment),
  });
};

export const updateSpecialAppointment = (
  id: number,
  appointment: Partial<Appointment>,
  token: string | null
): Promise<Appointment> => {
  return callApi<Appointment>(`/appointments/special/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(appointment),
  });
};

// Blocked Slots
export const getBlockedSlots = (
  token: string | null
): Promise<BlockedSlot[]> => {
  return callApi<BlockedSlot[]>("/blocked-slots", token);
};

export const createBlockedSlot = (
  blockedSlot: Partial<BlockedSlot>,
  token: string | null
): Promise<BlockedSlot> => {
  return callApi<BlockedSlot>("/blocked-slots", token, {
    method: "POST",
    body: JSON.stringify(blockedSlot),
  });
};

export const updateBlockedSlot = (
  id: number,
  blockedSlot: Partial<BlockedSlot>,
  token: string | null
): Promise<BlockedSlot> => {
  return callApi<BlockedSlot>(`/blocked-slots/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(blockedSlot),
  });
};

export const deleteBlockedSlot = (
  id: number,
  token: string | null
): Promise<void> => {
  return callApi<void>(`/blocked-slots/${id}`, token, { method: "DELETE" });
};

export const registerHolidays = (
  token: string | null
): Promise<{ message: string }> => {
  return callApi<{ message: string }>(
    "/blocked-slots/register-holidays",
    token,
    { method: "POST" }
  );
};

// Users
export const loginUser = (
  userId: string,
  password?: string
): Promise<{ token: string; user: User; mustChangePassword?: boolean }> => {
  return callApi<{ token: string; user: User; mustChangePassword?: boolean }>(
    "/login",
    null,
    { method: "POST", body: JSON.stringify({ userId, password }) }
  );
};

export const setPassword = (
  newPassword: string,
  token: string | null
): Promise<void> => {
  return callApi<void>("/users/set-password", token, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
};

export const getCurrentUser = (token: string | null): Promise<User> => {
  return callApi<User>("/me", token);
};

export const getAllUsers = (token: string | null): Promise<User[]> => {
  return callApi<User[]>("/users", token);
};

export const createUser = (
  user: Partial<User>,
  token: string | null
): Promise<User> => {
  return callApi<User>("/users/create", token, {
    method: "POST",
    body: JSON.stringify(user),
  });
};

export const updateUser = (
  userId: string,
  user: Partial<User>,
  token: string | null
): Promise<User> => {
  return callApi<User>(`/users/${userId}`, token, {
    method: "PUT",
    body: JSON.stringify(user),
  });
};

export const deleteUser = (
  userId: string,
  token: string | null
): Promise<void> => {
  return callApi<void>(`/users/${userId}`, token, { method: "DELETE" });
};
