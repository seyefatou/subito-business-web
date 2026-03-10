'use client';

// API Client for mysubito-v2-api
const API_BASE_URL = 'https://api.mysubito.net/v1';

// Token keys for localStorage
const TOKEN_KEY = 'subito_compagny_token';
const USER_KEY = 'subito_compagny_user';

// ==================== GENERIC TYPES ====================
export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedList<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== AUTH TYPES ====================
export interface LoginCompagnyDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: CompagnyUserProfile;
}

export interface CompagnyUserProfile {
  id: number;
  nomCompagny?: string;
  emailCompagny?: string;
  telephoneCompagny?: string;
  adresseCompagny?: string;
  raisonSociale?: string;
  logo?: string;
  statut?: string;
  nom?: string;
  prenom?: string;
  email?: string;
  role?: string;
  telephone?: string;
  adresse?: string;
  companyCode?: string;
  isTva?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateCompagnyProfileDto {
  nomCompagny?: string;
  emailCompagny?: string;
  telephoneCompagny?: string;
  adresseCompagny?: string;
  logo?: string;
}

export interface ChangePasswordCompagnyDto {
  oldPassword: string;
  newPassword: string;
}

export interface ResetPasswordCompagnyDto {
  token: string;
  newPassword: string;
}

export interface CreateRegistrationRequestDto {
  nomEntreprise: string;
  ninea: string;
  nomResponsable: string;
  emailEntreprise: string;
  telephone: string;
  utilisateursEstimes: number;
  secteurActivite: string;
}

// ==================== REFERENCE DATA TYPES ====================
export interface Ville {
  id: number;
  nom?: string;
  name?: string;
  pays?: string;
  isAeroport?: boolean;
  statut?: string;
  image?: string[];
}

export interface VehiculeNavette {
  id: number;
  marque?: string;
  modele?: string;
  model?: string;
  immatriculation?: string;
  categorie?: string;
  places?: number;
  nombrePlace?: number;
  petitBagage?: number;
  grandBagage?: number;
  climatisation?: boolean;
  transmission?: string;
  statut?: string;
  ordre?: number;
  image?: string[];
  [key: string]: unknown;
}

export interface TrajetAeroport {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  vehicule?: VehiculeNavette;
  prix?: number;
  prixAllerSimple?: number;
  prixAllerRetour?: number;
  prixAdresseSupplementaire?: number;
  prixSiegeBebe?: number;
  prixAnimalCompagnie?: number;
  duree?: string;
  statut?: string;
  [key: string]: unknown;
}

export interface TrajetInterVille {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  vehicule?: VehiculeNavette;
  prixAllerSimple?: number;
  prixAllerRetour?: number;
  prix?: number;
  prixSiegeBebe?: number;
  prixAnimalCompagnie?: number;
  prixAdresseSupplementaire?: number;
  duree?: number;
  distance?: number;
  statut?: string;
  [key: string]: unknown;
}

export interface VtcTarif {
  id: number;
  country: string;
  vehicleType: string;
  package: string;
  price: number;
}

export interface VtcPricingGrid {
  vehicleTypes: {
    id: string;
    name: string;
    description: string;
    capacity: number;
    prices: { two_hours: number; five_hours: number; ten_hours: number };
  }[];
  packages: {
    id: string;
    label: string;
    hours: number;
    includedKm: number;
    extraHourCost: number;
  }[];
  extraKmCost: number;
}

export interface TravelDocumentTarif {
  id: number;
  serviceType: string;
  serviceName: string;
  description: string;
  price: number;
  isActive: boolean;
}

// ==================== DEPARTMENT TYPES ====================
export interface DepartmentResponse {
  id: number;
  nom: string;
  centreDeCouts?: string;
  budgetMensuel?: number;
  emailResponsable?: string;
  _count?: { employees: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  nom: string;
  centreDeCouts?: string;
  budgetMensuel?: number;
  emailResponsable?: string;
}

export interface UpdateDepartmentDto {
  nom?: string;
  centreDeCouts?: string;
  budgetMensuel?: number;
  emailResponsable?: string;
}

// ==================== EMPLOYEE TYPES ====================
export interface EmployeeResponse {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  departementId?: number;
  departement?: { id: number; nom: string };
  role?: string;
  plafondMensuel?: number;
  actif?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDto {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  departementId?: number;
  role?: string;
  plafondMensuel?: number;
  actif?: boolean;
}

export interface UpdateEmployeeDto {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  departementId?: number;
  role?: string;
  plafondMensuel?: number;
  actif?: boolean;
}

// ==================== BOOKING TYPES ====================
export interface CreateAirportShuttleBookingDto {
  serviceType: string;
  trajetAeroportId: number;
  isOneWay: boolean;
  pickupDateAller: string;
  pickupTimeAller: string;
  pickupDateRetour?: string;
  pickupTimeRetour?: string;
  passengers: number;
  flightNumber?: string;
  adressePriseEnChargeAller: string;
  adressePriseEnChargeRetour?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress: string;
  siegeBebes?: number;
  animalDeCompagnie?: boolean;
  adresseSupplement?: number;
  specialRequests?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
  companyCode?: string;
  customerId?: number;
  employeeId?: number;
}

export interface CreateInterCityBookingDto {
  serviceType: 'one_way' | 'round_trip';
  trajetInterVilleId: number;
  vehiculeId?: number;
  departureCity: string;
  arrivalCity: string;
  isOneWay: boolean;
  pickupDateAller: string;
  pickupTimeAller: string;
  pickupDateRetour?: string;
  pickupTimeRetour?: string;
  adressePriseEnChargeDepartAller?: string;
  adressePriseEnChargeArriveeAller?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress: string;
  siegeBebes?: number;
  animalDeCompagnie?: boolean;
  siegeBebesRetour?: number;
  animalDeCompagnieRetour?: boolean;
  smallBags?: number;
  largeBags?: number;
  specialRequests?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
  companyCode?: string;
  customerId?: number;
  employeeId?: number;
}

export interface CreateVtcHourlyBookingDto {
  country: string;
  vehicleType: string;
  package: string;
  scheduledDatetime: string;
  pickupAddress: string;
  adressePriseEnCharge?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress: string;
  notes?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
  companyCode?: string;
  customerId?: number;
  employeeId?: number;
}

export interface CreateVisaAssistanceRequestDto {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress: string;
  visaType?: string;
  destinationCountry?: string;
  specialRequests?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
}

export interface BookingResponse {
  id: number;
  reference?: string;
  bookingCode?: string;
  serviceType?: string;
  status?: string;
  totalPrice?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  paidBy?: 'client' | 'company';
  canal?: string;
  tag?: string;
  paymentMethod?: 'cash' | 'mobile_money' | 'wallet' | 'bank_transfer' | string;
  companyCode?: string;
  discountAmount?: number;
  discountPercent?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// ==================== TRAVEL DOCUMENT TYPES ====================
export interface CreateTravelDocumentDto {
  flightReservation: boolean;
  hotelReservation: boolean;
  travelInsurance?: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passportNumber: string;
  nationality: string;
  birthDate: string;
  departureCountry: string;
  departureCity: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  travelReason: 'tourisme' | 'affaires' | 'etudes' | 'visite' | 'autre';
  hotelCategory?: string;
  numberOfPeople?: number;
  roomType?: string;
  hotelDetails?: string;
  notes?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
  companyCode?: string;
  employeeId?: number;
}

export interface TravelDocumentResponse {
  id: number;
  reference?: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// ==================== INVOICE TYPES ====================
export interface InvoiceEmployee {
  id: number;
  nom?: string;
  prenom?: string;
}

export interface InvoiceBooking {
  id: number;
  bookingCode?: string;
  serviceType?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  totalPrice?: number;
  status?: string;
  paymentStatus?: string;
  paidBy?: string;
  canal?: string;
  paymentMethod?: string;
  createdAt?: string;
  employee?: InvoiceEmployee;
  [key: string]: unknown;
}

export interface InvoiceTravelDocument {
  id: number;
  reference?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  totalPrice?: number;
  paymentStatus?: string;
  createdAt?: string;
  employee?: InvoiceEmployee;
  [key: string]: unknown;
}

export interface InvoiceServiceReservation {
  id: number;
  reservationCode?: string;
  serviceType?: string;
  clientName?: string;
  totalPrice?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  employee?: InvoiceEmployee;
  [key: string]: unknown;
}

export interface InvoiceCompagny {
  id: number;
  nomCompagny?: string;
  emailCompagny?: string;
  telephoneCompagny?: string;
}

export interface InvoiceResponse {
  id: number;
  reference?: string;
  invoiceNumber?: string;
  compagnyId?: number;
  companyCode?: string;
  compagnyName?: string;
  totalHT?: number | string;
  tvaAmount?: number | string;
  totalAmount?: number | string;
  isTva?: boolean;
  pdfUrl?: string | null;
  status: string;
  startDate?: string;
  endDate?: string;
  bookingsCount?: number;
  paymentMethod?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  compagny?: InvoiceCompagny;
  bookings?: InvoiceBooking[];
  travelDocuments?: InvoiceTravelDocument[];
  serviceReservations?: InvoiceServiceReservation[];
  [key: string]: unknown;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalPendingAmount?: number;
  totalPaidAmount?: number;
  [key: string]: unknown;
}

export interface BillingStatsServiceItem {
  serviceType: string;
  total: number | string;
  count: number;
}

export interface BillingStatsDeptItem {
  departmentName: string;
  total: number | string;
  count: number;
}

export interface BillingStats {
  byService: Record<string, number> | BillingStatsServiceItem[];
  byDepartment: Record<string, number> | BillingStatsDeptItem[];
  currentMonth: {
    total: number;
    count?: number;
    bookingsCount?: number;
  };
  facturePrevisionnelle?: {
    count: number;
    total: number;
  };
  invoices?: {
    total: number;
    paid: number;
    pending: number;
  };
  [key: string]: unknown;
}

// ==================== NOTIFICATION TYPES ====================
export interface CompagnyNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  data: CompagnyNotification[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// ==================== DASHBOARD / STATS TYPES ====================
export interface DashboardData {
  totalBookings: number;
  activeBookings: number;
  totalSpent: number;
  byService: Record<string, number>;
  [key: string]: unknown;
}

// Booking stats from GET /bookings/compagny/stats
export interface BookingStatsData {
  totalBookings?: number;
  totalRevenue?: number;
  averagePrice?: number;
  byStatus?: Record<string, number>;
  kpis?: {
    totalExpenses: number;
    totalOrders: number;
    completionRate: number;
    averageValue: number;
  };
  monthlyEvolution?: { month: string; label: string; total: number }[];
  expensesByCategory?: { category: string; total: number }[];
  expensesByDepartment?: { departmentId: number; departmentName: string; total: number }[];
  [key: string]: unknown;
}

// Travel document stats from GET /travel-documents/compagny/stats
export interface TravelDocStatsData {
  kpis: {
    totalExpenses: number;
    totalOrders: number;
    completionRate: number;
    averageValue: number;
  };
  monthlyEvolution: { month: string; label: string; total: number }[];
  expensesByCategory: { category: string; total: number }[];
  expensesByDepartment: { departmentId: number; departmentName: string; total: number }[];
  [key: string]: unknown;
}

// Backward compat alias
export type StatsData = BookingStatsData;

// ==================== PAYMENT OPTION TYPES ====================
export interface PaymentOption {
  id: number;
  name: string;
  slug: string;
  type?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

/** Map payment option slugs to valid booking paymentMethod values */
export function toBookingPaymentMethod(slug: string): string {
  const map: Record<string, string> = {
    wave: 'mobile_money',
    orange_money: 'mobile_money',
    cash: 'cash',
    mobile_money: 'mobile_money',
    wallet: 'wallet',
    bank_transfer: 'bank_transfer',
  };
  return map[slug] || 'mobile_money';
}

// ==================== PAYMENT REQUEST TYPES ====================
export interface PaymentRequest {
  id: number;
  bookingId?: number;
  travelDocumentId?: number;
  amount: number;
  status: string;
  serviceType?: string;
  clientName?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// ==================== SERVICE RESERVATION TYPES ====================
export interface Circuit {
  id: number;
  titre: string;
  descriptionCourte?: string;
  descriptionComplete?: string;
  duree?: string;
  ville?: string;
  prix?: number;
  maxParticipants?: number;
  inclus?: string[];
  nonInclus?: string[];
  typeAnnulation?: string;
  images?: string[];
  statut?: string;
  [key: string]: unknown;
}

export interface Logement {
  id: number;
  nom: string;
  type?: string; // HOTEL, RIAD, RESIDENCE, etc.
  nbreEtoiles?: number;
  pays?: string;
  ville?: string;
  adresseExacte?: string;
  description?: string;
  prixParNuit?: number;
  prixWeekend?: number;
  equipements?: string[];
  capacite?: number;
  chambres?: number;
  images?: string[];
  statut?: string;
  [key: string]: unknown;
}

export interface VehiculeLocation {
  id: number;
  marque?: string;
  modele?: string;
  annee?: number;
  type?: string;
  places?: number;
  transmission?: string;
  carburant?: string;
  prixParJour?: number;
  prixWeekend?: number;
  caution?: number;
  zoneOperations?: string;
  climatisation?: boolean;
  chauffeur?: boolean;
  gps?: boolean;
  images?: string[];
  statut?: string;
  [key: string]: unknown;
}

export interface CreateServiceReservationDto {
  serviceType: 'CIRCUIT' | 'LOGEMENT' | 'FLOTTE';
  circuitId?: number;
  logementId?: number;
  vehiculeLocationId?: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  dateDebut: string;
  dateFin?: string;
  totalPrice?: number;
  employeeId?: number;
  notes?: string;
  nombrePersonnes?: number;
  adresseLivraison?: string;
  paidBy?: 'company' | 'client';
  paymentMethod?: string;
}

export interface PayReservationDto {
  paymentMethod: 'cash' | 'mobile_money' | 'wallet' | 'bank_transfer';
}

export interface ServiceReservationResponse {
  id: number;
  reference?: string;
  serviceType?: string;
  status?: string;
  totalPrice?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  dateDebut?: string;
  dateFin?: string;
  nombrePersonnes?: number;
  adresseLivraison?: string;
  notes?: string;
  employeeId?: number;
  circuit?: Circuit;
  logement?: Logement;
  vehiculeLocation?: VehiculeLocation;
  paidBy?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

// ==================== ERROR TRANSLATION ====================
const ERROR_TRANSLATIONS: Record<string, string> = {
  // Auth
  'Unauthorized': 'Non autorisé',
  'Invalid credentials': 'Identifiants incorrects',
  'Invalid email or password': 'Email ou mot de passe incorrect',
  'Token expired': 'Session expirée',
  'Access denied': 'Accès refusé',
  'Forbidden': 'Accès interdit',
  'Not found': 'Ressource introuvable',
  'Not Found': 'Ressource introuvable',
  'Internal server error': 'Erreur interne du serveur',
  'Internal Server Error': 'Erreur interne du serveur',
  'Bad Request': 'Requête invalide',
  'Conflict': 'Conflit — cette ressource existe déjà',
  'Too Many Requests': 'Trop de requêtes, veuillez réessayer plus tard',
  'Service Unavailable': 'Service temporairement indisponible',
};

// Common NestJS validation patterns (regex → French)
const VALIDATION_PATTERNS: [RegExp, string][] = [
  [/^(\w+) should not be empty$/i, (m: string) => `Le champ « ${fieldToFrench(m.match(/^(\w+)/)?.[1] || '')} » est requis`],
  [/^(\w+) must be an? email$/i, (m: string) => `Le champ « ${fieldToFrench(m.match(/^(\w+)/)?.[1] || '')} » doit être un email valide`],
  [/^(\w+) must be a string$/i, (m: string) => `Le champ « ${fieldToFrench(m.match(/^(\w+)/)?.[1] || '')} » doit être du texte`],
  [/^(\w+) must be a number/i, (m: string) => `Le champ « ${fieldToFrench(m.match(/^(\w+)/)?.[1] || '')} » doit être un nombre`],
  [/^(\w+) must be longer than or equal to (\d+)/i, (m: string) => {
    const match = m.match(/^(\w+) must be longer than or equal to (\d+)/i);
    return `Le champ « ${fieldToFrench(match?.[1] || '')} » doit contenir au moins ${match?.[2]} caractères`;
  }],
  [/^(\w+) must be shorter than or equal to (\d+)/i, (m: string) => {
    const match = m.match(/^(\w+) must be shorter than or equal to (\d+)/i);
    return `Le champ « ${fieldToFrench(match?.[1] || '')} » ne doit pas dépasser ${match?.[2]} caractères`;
  }],
  [/^(\w+) must be a valid/i, (m: string) => `Le champ « ${fieldToFrench(m.match(/^(\w+)/)?.[1] || '')} » est invalide`],
  [/^(\w+) is not allowed$/i, (m: string) => `Le champ « ${fieldToFrench(m.match(/^(\w+)/)?.[1] || '')} » n'est pas autorisé`],
  [/already exists/i, () => 'Cette entrée existe déjà'],
  [/duplicate/i, () => 'Un doublon a été détecté'],
] as unknown as [RegExp, string][];

const FIELD_NAMES: Record<string, string> = {
  email: 'email',
  password: 'mot de passe',
  nom: 'nom',
  prenom: 'prénom',
  telephone: 'téléphone',
  adresse: 'adresse',
  departementId: 'département',
  role: 'rôle',
  name: 'nom',
  phone: 'téléphone',
  address: 'adresse',
  clientName: 'nom du client',
  clientPhone: 'téléphone du client',
  clientEmail: 'email du client',
  clientAddress: 'adresse du client',
};

function fieldToFrench(field: string): string {
  return FIELD_NAMES[field] || field;
}

function translateErrorMessage(msg: string): string {
  // Direct match
  if (ERROR_TRANSLATIONS[msg]) return ERROR_TRANSLATIONS[msg];

  // Pattern match (NestJS validations)
  for (const [pattern, replacer] of VALIDATION_PATTERNS) {
    if (pattern.test(msg)) {
      return typeof replacer === 'function' ? (replacer as (m: string) => string)(msg) : replacer;
    }
  }

  return msg;
}

function translateErrors(raw: string | string[]): string {
  if (Array.isArray(raw)) {
    return raw.map(translateErrorMessage).join(', ');
  }
  return translateErrorMessage(raw);
}

// ==================== API CLIENT ====================
class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  private getAuthHeader(): HeadersInit {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private saveNewToken(newToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, newToken);
    document.cookie = `subito_token=${newToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }

  private clearAuth() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'subito_token=; path=/; max-age=0';
  }

  private async attemptRefreshToken(): Promise<string | null> {
    // If already refreshing, wait for the existing refresh to finish
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const currentToken = this.getAuthToken();
    if (!currentToken) return null;

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('[API] Attempting token refresh...');
        const res = await fetch(`${this.baseUrl}/auth/compagny/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
        });

        if (!res.ok) {
          console.warn(`[API] Refresh token failed: ${res.status}`);
          return null;
        }

        const json = await res.json();
        const newToken = json?.data?.access_token || json?.access_token;
        if (newToken) {
          console.log('[API] Token refreshed successfully');
          this.saveNewToken(newToken);
          return newToken as string;
        }
        return null;
      } catch (err) {
        console.error('[API] Refresh token error:', err);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetryAfterRefresh = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const hasAuth = !!(options.headers && 'Authorization' in (options.headers as Record<string, string>));
    console.log(`[API] ${options.method || 'GET'} ${endpoint} | auth: ${hasAuth}`);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });
    } catch (networkError) {
      console.error(`[API] Network error on ${endpoint}:`, networkError);
      throw new Error('Erreur réseau — le serveur est peut-être indisponible');
    }

    console.log(`[API] ${endpoint} -> ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));

      const rawMsg = error.message;
      const msg = rawMsg ? translateErrors(rawMsg) : `Erreur ${response.status}`;

      // 5xx = server error, don't logout
      if (response.status >= 500) {
        console.error(`[API] ${response.status} on ${endpoint}:`, msg);
        throw new Error('Le serveur est temporairement indisponible, réessayez dans un instant');
      }

      if (response.status === 401) {
        console.error(`[API] 401 on ${endpoint}:`, msg);

        const isAuthEndpoint = endpoint.startsWith('/auth/');

        // Try refresh token (only once, not on auth endpoints)
        if (!isAuthEndpoint && !_isRetryAfterRefresh && typeof window !== 'undefined') {
          const newToken = await this.attemptRefreshToken();

          if (newToken) {
            // Retry the original request with the new token
            const retryOptions = {
              ...options,
              headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${newToken}`,
              },
            };
            return this.request<T>(endpoint, retryOptions, true);
          }

          // Refresh failed — logout
          this.clearAuth();
          window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login?expired=true';
          return new Promise<never>(() => {});
        }

        throw new Error(msg);
      }

      console.error(`[API] ${response.status} on ${endpoint}:`, msg);
      throw new Error(msg);
    }

    return response.json();
  }

  // Helper: authenticated GET
  private authGet<T>(endpoint: string) {
    return this.request<T>(endpoint, {
      headers: this.getAuthHeader(),
    });
  }

  // Helper: authenticated POST
  private authPost<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(body),
    });
  }

  // Helper: authenticated PUT
  private authPut<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // Helper: authenticated PATCH
  private authPatch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: this.getAuthHeader(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // Helper: authenticated DELETE
  private authDelete<T>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });
  }

  // ==================== COMPAGNY AUTH ====================
  authCompagny = {
    login: (data: LoginCompagnyDto) =>
      this.request<AuthResponse>('/auth/compagny/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: (token: string) =>
      this.request('/auth/compagny/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }),

    getProfile: (token: string) =>
      this.request<CompagnyUserProfile>('/auth/compagny/profile', {
        headers: { Authorization: `Bearer ${token}` },
      }),

    updateProfile: (token: string, data: UpdateCompagnyProfileDto) =>
      this.request<CompagnyUserProfile>('/auth/compagny/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    changePassword: (token: string, data: ChangePasswordCompagnyDto) =>
      this.request('/auth/compagny/change-password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    forgotPassword: (email: string) =>
      this.request('/auth/compagny/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (data: ResetPasswordCompagnyDto) =>
      this.request('/auth/compagny/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    refreshToken: (token: string) =>
      this.request<{ access_token: string }>('/auth/compagny/refresh-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }),
  };

  // ==================== COMPANY REGISTRATION REQUESTS (PUBLIC) ====================
  companyRegistration = {
    create: (data: CreateRegistrationRequestDto) =>
      this.request('/company-registration-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // ==================== REFERENCE DATA (PUBLIC) ====================
  reference = {
    getTrajetAeroport: () =>
      this.authGet<TrajetAeroport[]>('/trajet-aeroport'),

    getTrajetsWithVehicules: (pays?: string) =>
      this.authGet<TrajetAeroport[]>(`/trajets/with-vehicules${pays ? `?pays=${encodeURIComponent(pays)}` : ''}`),

    getTrajetInterVille: () =>
      this.authGet<{ list: TrajetInterVille[]; total: number; page: number; pageSize: number }>('/trajet-inter-ville'),

    getVtcTarifs: (country: string) =>
      this.authGet<VtcTarif[]>(`/vtc-tarifs?country=${country}`),

    getVtcGrid: (country: string) =>
      this.authGet<VtcPricingGrid>(`/vtc-tarifs/grid?country=${country}`),

    getVilles: (pays?: string) =>
      this.authGet<Ville[]>(`/villes${pays ? `?pays=${encodeURIComponent(pays)}` : ''}`),

    getPays: () =>
      this.authGet<string[]>('/villes/pays'),

    getTravelDocumentTarifs: () =>
      this.request<TravelDocumentTarif[]>('/travel-documents/tarifs'),

    getPaymentOptions: () =>
      this.request<PaymentOption[]>('/payment-options'),
  };

  // ==================== BOOKINGS COMPANY ====================
  bookings = {
    // Create bookings
    createAirportShuttle: (data: CreateAirportShuttleBookingDto) =>
      this.authPost<BookingResponse>('/bookings/airport-shuttle-by-compagny', data),

    createInterCity: (data: CreateInterCityBookingDto) =>
      this.authPost<BookingResponse>('/bookings/inter-city-by-compagny', data),

    createVisaAssistance: (data: CreateVisaAssistanceRequestDto) =>
      this.authPost<BookingResponse>('/bookings/visa-assistance/by-compagny', data),

    createVtcHourly: (data: CreateVtcHourlyBookingDto) =>
      this.authPost<BookingResponse>('/bookings/vtc-hourly/by-compagny', data),

    // List all company bookings
    list: (page = 1, limit = 10) =>
      this.authGet<PaginatedData<BookingResponse>>(`/bookings/compagny?page=${page}&limit=${limit}`),

    // Get single booking
    get: (id: number) =>
      this.authGet<BookingResponse>(`/bookings/compagny/${id}`),

    // Cancel booking
    cancel: (id: number) =>
      this.authDelete<void>(`/bookings/compagny/${id}`),

    // Pay individual booking
    payIndividual: (id: number, data?: { paymentMethod?: string }) =>
      this.authPut<BookingResponse>(`/bookings/compagny/${id}/pay-individual`, data || {}),

    // Airport shuttle bookings
    airportShuttle: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<BookingResponse>>(`/bookings/airport-shuttle/compagny?page=${page}&limit=${limit}`),
      get: (id: number) =>
        this.authGet<BookingResponse>(`/bookings/airport-shuttle/compagny/${id}`),
      update: (id: number, data: Partial<CreateAirportShuttleBookingDto>) =>
        this.authPut<BookingResponse>(`/bookings/airport-shuttle/compagny/${id}`, data),
    },

    // Inter-city bookings
    interCity: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<BookingResponse>>(`/bookings/inter-city/compagny?page=${page}&limit=${limit}`),
      get: (id: number) =>
        this.authGet<BookingResponse>(`/bookings/inter-city/compagny/${id}`),
      update: (id: number, data: Partial<CreateInterCityBookingDto>) =>
        this.authPut<BookingResponse>(`/bookings/inter-city/compagny/${id}`, data),
    },

    // Visa assistance bookings
    visaAssistance: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<BookingResponse>>(`/bookings/visa-assistance/compagny?page=${page}&limit=${limit}`),
      get: (id: number) =>
        this.authGet<BookingResponse>(`/bookings/visa-assistance/compagny/${id}`),
      update: (id: number, data: Partial<CreateVisaAssistanceRequestDto>) =>
        this.authPut<BookingResponse>(`/bookings/visa-assistance/compagny/${id}`, data),
    },

    // VTC hourly bookings
    vtcHourly: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<BookingResponse>>(`/bookings/vtc-hourly/compagny?page=${page}&limit=${limit}`),
      get: (id: number) =>
        this.authGet<BookingResponse>(`/bookings/vtc-hourly/compagny/${id}`),
      update: (id: number, data: Partial<CreateVtcHourlyBookingDto>) =>
        this.authPut<BookingResponse>(`/bookings/vtc-hourly/compagny/${id}`, data),
    },

    // Dashboard & Stats
    dashboard: () =>
      this.authGet<DashboardData>('/bookings/compagny/dashboard'),

    stats: (startDate: string, endDate: string) =>
      this.authGet<StatsData>(`/bookings/compagny/stats?startDate=${startDate}&endDate=${endDate}`),

    // Payment requests
    paymentRequests: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<PaymentRequest>>(`/bookings/compagny/payment-requests?page=${page}&limit=${limit}`),
      approve: (id: number) =>
        this.authPut<void>(`/bookings/compagny/payment-requests/${id}/approve`),
      pay: (id: number) =>
        this.authPut<void>(`/bookings/compagny/payment-requests/${id}/pay`),
      reject: (id: number) =>
        this.authPut<void>(`/bookings/compagny/payment-requests/${id}/reject`),
    },
  };

  // ==================== TRAVEL DOCUMENTS COMPANY ====================
  travelDocuments = {
    create: (data: CreateTravelDocumentDto) =>
      this.authPost<TravelDocumentResponse>('/travel-documents/compagny', data),

    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      return this.authGet<PaginatedData<TravelDocumentResponse>>(`/travel-documents/compagny?${q.toString()}`);
    },

    get: (id: number) =>
      this.authGet<TravelDocumentResponse>(`/travel-documents/compagny/${id}`),

    update: (id: number, data: Partial<CreateTravelDocumentDto>) =>
      this.authPut<TravelDocumentResponse>(`/travel-documents/compagny/${id}`, data),

    delete: (id: number) =>
      this.authDelete<void>(`/travel-documents/compagny/${id}`),

    dashboard: () =>
      this.authGet<DashboardData>('/travel-documents/compagny/dashboard'),

    stats: (startDate: string, endDate: string) =>
      this.authGet<StatsData>(`/travel-documents/compagny/stats?startDate=${startDate}&endDate=${endDate}`),

    paymentRequests: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<PaymentRequest>>(`/travel-documents/compagny/payment-requests?page=${page}&limit=${limit}`),
      approve: (id: number) =>
        this.authPut<void>(`/travel-documents/compagny/payment-requests/${id}/approve`),
      pay: (id: number) =>
        this.authPut<void>(`/travel-documents/compagny/payment-requests/${id}/pay`),
      reject: (id: number) =>
        this.authPut<void>(`/travel-documents/compagny/payment-requests/${id}/reject`),
    },
  };

  // ==================== DEPARTMENTS ====================
  departments = {
    create: (data: CreateDepartmentDto) =>
      this.authPost<DepartmentResponse>('/departments', data),

    list: (page = 1, limit = 50) =>
      this.authGet<PaginatedData<DepartmentResponse>>(`/departments?page=${page}&limit=${limit}`),

    get: (id: number) =>
      this.authGet<DepartmentResponse>(`/departments/${id}`),

    update: (id: number, data: UpdateDepartmentDto) =>
      this.authPut<DepartmentResponse>(`/departments/${id}`, data),

    delete: (id: number) =>
      this.authDelete<void>(`/departments/${id}`),
  };

  // ==================== EMPLOYEES ====================
  employees = {
    create: (data: CreateEmployeeDto) =>
      this.authPost<EmployeeResponse>('/employees', data),

    list: (params?: { page?: number; limit?: number; departementId?: number; actif?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.departementId) q.set('departementId', params.departementId.toString());
      if (params?.actif !== undefined) q.set('actif', params.actif.toString());
      return this.authGet<PaginatedData<EmployeeResponse>>(`/employees?${q.toString()}`);
    },

    get: (id: number) =>
      this.authGet<EmployeeResponse>(`/employees/${id}`),

    update: (id: number, data: UpdateEmployeeDto) =>
      this.authPut<EmployeeResponse>(`/employees/${id}`, data),

    delete: (id: number) =>
      this.authDelete<void>(`/employees/${id}`),
  };

  // ==================== INVOICES COMPANY ====================
  invoices = {
    requestInvoice: (data?: Record<string, unknown>) =>
      this.authPost<void>('/invoices/compagny/request', data || {}),

    list: (params?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string }) => {
      const q = new URLSearchParams();
      q.set('page', (params?.page || 1).toString());
      q.set('limit', (params?.limit || 10).toString());
      if (params?.status) q.set('status', params.status);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return this.authGet<PaginatedData<InvoiceResponse>>(`/invoices/compagny?${q.toString()}`);
    },

    summary: () =>
      this.authGet<InvoiceSummary>('/invoices/compagny/summary'),

    billingStats: () =>
      this.authGet<BillingStats>('/invoices/compagny/billing-stats'),

    get: (id: number) =>
      this.authGet<InvoiceResponse>(`/invoices/compagny/${id}`),

    pay: (id: number, data?: { paymentMethod?: string }) =>
      this.authPut<InvoiceResponse>(`/invoices/compagny/${id}/pay`, data || {}),
  };

  // ==================== SERVICE RESERVATIONS COMPANY ====================
  serviceReservations = {
    create: (data: CreateServiceReservationDto) =>
      this.authPost<ServiceReservationResponse>('/service-reservations/compagny', data),

    list: (page = 1, limit = 10) =>
      this.authGet<PaginatedData<ServiceReservationResponse>>(`/service-reservations/compagny?page=${page}&limit=${limit}`),

    get: (id: number) =>
      this.authGet<ServiceReservationResponse>(`/service-reservations/compagny/${id}`),

    pay: (id: number, data: PayReservationDto) =>
      this.authPut<ServiceReservationResponse>(`/service-reservations/compagny/${id}/pay`, data),
  };

  // ==================== PUBLIC CATALOGS (NO AUTH) ====================
  circuits = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<Circuit>>(`/circuits/public?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<Circuit>(`/circuits/public/${id}`),
  };

  logements = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<Logement>>(`/logements/public?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<Logement>(`/logements/public/${id}`),
  };

  vehiculesLocation = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<VehiculeLocation>>(`/vehicules-location/public?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<VehiculeLocation>(`/vehicules-location/public/${id}`),
  };

  // ==================== NOTIFICATIONS COMPANY ====================
  notifications = {
    list: () =>
      this.authGet<NotificationListResponse>('/notifications/compagny'),

    unreadCount: () =>
      this.authGet<{ count: number }>('/notifications/compagny/unread-count'),

    get: (id: number) =>
      this.authGet<CompagnyNotification>(`/notifications/compagny/${id}`),

    markRead: (id: number) =>
      this.authPatch<void>(`/notifications/compagny/${id}/read`),

    markAllRead: () =>
      this.authPatch<void>('/notifications/compagny/read-all'),
  };
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
