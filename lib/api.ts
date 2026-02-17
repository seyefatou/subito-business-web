'use client';

// API Client for mysubito-v2-api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Token keys for localStorage
const TOKEN_KEY = 'subito_admin_token';
const USER_KEY = 'subito_admin_user';

// Types
export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
}

// ==================== VTC HOURLY TYPES ====================
export type VtcVehicleType = 'berline' | 'berline_premium' | 'suv' | 'monospace' | 'van';
export type VtcPackageType = 'two_hours' | 'five_hours' | 'ten_hours';
export type VtcPaymentMethod = 'cash' | 'mobile_money' | 'company_account';
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
  notes?: string;
  paymentMethod: VtcPaymentMethod;
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
export type AirportPaymentMethod = 'cash' | 'mobile_money' | 'company_account';

export interface CreateAirportShuttleBookingDto {
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientAddress: string;
  isOneWay: boolean;
  pickupDateAller: string;
  pickupTimeAller: string;
  paymentMethod: AirportPaymentMethod;
  serviceType: 'airport_shuttle';
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
  siegeBebesRetour?: number;
  animalDeCompagnieRetour?: boolean;
  adresseSupplementRetour?: string[];
  trajetAeroportId: number;
  customerId?: number;
  passengers?: number;
  smallBags?: number;
  largeBags?: number;
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
export type InterCityPaymentMethod = 'cash' | 'mobile_money' | 'company_account';

export interface CreateInterCityBookingDto {
  customerId?: number;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientAddress: string;
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
  siegeBebesRetour?: number;
  animalDeCompagnieRetour?: boolean;
  adresseSupplementRetour?: string[];
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

  // ==================== ADMIN AUTH ====================
  authAdmin = {
    login: (data: LoginAdminDto) =>
      this.request<AuthResponse>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: (token: string) =>
      this.request('/auth/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }),

    getProfile: (token: string) =>
      this.request<AdminProfile>('/auth/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),

    updateProfile: (token: string, data: UpdateAdminProfileDto) =>
      this.request<AdminProfile>('/auth/admin/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    changePassword: (token: string, data: ChangePasswordDto) =>
      this.request('/auth/admin/change-password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    forgotPassword: (email: string) =>
      this.request('/auth/admin/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (data: ResetPasswordDto) =>
      this.request('/auth/admin/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // ==================== TRAVEL DOCUMENTS ====================
  travelDocuments = {
    create: (data: CreateTravelDocumentDto) =>
      this.request<TravelDocument>('/travel-documents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getTarifs: () =>
      this.request<TravelDocumentTarif[]>('/travel-documents/tarifs'),

    getAll: (token: string, params?: { status?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) searchParams.append(key, value);
        });
      }
      const query = searchParams.toString();
      return this.request<TravelDocument[]>(`/travel-documents/admin${query ? `?${query}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },

    getById: (token: string, id: number) =>
      this.request<TravelDocument>(`/travel-documents/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),

    update: (token: string, id: number, data: Partial<CreateTravelDocumentDto>) =>
      this.request<TravelDocument>(`/travel-documents/admin/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getStats: (token: string) =>
      this.request('/travel-documents/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      }),
  };
}

// ==================== AUTH TYPES ====================
export interface LoginAdminDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: AdminProfile;
}

export interface AdminProfile {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAdminProfileDto {
  nom?: string;
  prenom?: string;
  email?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// ==================== TRAVEL DOCUMENT TYPES ====================
export type TravelDocumentPaymentMethod = 'mobile_money' | 'company_account';

export interface CreateTravelDocumentDto {
  flightReservation: boolean;
  hotelReservation: boolean;
  firstName: string;
  lastName: string;
  passportNumber: string;
  nationality: string;
  birthDate: string;
  phone: string;
  email: string;
  departureCountry: string;
  departureCity: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;
  returnDate?: string;
  travelReason: string;
  hotelCategory?: string;
  numberOfPeople?: number;
  roomType?: string;
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
  email: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string;
  travelReason: string;
  hotelCategory?: string;
  numberOfPeople?: number;
  roomType?: string;
  hotelDetails?: string;
  paymentMethod: string;
  status: string;
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
