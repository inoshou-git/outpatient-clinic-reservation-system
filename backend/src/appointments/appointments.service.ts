import { supabase } from "../lib/supabaseClient";
import { Appointment } from "./appointments.types";
import dayjs from "dayjs";
import { sendEmail } from "../emailService";
import { getAllUsers } from "../users/users.service";
import { io } from "../index"; // Import the io instance
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isBetween);

const notifyUsers = async (subject: string, text: string, html: string) => {
  const users = await getAllUsers();
  const recipients = users.filter((u) => u.email).map((u) => u.email as string);
  if (recipients.length > 0) {
    await sendEmail(recipients.join(","), subject, text, html);
  }
};

export const getAllAppointments = async (date?: string): Promise<Appointment[]> => {
  let query = supabase
    .from('appointments')
    .select('*')
    .eq('isDeleted', false);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching appointments:', error);
    throw new Error('予約の取得に失敗しました。');
  }

  return data || [];
};

export const createAppointment = async (
  appointmentData: any,
  lastUpdatedBy: string
): Promise<Appointment> => {
  const {
    reservationType,
    patientId,
    patientName,
    date,
    time,
    consultation,
    facilityName,
    startTimeRange,
    endTimeRange,
    sendNotification,
  } = appointmentData;

  if (!reservationType || !date) {
    throw new Error("予約種別と日付は必須項目です。");
  }

  // Validate patientId format if it exists
  // if (patientId && !/^[0-9]+$/.test(patientId)) {
  //   throw new Error("患者IDは半角数字のみで入力してください。");
  // }

  if (reservationType === "outpatient") {
    if (!patientName || !time) {
      throw new Error("外来診療の場合、患者名、時間は必須項目です。");
    }
  } else if (reservationType === "visit" || reservationType === "rehab") {
    if (!startTimeRange || !endTimeRange) {
      throw new Error(
        "訪問診療または通所リハ会議の場合、開始時間と終了時間は必須項目です。"
      );
    }
    if (dayjs(startTimeRange, "HH:mm").isAfter(dayjs(endTimeRange, "HH:mm"))) {
      throw new Error("開始時間は終了時間より前に設定してください。");
    }
  }

  // ダブルブッキングチェック
  const { data: existingAppointments, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', date)
    .eq('isDeleted', false)
    .neq('reservationType', 'special');

  if (fetchError) {
    console.error("Error fetching existing appointments:", fetchError);
    throw new Error("既存の予約の確認に失敗しました。");
  }

  const newIsTimeBased = !!time;
  const newIsRangeBased = !!startTimeRange && !!endTimeRange;

  const conflicting = existingAppointments.find(a => {
    const existingIsTimeBased = !!a.time;
    const existingIsRangeBased = !!a.startTimeRange && !!a.endTimeRange;

    if (newIsTimeBased) {
      const newTime = dayjs(`${date} ${time}`);
      if (existingIsTimeBased) {
        return newTime.isSame(dayjs(`${a.date} ${a.time}`));
      }
      if (existingIsRangeBased) {
        const existingStart = dayjs(`${a.date} ${a.startTimeRange}`);
        const existingEnd = dayjs(`${a.date} ${a.endTimeRange}`);
        return newTime.isBetween(existingStart, existingEnd, 'minute', '[)');
      }
    }

    if (newIsRangeBased) {
      const newStart = dayjs(`${date} ${startTimeRange}`);
      const newEnd = dayjs(`${date} ${endTimeRange}`);
      if (existingIsTimeBased) {
        const existingTime = dayjs(`${a.date} ${a.time}`);
        return existingTime.isBetween(newStart, newEnd, 'minute', '[)');
      }
      if (existingIsRangeBased) {
        const existingStart = dayjs(`${a.date} ${a.startTimeRange}`);
        const existingEnd = dayjs(`${a.date} ${a.endTimeRange}`);
        return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
      }
    }
    return false;
  });

  if (conflicting) {
    throw new Error("すでに予約が入っている為、登録できませんでした。再度やり直してください。");
  }

  const newAppointmentData: Omit<Appointment, 'id' | 'createdAt' | 'lastUpdatedAt'> = {
    date,
    reservationType,
    lastUpdatedBy,
    isDeleted: false,
    patientId: patientId || undefined,
    patientName: patientName || undefined,
    time: time || undefined,
    consultation: Array.isArray(consultation) ? consultation.join(', ') : consultation || undefined,
    facilityName: facilityName || undefined,
    startTimeRange: startTimeRange || undefined,
    endTimeRange: endTimeRange || undefined,
    reason: undefined, // reason is not part of the form for these types
  };

  if (reservationType === "outpatient") {
    newAppointmentData.patientId = patientId;
    newAppointmentData.patientName = patientName;
    newAppointmentData.time = time;
    newAppointmentData.consultation = consultation;
  } else if (reservationType === "visit") {
    newAppointmentData.patientId = patientId;
    newAppointmentData.facilityName = facilityName;
    newAppointmentData.startTimeRange = startTimeRange;
    newAppointmentData.endTimeRange = endTimeRange;
    newAppointmentData.consultation = consultation;
  } else if (reservationType === "rehab") {
    newAppointmentData.startTimeRange = startTimeRange;
    newAppointmentData.endTimeRange = endTimeRange;
  }

  const { data: newAppointment, error: insertError } = await supabase
    .from('appointments')
    .insert([newAppointmentData]) // insert expects an array
    .select()
    .single();

  if (insertError) {
    console.error("Error creating appointment:", insertError);
    throw new Error("予約の作成に失敗しました。");
  }
  
  if (!newAppointment) {
      throw new Error("予約の作成に失敗しました。");
  }

  // Emit WebSocket event
  io.emit("appointmentCreated", newAppointment);

  if (sendNotification) {
    let subject = "";
    let text = "";
    let html = "";
    const consultationText = Array.isArray(consultation) ? consultation.join(', ') : consultation;

    if (reservationType === "outpatient") {
      subject = "新規予約登録のお知らせ (外来診療)";
      text = `新しい外来診療の予約が登録されました。\n患者名: ${patientName}\n日時: ${date} ${time}\n診察内容: ${
        consultationText || "未入力"
      }\n担当: ${lastUpdatedBy}`;
      html = `<p>新しい外来診療の予約が登録されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>診察内容: ${
        consultationText || "未入力"
      }</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${
         process.env.SYSTEM_URL
       }">${process.env.SYSTEM_URL}</a></p>`;
    } else if (reservationType === "visit") {
      subject = "新規予約登録のお知らせ (訪問診療)";
      text = `新しい訪問診療の予約が登録されました。\n施設名: ${
        facilityName || "未入力"
      }\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n診察内容: ${
        consultationText || "未入力"
      }\n担当: ${lastUpdatedBy}`;
      html = `<p>新しい訪問診療の予約が登録されました。</p><ul><li>施設名: ${
        facilityName || "未入力"
      }</li><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>診察内容: ${
        consultationText || "未入力"
      }</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${
         process.env.SYSTEM_URL
       }">${process.env.SYSTEM_URL}</a></p>`;
    } else if (reservationType === "rehab") {
      subject = "新規予約登録のお知らせ (通所リハ会議)";
      text = `新しい通所リハ会議の予約が登録されました。\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n担当: ${lastUpdatedBy}`;
      html = `<p>新しい通所リハ会議の予約が登録されました。</p><ul><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    }
    await notifyUsers(subject, text, html);
  }

  return newAppointment;
};

export const updateAppointment = async (
  id: number,
  appointmentData: any,
  lastUpdatedBy: string
): Promise<Appointment> => {
  const { data: existingAppointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error("Error fetching appointment:", fetchError);
    throw new Error("予約の取得に失敗しました。");
  }

  if (!existingAppointment) {
    throw new Error("Appointment not found");
  }

  const oldAppointment = { ...existingAppointment };

  const { sendNotification, ...restOfAppointmentData } = appointmentData;

  // Transform consultation if it's an array, making it consistent with create logic
  if (restOfAppointmentData.consultation && Array.isArray(restOfAppointmentData.consultation)) {
    (restOfAppointmentData.consultation as any) = (restOfAppointmentData.consultation as string[]).join(', ');
  }

  const updatedAppointment = {
    ...existingAppointment,
    ...restOfAppointmentData,
    lastUpdatedBy,
    lastUpdatedAt: new Date().toISOString(),
  };

    // ダブルブッキングチェック
    const { date, time, startTimeRange, endTimeRange } = updatedAppointment;
    const newIsTimeBased = !!time;
    const newIsRangeBased = !!startTimeRange && !!endTimeRange;

    const { data: existingAppointments, error: fetchError2 } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', date)
      .eq('isDeleted', false)
      .neq('reservationType', 'special')
      .neq('id', id); // Exclude the current appointment being updated

    if (fetchError2) {
      console.error("Error fetching existing appointments:", fetchError2);
      throw new Error("既存の予約の確認に失敗しました。");
    }

    const conflicting = existingAppointments?.find(a => {
      const existingIsTimeBased = !!a.time;
      const existingIsRangeBased = !!a.startTimeRange && !!a.endTimeRange;

      if (newIsTimeBased) {
        const newTime = dayjs(`${date} ${time}`);
        if (existingIsTimeBased) {
          return newTime.isSame(dayjs(`${a.date} ${a.time}`));
        }
        if (existingIsRangeBased) {
          const existingStart = dayjs(`${a.date} ${a.startTimeRange}`);
          const existingEnd = dayjs(`${a.date} ${a.endTimeRange}`);
          return newTime.isBetween(existingStart, existingEnd, 'minute', '[)');
        }
      }

      if (newIsRangeBased) {
        const newStart = dayjs(`${date} ${startTimeRange}`);
        const newEnd = dayjs(`${date} ${endTimeRange}`);
        if (existingIsTimeBased) {
          const existingTime = dayjs(`${a.date} ${a.time}`);
          return existingTime.isBetween(newStart, newEnd, 'minute', '[)');
        }
        if (existingIsRangeBased) {
          const existingStart = dayjs(`${a.date} ${a.startTimeRange}`);
          const existingEnd = dayjs(`${a.date} ${a.endTimeRange}`);
          return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
        }
      }

      return false;
    });

    if (conflicting) {
      throw new Error("すでに予約が入っている為、登録できませんでした。再度やり直してください。");
    }

    // Allow patientId to be cleared by submitting an empty string
    if (updatedAppointment.patientId === "") {
      (updatedAppointment.patientId as any) = null;
    }

    // Validate patientId format if it exists
    // if (updatedAppointment.patientId && !/^[0-9]+$/.test(updatedAppointment.patientId)) {
    //   throw new Error("患者IDは半角数字のみで入力してください。");
    // }

    if (updatedAppointment.reservationType === "outpatient") {
      if (
        !updatedAppointment.patientName ||
        !updatedAppointment.time
      ) {
        throw new Error("外来診療の場合、患者名、時間は必須項目です。");
      }
      updatedAppointment.facilityName = undefined;
      updatedAppointment.startTimeRange = undefined;
      updatedAppointment.endTimeRange = undefined;
    } else if (
      updatedAppointment.reservationType === "visit" ||
      updatedAppointment.reservationType === "rehab"
    ) {
      if (
        !updatedAppointment.startTimeRange ||
        !updatedAppointment.endTimeRange
      ) {
        throw new Error(
          "訪問診療または通所リハ会議の場合、開始時間と終了時間は必須項目です。"
        );
      }
      if (
        dayjs(updatedAppointment.startTimeRange, "HH:mm").isAfter(
          dayjs(updatedAppointment.endTimeRange, "HH:mm")
        )
      ) {
        throw new Error("開始時間は終了時間より前に設定してください。");
      }
      updatedAppointment.time = undefined;
      if (updatedAppointment.reservationType === "rehab") {
        updatedAppointment.patientId = undefined;
        updatedAppointment.patientName = undefined;
        updatedAppointment.facilityName = undefined;
        updatedAppointment.consultation = undefined;
      }
    }

    delete updatedAppointment.id;
    delete updatedAppointment.createdAt;

    const { data: updatedAppointmentResult, error: updateError } = await supabase
      .from('appointments')
      .update(updatedAppointment)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating appointment:", updateError);
      throw new Error("予約の更新に失敗しました。");
    }

    if (!updatedAppointmentResult) {
      throw new Error("予約の更新に失敗しました。");
    }

    // Emit WebSocket event
    io.emit("appointmentUpdated", updatedAppointmentResult);

    if (sendNotification) {
      let subject = "";
      let text = "";
      let html = "";
      let changes = "";

      if (oldAppointment.reservationType !== updatedAppointmentResult.reservationType)
        changes += `<li>予約種別: ${oldAppointment.reservationType} → ${updatedAppointmentResult.reservationType}</li>`;

      if (updatedAppointmentResult.reservationType === "outpatient") {
        if (oldAppointment.patientId !== updatedAppointmentResult.patientId)
          changes += `<li>患者ID: ${oldAppointment.patientId || "未入力"} → ${
            updatedAppointmentResult.patientId || "未入力"
          }</li>`;
        if (oldAppointment.patientName !== updatedAppointmentResult.patientName)
          changes += `<li>患者名: ${oldAppointment.patientName || "未入力"} → ${
            updatedAppointmentResult.patientName || "未入力"
          }</li>`;
        if (oldAppointment.time !== updatedAppointmentResult.time)
          changes += `<li>時間: ${oldAppointment.time || "未入力"} → ${
            updatedAppointmentResult.time || "未入力"
          }</li>`;
        const oldConsultationText = Array.isArray(oldAppointment.consultation) ? oldAppointment.consultation.join(', ') : oldAppointment.consultation;
        const newConsultationText = Array.isArray(updatedAppointmentResult.consultation) ? updatedAppointmentResult.consultation.join(', ') : updatedAppointmentResult.consultation;
        if (oldConsultationText !== newConsultationText)
          changes += `<li>診察内容: ${oldConsultationText || "未入力"} → ${newConsultationText || "未入力"}</li>`;
        subject = "予約更新のお知らせ (外来診療)";
        text = `外来診療の予約が更新されました.\n患者名: ${
          updatedAppointmentResult.patientName
        }\n日時: ${updatedAppointmentResult.date} ${
          updatedAppointmentResult.time
        }\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes
          .replace(/<li>/g, "")
          .replace(/<\/li>/g, "\n")}`;
        html = `<p>外来診療の予約が更新されました。</p><ul><li>患者名: ${updatedAppointmentResult.patientName}</li><li>日時: ${updatedAppointmentResult.date} ${updatedAppointmentResult.time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}<\/a><\/p>`;
      } else if (updatedAppointmentResult.reservationType === "visit") {
        if (oldAppointment.facilityName !== updatedAppointmentResult.facilityName)
          changes += `<li>施設名: ${oldAppointment.facilityName || "未入力"} → ${updatedAppointmentResult.facilityName || "未入力"}</li>`;
        if (oldAppointment.startTimeRange !== updatedAppointmentResult.startTimeRange)
          changes += `<li>開始時間: ${oldAppointment.startTimeRange || "未入力"} → ${updatedAppointmentResult.startTimeRange || "未入力"}</li>`;
        if (oldAppointment.endTimeRange !== updatedAppointmentResult.endTimeRange)
          changes += `<li>終了時間: ${oldAppointment.endTimeRange || "未入力"} → ${updatedAppointmentResult.endTimeRange || "未入力"}</li>`;
        const oldConsultationText = Array.isArray(oldAppointment.consultation) ? oldAppointment.consultation.join(', ') : oldAppointment.consultation;
        const newConsultationText = Array.isArray(updatedAppointmentResult.consultation) ? updatedAppointmentResult.consultation.join(', ') : updatedAppointmentResult.consultation;
        if (oldConsultationText !== newConsultationText)
          changes += `<li>診察内容: ${oldConsultationText || "未入力"} → ${newConsultationText || "未入力"}</li>`;
        subject = "予約更新のお知らせ (訪問診療)";
        text = `訪問診療の予約が更新されました.\n施設名: ${updatedAppointmentResult.facilityName || "未入力"}\n日時: ${updatedAppointmentResult.date} ${updatedAppointmentResult.startTimeRange} - ${updatedAppointmentResult.endTimeRange}\n診察内容: ${newConsultationText || "未入力"}\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes.replace(/<li>/g, "").replace(/<\/li>/g, "\n")}`;
        html = `<p>訪問診療の予約が更新されました。</p><ul><li>施設名: ${updatedAppointmentResult.facilityName || "未入力"}</li><li>日時: ${updatedAppointmentResult.date} ${updatedAppointmentResult.startTimeRange} - ${updatedAppointmentResult.endTimeRange}</li><li>診察内容: ${newConsultationText || "未入力"}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
      } else if (updatedAppointmentResult.reservationType === "rehab") {
        if (oldAppointment.startTimeRange !== updatedAppointmentResult.startTimeRange)
          changes += `<li>開始時間: ${
            oldAppointment.startTimeRange || "未入力"
          } → ${updatedAppointmentResult.startTimeRange || "未入力"}</li>`;
        if (oldAppointment.endTimeRange !== updatedAppointmentResult.endTimeRange)
          changes += `<li>終了時間: ${
            oldAppointment.endTimeRange || "未入力"
          } → ${updatedAppointmentResult.endTimeRange || "未入力"}</li>`;
        subject = "予約更新のお知らせ (通所リハ会議)";
        text = `通所リハ会議の予約が更新されました.\n日時: ${
          updatedAppointmentResult.date
        } ${updatedAppointmentResult.startTimeRange} - ${
          updatedAppointmentResult.endTimeRange
        }\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes
          .replace(/<li>/g, "")
          .replace(/<\/li>/g, "\n")}`;
        html = `<p>通所リハ会議の予約が更新されました。</p><ul><li>日時: ${updatedAppointmentResult.date} ${updatedAppointmentResult.startTimeRange} - ${updatedAppointmentResult.endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
      }

      await notifyUsers(subject, text, html);
    }

    return updatedAppointmentResult;
};

export const deleteAppointment = async (
  id: number,
  lastUpdatedBy: string,
  sendNotification: boolean
): Promise<boolean> => {
  const { data: deletedAppointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error("Error fetching appointment for deletion:", fetchError);
    return false;
  }

  if (!deletedAppointment) {
    return false;
  }

  if (deletedAppointment) {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ isDeleted: true, lastUpdatedBy, lastUpdatedAt: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error("Error marking appointment as deleted:", updateError);
      return false;
    }

    // Emit WebSocket event
    io.emit("appointmentDeleted", id);

    if (sendNotification) {
      let subject = "予約キャンセルのお知らせ";
      let text = "";
      let html = "";

      switch (deletedAppointment.reservationType) {
        case "outpatient":
          subject = "予約キャンセルのお知らせ (外来診療)";
          text = `外来診療の予約がキャンセルされました。
患者名: ${deletedAppointment.patientName}
日時: ${deletedAppointment.date} ${deletedAppointment.time}
診察内容: ${deletedAppointment.consultation || "未入力"}
担当: ${lastUpdatedBy}`;
          html = `<p>外来診療の予約がキャンセルされました。</p><ul><li>患者名: ${
            deletedAppointment.patientName
          }</li><li>日時: ${deletedAppointment.date} ${
            deletedAppointment.time
          }</li><li>診察内容: ${
            deletedAppointment.consultation || "未入力"
          }</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${
            process.env.SYSTEM_URL
          }">${process.env.SYSTEM_URL}</a></p>`;
          break;
        case "visit":
          subject = "予約キャンセルのお知らせ (訪問診療)";
          text = `訪問診療の予約がキャンセルされました。
施設名: ${deletedAppointment.facilityName || "未入力"}
日時: ${deletedAppointment.date} ${deletedAppointment.startTimeRange} - ${
            deletedAppointment.endTimeRange
          }
診察内容: ${deletedAppointment.consultation || "未入力"}
担当: ${lastUpdatedBy}`;
          html = `<p>訪問診療の予約がキャンセルされました。</p><ul><li>施設名: ${
            deletedAppointment.facilityName || "未入力"
          }</li><li>日時: ${deletedAppointment.date} ${
            deletedAppointment.startTimeRange
          } - ${deletedAppointment.endTimeRange}</li><li>診察内容: ${
            deletedAppointment.consultation || "未入力"
          }</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${
            process.env.SYSTEM_URL
          }">${process.env.SYSTEM_URL}</a></p>`;
          break;
        case "rehab":
          subject = "予約キャンセルのお知らせ (通所リハ会議)";
          text = `通所リハ会議の予約がキャンセルされました。
日時: ${deletedAppointment.date} ${deletedAppointment.startTimeRange} - ${deletedAppointment.endTimeRange}
担当: ${lastUpdatedBy}`;
          html = `<p>通所リハ会議の予約がキャンセルされました。</p><ul><li>日時: ${deletedAppointment.date} ${
            deletedAppointment.startTimeRange
          } - ${deletedAppointment.endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          break;
        case "special":
          subject = "予約キャンセルのお知らせ (特別予約)";
          text = `特別予約がキャンセルされました。
患者名: ${deletedAppointment.patientName}
日時: ${deletedAppointment.date} ${deletedAppointment.time}
理由: ${deletedAppointment.reason}
担当: ${lastUpdatedBy}`;
          html = `<p>特別予約がキャンセルされました。</p><ul><li>患者名: ${
            deletedAppointment.patientName
          }</li><li>日時: ${deletedAppointment.date} ${
            deletedAppointment.time
          }</li><li>理由: ${deletedAppointment.reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${
            process.env.SYSTEM_URL
          }">${process.env.SYSTEM_URL}</a></p>`;
          break;
        default:
          text = `予約がキャンセルされました。
担当: ${lastUpdatedBy}`;
          html = `<p>予約がキャンセルされました。</p><p>担当: ${lastUpdatedBy}</p><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
          break;
      }

      await notifyUsers(subject, text, html);
    }


    return true;
  } else {
    return false;
  }
};

export const createSpecialAppointment = async (
  appointmentData: any,
  lastUpdatedBy: string
): Promise<Appointment> => {
  const {
    patientId,
    patientName,
    date,
    time,
    reason,
    sendNotification,
  } = appointmentData;

  if (!patientName || !date) {
    throw new Error("患者名, 日付, 時間, 理由は必須項目です。");
  }

  if (patientId && !/^[0-9]+$/.test(patientId)) {
    throw new Error("患者IDは半角数字のみで入力してください。");
  }

  const { data: existingAppointments, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', date)
    .eq('isDeleted', false)
    .neq('reservationType', 'special');

  if (fetchError) {
    console.error("Error fetching existing appointments:", fetchError);
    throw new Error("既存の予約の確認に失敗しました。");
  }

  const conflicting = existingAppointments.find(a => {
    const newTime = dayjs(`${date} ${time}`);
    if (a.time) { // vs time-based
      return newTime.isSame(dayjs(`${a.date} ${a.time}`));
    }
    if (a.startTimeRange && a.endTimeRange) { // vs range-based
      const existingStart = dayjs(`${a.date} ${a.startTimeRange}`);
      const existingEnd = dayjs(`${a.date} ${a.endTimeRange}`);
      return newTime.isBetween(existingStart, existingEnd, 'minute', '[)');
    }
    return false;
  });

  if (conflicting) {
    throw new Error("すでに予約が入っている為、登録できませんでした。再度やり直してください。");
  }

  const newAppointmentData: Omit<Appointment, 'id' | 'createdAt' | 'lastUpdatedAt'> = {
    patientId,
    patientName,
    date,
    time,
    reason,
    reservationType: "special",
    lastUpdatedBy,
    isDeleted: false,
  };

  const { data: newAppointment, error: insertError } = await supabase
    .from('appointments')
    .insert([newAppointmentData])
    .select()
    .single();

  if (insertError) {
    console.error("Error creating special appointment:", insertError);
    throw new Error("特別予約の作成に失敗しました。");
  }

  if (!newAppointment) {
    throw new Error("特別予約の作成に失敗しました。");
  }

  io.emit("appointmentCreated", newAppointment);

  if (sendNotification) {
    const subject = "新規予約登録のお知らせ (特別予約)";
    const text = `新しい特別予約が登録されました.\n患者名: ${patientName}\n日時: ${date} ${time}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
    const html = `<p>新しい特別予約が登録されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
    await notifyUsers(subject, text, html);
  }

  return newAppointment;
};

export const updateSpecialAppointment = async (
  id: number,
  appointmentData: any,
  lastUpdatedBy: string
): Promise<Appointment> => {
  const { data: existingAppointment, error: fetchError } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error("Error fetching special appointment:", fetchError);
    throw new Error("特別予約の取得に失敗しました。");
  }

  if (!existingAppointment) {
    throw new Error("Special Appointment not found");
  }

  const oldAppointment = { ...existingAppointment };

  const { sendNotification, ...restOfAppointmentData } = appointmentData;

  const updatedAppointment = {
    ...existingAppointment,
    ...restOfAppointmentData,
    lastUpdatedBy,
    lastUpdatedAt: new Date().toISOString(),
  };

    // ダブルブッキングチェック
    const { date, time } = updatedAppointment;
    const { data: existingAppointments, error: fetchError2 } = await supabase
      .from('appointments')
      .select('*')
      .eq('date', date)
      .eq('isDeleted', false)
      .neq('reservationType', 'special')
      .neq('id', id); // Exclude the current appointment being updated

    if (fetchError2) {
      console.error("Error fetching existing appointments:", fetchError2);
      throw new Error("既存の予約の確認に失敗しました。");
    }

    const conflicting = existingAppointments?.find(a => {
      const newTime = dayjs(`${date} ${time}`);
      if (a.time) { // vs time-based
        return newTime.isSame(dayjs(`${a.date} ${a.time}`));
      }
      if (a.startTimeRange && a.endTimeRange) { // vs range-based
        const existingStart = dayjs(`${a.date} ${a.startTimeRange}`);
        const existingEnd = dayjs(`${a.date} ${a.endTimeRange}`);
        return newTime.isBetween(existingStart, existingEnd, 'minute', '[)');
      }
      return false;
    });

    if (conflicting) {
      throw new Error("すでに予約が入っている為、登録できませんでした。再度やり直してください。");
    }

    if (
      !updatedAppointment.patientName ||
      !updatedAppointment.date
    ) {
      throw new Error("患者名, 日付, 時間, 理由は必須項目です。");
    }

    if (updatedAppointment.patientId && !/^[0-9]+$/.test(updatedAppointment.patientId)) {
      throw new Error("患者IDは半角数字のみで入力してください。");
    }

    delete updatedAppointment.id;
    delete updatedAppointment.createdAt;

    const { data: updatedAppointmentResult, error: updateError } = await supabase
      .from('appointments')
      .update(updatedAppointment)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating special appointment:", updateError);
      throw new Error("特別予約の更新に失敗しました。");
    }

    if (!updatedAppointmentResult) {
      throw new Error("特別予約の更新に失敗しました。");
    }

    io.emit("appointmentUpdated", updatedAppointmentResult);

    if (sendNotification) {
      const subject = "予約更新のお知らせ (特別予約)";
      const text = `特別予約が更新されました。\n患者名: ${updatedAppointmentResult.patientName}\n日時: ${updatedAppointmentResult.date} ${updatedAppointmentResult.time}\n理由: ${updatedAppointmentResult.reason}\n担当: ${lastUpdatedBy}`;
      const html = `<p>特別予約が更新されました。</p><ul><li>患者名: ${updatedAppointmentResult.patientName}</li><li>日時: ${updatedAppointmentResult.date} ${updatedAppointmentResult.time}</li><li>理由: ${updatedAppointmentResult.reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
      await notifyUsers(subject, text, html);
    }

    return updatedAppointmentResult;
};
