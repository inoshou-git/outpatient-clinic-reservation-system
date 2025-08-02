import React, { createContext, useState, useContext, ReactNode } from 'react';
import dayjs, { Dayjs } from 'dayjs';

// --- Interfaces ---
interface Appointment {
  id: number;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  consultation: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
}

interface UIContextType {
  isReservationFormOpen: boolean;
  openReservationForm: (appointment?: Appointment | null, initialDate?: Dayjs | null, initialTime?: string | null) => void;
  closeReservationForm: () => void;
  isBlockedSlotFormOpen: boolean;
  openBlockedSlotForm: () => void;
  closeBlockedSlotForm: () => void;
  isLoading: boolean;
  showLoader: () => void;
  hideLoader: () => void;
  reservationFormAppointment: Appointment | null | undefined;
  reservationFormInitialDate: Dayjs | null | undefined;
  reservationFormInitialTime: string | null | undefined;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isReservationFormOpen, setReservationFormOpen] = useState(false);
  const [isBlockedSlotFormOpen, setBlockedSlotFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [reservationFormAppointment, setReservationFormAppointment] = useState<Appointment | null | undefined>(undefined);
  const [reservationFormInitialDate, setReservationFormInitialDate] = useState<Dayjs | null | undefined>(undefined);
  const [reservationFormInitialTime, setReservationFormInitialTime] = useState<string | null | undefined>(undefined);

  const openReservationForm = (appointment?: Appointment | null, initialDate?: Dayjs | null, initialTime?: string | null) => {
    setReservationFormAppointment(appointment);
    setReservationFormInitialDate(initialDate);
    setReservationFormInitialTime(initialTime);
    setReservationFormOpen(true);
  };

  const closeReservationForm = () => {
    setReservationFormOpen(false);
    // フォームを閉じる際にデータをクリア
    setReservationFormAppointment(undefined);
    setReservationFormInitialDate(undefined);
    setReservationFormInitialTime(undefined);
  };

  const openBlockedSlotForm = () => setBlockedSlotFormOpen(true);
  const closeBlockedSlotForm = () => setBlockedSlotFormOpen(false);

  const showLoader = () => setIsLoading(true);
  const hideLoader = () => setIsLoading(false);

  return (
    <UIContext.Provider value={{
      isReservationFormOpen,
      openReservationForm,
      closeReservationForm,
      isBlockedSlotFormOpen,
      openBlockedSlotForm,
      closeBlockedSlotForm,
      isLoading,
      showLoader,
      hideLoader,
      reservationFormAppointment,
      reservationFormInitialDate,
      reservationFormInitialTime,
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
