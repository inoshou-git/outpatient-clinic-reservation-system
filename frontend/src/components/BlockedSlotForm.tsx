import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Typography,
  Alert,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { getAppointments, getBlockedSlots } from "../services/api";
import { BlockedSlot, Appointment } from "../types";

dayjs.extend(isBetween);

interface BlockedSlotFormProps {
  onFormSubmit: () => void;
  blockedSlot?: BlockedSlot | null;
}

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

const BlockedSlotForm: React.FC<BlockedSlotFormProps> = ({
  onFormSubmit,
  blockedSlot,
}) => {
  const { token } = useAuth();
  const { showLoader, hideLoader, closeBlockedSlotForm } = useUI();
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictingAppointments, setConflictingAppointments] = useState<
    Appointment[]
  >([]);
  const [existingBlockedSlots, setExistingBlockedSlots] = useState<
    BlockedSlot[]
  >([]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [timeResetWarning, setTimeResetWarning] = useState("");
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchBlockedSlots = async () => {
      if (token) {
        try {
          const slots = await getBlockedSlots(token);
          setExistingBlockedSlots(slots);
        } catch (err) {
          console.error("Failed to fetch blocked slots", err);
        }
      }
    };
    fetchBlockedSlots();
  }, [token]);

  useEffect(() => {
    if (blockedSlot) {
      setStartDate(dayjs(blockedSlot.date));
      setEndDate(blockedSlot.endDate ? dayjs(blockedSlot.endDate) : null);
      setStartTime(blockedSlot.startTime);
      setEndTime(blockedSlot.endTime);
      setReason(blockedSlot.reason);
      setIsAllDay(blockedSlot.startTime === null);
    } else {
      setStartDate(dayjs());
      setEndDate(null);
      setStartTime(null);
      setEndTime(null);
      setReason("");
      setIsAllDay(false);
    }
  }, [blockedSlot]);

  useEffect(() => {
    const fetchAndCheckAppointments = async () => {
      if (!startDate || !token) {
        setConflictingAppointments([]);
        return;
      }

      if (!isAllDay && (!startTime || !endTime)) {
        setConflictingAppointments([]);
        return;
      }

      try {
        let appointmentsInRange: Appointment[] = [];
        if (isAllDay) {
          const blockStart = startDate.startOf("day");
          const blockEnd = (endDate || startDate).endOf("day");

          let currentDate = blockStart.clone();
          while (
            currentDate.isBefore(blockEnd) ||
            currentDate.isSame(blockEnd, "day")
          ) {
            const dailyAppointments = await getAppointments(
              token,
              currentDate.format("YYYY-MM-DD")
            );
            appointmentsInRange.push(...dailyAppointments);
            currentDate = currentDate.add(1, "day");
          }
        } else {
          appointmentsInRange = await getAppointments(
            token,
            startDate.format("YYYY-MM-DD")
          );
        }

        const conflicts = appointmentsInRange.filter((appointment) => {
          if (isAllDay) {
            const blockStart = startDate.startOf("day");
            const blockEnd = (endDate || startDate).endOf("day");
            const appointmentDate = dayjs(appointment.date);
            return appointmentDate.isBetween(blockStart, blockEnd, "day", "[]");
          } else {
            if (!startTime || !endTime) return false;
            const blockStart = dayjs(
              `${startDate.format("YYYY-MM-DD")}T${startTime}`
            );
            const blockEnd = dayjs(
              `${startDate.format("YYYY-MM-DD")}T${endTime}`
            );

            if (!dayjs(appointment.date).isSame(startDate, "day")) {
              return false;
            }

            switch (appointment.reservationType) {
              case "outpatient":
              case "special":
                if (!appointment.time) return false;
                const appointmentTime = dayjs(
                  `${appointment.date}T${appointment.time}`
                );
                return appointmentTime.isBetween(blockStart, blockEnd, null, "[)");

              case "visit":
              case "rehab":
                if (!appointment.startTimeRange || !appointment.endTimeRange)
                  return false;
                const apptStart = dayjs(
                  `${appointment.date}T${appointment.startTimeRange}`
                );
                const apptEnd = dayjs(
                  `${appointment.date}T${appointment.endTimeRange}`
                );
                return blockStart.isBefore(apptEnd) && blockEnd.isAfter(apptStart);

              default:
                return false;
            }
          }
        });
        setConflictingAppointments(conflicts);
      } catch (err) {
        console.error("Failed to fetch appointments for conflict check", err);
        setConflictingAppointments([]);
      }
    };

    fetchAndCheckAppointments();
  }, [startDate, endDate, startTime, endTime, isAllDay, token]);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  const shouldDisableDate = (day: Dayjs) => {
    const isWeekend = day.day() === 0 || day.day() === 6;
    const isAlreadyBlocked = existingBlockedSlots.some((slot) => {
      if (slot.id === blockedSlot?.id) return false;
      if (slot.startTime) return false;
      const blockedStart = dayjs(slot.date).startOf("day");
      const blockedEnd = slot.endDate
        ? dayjs(slot.endDate).endOf("day")
        : blockedStart;
      return day.isBetween(blockedStart, blockedEnd, "day", "[]");
    });
    return isWeekend || isAlreadyBlocked;
  };

  const availableTimeSlots = useMemo(() => {
    if (!startDate) return [];

    const dayBlockedSlots = existingBlockedSlots.filter((slot) => {
      if (slot.id === blockedSlot?.id) return false;
      return dayjs(slot.date).isSame(startDate, "day") && slot.startTime;
    });

    return allTimeSlots.filter((slotTime) => {
      const currentSlot = dayjs(`${startDate.format("YYYY-MM-DD")}T${slotTime}`);
      const isBlocked = dayBlockedSlots.some((blocked) => {
        if (!blocked.startTime || !blocked.endTime) return false;
        const start = dayjs(`${blocked.date}T${blocked.startTime}`);
        const end = dayjs(`${blocked.date}T${blocked.endTime}`);
        return currentSlot.isBetween(start, end, null, "[)");
      });
      return !isBlocked;
    });
  }, [startDate, existingBlockedSlots, allTimeSlots, blockedSlot]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setStartTime(null);
    setEndTime(null);
    setTimeResetWarning(
      "日付が変更されたため、時間範囲を再選択してください。"
    );
  }, [startDate]);

  const proceedToSubmit = async () => {
    if (!startDate || !reason) {
      setError("開始日と理由を入力してください。");
      return;
    }

    if (isAllDay && endDate && startDate.isAfter(endDate)) {
      setError("開始日は終了日より前である必要があります。");
      return;
    }

    if (!isAllDay && (!startTime || !endTime)) {
      setError(
        "開始時間と終了時間を入力するか、終日予約不可を選択してください。"
      );
      return;
    }

    if (!isAllDay && startTime && endTime && startTime >= endTime) {
      setError("開始時間は終了時間より前である必要があります。");
      return;
    }

    closeBlockedSlotForm();
    showLoader();

    const blockedSlotData = {
      date: startDate.format("YYYY-MM-DD"),
      endDate: isAllDay && endDate ? endDate.format("YYYY-MM-DD") : null,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime,
      reason,
      sendNotification,
    };

    const url = blockedSlot
      ? `/api/blocked-slots/${blockedSlot.id}`
      : "/api/blocked-slots";
    const method = blockedSlot ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(blockedSlotData),
      });

      if (response.ok) {
        onFormSubmit();
      } else {
        const errorData = await response.json();
        setError(
          errorData.message ||
            (blockedSlot ? "更新に失敗しました。" : "登録に失敗しました。")
        );
      }
    } catch (err) {
      setError("フォームの送信中にエラーが発生しました。");
      console.error("Error submitting form:", err);
    } finally {
      hideLoader();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (conflictingAppointments.length > 0) {
      setConfirmationOpen(true);
    } else {
      proceedToSubmit();
    }
  };

  const handleConfirm = () => {
    setConfirmationOpen(false);
    proceedToSubmit();
  };

  const handleCancel = () => {
    setConfirmationOpen(false);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="h6" sx={{ mb: 2 }}>
          {blockedSlot ? "予約不可設定の編集" : "予約不可設定の登録"}
        </Typography>
        <DatePicker
          label="開始日"
          value={startDate}
          onChange={(newValue) => setStartDate(newValue)}
          shouldDisableDate={shouldDisableDate}
          sx={{ mb: 2, width: "100%" }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
            />
          }
          label="終日予約不可"
          sx={{ mb: 2 }}
        />
        {isAllDay && (
          <DatePicker
            label="終了日"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            shouldDisableDate={shouldDisableDate}
            minDate={startDate || undefined}
            sx={{ mb: 2, width: "100%" }}
          />
        )}
        {!isAllDay && (
          <>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>開始時間</InputLabel>
                <Select
                  value={startTime || ""}
                  label="開始時間"
                  onChange={(e: SelectChangeEvent) => {
                    setStartTime(e.target.value);
                    setTimeResetWarning("");
                  }}
                >
                  {availableTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>終了時間</InputLabel>
                <Select
                  value={endTime || ""}
                  label="終了時間"
                  onChange={(e: SelectChangeEvent) => {
                    setEndTime(e.target.value);
                    setTimeResetWarning("");
                  }}
                >
                  {availableTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {timeResetWarning && (
              <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                {timeResetWarning}
              </Typography>
            )}
          </>
        )}
        {conflictingAppointments.length > 0 && !confirmationOpen && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            この期間には{conflictingAppointments.length}
            件の予約が既に存在します。
          </Alert>
        )}
        <TextField
          label="理由"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
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
          {blockedSlot ? "更新" : "登録"}
        </Button>
      </Box>

      <Dialog open={confirmationOpen} onClose={handleCancel}>
        <DialogTitle>予約の競合</DialogTitle>
        <DialogContent>
          <DialogContentText>
            指定された期間には{conflictingAppointments.length}
            件の予約が既に存在します。
            <br />
            本当にこの期間を予約不可に設定しますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>キャンセル</Button>
          <Button onClick={handleConfirm} color="primary" autoFocus>
            続行
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default BlockedSlotForm;