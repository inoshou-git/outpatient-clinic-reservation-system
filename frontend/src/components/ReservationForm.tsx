import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Alert,
  Checkbox,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { getAppointments } from "../services/api"; // Import getAppointments

import { Appointment, BlockedSlot } from "../types";

import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

interface ReservationFormProps {
  onFormSubmit: () => void;
  blockedSlots: BlockedSlot[];
  appointment?: Appointment | null;
  initialDate?: Dayjs | null;
  initialTime?: string | null;
}

// --- Constants ---
const consultationOptions = [
  "新患",
  "定期処方",
  "生活習慣",
  "特定健診",
  "企業健診",
  "健康診断",
  "その他",
];

// --- Time Slot Generation ---
const generateTimeSlots = (
  startHour: number = 9,
  startMinute: number = 30,
  endHour: number = 16,
  endMinute: number = 30
) => {
  const slots = [];
  let time = dayjs().hour(startHour).minute(startMinute).second(0);
  const endTime = dayjs().hour(endHour).minute(endMinute).second(0);
  const lunchStart = dayjs().hour(11).minute(45).second(0);
  const lunchEnd = dayjs().hour(13).minute(30).second(0);

  while (time.isBefore(endTime) || time.isSame(endTime)) {
    if (
      time.isBefore(lunchStart) ||
      time.isAfter(lunchEnd) ||
      time.isSame(lunchEnd)
    ) {
      slots.push(time.format("HH:mm"));
    }
    time = time.add(15, "minute");
  }
  return slots;
};

// --- Component ---
const ReservationForm: React.FC<ReservationFormProps> = ({
  onFormSubmit,
  blockedSlots,
  appointment,
  initialDate,
  initialTime,
}) => {
  const { token } = useAuth();
  const { showLoader, hideLoader, closeReservationForm } = useUI();
  const [reservationType, setReservationType] = useState<
    "outpatient" | "visit" | "rehab" | "special"
  >(appointment?.reservationType || "outpatient");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState("");
  const [startTimeRange, setStartTimeRange] = useState("");
  const [endTimeRange, setEndTimeRange] = useState("");
  const [consultation, setConsultation] = useState("");
  const [otherConsultation, setOtherConsultation] = useState("");
  const [sendNotification, setSendNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientIdError, setPatientIdError] = useState("");
  const [timeResetWarning, setTimeResetWarning] = useState("");
  const [rangeResetWarning, setRangeResetWarning] = useState("");
  const [existingAppointments, setExistingAppointments] = useState<
    Appointment[]
  >([]); // New state for existing appointments
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (date && token) {
        try {
          const fetchedAppointments = await getAppointments(
            token,
            date.format("YYYY-MM-DD")
          );
          setExistingAppointments(fetchedAppointments);
        } catch (err) {
          console.error("Failed to fetch existing appointments:", err);
          setExistingAppointments([]);
        }
      }
    };
    fetchAppointments();
  }, [date, token]);

  useEffect(() => {
    if (appointment) {
      setReservationType(appointment.reservationType || "outpatient");
      setPatientId(appointment.patientId || "");
      setPatientName(appointment.patientName || "");
      setFacilityName(appointment.facilityName || "");
      setDate(dayjs(appointment.date));
      setTime(appointment.time || "");
      setStartTimeRange(appointment.startTimeRange || "");
      setEndTimeRange(appointment.endTimeRange || "");

      const existingConsultation = appointment.consultation || "";
      if (consultationOptions.includes(existingConsultation)) {
        setConsultation(existingConsultation);
        setOtherConsultation("");
      } else if (existingConsultation) {
        setConsultation("その他");
        setOtherConsultation(existingConsultation);
      } else {
        setConsultation("");
        setOtherConsultation("");
      }
    } else {
      setReservationType("outpatient");
      setPatientId("");
      setPatientName("");
      setFacilityName("");
      setDate(initialDate || dayjs());
      setTime(initialTime || "");
      setStartTimeRange("");
      setEndTimeRange("");
      setConsultation("");
      setOtherConsultation("");
    }
  }, [appointment, initialDate, initialTime]);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  const validatePatientId = (id: string) => {
    if (id && !/^[0-9]*$/.test(id)) {
      setPatientIdError("患者IDは半角数字で入力してください。");
      return false;
    }
    setPatientIdError("");
    return true;
  };

  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPatientId = e.target.value;
    setPatientId(newPatientId);
    validatePatientId(newPatientId);
  };

  // --- Event Handlers ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!date || !patientName) {
      setError("日付と患者名は必須項目です。");
      return;
    }

    if (reservationType === "outpatient") {
      if (!validatePatientId(patientId)) return;
      if (!time) {
        setError("時間は必須項目です。");
        return;
      }
    } else if (reservationType === "visit" || reservationType === "rehab") {
      if (!startTimeRange || !endTimeRange) {
        setError("開始時間と終了時間は必須項目です。");
        return;
      }
      if (
        dayjs(startTimeRange, "HH:mm").isAfter(dayjs(endTimeRange, "HH:mm"))
      ) {
        setError("開始時間は終了時間より前に設定してください。");
        return;
      }
    }

    closeReservationForm();
    showLoader();

    const appointmentData: any = {
      date: date.format("YYYY-MM-DD"),
      reservationType,
      patientName,
      patientId,
      sendNotification,
    };

    if (reservationType === "outpatient") {
      appointmentData.time = time;
      appointmentData.consultation =
        consultation === "その他" ? otherConsultation : consultation;
    } else if (reservationType === "visit") {
      appointmentData.facilityName = facilityName;
      appointmentData.startTimeRange = startTimeRange;
      appointmentData.endTimeRange = endTimeRange;
      appointmentData.consultation =
        consultation === "その他" ? otherConsultation : consultation;
    } else if (reservationType === "rehab") {
      appointmentData.startTimeRange = startTimeRange;
      appointmentData.endTimeRange = endTimeRange;
    }

    const url = appointment
      ? `/api/appointments/${appointment.id}`
      : "/api/appointments";
    const method = appointment ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(appointmentData),
      });

      if (response.ok) {
        onFormSubmit();
      } else {
        const errorData = await response.json();
        setError(
          errorData.message ||
            (appointment
              ? "予約の更新に失敗しました。"
              : "予約の作成に失敗しました。")
        );
      }
    } catch (err) {
      setError("フォームの送信中にエラーが発生しました。");
      console.error("Error submitting form:", err);
    } finally {
      hideLoader();
    }
  };

  // --- Disabling Logic ---
  const shouldDisableDate = (day: Dayjs) => {
    const isWeekend = day.day() === 0 || day.day() === 6;
    const isBlockedAllDay = blockedSlots.some((slot) => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate
        ? dayjs(slot.endDate)
        : blockedStartDate;
      return (
        slot.startTime === null &&
        day.isBetween(
          blockedStartDate.startOf("day"),
          blockedEndDate.endOf("day"),
          null,
          "[]"
        )
      );
    });
    return isWeekend || isBlockedAllDay;
  };

  const availableTimeSlots = useMemo(() => {
    if (!date) return [];

    const dayBlockedSlots = blockedSlots.filter(
      (slot) => dayjs(slot.date).isSame(date, "day") && slot.startTime !== null
    );

    return allTimeSlots.filter((slotTime) => {
      const currentSlotTime = dayjs(`${date.format("YYYY-MM-DD")}T${slotTime}`);
      const isBlocked = dayBlockedSlots.some((blocked) => {
        const start = dayjs(`${blocked.date}T${blocked.startTime}`);
        const end = dayjs(`${blocked.date}T${blocked.endTime}`);
        return currentSlotTime.isBetween(start, end, null, "[)");
      });

      const isBooked = existingAppointments.some((appt) => {
        if (appointment && appt.id === appointment.id) {
          return false;
        }
        if (appt.reservationType === "outpatient" && appt.time) {
          return appt.time === slotTime;
        }
        return false;
      });

      return !isBlocked && !isBooked;
    });
  }, [date, blockedSlots, allTimeSlots, existingAppointments, appointment]);

  const availableVisitRehabTimeSlots = useMemo(() => {
    if (!date) return [];
    return allTimeSlots.filter((slotTime) => {
      const currentSlotTime = dayjs(`${date.format("YYYY-MM-DD")}T${slotTime}`);

      const isBooked = existingAppointments.some((appt) => {
        if (appointment && appt.id === appointment.id) {
          return false;
        }
        if (
          (appt.reservationType === "visit" ||
            appt.reservationType === "rehab") &&
          appt.startTimeRange &&
          appt.endTimeRange
        ) {
          const apptStart = dayjs(`${appt.date}T${appt.startTimeRange}`);
          const apptEnd = dayjs(`${appt.date}T${appt.endTimeRange}`);
          return (
            currentSlotTime.isBefore(apptEnd) &&
            currentSlotTime.add(15, "minute").isAfter(apptStart)
          );
        }
        return false;
      });
      return !isBooked;
    });
  }, [date, allTimeSlots, existingAppointments, appointment]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // When date changes, clear time and set generic warning
    setTime("");
    setStartTimeRange("");
    setEndTimeRange("");
    setTimeResetWarning("日付が変更されたため、時間を再選択してください。");
    setRangeResetWarning("日付が変更されたため、時間範囲を再選択してください。");
  }, [date]);

  // --- Render ---
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth required sx={{ mb: 2 }}>
          <InputLabel>予約種別</InputLabel>
          <Select
            value={reservationType}
            label="予約種別"
            onChange={(e: SelectChangeEvent) =>
              setReservationType(
                e.target.value as "outpatient" | "visit" | "rehab" | "special"
              )
            }
          >
            <MenuItem value="outpatient">外来診療</MenuItem>
            <MenuItem value="visit">訪問診療</MenuItem>
            <MenuItem value="rehab">通所リハ会議</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="患者ID (任意)"
          value={patientId}
          onChange={handlePatientIdChange}
          fullWidth
          sx={{ mb: 2 }}
          error={!!patientIdError}
          helperText={patientIdError}
        />

        <TextField
          label="患者名"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />

        {reservationType === "visit" && (
          <TextField
            label="施設名 (任意)"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
        )}

        <DatePicker
          label="日付"
          value={date}
          onChange={(newValue) => setDate(newValue)}
          shouldDisableDate={shouldDisableDate}
          sx={{ mb: 2, width: "100%" }}
        />

        {reservationType === "outpatient" && (
          <>
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>時間</InputLabel>
              <Select
                value={time}
                label="時間"
                onChange={(e: SelectChangeEvent) => {
                  setTime(e.target.value);
                  setTimeResetWarning("");
                }}
                disabled={!date}
              >
                {availableTimeSlots.map((slot) => (
                  <MenuItem key={slot} value={slot}>
                    {slot}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {timeResetWarning && (
              <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                {timeResetWarning}
              </Typography>
            )}
          </>
        )}

        {(reservationType === "visit" || reservationType === "rehab") && (
          <>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>開始時間</InputLabel>
                <Select
                  value={startTimeRange}
                  label="開始時間"
                  onChange={(e: SelectChangeEvent) => {
                    setStartTimeRange(e.target.value);
                    setRangeResetWarning("");
                  }}
                >
                  {availableVisitRehabTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>終了時間</InputLabel>
                <Select
                  value={endTimeRange}
                  label="終了時間"
                  onChange={(e: SelectChangeEvent) => {
                    setEndTimeRange(e.target.value);
                    setRangeResetWarning("");
                  }}
                >
                  {availableVisitRehabTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {rangeResetWarning && (
              <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                {rangeResetWarning}
              </Typography>
            )}
          </>
        )}

        {(reservationType === "outpatient" || reservationType === "visit") && (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>診察内容</InputLabel>
              <Select
                value={consultation}
                label="診察内容"
                onChange={(e: SelectChangeEvent) =>
                  setConsultation(e.target.value)
                }
              >
                {consultationOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {consultation === "その他" && (
              <TextField
                label="診察内容 (その他)"
                value={otherConsultation}
                onChange={(e) => setOtherConsultation(e.target.value)}
                fullWidth
                multiline
                rows={4}
                sx={{ mb: 2 }}
              />
            )}
          </>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
            />
          }
          label="関係者にメールで通知する"
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" fullWidth>
          {appointment ? "予約を更新する" : "予約を登録する"}
        </Button>
      </Box>
    </LocalizationProvider>
  );
};

export default ReservationForm;