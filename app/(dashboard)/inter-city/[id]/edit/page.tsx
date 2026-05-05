'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { api, BookingResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import InterCityBookingWizard from "@/components/bookings/InterCityBookingWizard";

export default function EditInterCityBookingPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params?.id || "", 10);

  const { data, isLoading, error } = useQuery<unknown>({
    queryKey: ["booking-edit", "inter-city", id],
    queryFn: () => api.bookings.interCity.get(id),
    enabled: !isNaN(id),
  });

  const raw = data as Record<string, unknown> | undefined;
  const unwrapped =
    raw && typeof raw.data === "object" && raw.data !== null && "id" in (raw.data as Record<string, unknown>)
      ? (raw.data as Record<string, unknown>)
      : raw;
  const booking = unwrapped as (BookingResponse & Record<string, unknown>) | undefined;

  if (isNaN(id)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-semibold">Identifiant invalide</p>
          <Button asChild variant="outline">
            <Link href="/tracking"><ArrowLeft className="w-4 h-4 mr-2" />Retour au suivi</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-semibold">Reservation introuvable</p>
          <Button asChild variant="outline">
            <Link href="/tracking"><ArrowLeft className="w-4 h-4 mr-2" />Retour au suivi</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InterCityBookingWizard
      mode="edit"
      bookingId={id}
      initialData={booking}
    />
  );
}
