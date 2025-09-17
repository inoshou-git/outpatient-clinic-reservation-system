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
import { getAppointments, createAppointment, updateAppointment } from "../services/api"; // Import getAppointments

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

// --- Constants ---
const consultationOptions = [
  "新患",
  "定期処方",
  "生活習慣",
  "入職時健診",
  "インフルエンザ",
  "肺炎球菌",
  "コロナ",
  "帯状疱疹(生ワクチン)",
  "帯状疱疹(シングリックス1回目)",
  "帯状疱疹(シングリックス2回目)",
  "採血のみ",
  "整形",
  "特定健診",
  "企業健診",
  "健康診断",
  "VF",
  "その他",
];

// --- Time Slot Generation ---
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
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState("");
  const [startTimeRange, setStartTimeRange] = useState("");
  const [endTimeRange, setEndTimeRange] = useState("");
  const [consultation, setConsultation] = useState<string[]>([]);
  const [otherConsultation, setOtherConsultation] = useState("");
  const [sendNotification, setSendNotification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientIdError, setPatientIdError] = useState("");
  const [existingAppointments, setExistingAppointments] = useState<
    Appointment[]
  >([]); // New state for existing appointments
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [feverClinicWarning, setFeverClinicWarning] = useState<string | null>(null);
  const [consultationSelectOpen, setConsultationSelectOpen] = useState(false);

  const allTimeSlots = useMemo(() => generateTimeSlots(), []);

  const filteredTimeSlotsForStart = useMemo(() => {
    const lunchStart = dayjs().hour(12).minute(0).second(0);
    const lunchEnd = dayjs().hour(13).minute(30).second(0);
    return allTimeSlots.filter(slot => {
      const slotTime = dayjs().hour(parseInt(slot.substring(0, 2))).minute(parseInt(slot.substring(3, 5))).second(0);
      return !slotTime.isBetween(lunchStart, lunchEnd, null, "[)");
    });
  }, [allTimeSlots]);

  const availableTimeSlots = useMemo(() => {
    if (!date) return [];
    const selectedDate = date.format("YYYY-MM-DD");

    return filteredTimeSlotsForStart.filter((slot) => {
      // Check against existing outpatient appointments
      const isConflictWithOutpatient = existingAppointments.some(
        (appt) =>
          appt.reservationType === "outpatient" &&
          appt.date === selectedDate &&
          appt.time === slot &&
          appt.id !== appointment?.id
      );

      // Check against existing visit/rehab appointments
      const isConflictWithVisitRehab = existingAppointments.some((appt) => {
        if (
          (appt.reservationType === "visit" ||
            appt.reservationType === "rehab") &&
          appt.date === selectedDate &&
          appt.startTimeRange &&
          appt.endTimeRange &&
          appt.id !== appointment?.id
        ) {
          const apptStart = dayjs(`${selectedDate}T${appt.startTimeRange}`);
          const apptEnd = dayjs(`${selectedDate}T${appt.endTimeRange}`);
          const slotTime = dayjs(`${selectedDate}T${slot}`);
          return slotTime.isBetween(apptStart, apptEnd, null, "[)");
        }
        return false;
      });

      // Check against blocked slots
      const isBlocked = blockedSlots.some((blockedSlot) => {
        const blockedStartDate = dayjs(blockedSlot.date);
        const blockedEndDate = blockedSlot.endDate
          ? dayjs(blockedSlot.endDate)
          : blockedStartDate;

        if (blockedSlot.startTime === null) {
          // All-day blocked
          return dayjs(selectedDate).isBetween(
            blockedStartDate.startOf("day"),
            blockedEndDate.endOf("day"),
            null,
            "[]"
          );
        } else {
          // Time-specific blocked
          const blockedStart = dayjs(
            `${blockedSlot.date}T${blockedSlot.startTime}`
          );
          const blockedEnd = dayjs(
            `${blockedSlot.date}T${blockedSlot.endTime}`
          );
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

    // Exclude lunch times (12:00 to 13:15) from end time options
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

    // 月曜日 (day() === 1) かつ 15:00 (15:00) 以降
    const isMondayAfter3PM = currentDate.day() === 1 && dayjs(currentDate.format("YYYY-MM-DD") + "T" + (currentTime || currentStartTimeRange), "YYYY-MM-DDTHH:mm").isSameOrAfter(dayjs(currentDate.format("YYYY-MM-DD") + "T15:00", "YYYY-MM-DDTHH:mm"));

    if (currentReservationType === "outpatient" && currentTime) {
      return isMondayAfter3PM;
    } else if ((currentReservationType === "visit" || currentReservationType === "rehab") && currentStartTimeRange) {
      return isMondayAfter3PM;
    }
    return false;
  }, []); // dayjsを依存配列から削除


  useEffect(() => {
    setExistingAppointments([]); // Clear stale data immediately on date change
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

  // New useEffect for conflict checking
  useEffect(() => {
    if (date) {
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
        setConflictWarning(`この期間には${conflicts}件の予約が既に存在します。`);
      } else {
        // 時間が選択されており、かつ競合がない場合にのみ警告をクリアします。
        // timeが空の場合は、無効な時間としてクリアされた可能性があるため、
        // 「無効な時間」の警告を消さないようにします。
        if (
          (reservationType === "outpatient" && time) ||
          ((reservationType === "visit" || reservationType === "rehab") &&
            startTimeRange &&
            endTimeRange)
        ) {
          setConflictWarning(null);
        }
      }
    } else {
      setConflictWarning(null); // Clear warning if date is not selected
    }
  }, [
    date,
    time,
    startTimeRange,
    endTimeRange,
    reservationType,
    existingAppointments,
    blockedSlots,
    appointment?.id,
  ]);

  // useEffect for fever clinic time warning
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
          // Try to parse as JSON array first
          const jsonParsed = JSON.parse(existingConsultation);
          if (Array.isArray(jsonParsed)) {
            parsedConsultation = jsonParsed;
          } else {
            // Not a JSON array, treat as comma-separated string
            parsedConsultation = existingConsultation.split(', ').filter(item => item !== '');
          }
        } catch (e) {
          // Not valid JSON, treat as comma-separated string
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
  }, [appointment, initialDate, initialTime]);

  useEffect(() => {
    // When switching to visit or rehab from outpatient,
    // and a time was already selected (from the calendar slot click),
    // set the startTimeRange to that time.
    if (
      (reservationType === 'visit' || reservationType === 'rehab') &&
      time // check if a time was set
    ) {
      setStartTimeRange(time);
      setTime(''); // Clear the outpatient time
    }
  }, [reservationType, time]);



   const checkConflicts = (
    currentReservationType: "outpatient" | "visit" | "rehab" | "special",
     currentDate: Dayjs | null,
     currentTime: string, // for outpatient
     currentStartTimeRange: string, // for visit/rehab
     currentEndTimeRange: string, // for visit/rehab
     existingAppointments: Appointment[],
     blockedSlots: BlockedSlot[],
     currentAppointmentId?: number // for editing, to ignore self
   ): number => {
    if (currentReservationType === "special") {
       return 0; // Special appointments never conflict
     }
    if (!currentDate) {
       return 0;
     }

     let conflicts = 0;

     // Check against existing appointments
    existingAppointments.forEach(appt => {
       if (appt.id === currentAppointmentId) return; // Ignore current appointment if editing

       if (currentReservationType === "outpatient" && currentTime) {
         // Outpatient vs Outpatient
         if (appt.reservationType === "outpatient" && appt.time === currentTime) {
           conflicts++;
         }
         // Outpatient vs Visit/Rehab
         if ((appt.reservationType === "visit" || appt.reservationType === "rehab") && appt.startTimeRange && appt.endTimeRange) {
           const apptStart = dayjs(`${appt.date}T${appt.startTimeRange}`);
           const apptEnd = dayjs(`${appt.date}T${appt.endTimeRange}`);
           const selectedTime = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentTime}`);
           if (selectedTime.isBetween(apptStart, apptEnd, null, "[)")) {
              conflicts++;
           }
         }
       } else if ((currentReservationType === "visit" || currentReservationType === "rehab") && currentStartTimeRange &&
      currentEndTimeRange) {
         const selectedStart = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentStartTimeRange}`);
         const selectedEnd = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentEndTimeRange}`);

         // Visit/Rehab vs Outpatient
         if (appt.reservationType === "outpatient" && appt.time) {
           const apptTime = dayjs(`${appt.date}T${appt.time}`);
             if (apptTime.isBetween(selectedStart, selectedEnd, null, "[)")) {
              conflicts++;
            }
          }
        // Visit/Rehab vs Visit/Rehab
          if ((appt.reservationType === "visit" || appt.reservationType === "rehab") && appt.startTimeRange && appt.endTimeRange) {
           const apptStart = dayjs(`${appt.date}T${appt.startTimeRange}`);
          const apptEnd = dayjs(`${appt.date}T${appt.endTimeRange}`);
          if (selectedStart.isBefore(apptEnd) && selectedEnd.isAfter(apptStart)) {
            conflicts++;
           }
         }
      }
     });

     // Check against blocked slots
     blockedSlots.forEach(slot => {
       const blockedStartDate = dayjs(slot.date);
      const blockedEndDate = slot.endDate ? dayjs(slot.endDate) : blockedStartDate;

      if (currentReservationType === "outpatient" && currentTime) {
         const selectedTime = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentTime}`);
         if (slot.startTime === null) { // All-day blocked
           if (selectedTime.isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]")) {
            conflicts++;
           }
        } else { // Time-specific blocked
          const blockedStart = dayjs(`${slot.date}T${slot.startTime}`);
           const blockedEnd = dayjs(`${slot.date}T${slot.endTime}`);
           if (selectedTime.isBetween(blockedStart, blockedEnd, null, "[)")) {
             conflicts++;
           }
         }
       } else if ((currentReservationType === "visit" || currentReservationType === "rehab") && currentStartTimeRange &&
      currentEndTimeRange) {
         const selectedStart = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentStartTimeRange}`);
         const selectedEnd = dayjs(`${currentDate.format("YYYY-MM-DD")}T${currentEndTimeRange}`);

         if (slot.startTime === null) { // All-day blocked
           if (selectedStart.isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]") ||
               selectedEnd.isBetween(blockedStartDate.startOf("day"), blockedEndDate.endOf("day"), null, "[]") ||
              (blockedStartDate.startOf("day").isBetween(selectedStart, selectedEnd, null, "[]") && blockedEndDate.endOf("day").
      isBetween(selectedStart, selectedEnd, null, "[]"))) {
             conflicts++;
           }
         } else { // Time-specific blocked
           const blockedStart = dayjs(`${slot.date}T${slot.startTime}`);
           const blockedEnd = dayjs(`${slot.date}T${slot.endTime}`);
           if (selectedStart.isBefore(blockedEnd) && selectedEnd.isAfter(blockedStart)) {
             conflicts++;
           }
         }
      }
     });

     return conflicts;
   };

   const shouldDisableDate = (day: Dayjs) => {
     const today = dayjs().startOf('day');
     // Disable dates before today
     if (day.isBefore(today, 'day')) {
       return true;
     }

     // Disable dates that are blocked in blockedSlots for the entire day
     const isBlockedEntireDay = blockedSlots.some(slot => {
       const blockedStartDate = dayjs(slot.date).startOf('day');
       const blockedEndDate = slot.endDate ? dayjs(slot.endDate).endOf('day') : blockedStartDate.endOf('day');
       return slot.startTime === null && day.isBetween(blockedStartDate, blockedEndDate, null, '[]');
     });

     return isBlockedEntireDay;
   };

  // const validatePatientId = (id: string) => {
   //   if (id && !/^[0-9]*$/.test(id)) {
   //     setPatientIdError("患者IDは半角数字で入力してください。");
   //     return false;
   //   }
   //   setPatientIdError("");
   //   return true;
   // };

  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPatientId = e.target.value;
    setPatientId(newPatientId);
    // validatePatientId(newPatientId);
  };

  // --- Event Handlers ---
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setConflictWarning(null); // すべての警告をクリア
    setFeverClinicWarning(null);

    if (!date || (reservationType !== "rehab" && !patientName)) {
      setError("日付と患者名は必須項目です。");
      return;
    }

    if (reservationType === "outpatient") {
      // if (!validatePatientId(patientId)) return;
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
        setError("開始時間は終了時間より前に設定してください。他の予約と重複しています。");
        return;
      }
    }

    // --- 発熱外来の時間帯チェック ---
    // useEffectでリアルタイムに警告が表示されるため、ここではfeverClinicWarningが設定されているかを確認するのみ
    if (feverClinicWarning) {
      return;
    }

    // --- Submission Conflict Check ---
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
      appointmentData.time = time;
      appointmentData.consultation = finalConsultation;
    } else if (reservationType === "visit") {
      appointmentData.patientName = patientName;
      appointmentData.facilityName = patientName; // Use patientName for facilityName as well
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

  // --- Disabling Logic ---
  // <<< CUTTING useMemo hooks here >>>

  // useEffect to check for invalid times when the date changes
  useEffect(() => {
    // このuseEffectは、日付変更時に選択された時間が無効になったことをユーザーに知らせるのではなく、
    // 単にavailableTimeSlotsやavailableVisitRehabTimeSlotsが更新されることで、
    // UI上の選択肢が適切にフィルタリングされるようにすることに限定します。
    // 警告メッセージを設定したり、時間をクリアしたりする役割は持ちません。
  }, [date, availableTimeSlots, time, startTimeRange, reservationType]);



  // --- Render ---
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
          onChange={(newValue) => setDate(newValue)}
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

        {reservationType === "outpatient" && (
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

        {(reservationType === "visit" || reservationType === "rehab") && (
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
                  }}
                  disabled={!startTimeRange}
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

        {conflictWarning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {conflictWarning}
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
                onChange={(e: SelectChangeEvent<typeof consultation>) =>
                  setConsultation(e.target.value as string[])
                }
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