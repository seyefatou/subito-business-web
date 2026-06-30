// Extract the service-specific sub-object from a booking response.
// The API nests airport/inter-city/VTC fields under varying keys (vtcHourly, hourlyVtc,
// vtcHourlyBooking, interCity, intercity, etc.). Try known keys first; if none match,
// scan top-level for any object that "smells like" a service sub-object — this avoids
// playing whack-a-mole every time the backend renames a key.

const KNOWN_SUB_KEYS = [
  "airportShuttle", "airportShuttleBooking",
  "interCity", "intercity", "interCityBooking", "intervilleCiBooking",
  "vtcHourly", "hourlyVtc", "vtcHourlyBooking", "vtcHourlyDetails",
];

const SUB_FIELD_HINTS = [
  "vehicleType", "scheduledDatetime", "package", "isOneWay",
  "trajetAeroportId", "trajetInterVilleId",
  "trajetAeroport", "trajetInterVille",
  "pickupDateAller", "pickupDateRetour",
  "adressePriseEnCharge", "adressePriseEnChargeDepartAller",
  "departAddress", "arriveeAddress", "navetteCategoryCode",
  "adresseDepartAller", "adresseArriveeAller", "adresseDepartRetour", "adresseArriveeRetour",
];

export function extractBookingSub(booking: Record<string, unknown>): Record<string, unknown> {
  for (const k of KNOWN_SUB_KEYS) {
    const v = booking[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  }
  for (const v of Object.values(booking)) {
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const o = v as Record<string, unknown>;
    if (SUB_FIELD_HINTS.some(h => h in o)) return o;
  }
  return {};
}
