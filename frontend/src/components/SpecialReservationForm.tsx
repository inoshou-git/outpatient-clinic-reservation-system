import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  Alert,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import {
  createSpecialAppointment,
  updateSpecialAppointment,
} from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import dayjs, { Dayjs } from "dayjs";
import { Appointment, BlockedSlot } from "../types";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

interface SpecialReservationFormProps {
  onFormSubmit: () => void;
  appointment?: Appointment | null;
  blockedSlots: BlockedSlot[];
}

const SpecialReservationForm: React.FC<SpecialReservationFormProps> = ({
  onFormSubmit,
  appointment,
  blockedSlots,
}) => {
  const { token } = useAuth();
  const { showLoader, hideLoader } = useUI();
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [sendNotification, setSendNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState("");
  const [patientIdError, setPatientIdError] = useState("");

  const shouldDisableDate = (day: Dayjs) => {
    const isWeekend = day.day() === 0 || day.day() === 6; // Sunday (0) or Saturday (6)
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

  useEffect(() => {
    if (appointment) {
      setPatientId(appointment.patientId || "");
      setPatientName(appointment.patientName || "");
      setDate(dayjs(appointment.date));
      setTime(appointment.time || "");
      setReason(appointment.reason || "");
    }
  }, [appointment]);

  const validateTime = (timeStr: string) => {
    if (!timeStr) {
      setTimeError("時間は必須項目です。");
      return false;
    }
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) {
      setTimeError("時間はHH:mm形式で入力してください。");
      return false;
    }
    setTimeError("");
    return true;
  };

  const validatePatientId = (id: string) => {
    if (id && !/^[0-9]*$/.test(id)) {
      setPatientIdError("患者IDは半角数字で入力してください。");
      return false;
    }
    setPatientIdError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isTimeFormatValid = validateTime(time);
    const isPatientIdFormatValid = validatePatientId(patientId);

    if (!patientName || !date || !time) {
      setError("患者名、日付、時間は必須項目です。");
      return;
    }

    if (!isTimeFormatValid || !isPatientIdFormatValid) {
      setError("入力形式が正しくない項目があります。");
      return;
    }

    showLoader();
    onFormSubmit();

    try {
      const appointmentData: Partial<Appointment> = {
        patientId,
        patientName,
        date: date.format("YYYY-MM-DD"),
        time,
        reason,
        sendNotification,
        reservationType: "special",
      };

      if (appointment) {
        appointmentData.id = appointment.id;
        await updateSpecialAppointment(appointment.id, appointmentData, token);
      } else {
        await createSpecialAppointment(appointmentData, token);
      }
    } catch (err) {
      console.error("Failed to save special appointment", err);
      setError("特別予約の保存に失敗しました。");
    } finally {
      hideLoader();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit} noValidate>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="患者ID (任意)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            error={!!patientIdError}
            helperText={patientIdError}
          />
          <TextField
            label="患者名"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
          <DatePicker
            label="日付"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            shouldDisableDate={shouldDisableDate}
            sx={{ width: "100%" }}
          />
          <TextField
            label="時間"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="HH:mm"
            error={!!timeError}
            helperText={timeError}
          />
          <TextField
            label="理由 (任意)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={3}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
              />
            }
            label="関係者にメールで通知する"
          />
          <Button type="submit" variant="contained">
            {appointment ? "更新" : "登録"}
          </Button>
        </Box>
      </form>
    </LocalizationProvider>
  );
};

export default SpecialReservationForm;