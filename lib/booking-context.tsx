'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BookingContextType, BookingData, ProductType, SelectedOptions } from './booking-types';

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const STORAGE_KEY = 'subito_booking_data';

const defaultBookingData: BookingData = {
  productType: 'logement',
  productId: 0,
  nombrePersonnes: 1,
  selectedOptions: {},
};

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookingData, setBookingDataState] = useState<BookingData>(defaultBookingData);
  const [isMounted, setIsMounted] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.dateDebut) parsed.dateDebut = new Date(parsed.dateDebut);
        if (parsed.dateFin) parsed.dateFin = new Date(parsed.dateFin);
        setBookingDataState(parsed);
      } catch (e) {
        console.error('Failed to restore booking data:', e);
      }
    }
    setIsMounted(true);
  }, []);

  // Save to localStorage whenever bookingData changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookingData));
    }
  }, [bookingData, isMounted]);

  const setBookingData = (data: BookingData) => {
    setBookingDataState(data);
  };

  const updateProductSelection = (productType: ProductType, productId: number) => {
    setBookingDataState((prev) => ({
      ...prev,
      productType,
      productId,
      selectedOptions: {},
    }));
  };

  const updateDates = (dateDebut?: Date, dateFin?: Date) => {
    setBookingDataState((prev) => ({
      ...prev,
      dateDebut,
      dateFin,
    }));
  };

  const updateParticipants = (count: number) => {
    setBookingDataState((prev) => ({
      ...prev,
      nombrePersonnes: Math.max(1, count),
    }));
  };

  const updateSelectedOptions = (options: SelectedOptions) => {
    setBookingDataState((prev) => ({
      ...prev,
      selectedOptions: options,
    }));
  };

  const updateClientData = (data: BookingData['clientData']) => {
    setBookingDataState((prev) => ({
      ...prev,
      clientData: data,
    }));
  };

  const clearBooking = () => {
    setBookingDataState(defaultBookingData);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <BookingContext.Provider
      value={{
        bookingData,
        setBookingData,
        updateProductSelection,
        updateDates,
        updateParticipants,
        updateSelectedOptions,
        updateClientData,
        clearBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
}
