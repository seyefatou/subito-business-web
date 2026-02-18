'use client';

// API Client for mysubito-v2-api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Token keys for localStorage
const TOKEN_KEY = 'subito_compagny_token';
const USER_KEY = 'subito_compagny_user';

// Types
export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
}

// ==================== VTC HOURLY TYPES ====================
export type VtcVehicleType = 'berline' | 'berline_premium' | 'suv' | 'monospace' | 'van';
export type VtcPackageType = 'two_hours' | 'five_hours' | 'ten_hours';
export type VtcPaymentMethod = 'cash' | 'mobile_money' | 'company_account' | 'wallet';
export type VtcCountry = 'senegal' | 'cotedivoire' | 'mali';

export interface CreateVtcHourlyBookingDto {
  customerId?: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientAddress: string;
  country: VtcCountry;
  vehicleType: VtcVehicleType;
  package: VtcPackageType;
  scheduledDatetime: string;
  pickupAddress: string;
  adressePriseEnCharge: string;
  notes?: string;
  paymentMethod: VtcPaymentMethod;
  discountAmount?: number;
  discountPercent?: number;
}

export interface VtcHourlyBooking {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientAddress: string;
  country: VtcCountry;
  vehicleType: VtcVehicleType;
  package: VtcPackageType;
  scheduledDatetime: string;
  pickupAddress: string;
  adressePriseEnCharge?: string;
  notes?: string;
  paymentMethod: VtcPaymentMethod;
  status: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface VtcPricing {
  vehicleTypes: {
    id: string;
    name: string;
    description: string;
    capacity: number;
    prices: {
      two_hours: number;
      five_hours: number;
      ten_hours: number;
    };
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

// ==================== AIRPORT SHUTTLE TYPES ====================
export type AirportPaymentMethod = 'cash' | 'mobile_money' | 'company_account' | 'wallet';

export interface CreateAirportShuttleBookingDto {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  adressePriseEnChargeAller: string;
  isOneWay: boolean;
  pickupDateAller: string;
  pickupTimeAller: string;
  paymentMethod: AirportPaymentMethod;
  serviceType: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  siegeBebes?: number;
  animalDeCompagnie?: boolean;
  adresseSupplement?: number;
  specialRequests?: string;
  pickupDateRetour?: string;
  pickupTimeRetour?: string;
  departureTimeRetour?: string;
  arrivalTimeRetour?: string;
  adressePriseEnChargeRetour?: string;
  siegeBebesRetour?: number;
  animalDeCompagnieRetour?: boolean;
  adresseSupplementRetour?: string[];
  trajetAeroportId: number;
  customerId: number;
  passengers: number;
  smallBags?: number;
  largeBags?: number;
  discountAmount?: number;
  discountPercent?: number;
}

export interface AirportShuttleBooking {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  status: string;
  totalPrice: number;
  createdAt: string;
}

// ==================== INTER CITY TYPES ====================
export type InterCityServiceType = 'one_way' | 'round_trip';
export type InterCityPaymentMethod = 'cash' | 'mobile_money' | 'company_account' | 'wallet';

export interface CreateInterCityBookingDto {
  customerId: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientAddress: string;
  adressePriseEnChargeDepartAller: string;
  adressePriseEnChargeArriveeAller: string;
  serviceType: InterCityServiceType;
  adresseSupplement?: number;
  siegeBebes?: number;
  animalDeCompagnie?: boolean;
  smallBags?: number;
  largeBags?: number;
  specialRequests?: string;
  trajetInterVilleId: number;
  departureCity: string;
  arrivalCity: string;
  isOneWay: boolean;
  pickupDateAller: string;
  pickupTimeAller: string;
  paymentMethod: InterCityPaymentMethod;
  departureTime?: string;
  arrivalTime?: string;
  pickupDateRetour?: string;
  pickupTimeRetour?: string;
  departureTimeRetour?: string;
  arrivalTimeRetour?: string;
  adressePriseEnChargeDepartRetour?: string;
  adressePriseEnChargeArriveeRetour?: string;
  siegeBebesRetour?: number;
  animalDeCompagnieRetour?: boolean;
  adresseSupplementRetour?: string[];
  discountAmount?: number;
  discountPercent?: number;
}

export interface InterCityBooking {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== VISA ASSISTANCE TYPES ====================
export type VisaAssistancePaymentMethod = 'cash' | 'mobile_money' | 'company_account' | 'wallet';

export interface CreateVisaAssistanceRequestDto {
  flightTicket: boolean;
  hotelReservation: boolean;
  travelInsurance: boolean;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  numeroPasseport: string;
  dateNaissance: string;
  nationalite: string;
  paysDestination: string;
  villeDestination: string;
  dateDepart: string;
  dateRetour?: string;
  motifVoyage: string;
  motifAutre?: string;
  categorieHotel?: string;
  nombrePersonnes?: number;
  typeChambre?: string;
  precisionsHotel?: string;
  notes?: string;
  doc?: string;
  docCNI?: string;
  docPassport?: string;
  paymentMethod: VisaAssistancePaymentMethod;
  discountAmount?: number;
  discountPercent?: number;
}

export interface UpdateVisaAssistanceDto {
  flightTicket?: boolean;
  hotelReservation?: boolean;
  travelInsurance?: boolean;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  numeroPasseport?: string;
  dateNaissance?: string;
  nationalite?: string;
  paysDestination?: string;
  villeDestination?: string;
  dateDepart?: string;
  dateRetour?: string;
  motifVoyage?: string;
  motifAutre?: string;
  categorieHotel?: string;
  nombrePersonnes?: number;
  typeChambre?: string;
  precisionsHotel?: string;
  notes?: string;
  doc?: string;
  docCNI?: string;
  docPassport?: string;
  paymentMethod?: VisaAssistancePaymentMethod;
  discountAmount?: number;
  discountPercent?: number;
}

export interface VisaAssistanceBooking {
  id: number;
  flightTicket: boolean;
  hotelReservation: boolean;
  travelInsurance: boolean;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  numeroPasseport: string;
  nationalite: string;
  paysDestination: string;
  villeDestination: string;
  dateDepart: string;
  dateRetour?: string;
  motifVoyage: string;
  status: string;
  totalPrice: number;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== TRAJET TYPES ====================
export interface Ville {
  id: number;
  name: string;
  pays?: string;
  isAeroport?: boolean;
}

export interface TrajetAeroport {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  prixAllerSimple: number;
  prixAllerRetour?: number;
  prixAdresseSupplementaire?: number;
  prixSiegeBebe?: number;
  prixAnimalCompagnie?: number;
  statut?: string;
}

export interface TrajetInterVille {
  id: number;
  villeDepart: Ville;
  villeArrivee: Ville;
  prixAllerSimple: number;
  prixAllerRetour?: number;
  prixAdresseSupplementaire?: number;
  prixSiegeBebe?: number;
  prixAnimalCompagnie?: number;
  statut?: string;
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

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Une erreur est survenue' }));

      // Handle 401 Unauthorized - session expired
      if (response.status === 401) {
        // Clear auth data from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);

          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?expired=true';
          }
        }
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ==================== VTC HOURLY ====================
  vtcHourly = {
    create: (data: CreateVtcHourlyBookingDto) =>
      this.request<VtcHourlyBooking>('/bookings/vtc-hourly', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createByAdmin: (data: CreateVtcHourlyBookingDto) =>
      this.request<VtcHourlyBooking>('/bookings/vtc-hourly/by-admin', {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      }),

    getAll: () => this.request<VtcHourlyBooking[]>('/bookings/vtc-hourly'),

    getById: (id: number) =>
      this.request<VtcHourlyBooking>(`/bookings/vtc-hourly/${id}`),

    getDetail: (id: number) =>
      this.request<VtcHourlyBooking>(`/bookings/vtc-hourly/${id}/detail`),

    getPricing: (country?: string) =>
      this.request<VtcPricing>(`/bookings/vtc-hourly/pricing${country ? `?country=${country}` : ''}`),

    getStats: () => this.request('/bookings/vtc-hourly/stats'),

    update: (id: number, data: Partial<CreateVtcHourlyBookingDto>) =>
      this.request<VtcHourlyBooking>(`/bookings/vtc-hourly/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      this.request(`/bookings/vtc-hourly/${id}`, { method: 'DELETE' }),

    assignDriver: (bookingId: number, driverId: number) =>
      this.request(`/bookings/vtc-hourly/${bookingId}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      }),
  };

  // ==================== AIRPORT SHUTTLE ====================
  airportShuttle = {
    create: (data: CreateAirportShuttleBookingDto) =>
      this.request<AirportShuttleBooking>('/bookings/airport-shuttle', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createByAdmin: (data: CreateAirportShuttleBookingDto) =>
      this.request<AirportShuttleBooking>('/bookings/airport-shuttle-by-admin', {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      }),

    getAll: () => this.request<AirportShuttleBooking[]>('/bookings/airport-shuttle'),

    getById: (id: number) =>
      this.request<AirportShuttleBooking>(`/bookings/airport-shuttle/${id}`),

    getDetail: (id: number) =>
      this.request<AirportShuttleBooking>(`/bookings/airport-shuttle/${id}/detail`),

    update: (id: number, data: Partial<CreateAirportShuttleBookingDto>) =>
      this.request<AirportShuttleBooking>(`/bookings/airport-shuttle/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      this.request(`/bookings/airport-shuttle/${id}`, { method: 'DELETE' }),

    assignDriver: (bookingId: number, driverId: number) =>
      this.request(`/bookings/airport-shuttle/${bookingId}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      }),
  };

  // ==================== INTER CITY ====================
  interCity = {
    create: (data: CreateInterCityBookingDto) =>
      this.request<InterCityBooking>('/bookings/inter-city', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createByAdmin: (data: CreateInterCityBookingDto) =>
      this.request<InterCityBooking>('/bookings/inter-city-by-admin', {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(data),
      }),

    getAll: () => this.request<InterCityBooking[]>('/bookings/inter-city'),

    getById: (id: number) =>
      this.request<InterCityBooking>(`/bookings/inter-city/${id}`),

    getDetail: (id: number) =>
      this.request<InterCityBooking>(`/bookings/inter-city/${id}/detail`),

    update: (id: number, data: Partial<CreateInterCityBookingDto>) =>
      this.request<InterCityBooking>(`/bookings/inter-city/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      this.request(`/bookings/inter-city/${id}`, { method: 'DELETE' }),

    assignDriver: (bookingId: number, driverId: number) =>
      this.request(`/bookings/inter-city/${bookingId}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify({ driverId }),
      }),

    getStats: () => this.request('/bookings/inter-city/stats/overview'),
  };

  // ==================== BOOKINGS GENERAL ====================
  bookings = {
    getAll: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      pays?: string;
      date?: string;
      statut?: string;
      serviceType?: string;
      customerId?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request(`/bookings${query ? `?${query}` : ''}`);
    },

    getByCustomer: (customerId: number) =>
      this.request(`/bookings/customer/${customerId}`),

    updateStatus: (id: number, status: string) =>
      this.request(`/bookings/update-status/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  };

  // ==================== BOOKINGS COMPAGNY - GENERAL ====================
  bookingsCompagny = {
    getAll: (token: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request(`/bookings/compagny${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request(`/bookings/compagny/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    // cancel: (token: string, id: number) =>
    //   this.request(`/bookings/compagny/${id}`, {
    //     method: 'DELETE',
    //     headers: { Authorization: `Bearer ${token}` },
    //   }),
  };

  // ==================== AIRPORT SHUTTLE COMPAGNY ====================
  airportShuttleCompagny = {
    create: (token: string, data: CreateAirportShuttleBookingDto) =>
      this.request<AirportShuttleBooking>('/bookings/airport-shuttle-by-compagny', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getAll: (token: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request<AirportShuttleBooking[]>(`/bookings/airport-shuttle/compagny${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request<AirportShuttleBooking>(`/bookings/airport-shuttle/compagny/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    update: (token: string, id: number, data: Partial<CreateAirportShuttleBookingDto>) =>
      this.request<AirportShuttleBooking>(`/bookings/airport-shuttle/compagny/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  };

  // ==================== INTER CITY COMPAGNY ====================
  interCityCompagny = {
    create: (token: string, data: CreateInterCityBookingDto) =>
      this.request<InterCityBooking>('/bookings/inter-city-by-compagny', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getAll: (token: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request<InterCityBooking[]>(`/bookings/inter-city/compagny${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request<InterCityBooking>(`/bookings/inter-city/compagny/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    update: (token: string, id: number, data: Partial<CreateInterCityBookingDto>) =>
      this.request<InterCityBooking>(`/bookings/inter-city/compagny/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  };

  // ==================== VTC HOURLY COMPAGNY ====================
  vtcHourlyCompagny = {
    create: (token: string, data: CreateVtcHourlyBookingDto) =>
      this.request<VtcHourlyBooking>('/bookings/vtc-hourly/by-compagny', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getAll: (token: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request<VtcHourlyBooking[]>(`/bookings/vtc-hourly/compagny${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request<VtcHourlyBooking>(`/bookings/vtc-hourly/compagny/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    update: (token: string, id: number, data: Partial<CreateVtcHourlyBookingDto>) =>
      this.request<VtcHourlyBooking>(`/bookings/vtc-hourly/compagny/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  };

  // ==================== VISA ASSISTANCE COMPAGNY ====================
  visaAssistanceCompagny = {
    create: (token: string, data: CreateVisaAssistanceRequestDto) =>
      this.request<VisaAssistanceBooking>('/bookings/visa-assistance/by-compagny', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getAll: (token: string, params?: { page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request<VisaAssistanceBooking[]>(`/bookings/visa-assistance/compagny${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request<VisaAssistanceBooking>(`/bookings/visa-assistance/compagny/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    update: (token: string, id: number, data: UpdateVisaAssistanceDto) =>
      this.request<VisaAssistanceBooking>(`/bookings/visa-assistance/compagny/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  };

  // ==================== TRAJETS AEROPORT ====================
  trajetsAeroport = {
    getAll: () => this.request<TrajetAeroport[]>('/trajet-aeroport'),
    getById: (id: number) => this.request<TrajetAeroport>(`/trajet-aeroport/${id}`),
  };

  // ==================== TRAJETS INTER VILLE ====================
  trajetsInterVille = {
    getAll: () => this.request<TrajetInterVille[]>('/trajet-inter-ville'),
    getById: (id: number) => this.request<TrajetInterVille>(`/trajet-inter-ville/${id}`),
  };

  // ==================== VTC TARIFS ====================
  vtcTarifs = {
    getAll: (params?: { country?: string; vehicleType?: string; statut?: string }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, value);
        });
      }
      const query = searchParams.toString();
      return this.request(`/vtc-tarifs${query ? `?${query}` : ''}`);
    },

    getGrid: (country?: string) =>
      this.request(`/vtc-tarifs/grid${country ? `?country=${country}` : ''}`),
  };

  // ==================== VILLES ====================
  villes = {
    getAll: () => this.request('/ville'),
  };

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

  // ==================== TRAVEL DOCUMENTS (public) ====================
  travelDocuments = {
    getTarifs: () =>
      this.request<TravelDocumentTarif[]>('/travel-documents/tarifs'),
  };

  // ==================== TRAVEL DOCUMENTS COMPAGNY ====================
  travelDocumentsCompagny = {
    create: (token: string, data: CreateTravelDocumentDto) =>
      this.request<TravelDocument>('/travel-documents/compagny', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getAll: (token: string, params?: { status?: TravelDocumentStatus; page?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, String(value));
        });
      }
      const query = searchParams.toString();
      return this.request<TravelDocument[]>(`/travel-documents/compagny${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request<TravelDocument>(`/travel-documents/compagny/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    update: (token: string, id: number, data: CreateTravelDocumentDto) =>
      this.request<TravelDocument>(`/travel-documents/compagny/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    cancel: (token: string, id: number) =>
      this.request(`/travel-documents/compagny/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
  };
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
  email: string;
  nom: string;
  prenom: string;
  role: string;
  statut: string;
  telephone?: string;
  adresse?: string;
  compagnyId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompagnyProfileDto {
  nomCompagny: string;
  emailCompagny: string;
  telephoneCompagny: string;
  adresseCompagny: string;
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

// ==================== TRAVEL DOCUMENT TYPES ====================
export type TravelDocumentPaymentMethod = 'mobile_money' | 'company_account';
export type TravelDocumentStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type TravelReason = 'tourisme' | 'affaires' | 'etudes' | 'visite' | 'autre';
export type HotelCategory = 'economique' | 'standard' | 'haut-gamme';
export type RoomType = 'single' | 'double' | 'twin' | 'suite';

export interface CreateTravelDocumentDto {
  flightReservation: boolean;
  hotelReservation: boolean;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality: string;
  birthDate: string;
  phone: string;
  phoneCountryCode?: string;
  email: string;
  departureCountry: string;
  departureCity: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  travelReason: TravelReason;
  hotelCategory?: HotelCategory;
  numberOfPeople?: number;
  roomType?: RoomType;
  hotelDetails?: string;
  paymentMethod: TravelDocumentPaymentMethod;
}

export interface TravelDocument {
  id: number;
  reference: string;
  flightReservation: boolean;
  hotelReservation: boolean;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality: string;
  birthDate: string;
  phone: string;
  phoneCountryCode?: string;
  email: string;
  departureCountry: string;
  departureCity: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  travelReason: TravelReason;
  hotelCategory?: HotelCategory;
  numberOfPeople?: number;
  roomType?: RoomType;
  hotelDetails?: string;
  paymentMethod: TravelDocumentPaymentMethod;
  status: TravelDocumentStatus;
  flightDocument?: string;
  hotelDocument?: string;
  adminNotes?: string;
  paymentStatus?: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface TravelDocumentTarif {
  id: number;
  serviceType: string;
  serviceName: string;
  description: string;
  price: number;
  isActive: boolean;
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
