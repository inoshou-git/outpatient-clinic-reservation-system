import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UIContextType {
  isReservationFormOpen: boolean;
  openReservationForm: () => void;
  closeReservationForm: () => void;
  isBlockedSlotFormOpen: boolean;
  openBlockedSlotForm: () => void;
  closeBlockedSlotForm: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isReservationFormOpen, setReservationFormOpen] = useState(false);
  const [isBlockedSlotFormOpen, setBlockedSlotFormOpen] = useState(false);

  const openReservationForm = () => setReservationFormOpen(true);
  const closeReservationForm = () => setReservationFormOpen(false);

  const openBlockedSlotForm = () => setBlockedSlotFormOpen(true);
  const closeBlockedSlotForm = () => setBlockedSlotFormOpen(false);

  return (
    <UIContext.Provider value={{
      isReservationFormOpen,
      openReservationForm,
      closeReservationForm,
      isBlockedSlotFormOpen,
      openBlockedSlotForm,
      closeBlockedSlotForm
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
