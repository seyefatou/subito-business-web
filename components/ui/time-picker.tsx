'use client';

import React, { useState, useRef, useEffect } from "react";
import { Clock, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Generate time slots from 00:00 to 23:55 in 5-minute increments
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 5) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h}h${m}`;
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Selected date — when it's today, past time slots are hidden */
  selectedDate?: Date | string | null;
}

function getMinTimeForDate(selectedDate?: Date | string | null): string | null {
  if (!selectedDate) return null;
  const date = typeof selectedDate === 'string' ? new Date(selectedDate + 'T00:00:00') : selectedDate;
  const now = new Date();
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    const h = now.getHours();
    const m = now.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  return null;
}

export function TimePicker({ value, onChange, placeholder = "Selectionner", selectedDate }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const minTime = getMinTimeForDate(selectedDate);
  const availableSlots = minTime
    ? TIME_SLOTS.filter((slot) => slot >= minTime)
    : TIME_SLOTS;

  // Clear value if it became unavailable (e.g. user picked a past time then switched date to today)
  useEffect(() => {
    if (value && minTime && value < minTime) {
      onChange('');
    }
  }, [minTime, value, onChange]);

  useEffect(() => {
    if (open && selectedRef.current) {
      // Small delay to let popover render
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, 50);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start border-0 bg-transparent p-0 h-auto font-normal hover:bg-transparent"
        >
          <Clock className="w-4 h-4 mr-2 text-orange-600" />
          {value ? formatTimeDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="start">
        <ScrollArea className="h-60">
          <div className="p-1">
            {availableSlots.map((slot) => {
              const isSelected = value === slot;
              return (
                <button
                  key={slot}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => {
                    onChange(slot);
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                    ${isSelected
                      ? 'bg-orange-50 text-orange-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <span>{formatTimeDisplay(slot)}</span>
                  {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
