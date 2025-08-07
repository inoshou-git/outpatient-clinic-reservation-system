import { Appointment } from './appointments.types';
import { readDb, writeDb } from '../data/db';
import dayjs from 'dayjs';
import { sendEmail } from '../emailService';
import { getAllUsers } from '../users/users.service';
import { io } from '../index'; // Import the io instance

const notifyUsers = async (subject: string, text: string, html: string) => {
    const users = await getAllUsers();
    const recipients = users.filter(u => u.email).map(u => u.email as string);
    if (recipients.length > 0) {
        await sendEmail(recipients.join(','), subject, text, html);
    }
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
    const db = await readDb();
    return db.appointments.filter(a => !a.isDeleted);
};

export const createAppointment = async (appointmentData: any, lastUpdatedBy: string): Promise<{ appointment?: Appointment, error?: string }> => {
    const { reservationType, patientId, patientName, date, time, consultation, facilityName, startTimeRange, endTimeRange, sendNotification } = appointmentData;

    if (!reservationType || !date) {
        return { error: '予約種別と日付は必須項目です。' };
    }

    if (reservationType === 'outpatient') {
        if (!patientId || !patientName || !time) {
            return { error: '外来診療の場合、患者ID、患者名、時間は必須項目です。' };
        }
        if (!/^[0-9]+$/.test(patientId)) {
            return { error: '患者IDは数字のみで入力してください。' };
        }
    } else if (reservationType === 'visit' || reservationType === 'rehab') {
        if (!startTimeRange || !endTimeRange) {
            return { error: '訪問診療または通所リハ会議の場合、開始時間と終了時間は必須項目です。' };
        }
        if (dayjs(startTimeRange, 'HH:mm').isAfter(dayjs(endTimeRange, 'HH:mm'))) {
            return { error: '開始時間は終了時間より前に設定してください。' };
        }
    }
    
    // Add validation for Wednesday afternoon
    const appointmentDate = dayjs(appointmentData.date);
    if (appointmentDate.day() === 3 && appointmentData.time >= '13:00') {
        throw new Error('水曜日の午後は予約できません。');
    }

    const db = await readDb();
    const newId = db.appointments.length > 0 ? Math.max(...db.appointments.map(a => a.id)) + 1 : 1;
    const newAppointment: Appointment = {
        id: newId,
        date,
        reservationType,
        lastUpdatedBy,
        isDeleted: false,
    };

    if (reservationType === 'outpatient') {
        newAppointment.patientId = patientId;
        newAppointment.patientName = patientName;
        newAppointment.time = time;
        newAppointment.consultation = consultation;
    } else if (reservationType === 'visit') {
        newAppointment.facilityName = facilityName;
        newAppointment.startTimeRange = startTimeRange;
        newAppointment.endTimeRange = endTimeRange;
        newAppointment.consultation = consultation;
    } else if (reservationType === 'rehab') {
        newAppointment.startTimeRange = startTimeRange;
        newAppointment.endTimeRange = endTimeRange;
    }

    db.appointments.push(newAppointment);
    await writeDb(db);

    // Emit WebSocket event
    io.emit('appointmentCreated', newAppointment);

    if (sendNotification) {
        let subject = '';
        let text = '';
        let html = '';

        if (reservationType === 'outpatient') {
            subject = '新規予約登録のお知らせ (外来診療)';            text = `新しい外来診療の予約が登録されました.\n患者名: ${patientName}\n日時: ${date} ${time}\n診察内容: ${consultation || '未入力'}\n担当: ${lastUpdatedBy}`;            html = `<p>新しい外来診療の予約が登録されました。</p><ul><li>患者名: ${patientName}</li><li>日時: ${date} ${time}</li><li>診察内容: ${consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        } else if (reservationType === 'visit') {
            subject = '新規予約登録のお知らせ (訪問診療)';
            text = `新しい訪問診療の予約が登録されました.\n施設名: ${facilityName || '未入力'}\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n診察内容: ${consultation || '未入力'}\n担当: ${lastUpdatedBy}`;
            html = `<p>新しい訪問診療の予約が登録されました。</p><ul><li>施設名: ${facilityName || '未入力'}</li><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>診察内容: ${consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        } else if (reservationType === 'rehab') {
            subject = '新規予約登録のお知らせ (通所リハ会議)';
            text = `新しい通所リハ会議の予約が登録されました.\n日時: ${date} ${startTimeRange} - ${endTimeRange}\n担当: ${lastUpdatedBy}`;
            html = `<p>新しい通所リハ会議の予約が登録されました。</p><ul><li>日時: ${date} ${startTimeRange} - ${endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        }
        await notifyUsers(subject, text, html);
    }

    return { appointment: newAppointment };
};

export const updateAppointment = async (id: number, appointmentData: any, lastUpdatedBy: string): Promise<{ appointment?: Appointment, error?: string, status?: number }> => {
    const db = await readDb();
    const appointmentIndex = db.appointments.findIndex(a => a.id === id);

    if (appointmentIndex !== -1) {
        const oldAppointment = { ...db.appointments[appointmentIndex] };

        // Add validation for Wednesday afternoon
        const appointmentDate = dayjs(appointmentData.date);
        if (appointmentDate.day() === 3 && appointmentData.time >= '13:00') {
            throw new Error('水曜日の午後は予約できません。');
        }

        const updatedAppointment = { ...db.appointments[appointmentIndex], ...appointmentData, lastUpdatedBy };

        if (updatedAppointment.reservationType === 'outpatient') {
            if (!updatedAppointment.patientId || !updatedAppointment.patientName || !updatedAppointment.time) {
                return { error: '外来診療の場合、患者ID、患者名、時間は必須項目です。' };
            }
            if (!/^[0-9]+$/.test(updatedAppointment.patientId)) {
                return { error: '患者IDは数字のみで入力してください。' };
            }
            updatedAppointment.facilityName = undefined;
            updatedAppointment.startTimeRange = undefined;
            updatedAppointment.endTimeRange = undefined;
        } else if (updatedAppointment.reservationType === 'visit' || updatedAppointment.reservationType === 'rehab') {
            if (!updatedAppointment.startTimeRange || !updatedAppointment.endTimeRange) {
                return { error: '訪問診療または通所リハ会議の場合、開始時間と終了時間は必須項目です。' };
            }
            if (dayjs(updatedAppointment.startTimeRange, 'HH:mm').isAfter(dayjs(updatedAppointment.endTimeRange, 'HH:mm'))) {
                return { error: '開始時間は終了時間より前に設定してください。' };
            }
            updatedAppointment.patientId = undefined;
            updatedAppointment.patientName = undefined;
            updatedAppointment.time = undefined;
            if (updatedAppointment.reservationType === 'rehab') {
                updatedAppointment.facilityName = undefined;
                updatedAppointment.consultation = undefined;
            }
        }

        db.appointments[appointmentIndex] = updatedAppointment;
        await writeDb(db);

        // Emit WebSocket event
        io.emit('appointmentUpdated', updatedAppointment);

        if (appointmentData.sendNotification) {
            let subject = '';
            let text = '';
            let html = '';
            let changes = '';

            if (oldAppointment.reservationType !== updatedAppointment.reservationType) changes += `<li>予約種別: ${oldAppointment.reservationType} → ${updatedAppointment.reservationType}</li>`;

            if (updatedAppointment.reservationType === 'outpatient') {
                if (oldAppointment.patientId !== updatedAppointment.patientId) changes += `<li>患者ID: ${oldAppointment.patientId || '未入力'} → ${updatedAppointment.patientId || '未入力'}</li>`;
                if (oldAppointment.patientName !== updatedAppointment.patientName) changes += `<li>患者名: ${oldAppointment.patientName || '未入力'} → ${updatedAppointment.patientName || '未入力'}</li>`;
                if (oldAppointment.time !== updatedAppointment.time) changes += `<li>時間: ${oldAppointment.time || '未入力'} → ${updatedAppointment.time || '未入力'}</li>`;
                if (oldAppointment.consultation !== updatedAppointment.consultation) changes += `<li>診察内容: ${oldAppointment.consultation || '未入力'} → ${updatedAppointment.consultation || '未入力'}</li>`;
                subject = '予約更新のお知らせ (外来診療)';
                text = `外来診療の予約が更新されました.\n患者名: ${updatedAppointment.patientName}\n日時: ${updatedAppointment.date} ${updatedAppointment.time}\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes.replace(/<li>/g, '').replace(/<\/li>/g, '\n')}`;
                html = `<p>外来診療の予約が更新されました。</p><ul><li>患者名: ${updatedAppointment.patientName}</li><li>日時: ${updatedAppointment.date} ${updatedAppointment.time}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}<\/a><\/p>`;
            } else if (updatedAppointment.reservationType === 'visit') {
                if (oldAppointment.facilityName !== updatedAppointment.facilityName) changes += `<li>施設名: ${oldAppointment.facilityName || '未入力'} → ${updatedAppointment.facilityName || '未入力'}</li>`;
                if (oldAppointment.startTimeRange !== updatedAppointment.startTimeRange) changes += `<li>開始時間: ${oldAppointment.startTimeRange || '未入力'} → ${updatedAppointment.startTimeRange || '未入力'}</li>`;
                if (oldAppointment.endTimeRange !== updatedAppointment.endTimeRange) changes += `<li>終了時間: ${oldAppointment.endTimeRange || '未入力'} → ${updatedAppointment.endTimeRange || '未入力'}</li>`;
                if (oldAppointment.consultation !== updatedAppointment.consultation) changes += `<li>診察内容: ${oldAppointment.consultation || '未入力'} → ${updatedAppointment.consultation || '未入力'}</li>`;
                subject = '予約更新のお知らせ (訪問診療)';
                text = `訪問診療の予約が更新されました.\n施設名: ${updatedAppointment.facilityName || '未入力'}\n日時: ${updatedAppointment.date} ${updatedAppointment.startTimeRange} - ${updatedAppointment.endTimeRange}\n診察内容: ${updatedAppointment.consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
            } else if (updatedAppointment.reservationType === 'rehab') {
                if (oldAppointment.startTimeRange !== updatedAppointment.startTimeRange) changes += `<li>開始時間: ${oldAppointment.startTimeRange || '未入力'} → ${updatedAppointment.startTimeRange || '未入力'}</li>`;
                if (oldAppointment.endTimeRange !== updatedAppointment.endTimeRange) changes += `<li>終了時間: ${updatedAppointment.endTimeRange || '未入力'} → ${updatedAppointment.endTimeRange || '未入力'}</li>`;
                subject = '予約更新のお知らせ (通所リハ会議)';
                text = `通所リハ会議の予約が更新されました.\n日時: ${updatedAppointment.date} ${updatedAppointment.startTimeRange} - ${updatedAppointment.endTimeRange}\n担当: ${lastUpdatedBy}\n\n変更点:\n${changes.replace(/<li>/g, '').replace(/<\/li>/g, '\n')}`;
                html = `<p>通所リハ会議の予約が更新されました。</p><ul><li>日時: ${updatedAppointment.date} ${updatedAppointment.startTimeRange} - ${updatedAppointment.endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>変更点：</p><ul>${changes}</ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
            }

            await notifyUsers(subject, text, html);
        }

        return { appointment: db.appointments[appointmentIndex] };
    } else {
        return { error: 'Appointment not found', status: 404 };
    }
};

export const deleteAppointment = async (id: number, lastUpdatedBy: string): Promise<boolean> => {
    const db = await readDb();
    const appointmentIndex = db.appointments.findIndex(a => a.id === id);

    if (appointmentIndex !== -1) {
        const deletedAppointment = db.appointments[appointmentIndex];
        db.appointments[appointmentIndex].isDeleted = true;
        db.appointments[appointmentIndex].lastUpdatedBy = lastUpdatedBy;
        await writeDb(db);

        // Emit WebSocket event
        io.emit('appointmentDeleted', id);

        let subject = '予約削除のお知らせ';
        let text = '';
        let html = '';

        switch (deletedAppointment.reservationType) {
            case 'outpatient':
                subject = '予約削除のお知らせ (外来診療)';
                text = `外来診療の予約が削除されました。
患者名: ${deletedAppointment.patientName}
日時: ${deletedAppointment.date} ${deletedAppointment.time}
診察内容: ${deletedAppointment.consultation || '未入力'}
担当: ${lastUpdatedBy}`;
                html = `<p>外来診療の予約が削除されました。</p><ul><li>患者名: ${deletedAppointment.patientName}</li><li>日時: ${deletedAppointment.date} ${deletedAppointment.time}</li><li>診察内容: ${deletedAppointment.consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
                break;
            case 'visit':
                subject = '予約削除のお知らせ (訪問診療)';
                text = `訪問診療の予約が削除されました。
施設名: ${deletedAppointment.facilityName || '未入力'}
日時: ${deletedAppointment.date} ${deletedAppointment.startTimeRange} - ${deletedAppointment.endTimeRange}
診察内容: ${deletedAppointment.consultation || '未入力'}
担当: ${lastUpdatedBy}`;
                html = `<p>訪問診療の予約が削除されました。</p><ul><li>施設名: ${deletedAppointment.facilityName || '未入力'}</li><li>日時: ${deletedAppointment.date} ${deletedAppointment.startTimeRange} - ${deletedAppointment.endTimeRange}</li><li>診察内容: ${deletedAppointment.consultation || '未入力'}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
                break;
            case 'rehab':
                subject = '予約削除のお知らせ (通所リハ会議)';
                text = `通所リハ会議の予約が削除されました。
日時: ${deletedAppointment.date} ${deletedAppointment.startTimeRange} - ${deletedAppointment.endTimeRange}
担当: ${lastUpdatedBy}`;
                html = `<p>通所リハ会議の予約が削除されました。</p><ul><li>日時: ${deletedAppointment.date} ${deletedAppointment.startTimeRange} - ${deletedAppointment.endTimeRange}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
                break;
            default:
                text = `予約が削除されました。
担当: ${lastUpdatedBy}`;
                html = `<p>予約が削除されました。</p><p>担当: ${lastUpdatedBy}</p><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
                break;
        }

        await notifyUsers(subject, text, html);

        return true;
    } else {
        return false;
    }
};