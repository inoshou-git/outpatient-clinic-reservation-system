import { supabase } from "../lib/supabaseClient";
import { BlockedSlot } from './blocked-slots.types';
import dayjs from 'dayjs';
import axios from 'axios';
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

export const getAllBlockedSlots = async (): Promise<BlockedSlot[]> => {
    const { data, error } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('isDeleted', false);

    if (error) {
        console.error('Error fetching blocked slots:', error);
        throw new Error('予約不可枠の取得に失敗しました。');
    }

    return data || [];
};

export const createBlockedSlot = async (slotData: any, lastUpdatedBy: string): Promise<BlockedSlot> => {
    const { date, endDate, startTime, endTime, reason, sendNotification } = slotData;
    const newBlockedSlotData = { date, endDate, startTime, endTime, reason, lastUpdatedBy, isDeleted: false };

    const { data: newBlockedSlot, error: insertError } = await supabase
        .from('blocked_slots')
        .insert([newBlockedSlotData])
        .select()
        .single();

    if (insertError) {
        console.error("Error creating blocked slot:", insertError);
        throw new Error("予約不可枠の作成に失敗しました。");
    }

    if (!newBlockedSlot) {
        throw new Error("予約不可枠の作成に失敗しました。");
    }

    // Emit WebSocket event
    io.emit('blockedSlotCreated', newBlockedSlot);

    if (sendNotification) {
        const subject = '予約不可設定追加のお知らせ';
        const text = `新しい予約不可設定が追加されました。\n期間: ${date}${endDate ? '〜' + endDate : ''}\n時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
        const html = `<p>新しい予約不可設定が追加されました。</p><ul><li>期間: ${date}${endDate ? '〜' + endDate : ''}</li><li>時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        await notifyUsers(subject, text, html);
    }

    return newBlockedSlot;
};

export const updateBlockedSlot = async (id: number, slotData: any, lastUpdatedBy: string): Promise<BlockedSlot | null> => {
    const { data: existingSlot, error: fetchError } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) {
        console.error("Error fetching blocked slot:", fetchError);
        return null;
    }

    if (!existingSlot) {
        return null;
    }

    const { sendNotification, ...restOfSlotData } = slotData;
    const updatedDataForDb = {
        date: restOfSlotData.date,
        endDate: restOfSlotData.endDate,
        startTime: restOfSlotData.startTime,
        endTime: restOfSlotData.endTime,
        reason: restOfSlotData.reason,
        lastUpdatedBy: lastUpdatedBy,
    };
    const { data: updatedSlot, error: updateError } = await supabase
        .from('blocked_slots')
        .update(updatedDataForDb)
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating blocked slot:", updateError);
        throw new Error("予約不可枠の更新に失敗しました。");
    }

    if (!updatedSlot) {
        throw new Error("予約不可枠の更新に失敗しました。");
    }

    // Emit WebSocket event
    io.emit('blockedSlotUpdated', updatedSlot);

        if (slotData.sendNotification) {
            const { date, endDate, startTime, endTime, reason } = updatedSlot;
            const subject = '予約不可設定更新のお知らせ';
            const text = `予約不可設定が更新されました。\n期間: ${date}${endDate ? '〜' + endDate : ''}\n時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}\n理由: ${reason}\n担当: ${lastUpdatedBy}`;
            const html = `<p>予約不可設定が更新されました。</p><ul><li>期間: ${date}${endDate ? '〜' + endDate : ''}</li><li>時間: ${startTime || '終日'}${endTime ? '〜' + endTime : ''}</li><li>理由: ${reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
            await notifyUsers(subject, text, html);
        }

        return updatedSlot;
};

export const deleteBlockedSlot = async (id: number, lastUpdatedBy: string): Promise<boolean> => {
    const { data: deletedSlot, error: fetchError } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError) {
        console.error("Error fetching blocked slot for deletion:", fetchError);
        return false;
    }

    if (!deletedSlot) {
        return false;
    }

    const { error: updateError } = await supabase
        .from('blocked_slots')
        .update({ isDeleted: true, lastUpdatedBy })
        .eq('id', id);

    if (updateError) {
        console.error("Error marking blocked slot as deleted:", updateError);
        return false;
    }

    // Emit WebSocket event
    io.emit('blockedSlotDeleted', id);

        const subject = '予約不可設定削除のお知らせ';
        const text = `予約不可設定が削除されました.\n期間: ${deletedSlot.date}${deletedSlot.endDate ? '〜' + deletedSlot.endDate : ''}\n時間: ${deletedSlot.startTime || '終日'}${deletedSlot.endTime ? '〜' + deletedSlot.endTime : ''}\n理由: ${deletedSlot.reason}\n担当: ${lastUpdatedBy}`;
        const html = `<p>予約不可設定が削除されました。</p><ul><li>期間: ${deletedSlot.date}${deletedSlot.endDate ? '〜' + deletedSlot.endDate : ''}</li><li>時間: ${deletedSlot.startTime || '終日'}${deletedSlot.endTime ? '〜' + deletedSlot.endTime : ''}</li><li>理由: ${deletedSlot.reason}</li><li>担当: ${lastUpdatedBy}</li></ul><p>システムURL: <a href="${process.env.SYSTEM_URL}">${process.env.SYSTEM_URL}</a></p>`;
        await notifyUsers(subject, text, html);

        return true;
};

export const registerHolidays = async (lastUpdatedBy: string): Promise<{ message: string, status: number }> => {
    try {
        const response = await axios.get('https://holidays-jp.github.io/api/v1/date.json');
        const holidays = response.data;

        let addedCount = 0;

        for (const date in holidays) {
            const holidayDate = dayjs(date).format('YYYY-MM-DD');
            const holidayName = holidays[date];

            const { data: existingBlockedSlots, error: fetchError } = await supabase
                .from('blocked_slots')
                .select('*')
                .eq('date', holidayDate)
                .eq('reason', holidayName);

            if (fetchError) {
                console.error("Error checking existing blocked slots for holidays:", fetchError);
                continue; // Skip this holiday and try the next one
            }

            const isAlreadyBlocked = existingBlockedSlots && existingBlockedSlots.length > 0;

            if (!isAlreadyBlocked) {
                const newBlockedSlotData = {
                    date: holidayDate,
                    endDate: null,
                    startTime: null,
                    endTime: null,
                    reason: holidayName,
                    lastUpdatedBy,
                    isDeleted: false,
                };
                const { error: insertError } = await supabase
                    .from('blocked_slots')
                    .insert([newBlockedSlotData]);

                if (insertError) {
                    console.error("Error inserting new blocked slot for holiday:", insertError);
                    continue; // Skip this holiday and try the next one
                }
                addedCount++;
            }
        }

        if (addedCount > 0) {
            return { message: `${addedCount}件の祝日を登録しました。`, status: 201 };
        } else {
            return { message: '新しい祝日はありませんでした。', status: 200 };
        }
    } catch (error) {
        console.error('Error registering holidays:', error);
        return { message: '祝日の登録中にエラーが発生しました。', status: 500 };
    }
};