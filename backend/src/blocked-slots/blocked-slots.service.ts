import { BlockedSlot } from './blocked-slots.types';
import { readDb, writeDb } from '../data/db';
import dayjs from 'dayjs';
import axios from 'axios';
import { sendEmail } from '../emailService';
import { getAllUsers } from '../users/users.service';

const notifyUsers = async (subject: string, text: string, html: string) => {
    const users = await getAllUsers();
    const recipients = users.filter(u => u.email).map(u => u.email as string);
    if (recipients.length > 0) {
        await sendEmail(recipients.join(','), subject, text, html);
    }
};

export const getAllBlockedSlots = async (): Promise<BlockedSlot[]> => {
    const db = await readDb();
    return db.blockedSlots.filter(s => !s.isDeleted);
};

export const createBlockedSlot = async (slotData: any, lastUpdatedBy: string): Promise<BlockedSlot> => {
    const { date, endDate, startTime, endTime, reason, sendNotification } = slotData;
    const db = await readDb();
    const newId = db.blockedSlots.length > 0 ? Math.max(...db.blockedSlots.map(s => s.id)) + 1 : 1;
    const newBlockedSlot: BlockedSlot = { id: newId, date, endDate, startTime, endTime, reason, lastUpdatedBy };
    db.blockedSlots.push(newBlockedSlot);
    await writeDb(db);

    if (sendNotification) {
        const subject = '予約不可設定追加のお知らせ';
        const text = `新しい予約不可設定が追加されました。\n期間: ${date}${endDate ? '〜' + endDate : ''}\n時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
        const html = `<p>新しい予約不可設定が追加されました。</p><ul><li>期間: ${date}${endDate ? '〜' + endDate : ''}</li><li>時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        await notifyUsers(subject, text, html);
    }

    return newBlockedSlot;
};

export const updateBlockedSlot = async (id: number, slotData: any, lastUpdatedBy: string): Promise<BlockedSlot | null> => {
    const db = await readDb();
    const slotIndex = db.blockedSlots.findIndex(s => s.id === id);

    if (slotIndex !== -1) {
        db.blockedSlots[slotIndex] = { ...db.blockedSlots[slotIndex], ...slotData, lastUpdatedBy };
        await writeDb(db);

        if (slotData.sendNotification) {
            const { date, endDate, startTime, endTime, reason } = db.blockedSlots[slotIndex];
            const subject = '予約不可設定更新のお知らせ';
            const text = `予約不可設定が更新されました。\n期間: ${date}${endDate ? '〜' + endDate : ''}\n時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
            const html = `<p>予約不可設定が更新されました。</p><ul><li>期間: ${date}${endDate ? '〜' + endDate : ''}</li><li>時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
            await notifyUsers(subject, text, html);
        }

        return db.blockedSlots[slotIndex];
    } else {
        return null;
    }
};

export const deleteBlockedSlot = async (id: number, lastUpdatedBy: string): Promise<boolean> => {
    const db = await readDb();
    const slotIndex = db.blockedSlots.findIndex(s => s.id === id);

    if (slotIndex !== -1) {
        const deletedSlot = db.blockedSlots[slotIndex];
        db.blockedSlots[slotIndex].isDeleted = true;
        db.blockedSlots[slotIndex].lastUpdatedBy = lastUpdatedBy;
        await writeDb(db);

        const subject = '予約不可設定削除のお知らせ';
        const text = `予約不可設定が削除されました。\n期間: ${deletedSlot.date}${deletedSlot.endDate ? '〜' + deletedSlot.endDate : ''}\n時間: ${deletedSlot.startTime || '終日'}${deletedSlot.endTime ? '〜' + deletedSlot.endTime : ''}\n理由: ${deletedSlot.reason}\n担当: ${lastUpdatedBy}`;
        const html = `<p>予約不可設定が削除されました。</p><ul><li>期間: ${deletedSlot.date}${deletedSlot.endDate ? '〜' + deletedSlot.endDate : ''}</li><li>時間: ${deletedSlot.startTime || '終日'}${deletedSlot.endTime ? '〜' + deletedSlot.endTime : ''}</li><li>理由: ${deletedSlot.reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        await notifyUsers(subject, text, html);

        return true;
    } else {
        return false;
    }
};

export const registerHolidays = async (lastUpdatedBy: string): Promise<{ message: string, status: number }> => {
    try {
        const response = await axios.get('https://holidays-jp.github.io/api/v1/date.json');
        const holidays = response.data;
        const db = await readDb();

        let addedCount = 0;

        for (const date in holidays) {
            const holidayDate = dayjs(date).format('YYYY-MM-DD');
            const holidayName = holidays[date];

            const isAlreadyBlocked = db.blockedSlots.some(
                (slot) => slot.date === holidayDate && slot.reason === holidayName
            );

            if (!isAlreadyBlocked) {
                const newId = db.blockedSlots.length > 0 ? Math.max(...db.blockedSlots.map(s => s.id)) + 1 : 1;
                const newBlockedSlot: BlockedSlot = {
                    id: newId,
                    date: holidayDate,
                    endDate: null,
                    startTime: null,
                    endTime: null,
                    reason: holidayName,
                    lastUpdatedBy,
                };
                db.blockedSlots.push(newBlockedSlot);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            await writeDb(db);
            return { message: `${addedCount}件の祝日を登録しました。`, status: 201 };
        } else {
            return { message: '新しい祝日はありませんでした。', status: 200 };
        }
    } catch (error) {
        console.error('Error registering holidays:', error);
        return { message: '祝日の登録中にエラーが発生しました。', status: 500 };
    }
};