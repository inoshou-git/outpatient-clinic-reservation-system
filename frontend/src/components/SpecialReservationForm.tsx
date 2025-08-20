import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { createSpecialAppointment, updateSpecialAppointment } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import dayjs, { Dayjs } from "dayjs";
import { Appointment } from "../types";

interface SpecialReservationFormProps {
  onFormSubmit: () => void;
  appointment?: Appointment | null;
}

const SpecialReservationForm: React.FC<SpecialReservationFormProps> = ({
  onFormSubmit,
  appointment,
}) => {
  const { token } = useAuth();
  const { showLoader, hideLoader } = useUI();
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [timeError, setTimeError] = useState("");
  const [patientIdError, setPatientIdError] = useState("");

  useEffect(() => {
    if (appointment) {
      setPatientId(appointment.patientId || "");
      setPatientName(appointment.patientName || "");
      setDate(dayjs(appointment.date));
      setTime(appointment.time || "");
      setReason(appointment.reason || "");
    }
  }, [appointment]);

  const validateTime = (time: string) => {
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      setTimeError("時間はHH:mm形式で入力してください。");
      return false;
    }
    setTimeError("");
    return true;
  };

  const validatePatientId = (id: string) => {
    if (!/^[0-9]*$/.test(id)) {
      setPatientIdError("患者IDは半角数字で入力してください。");
      return false;
    }
    setPatientIdError("");
    return true;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    validateTime(newTime);
  };

  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPatientId = e.target.value;
    setPatientId(newPatientId);
    validatePatientId(newPatientId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTime(time) || !validatePatientId(patientId) || !date) return;

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
    } catch (error) {
      console.error("Failed to save special appointment", error);
      alert("特別予約の保存に失敗しました。");
    } finally {
      hideLoader();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="患者ID"
            value={patientId}
            onChange={handlePatientIdChange}
            required
            error={!!patientIdError}
            helperText={patientIdError}
          />
          <TextField
            label="患者名"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            required
          />
          <DatePicker
            label="日付"
            value={date}
            onChange={(newDate) => setDate(newDate)}
            sx={{ width: "100%" }}
          />
          <TextField
            label="時間"
            value={time}
            onChange={handleTimeChange}
            required
            placeholder="HH:mm"
            error={!!timeError}
            helperText={timeError}
          />
          <TextField
            label="理由"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
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
            label="通知を送信する"
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
