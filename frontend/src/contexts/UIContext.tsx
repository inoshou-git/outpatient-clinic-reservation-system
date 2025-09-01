import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useRef, // Import useRef
} from "react";
import dayjs, { Dayjs } from "dayjs";
import { io, Socket } from "socket.io-client";
import { Appointment, BlockedSlot } from "../types";

interface UIContextType {
  isReservationFormOpen: boolean;
  openReservationForm: (
    appointment?: Appointment | null,
    initialDate?: Dayjs | null,
    initialTime?: string | null
  ) => void;
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
  // Function to register a callback for appointment changes
  registerAppointmentChangeCallback: (callback: () => void) => void;
  unregisterAppointmentChangeCallback: () => void;
  // Function to register a callback for blocked slot changes
  registerBlockedSlotChangeCallback: (callback: () => void) => void;
  unregisterBlockedSlotChangeCallback: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [isReservationFormOpen, setReservationFormOpen] = useState(false);
  const [isBlockedSlotFormOpen, setBlockedSlotFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [reservationFormAppointment, setReservationFormAppointment] = useState<
    Appointment | null | undefined
  >(undefined);
  const [reservationFormInitialDate, setReservationFormInitialDate] = useState<
    Dayjs | null | undefined
  >(undefined);
  const [reservationFormInitialTime, setReservationFormInitialTime] = useState<
    string | null | undefined
  >(undefined);

  // State to hold the callback function for appointment changes
  const [appointmentChangeCallback, setAppointmentChangeCallback] = useState<
    (() => void) | null
  >(null);
  // State to hold the callback function for blocked slot changes
  const [blockedSlotChangeCallback, setBlockedSlotChangeCallback] = useState<
    (() => void) | null
  >(null);

  // Register callback for appointment changes
  const registerAppointmentChangeCallback = useCallback(
    (callback: () => void) => {
      setAppointmentChangeCallback(() => callback);
    },
    []
  );

  // Unregister callback for appointment changes
  const unregisterAppointmentChangeCallback = useCallback(() => {
    setAppointmentChangeCallback(null);
  }, []);

  // Register callback for blocked slot changes
  const registerBlockedSlotChangeCallback = useCallback(
    (callback: () => void) => {
      setBlockedSlotChangeCallback(() => callback);
    },
    []
  );

  // Unregister callback for blocked slot changes
  const unregisterBlockedSlotChangeCallback = useCallback(() => {
    setBlockedSlotChangeCallback(null);
  }, []);

  // Use refs to hold the latest callbacks without re-triggering the effect
  const appointmentChangeCallbackRef = useRef(appointmentChangeCallback);
  const blockedSlotChangeCallbackRef = useRef(blockedSlotChangeCallback);

  useEffect(() => {
    appointmentChangeCallbackRef.current = appointmentChangeCallback;
    blockedSlotChangeCallbackRef.current = blockedSlotChangeCallback;
  }, [appointmentChangeCallback, blockedSlotChangeCallback]);

  useEffect(() => {
    const socketURL =
      process.env.REACT_APP_WEBSOCKET_URL ||
      window.location.origin.replace(/^http/, "ws");
    const socket: Socket = io(socketURL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socket.on("appointmentCreated", (newAppointment: Appointment) => {
      console.log("Appointment created:", newAppointment);
      if (appointmentChangeCallbackRef.current) {
        appointmentChangeCallbackRef.current();
      }
    });

    socket.on("appointmentUpdated", (updatedAppointment: Appointment) => {
      console.log("Appointment updated:", updatedAppointment);
      if (appointmentChangeCallbackRef.current) {
        appointmentChangeCallbackRef.current();
      }
    });

    socket.on("appointmentDeleted", (deletedAppointmentId: number) => {
      console.log("Appointment deleted:", deletedAppointmentId);
      if (appointmentChangeCallbackRef.current) {
        appointmentChangeCallbackRef.current();
      }
    });

    socket.on("blockedSlotCreated", (newBlockedSlot: BlockedSlot) => {
      console.log("Blocked slot created:", newBlockedSlot);
      if (blockedSlotChangeCallbackRef.current) {
        blockedSlotChangeCallbackRef.current();
      }
    });

    socket.on("blockedSlotUpdated", (updatedBlockedSlot: BlockedSlot) => {
      console.log("Blocked slot updated:", updatedBlockedSlot);
      if (blockedSlotChangeCallbackRef.current) {
        blockedSlotChangeCallbackRef.current();
      }
    });

    socket.on("blockedSlotDeleted", (deletedBlockedSlotId: number) => {
      console.log("Blocked slot deleted:", deletedBlockedSlotId);
      if (blockedSlotChangeCallbackRef.current) {
        blockedSlotChangeCallbackRef.current();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from WebSocket server:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array ensures this runs only once

  const openReservationForm = (
    appointment?: Appointment | null,
    initialDate?: Dayjs | null,
    initialTime?: string | null
  ) => {
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

  const showLoader = useCallback(() => setIsLoading(true), []);
  const hideLoader = useCallback(() => setIsLoading(false), []);

  return (
    <UIContext.Provider
      value={{
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
        registerAppointmentChangeCallback,
        unregisterAppointmentChangeCallback,
        registerBlockedSlotChangeCallback,
        unregisterBlockedSlotChangeCallback,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};
