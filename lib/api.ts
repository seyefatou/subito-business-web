'use client';

// API Client for mysubito-v2-api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

// ==================== REFERENCE DATA TYPES ====================
export interface Ville {
  id: number;
  name: string;
  pays?: string;
}

export interface TrajetAeroport {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  prixAllerSimple?: number;
  prixAllerRetour?: number;
  prixAdresseSupplementaire?: number;
  prixSiegeBebe?: number;
  prixAnimalCompagnie?: number;
}

export interface TrajetInterVille {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  prixAllerSimple: number;
  prixAllerRetour?: number;
  duree?: number;
  distance?: number;
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
  serviceType?: string;
  status?: string;
  totalPrice?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
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
export interface InvoiceResponse {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface InvoiceSummary {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  currentMonthTotal: number;
  [key: string]: unknown;
}

export interface BillingStats {
  byService: Record<string, number>;
  byDepartment: Record<string, number>;
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

export interface StatsData {
  totalBookings: number;
  totalRevenue: number;
  averagePrice: number;
  byStatus: Record<string, number>;
  [key: string]: unknown;
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

// ==================== API CLIENT ====================
class ApiClient {
  private baseUrl: string;

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const hasAuth = !!(options.headers && 'Authorization' in (options.headers as Record<string, string>));
    console.log(`[API] ${options.method || 'GET'} ${endpoint} | auth: ${hasAuth}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    console.log(`[API] ${endpoint} -> ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));

      // Format message: handle string, array, or fallback
      const rawMsg = error.message;
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : (rawMsg || `Erreur ${response.status}`);

      if (response.status === 401) {
        console.error(`[API] 401 on ${endpoint}:`, msg);
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
  };

  // ==================== REFERENCE DATA (PUBLIC) ====================
  reference = {
    getTrajetAeroport: () =>
      this.authGet<TrajetAeroport[]>('/trajet-aeroport'),

    getTrajetInterVille: () =>
      this.authGet<{ list: TrajetInterVille[]; total: number; page: number; pageSize: number }>('/trajet-inter-ville'),

    getVtcTarifs: (country: string) =>
      this.authGet<VtcTarif[]>(`/vtc-tarifs?country=${country}`),

    getVtcGrid: (country: string) =>
      this.authGet<VtcPricingGrid>(`/vtc-tarifs/grid?country=${country}`),

    getVilles: (pays?: string) =>
      this.authGet<Ville[]>(`/villes${pays ? `?pays=${pays}` : ''}`),

    getPays: () =>
      this.authGet<string[]>('/villes/pays'),

    getTravelDocumentTarifs: () =>
      this.authGet<TravelDocumentTarif[]>('/travel-documents/admin/tarifs'),
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
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
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
