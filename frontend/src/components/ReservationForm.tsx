import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  ListItemText,
} from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { getAppointments, createAppointment, updateAppointment } from "../services/api";

import { Appointment, BlockedSlot } from "../types";

import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import 'dayjs/locale/ja';

dayjs.extend(isBetween);

interface ReservationFormProps {
  onFormSubmit: () => void;
  blockedSlots: BlockedSlot[];
  appointment?: Appointment | null;
  initialDate?: Dayjs | null;
  initialTime?: string | null;
}

const consultationOptions = [
  "VF",
  "生活習慣",
  "入職時健診",
  "健康診断",
  "企業健診",
  "特定健診",
  "帯状疱疹(生ワクチン)",
  "帯状疱疹(シングリックス1回目)",
  "帯状疱疹(シングリックス2回目)",
  "コロナ",
  "肺炎球菌",
  "インフルエンザ",
  "定期処方",
  "整形",
  "採血のみ",
  "新患",
  "その他(直接入力)",
];

const generateTimeSlots = (
  startHour: number = 9,
  startMinute: number = 30,
  endHour: number = 16,
  endMinute: number = 45
) => {
  const slots = [];
  let time = dayjs().hour(startHour).minute(startMinute).second(0);
  const endTime = dayjs().hour(endHour).minute(endMinute).second(0);
  const lunchStart = dayjs().hour(11).minute(45).second(0);
  const lunchEnd = dayjs().hour(13).minute(30).second(0);

  while (time.isBefore(endTime) || time.isSame(endTime)) {
    slots.push(time.format("HH:mm"));
    time = time.add(15, "minute");
  }
  return slots;
};

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
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState("");
  const [startTimeRange, setStartTimeRange] = useState("");
  const [endTimeRange, setEndTimeRange] = useState("");
  const [consultation, setConsultation] = useState<string[]>([]);
  const [otherConsultation, setOtherConsultation] = useState("");
  const [sendNotification, setSendNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientIdError, setPatientIdError] = useState("");
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [feverClinicWarning, setFeverClinicWarning] = useState<string | null>(null);
  const [consultationSelectOpen, setConsultationSelectOpen] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  const filteredTimeSlotsForStart = useMemo(() => {
    const lunchStart = dayjs().hour(12).minute(0).second(0);
    const lunchEnd = dayjs().hour(13).minute(30).second(0);
    return allTimeSlots.filter(slot => {
      const slotTime = dayjs().hour(parseInt(slot.substring(0, 2))).minute(parseInt(slot.substring(3, 5))).second(0);
      return !slotTime.isBetween(lunchStart, lunchEnd, null, "[)");
    });
  }, [allTimeSlots]);

  const checkConflicts = useCallback((
    currentReservationType: "outpatient" | "visit" | "rehab" | "special",
    currentDate: Dayjs | null,
    currentTime: string,
    currentStartTimeRange: string,
    currentEndTimeRange: string,
    existingAppointments: Appointment[],
    blockedSlots: BlockedSlot[],
    currentAppointmentId?: number
  ): number => {
    if (currentReservationType === "special" || !currentDate) {
      return 0;
    }
    if (currentReservationType === "outpatient" && !currentTime) {
      return 0;
    }
    if ((currentReservationType === "visit" || currentReservationType === "rehab") && (!currentStartTimeRange || !currentEndTimeRange)) {
      return 0;
    }

    let conflicts = 0;
    existingAppointments.forEach(appt => {
      if (appt.id === currentAppointmentId) return;
      if (currentReservationType === "outpatient" && currentTime) {
        if (appt.reservationType === "outpatient" && appt.time === currentTime) {
          conflicts++;
        }
        if ((appt.reservationType === "visit" || appt.reservationType === "rehab") && appt.startTimeRange && appt.endTimeRange) {
          const apptStart = dayjs(`${appt.date}T${appt.startTimeRange}`);
          const apptEnd = dayjs(`${appt.date}T${appt.endTimeRange}`);
          const selectedTime = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentTime}`);
          if (selectedTime.isBetween(apptStart, apptEnd, null, "[)")) {
            conflicts++;
          }
        }
      } else if ((currentReservationType === "visit" || currentReservationType === "rehab") && currentStartTimeRange && currentEndTimeRange) {
        const selectedStart = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentStartTimeRange}`);
        const selectedEnd = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentEndTimeRange}`);
        if (appt.reservationType === "outpatient" && appt.time) {
          const apptTime = dayjs(`${appt.date}T${appt.time}`);
          if (apptTime.isBetween(selectedStart, selectedEnd, null, "[)")) {
            conflicts++;
          }
        }
        if ((appt.reservationType === "visit" || appt.reservationType === "rehab") && appt.startTimeRange && appt.endTimeRange) {
          const apptStart = dayjs(`${appt.date}T${appt.startTimeRange}`);
          const apptEnd = dayjs(`${appt.date}T${appt.endTimeRange}`);
          if (selectedStart.isBefore(apptEnd) && selectedEnd.isAfter(apptStart)) {
            conflicts++;
          }
        }
      }
    });

    blockedSlots.forEach(slot => {
      const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate ? dayjs(slot.endDate) : blockedStartDate;
      if (currentReservationType === "outpatient" && currentTime) {
        const selectedTime = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentTime}`);
        if (slot.startTime === null) {
          if (selectedTime.isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]")) {
            conflicts++;
          }
        } else {
          const blockedStart = dayjs(`${slot.date}T${slot.startTime}`);
          const blockedEnd = dayjs(`${slot.date}T${slot.endTime}`);
          if (selectedTime.isBetween(blockedStart, blockedEnd, null, "[)")) {
            conflicts++;
          }
        }
      } else if ((currentReservationType === "visit" || currentReservationType === "rehab") && currentStartTimeRange && currentEndTimeRange) {
        const selectedStart = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentStartTimeRange}`);
        const selectedEnd = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentEndTimeRange}`);
        if (slot.startTime === null) {
          if (selectedStart.isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]") ||
              selectedEnd.isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]") ||
             (blockedStartDate.startOf("day").isBetween(selectedStart, selectedEnd, null, "[]") && blockedEndDate.endOf("day").isBetween(selectedStart, selectedEnd, null, "[]"))) {
            conflicts++;
          }
        } else {
          const blockedStart = dayjs(`${slot.date}T${slot.startTime}`);
          const blockedEnd = dayjs(`${slot.date}T${slot.endTime}`);
          if (selectedStart.isBefore(blockedEnd) && selectedEnd.isAfter(blockedStart)) {
            conflicts++;
          }
        }
      }
    });

    return conflicts;
  }, []);

  const availableTimeSlots = useMemo(() => {
    if (!date) return [];
    const selectedDate = date.format("YYYY-MM-DD");

    return filteredTimeSlotsForStart.filter((slot) => {
      const isConflictWithOutpatient = existingAppointments.some(
        (appt) =>
          appt.reservationType === "outpatient" &&
          appt.date === selectedDate &&
          appt.time === slot &&
          appt.id !== appointment?.id
      );
      const isConflictWithVisitRehab = existingAppointments.some((appt) => {
        if ((appt.reservationType === "visit" || appt.reservationType === "rehab") && appt.date === selectedDate && appt.startTimeRange && appt.endTimeRange && appt.id !== appointment?.id) {
          const apptStart = dayjs(`${selectedDate}T${appt.startTimeRange}`);
          const apptEnd = dayjs(`${selectedDate}T${appt.endTimeRange}`);
          const slotTime = dayjs(`${selectedDate}T${slot}`);
          return slotTime.isBetween(apptStart, apptEnd, null, "[)");
        }
        return false;
      });
      const isBlocked = blockedSlots.some((blockedSlot) => {
        const blockedStartDate = dayjs(blockedSlot.date);
        const blockedEndDate = blockedSlot.endDate ? dayjs(blockedSlot.endDate) : blockedStartDate;
        if (blockedSlot.startTime === null) {
          return dayjs(selectedDate).isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]");
        } else {
          const blockedStart = dayjs(`${blockedSlot.date}T${blockedSlot.startTime}`);
          const blockedEnd = dayjs(`${blockedSlot.date}T${blockedSlot.endTime}`);
          const slotTime = dayjs(`${selectedDate}T${slot}`);
          return slotTime.isBetween(blockedStart, blockedEnd, null, "[]");
        }
      });
      return !isConflictWithOutpatient && !isConflictWithVisitRehab && !isBlocked;
    });
  }, [date, filteredTimeSlotsForStart, existingAppointments, blockedSlots, appointment?.id]);

  const availableEndTimeSlots = useMemo(() => {
    if (!date) return [];
    if (!startTimeRange) {
        return allTimeSlots;
    }
    const selectedDateStr = date.format("YYYY-MM-DD");
    const startDateTime = dayjs(`${selectedDateStr}T${startTimeRange}`);
    let firstConflictTime: Dayjs | null = null;
    const appointmentsOnDate = existingAppointments.filter(
        appt => appt.date === selectedDateStr && appt.id !== appointment?.id
    );
    const blockedSlotsOnDate = blockedSlots.filter(
        bs => (bs.date === selectedDateStr || (bs.endDate && dayjs(selectedDateStr).isBetween(bs.date, bs.endDate, null, '[]')))
    );
    for (const appt of appointmentsOnDate) {
        const conflictStartCandidate = appt.time ? appt.time : appt.startTimeRange;
        if (!conflictStartCandidate) continue;
        const conflictStart = dayjs(`${selectedDateStr}T${conflictStartCandidate}`);
        if (conflictStart.isAfter(startDateTime)) {
            if (firstConflictTime === null || conflictStart.isBefore(firstConflictTime)) {
                firstConflictTime = conflictStart;
            }
        }
    }
    for (const bs of blockedSlotsOnDate) {
        if (bs.startTime) {
            const conflictStart = dayjs(`${selectedDateStr}T${bs.startTime}`);
            if (conflictStart.isAfter(startDateTime)) {
                if (firstConflictTime === null || conflictStart.isBefore(firstConflictTime)) {
                    firstConflictTime = conflictStart;
                }
            }
        } else {
            firstConflictTime = startDateTime.add(1, 'minute');
            break;
        }
    }
    let possibleEndTimes = allTimeSlots.filter(slot =>
        dayjs(`${selectedDateStr}T${slot}`).isAfter(startDateTime)
    );
    const lunchStartExclude = dayjs().hour(12).minute(0).second(0);
    const lunchEndExclude = dayjs().hour(13).minute(30).second(0);
    possibleEndTimes = possibleEndTimes.filter(slot => {
      const slotTime = dayjs().hour(parseInt(slot.substring(0, 2))).minute(parseInt(slot.substring(3, 5))).second(0);
      return !slotTime.isBetween(lunchStartExclude, lunchEndExclude, null, "[)");
    });
    if (firstConflictTime) {
        possibleEndTimes = possibleEndTimes.filter(slot =>
            !dayjs(`${selectedDateStr}T${slot}`).isAfter(firstConflictTime)
        );
    }
    return possibleEndTimes;
  }, [startTimeRange, date, allTimeSlots, existingAppointments, blockedSlots, appointment?.id]);

  const isFeverClinicTime = useCallback((currentDate: Dayjs | null, currentTime: string | null, currentStartTimeRange: string | null, currentReservationType: "outpatient" | "visit" | "rehab" | "special"): boolean => {
    if (!currentDate) {
      return false;
    }
    const isMondayAfter3PM = currentDate.day() === 1 && dayjs(currentDate.format("YYYY-MM-DD") + "T" + (currentTime || currentStartTimeRange), "YYYY-MM-DDTHH:mm").isSameOrAfter(dayjs(currentDate.format("YYYY-MM-DD") + "T15:00", "YYYY-MM-DDTHH:mm"));
    if (currentReservationType === "outpatient" && currentTime) {
      return isMondayAfter3PM;
    } else if ((currentReservationType === "visit" || currentReservationType === "rehab") && currentStartTimeRange) {
      return isMondayAfter3PM;
    }
    return false;
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (date && token) {
        setIsCheckingConflicts(true);
        setExistingAppointments([]);
        try {
          const fetchedAppointments = await getAppointments(
            token,
            date.format("YYYY-MM-DD")
          );
          setExistingAppointments(fetchedAppointments);
        } catch (err) {
          console.error("Failed to fetch existing appointments:", err);
          setExistingAppointments([]);
        } finally {
          setIsCheckingConflicts(false);
        }
      }
    };
    fetchAppointments();
  }, [date, token]);

  const conflictCount = useMemo(() => {
    if (!hasUserInteracted || isCheckingConflicts) {
      return 0;
    }
    return checkConflicts(
      reservationType,
      date,
      time,
      startTimeRange,
      endTimeRange,
      existingAppointments,
      blockedSlots,
      appointment?.id
    );
  }, [
    hasUserInteracted,
    isCheckingConflicts,
    date,
    time,
    startTimeRange,
    endTimeRange,
    reservationType,
    existingAppointments,
    blockedSlots,
    appointment?.id,
    checkConflicts,
  ]);

  useEffect(() => {
    if (isFeverClinicTime(date, time, startTimeRange, reservationType)) {
      setFeverClinicWarning("その時間帯は発熱外来の為、予約設定は出来ません。");
    } else {
      setFeverClinicWarning(null);
    }
  }, [date, time, startTimeRange, reservationType, isFeverClinicTime]);

  useEffect(() => {
    if (appointment) {
      setReservationType(appointment.reservationType || "outpatient");
      setPatientId(appointment.patientId || "");
      setPatientName(appointment.patientName || "");
      setDate(dayjs(appointment.date));
      setTime(appointment.time || "");
      setStartTimeRange(appointment.startTimeRange || "");
      setEndTimeRange(appointment.endTimeRange || "");

      const existingConsultation = appointment.consultation;
      let parsedConsultation: string[] = [];

      if (typeof existingConsultation === 'string') {
        try {
          const jsonParsed = JSON.parse(existingConsultation);
          if (Array.isArray(jsonParsed)) {
            parsedConsultation = jsonParsed;
          } else {
            parsedConsultation = existingConsultation.split(', ').filter(item => item !== '');
          }
        } catch (e) {
          parsedConsultation = existingConsultation.split(', ').filter(item => item !== '');
        }
      } else if (Array.isArray(existingConsultation)) {
        parsedConsultation = existingConsultation;
      } else {
        parsedConsultation = [];
      }

      const knownOptions = parsedConsultation.filter(c => consultationOptions.includes(c) && c !== "その他");
      const customTextOptions = parsedConsultation.filter(c => !consultationOptions.includes(c));

      let finalConsultationSelection: string[] = [...knownOptions];
      let finalOtherConsultationText: string = "";

      if (customTextOptions.length > 0) {
        finalConsultationSelection.push("その他");
        finalOtherConsultationText = customTextOptions.join(', ');
      } else if (parsedConsultation.includes("その他")) {
        finalConsultationSelection.push("その他");
      }

      setConsultation(finalConsultationSelection);
      setOtherConsultation(finalOtherConsultationText);
    } else {
      setReservationType("outpatient");
      setPatientId("");
      setPatientName("");
      setDate(initialDate || dayjs());
      setTime(initialTime || "");
      setStartTimeRange("");
      setEndTimeRange("");
      setConsultation([]);
      setOtherConsultation("");
    }
    setHasUserInteracted(false);
  }, [appointment, initialDate, initialTime]);

  useEffect(() => {
    if (reservationType === 'outpatient' && consultation.includes('VF') && time) {
      setStartTimeRange(time);
      setTime('');
      setHasUserInteracted(true);
    }
  }, [reservationType, consultation, time]);

  useEffect(() => {
    if (reservationType === 'outpatient' && consultation.includes('VF') && startTimeRange) {
      const startTime = dayjs(`1970-01-01T${startTimeRange}`);
      const endTimeString = startTime.add(45, 'minute').format('HH:mm');
      setEndTimeRange(endTimeString);
      setHasUserInteracted(true);
    }
  }, [reservationType, consultation, startTimeRange]);

  useEffect(() => {
    if ((reservationType === 'visit' || reservationType === 'rehab') && time) {
      setStartTimeRange(time);
      setTime('');
      setHasUserInteracted(true);
    }
  }, [reservationType, time]);

  const shouldDisableDate = (day: Dayjs) => {
    const today = dayjs().startOf('day');
    if (day.isBefore(today, 'day')) {
      return true;
    }
    const isBlockedEntireDay = blockedSlots.some(slot => {
      const blockedStartDate = dayjs(slot.date).startOf('day');
      const blockedEndDate = slot.endDate ? dayjs(slot.endDate).endOf('day') : blockedStartDate.endOf('day');
      return slot.startTime === null && day.isBetween(blockedStartDate, blockedEndDate, null, '[]');
    });
    return isBlockedEntireDay;
  };

  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPatientId = e.target.value;
    setPatientId(newPatientId);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFeverClinicWarning(null);

    if (!date || (reservationType !== "rehab" && !patientName)) {
      setError("日付と患者名は必須項目です。");
      return;
    }

    if (reservationType === "outpatient") {
      if (!time && (!startTimeRange || !endTimeRange)) {
        setError("時間または開始時間と終了時間は必須項目です。");
        return;
      }
    } else if (reservationType === "visit" || reservationType === "rehab") {
      if (!startTimeRange || !endTimeRange) {
        setError("開始時間と終了時間は必須項目です。");
        return;
      }
      if (dayjs(startTimeRange, "HH:mm").isAfter(dayjs(endTimeRange, "HH:mm"))) {
        setError("開始時間は終了時間より前に設定してください。他の予約と重複しています。");
        return;
      }
    }

    if (feverClinicWarning) {
      return;
    }

    const conflicts = checkConflicts(
      reservationType,
      date,
      time,
      startTimeRange,
      endTimeRange,
      existingAppointments,
      blockedSlots,
      appointment?.id
    );
    if (conflicts > 0) {
      setError("すでに予約が入っているので、登録できません。再度やり直してください。");
      return;
    }

    closeReservationForm();
    showLoader();

    const appointmentData: any = {
      date: date.format("YYYY-MM-DD"),
      reservationType,
      sendNotification,
    };

    const finalConsultation = consultation.filter(c => c !== 'その他');
    if (consultation.includes('その他') && otherConsultation.trim() !== '') {
        const customOptions = otherConsultation.split(',').map(s => s.trim()).filter(s => s !== '');
        finalConsultation.push(...customOptions);
    }

    if (reservationType === "outpatient") {
      appointmentData.patientName = patientName;
      appointmentData.patientId = patientId;
      appointmentData.consultation = finalConsultation;
      if (consultation.includes("VF")) {
        appointmentData.startTimeRange = startTimeRange;
        appointmentData.endTimeRange = endTimeRange;
        appointmentData.time = null;
      } else {
        appointmentData.time = time;
      }
    } else if (reservationType === "visit") {
      appointmentData.patientName = patientName;
      appointmentData.facilityName = patientName;
      appointmentData.startTimeRange = startTimeRange;
      appointmentData.endTimeRange = endTimeRange;
      appointmentData.consultation = finalConsultation;
    } else if (reservationType === "rehab") {
      appointmentData.startTimeRange = startTimeRange;
      appointmentData.endTimeRange = endTimeRange;
    }

    try {
      if (appointment) {
        await updateAppointment(appointment.id, appointmentData, token);
      } else {
        await createAppointment(appointmentData, token);
      }
      onFormSubmit();
    } catch (err: any) {
      setError(
        err.message ||
          (appointment ? "予約の更新に失敗しました。" : "予約の作成に失敗しました。")
      );
      console.error("Error submitting form:", err);
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
  }, [date, availableTimeSlots, time, startTimeRange, reservationType]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ja">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth required sx={{ mb: 2 }}>
          <InputLabel id="reservation-type-label">予約種別</InputLabel>
          <Select
            labelId="reservation-type-label"
            id="reservation-type"
            name="reservationType"
            value={reservationType}
            label="予約種別"
            onChange={(e: SelectChangeEvent) => {
              setReservationType(e.target.value as "outpatient" | "visit" | "rehab" | "special");
              setHasUserInteracted(true);
            }}
          >
            <MenuItem value="outpatient">外来診療</MenuItem>
            <MenuItem value="visit">訪問診療</MenuItem>
            <MenuItem value="rehab">通所リハ会議</MenuItem>
          </Select>
        </FormControl>

        {(reservationType === "outpatient" || reservationType === "visit") && (
          <>
            <TextField
              id="patient-id"
              name="patientId"
              label="患者ID (任意)"
              value={patientId}
              onChange={handlePatientIdChange}
              fullWidth
              sx={{ mb: 2 }}
              error={!!patientIdError}
              helperText={patientIdError}
            />

            <TextField
              id="patient-name"
              name="patientName"
              label={reservationType === "visit" ? "患者名/施設名" : "患者名"}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              fullWidth
              required={true}
              sx={{ mb: 2 }}
            />
          </>
        )}

        <DatePicker
          label="日付"
          value={date}
          onChange={(newValue) => {
            setDate(newValue);
            setHasUserInteracted(true);
          }}
          shouldDisableDate={shouldDisableDate}
          format="YYYY/MM/DD"
          sx={{ mb: 2, width: "100%" }}
          slotProps={{
            actionBar: {
              actions: ['cancel'],
              sx: {
                justifyContent: 'flex-end',
              },
            },
          }}
          localeText={{
            cancelButtonLabel: '閉じる',
          }}
        />

        {reservationType === "outpatient" && !consultation.includes("VF") && (
          <>
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel id="time-select-label">時間</InputLabel>
              <Select
                labelId="time-select-label"
                id="time-select"
                name="time"
                value={time}
                label="時間"
                onChange={(e: SelectChangeEvent) => {
                  setTime(e.target.value);
                  setHasUserInteracted(true);
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

          </>
        )}

        {(reservationType === "visit" || reservationType === "rehab" || (reservationType === "outpatient" && consultation.includes("VF"))) && (
          <>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <FormControl fullWidth required>
                <InputLabel id="start-time-range-label">開始時間</InputLabel>
                <Select
                  labelId="start-time-range-label"
                  id="start-time-range"
                  name="startTimeRange"
                  value={startTimeRange}
                  label="開始時間"
                  onChange={(e: SelectChangeEvent) => {
                    setStartTimeRange(e.target.value);
                    setHasUserInteracted(true);
                  }}
                >
                  {availableTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel id="end-time-range-label">終了時間</InputLabel>
                <Select
                  labelId="end-time-range-label"
                  id="end-time-range"
                  name="endTimeRange"
                  value={endTimeRange}
                  label="終了時間"
                  onChange={(e: SelectChangeEvent) => {
                    setEndTimeRange(e.target.value);
                    setHasUserInteracted(true);
                  }}
                  disabled={!startTimeRange || (reservationType === 'outpatient' && consultation.includes('VF'))}
                >
                  {availableEndTimeSlots.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

          </>
        )}

        {conflictCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {`この期間には${conflictCount}件の予約が既に存在します。`}
          </Alert>
        )}

        {feverClinicWarning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {feverClinicWarning}
          </Alert>
        )}

        {(reservationType === "outpatient" || reservationType === "visit") && (
          <>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="consultation-label">診察内容</InputLabel>
              <Select
                labelId="consultation-label"
                id="consultation-select"
                name="consultation"
                multiple
                value={consultation}
                label="診察内容"
                open={consultationSelectOpen}
                onOpen={() => setConsultationSelectOpen(true)}
                onClose={() => setConsultationSelectOpen(false)}
                onChange={(e: SelectChangeEvent<typeof consultation>) => {
                  setConsultation(e.target.value as string[]);
                  setHasUserInteracted(true);
                }}
                renderValue={(selected) => (Array.isArray(selected) ? selected.join(', ') : selected)}
              >
                {consultationOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox checked={consultation.indexOf(option) > -1} />
                    <ListItemText primary={option} />
                  </MenuItem>
                ))}
                <Box sx={{ position: 'sticky', bottom: 0, background: 'white', p: 1, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #ddd' }}>
                  <Button size="small" onClick={() => setConsultationSelectOpen(false)}>閉じる</Button>
                </Box>
              </Select>
            </FormControl>
            {consultation.includes("その他") && (
              <TextField
                id="other-consultation"
                name="otherConsultation"
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
