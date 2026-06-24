'use client';

// API Client — Mysubito Microservices
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dev.api.mysubito.net';

// Token keys for localStorage
const TOKEN_KEY = 'subito_compagny_token';
const REFRESH_TOKEN_KEY = 'subito_compagny_refresh_token';
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
  latitude?: number | null;
  longitude?: number | null;
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
  price: number | string;
  includedKm?: number;
  extraHourCost?: number | string;
  extraKmCost?: number | string;
  statut?: string;
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
  trajetAeroportId: number;
  isOneWay: boolean;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  flightNumber?: string;
  pickupDateAller: string;
  pickupTimeAller: string;
  pickupDateRetour?: string;
  pickupTimeRetour?: string;
  adressePriseEnChargeAller: string;
  adressePriseEnChargeAllerLat?: number;
  adressePriseEnChargeAllerLng?: number;
  adressePriseEnChargeRetour?: string;
  adressePriseEnChargeRetourLat?: number;
  adressePriseEnChargeRetourLng?: number;
  terminalDepartId?: number;
  terminalRetourId?: number;
  adresseSupplementAller?: Array<{ adresse: string; lat: number; lng: number }>;
  adresseSupplementRetour?: Array<{ adresse: string; lat: number; lng: number }>;
  siegeBebes?: number;
  siegeBebesRetour?: number;
  animalDeCompagnie?: boolean;
  animalDeCompagnieRetour?: boolean;
  smallBags?: number;
  largeBags?: number;
  specialRequests?: string;
  canal?: string;
  discountCode?: string;
  employeeId?: number;
  direction?: 'to_airport' | 'from_airport';
}

export interface CreateInterCityBookingDto {
  serviceType?: 'one_way' | 'round_trip';
  trajetInterVilleId?: number;
  vehiculeId?: number;
  departureCity?: string;
  arrivalCity?: string;
  isOneWay?: boolean;
  categoryCode?: string;
  pays?: string;
  departLat?: number;
  departLng?: number;
  departAddress?: string;
  arriveeLat?: number;
  arriveeLng?: number;
  arriveeAddress?: string;
  pax?: number;
  paidBy?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  pickupDateAller?: string;
  pickupTimeAller?: string;
  pickupDateRetour?: string;
  pickupTimeRetour?: string;
  adressePriseEnChargeDepartAller?: string;
  adressePriseEnChargeDepartAllerLat?: number;
  adressePriseEnChargeDepartAllerLng?: number;
  adressePriseEnChargeArriveeAller?: string;
  adressePriseEnChargeArriveeAllerLat?: number;
  adressePriseEnChargeArriveeAllerLng?: number;
  adressePriseEnChargeDepartRetour?: string;
  adressePriseEnChargeDepartRetourLat?: number;
  adressePriseEnChargeDepartRetourLng?: number;
  adressePriseEnChargeArriveeRetour?: string;
  adressePriseEnChargeArriveeRetourLat?: number;
  adressePriseEnChargeArriveeRetourLng?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  siegeBebes?: number;
  animalDeCompagnie?: boolean;
  siegeBebesRetour?: number;
  animalDeCompagnieRetour?: boolean;
  smallBags?: number;
  largeBags?: number;
  adresseSupplement?: number;
  adresseSupplementAller?: Array<{ adresse: string; lat: number; lng: number }>;
  adresseSupplementRetour?: Array<{ adresse: string; lat: number; lng: number }>;
  specialRequests?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureTimeRetour?: string;
  arrivalTimeRetour?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
  companyCode?: string;
  customerId?: number;
  employeeId?: number;
  discountAmount?: number;
  discountPercent?: number;
  surchargeAmount?: number;
  surchargePercent?: number;
  canal?: string;
}

export interface CreateVtcHourlyBookingDto {
  country: string;
  vehicleType: string;
  package: string;
  scheduledDatetime: string;
  pickupAddress: string;
  adressePriseEnCharge?: string;
  adressePriseEnChargeLat?: number;
  adressePriseEnChargeLng?: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  notes?: string;
  paidBy: 'company' | 'client';
  paymentMethod?: string;
  companyCode?: string;
  customerId?: number;
  employeeId?: number;
  discountAmount?: number;
  discountPercent?: number;
  surchargeAmount?: number;
  surchargePercent?: number;
  canal?: string;
}

export interface CreateVisaAssistanceRequestDto {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
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

// Travel document stats from GET /travel-documents/company/stats
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
    bictorys: 'bictorys',
  };
  return map[slug] || 'mobile_money';
}

// ==================== BICTORYS PAYMENT TYPES ====================
export type BictorysServiceType = 'booking' | 'travel_document' | 'invoice' | 'service_reservation' | 'delivery';

export interface InitiateBictorysPaymentDto {
  serviceType: BictorysServiceType;
  serviceId: number;
}

export interface BictorysPaymentResponse {
  chargeId: string;
  checkoutUrl: string;
  status: string;
  amount: number;
  serviceType: string;
  serviceId: number;
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
export type TypeTarification = 'PAR_PERSONNE' | 'PAR_GROUPE' | 'FORFAIT';

export interface PriceOption {
  id: number;
  code?: string;
  titre?: string;
  description?: string;
  prix?: number;
  pricingMode?: string;
  isActive?: boolean;
  logementId?: number | null;
  chambreId?: number | null;
  activiteId?: number | null;
  circuitId?: number | null;
  vehiculeLocationId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

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
  priceOptions?: PriceOption[];
  partner?: PartnerInfo;
  statut?: string;
  [key: string]: unknown;
}

export interface Activite {
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
  typeTarification?: TypeTarification;
  images?: string[];
  priceOptions?: PriceOption[];
  partner?: PartnerInfo;
  statut?: string;
  [key: string]: unknown;
}

export interface ActiviteCircuitItem {
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
  typeTarification?: TypeTarification;
  images?: string[];
  statut?: string;
  type: 'circuit' | 'activite';
  [key: string]: unknown;
}

export interface ChambreHotel {
  id: number;
  typeChambre?: string;
  nom?: string;
  description?: string;
  capacite?: number;
  nombreUnites?: number;
  prixParNuit?: number;
  prixWeekend?: number;
  acompteRequis?: boolean;
  acompteType?: 'POURCENTAGE' | 'MONTANT_FIXE' | null;
  acompteValeur?: number | null;
  prixAvecPetitDejeuner?: number | null;
  prixDemiPension?: number | null;
  prixPensionComplete?: number | null;
  prixWeekendAvecPetitDejeuner?: number | null;
  prixWeekendDemiPension?: number | null;
  prixWeekendPensionComplete?: number | null;
  images?: string[];
  equipements?: string[];
  salleDeBain?: number;
  logementId?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface LieuProche {
  nom: string;
  distance: string;
  type?: string;
}

export interface LieuxProches {
  plages?: LieuProche[];
  aeroports?: LieuProche[];
  restaurants?: LieuProche[];
  [key: string]: LieuProche[] | undefined;
}

export interface EquipementsDetail {
  cuisine?: string[];
  securite?: string[];
  services?: string[];
  multimedia?: string[];
  salleDeBain?: string[];
  chambreLinge?: string[];
  exterieurVue?: string[];
  accessibilite?: string[];
  bienEtreLoisirs?: string[];
  parkingTransport?: string[];
  [key: string]: string[] | undefined;
}

export interface PartnerInfo {
  id: number;
  nomPartner: string;
  logo?: string;
}

export interface Pension {
  id: number;
  formule?: string;
  prix?: number;
  prixWeekend?: number | null;
  isActive?: boolean;
  logementId?: number;
  chambreId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AvisLogement {
  id: number;
  note: number;
  commentaire?: string;
  auteur?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AvisMoyennes {
  noteService: number;
  notePrestataire: number;
  noteRapportQualitePrix: number;
  notePonctualite: number;
  globale: number;
  total: number;
}

export interface AvisItem {
  id: number;
  noteService?: number;
  notePrestataire?: number;
  noteRapportQualitePrix?: number;
  notePonctualite?: number;
  note?: number;
  commentaire?: string;
  auteur?: string;
  customer?: { prenom?: string; nom?: string };
  reponsePartenaire?: string;
  repondeLe?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AvisResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  moyennes: AvisMoyennes;
  data: AvisItem[];
}

export interface Logement {
  id: number;
  nom: string;
  type?: string;
  categorie?: string;
  nbreEtoiles?: number;
  pays?: string;
  ville?: string;
  quartier?: string;
  adresseExacte?: string;
  description?: string;
  heureCheckIn?: string;
  heureCheckOut?: string;
  prixParNuit?: number;
  prixWeekend?: number;
  acompteRequis?: boolean;
  acompteType?: 'POURCENTAGE' | 'MONTANT_FIXE' | null;
  acompteValeur?: number | null;
  prixAvecPetitDejeuner?: number | null;
  prixDemiPension?: number | null;
  prixPensionComplete?: number | null;
  prixWeekendAvecPetitDejeuner?: number | null;
  prixWeekendDemiPension?: number | null;
  prixWeekendPensionComplete?: number | null;
  equipements?: string[];
  equipementsDetail?: EquipementsDetail;
  capacite?: number;
  nbreChambres?: number;
  salleDeBain?: number;
  chambresHotel?: ChambreHotel[];
  images?: string[];
  priceOptions?: PriceOption[];
  pensions?: Pension[];
  typeAnnulation?: string;
  latitude?: number;
  longitude?: number;
  instructionsAcces?: string;
  politiqueFumeur?: string;
  animauxCompagnie?: string;
  fetesAutorisees?: boolean;
  heuresSilencieusesDebut?: string;
  heuresSilencieusesFin?: string;
  ageMinimum?: number;
  autresRegles?: string;
  lieuxProches?: LieuxProches;
  statut?: string;
  isTaxe?: boolean;
  partnerId?: number;
  partner?: PartnerInfo;
  totalAvis?: number;
  averageRating?: number;
  avis?: AvisLogement[];
  createdAt?: string;
  updatedAt?: string;
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
  priceOptions?: PriceOption[];
  partner?: PartnerInfo;
  statut?: string;
  [key: string]: unknown;
}

export interface CreateServiceReservationDto {
  serviceType: 'ACTIVITE' | 'LOGEMENT' | 'FLOTTE';
  activiteId?: number;
  circuitId?: number;
  logementId?: number;
  chambreId?: number;
  vehiculeLocationId?: number;
  employeeId?: number;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  dateDebut: string;
  dateFin?: string;
  heureDebut?: string;
  heureFin?: string;
  nombrePersonnes?: number;
  adresseLivraison?: string;
  permisConduire?: string;
  formuleRepas?: string;
  reductionType?: string;
  reductionValue?: number;
  notes?: string;
  canal?: string;
  priceOptions?: Array<{ code: string; quantite: number }>;
}

export interface QuoteRequestDto {
  serviceType?: 'ACTIVITE' | 'LOGEMENT' | 'CIRCUIT' | 'FLOTTE';
  activiteId?: number;
  circuitId?: number;
  logementId?: number;
  chambreId?: number;
  vehiculeLocationId?: number;
  dateDebut?: string;
  dateFin?: string;
  heureDebut?: string;
  heureFin?: string;
  nombrePersonnes?: number;
  pensionIds?: number[];
  priceOptionIds?: number[];
  reductionType?: string;
  reductionValue?: number;
}

export interface QuoteResponseDto {
  serviceType: string;
  product: Record<string, unknown>;
  sejour: {
    dateDebut: string;
    dateFin: string;
    nbNuits: number;
    nbWeekend: number;
  };
  nombrePersonnes: number;
  uniteBase: string;
  base: { libelle: string; montant: number };
  pension?: {
    formule: string;
    prixParNuit: number;
    prixWeekend: number | null;
    nbNuits: number;
    nbWeekend: number;
    remplaceBase: boolean;
    total: number;
  };
  options?: {
    items: Array<{
      code: string;
      titre: string;
      pricingMode: string;
      prix: number;
      quantite?: number;
      total: number;
    }>;
    montant: number;
  };
  reduction?: {
    type: string;
    valeur: number;
    montant: number;
  };
  acompte: {
    requis: boolean;
    type: string | null;
    montant: number | null;
  };
  totalPrice: number;
  disponible: boolean;
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

// ==================== DELIVERIES COMPANY ====================
export interface CreateDeliveryDto {
  deliveryTypeId: number;
  deliveryDate: string;
  deliveryTime: string;
  expediteurNom: string;
  expediteurTelephone: string;
  expediteurEmail?: string;
  expediteurEmployeeId?: number;
  destinataireNom: string;
  destinataireTelephone: string;
  destinataireEmail?: string;
  destinataireEmployeeId?: number;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress: string;
  dropoffLat?: number;
  dropoffLng?: number;
  description?: string;
  notes?: string;
  employeeId?: number;
}

export interface DeliveryEstimate {
  deliveryType: { id: number; nom: string; prixParKm: number; prixMinimum: number };
  distanceKm: number;
  originalPrice: number;
  totalHT: number;
  tvaAmount: number;
  totalTTC: number;
  isTva: boolean;
}

export interface DeliveryResponse {
  id: number;
  reference?: string;
  status?: string;
  deliveryTypeId?: number;
  deliveryDate?: string;
  deliveryTime?: string;
  expediteurNom?: string;
  expediteurTelephone?: string;
  expediteurEmail?: string;
  destinataireNom?: string;
  destinataireTelephone?: string;
  destinataireEmail?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  description?: string;
  notes?: string;
  totalPrice?: number;
  originalPrice?: string;
  totalHT?: string;
  tvaAmount?: string;
  totalTTC?: string;
  isTva?: boolean;
  distanceKm?: number;
  distance?: number;
  discountAmount?: string | null;
  discountPercent?: string | null;
  surchargeAmount?: string | null;
  surchargePercent?: string | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
  paidBy?: string;
  deliveryCode?: string;
  confirmationCode?: string;
  employeeId?: number;
  deliveryType?: { id: number; name?: string; description?: string; prixParKm?: number; prixMinimum?: number };
  livreur?: { id: number; nom?: string; prenom?: string; telephone?: string };
  trackingHistory?: Array<{ status: string; timestamp: string; comment?: string }>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface DeliveryListResponse {
  list: DeliveryResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DeliveryType {
  id: number;
  nom: string;
  description?: string;
  image?: string;
  prixParKm?: string;
  prixMinimum?: string;
  isActive?: boolean;
}

// ==================== NAVETTE CI TYPES ====================
export interface NavetteCICategory {
  id: number;
  code: string;
  label: string;
  maxPax: number;
  maxBagages23kg: number;
  maxBagages10kg: number;
  image?: string;
  ordre: number;
  statut: string;
  tarifs: Array<{ prixParKm: number; minimumGaranti: number; statut: string }>;
}

export interface NavetteCIQuoteOption {
  categoryId: number;
  code: string;
  label: string;
  maxPax: number;
  maxBagages10kg: number;
  maxBagages23kg: number;
  image?: string;
  prixParKm: number;
  minimumGaranti: number;
  prix: number;
  minimumApplique: boolean;
}

export interface NavetteCIQuoteResponse {
  distanceKm: number;
  pax: number;
  bagages23: number;
  bagages10: number;
  options: NavetteCIQuoteOption[];
}

export interface NavetteCIOption {
  id: number;
  code: string;
  label: string;
  description?: string;
  image?: string[];
  prix: number;
  maxQuantite: number;
  type: 'SIMPLE' | 'ADDRESS';
  pricingMode: 'FLAT' | 'PER_KM_DETOUR';
  country: string;
  ordre: number;
  statut: string;
}

export interface NavetteCIOptionAdresse {
  adresse: string;
  lat: number;
  lng: number;
  instructions?: string;
  contactNom?: string;
  contactTelephone?: string;
}

export interface NavetteCIOptionSelectionnee {
  optionId: number;
  quantite?: number;
  adresses?: NavetteCIOptionAdresse[];
}

export interface CreateNavetteCIBookingDto {
  categoryCode: string;
  departLat: number;
  departLng: number;
  arriveeLat: number;
  arriveeLng: number;
  departAddress: string;
  arriveeAddress: string;
  pax: number;
  bagages23: number;
  bagages10: number;
  sens: 'airport_to_city' | 'city_to_airport';
  isOneWay: boolean;
  scheduledDate: string;
  scheduledTime: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  flightNumber?: string;
  paymentMethod?: string;
  notes?: string;
  employeeId?: number;
  optionsSelectionnees?: NavetteCIOptionSelectionnee[];
}

// ==================== INSURANCE TYPES ====================
export interface InsuranceReferenceItem {
  id?: string | number;
  code?: string;
  name?: string;
  label?: string;
  description?: string;
  // AXA product fields
  kindLabel?: string;
  usageLabel?: string;
  productCode?: string;
  productLabel?: string;
  libelle?: string;
  nom?: string;
  designation?: string;
  // Brand-specific fields (from /ref/brands)
  brandCode?: string;
  brandLabel?: string;
  typeCode?: string;
  typeLabel?: string;
  country?: string;
  // Coverage-specific fields (from /ref/coverages)
  categoryId?: number;
  orderGuarantee?: number;
  options?: Array<{ key: string; value: string; label: string }> | null;
  [key: string]: unknown;
}

export type InsuranceReferenceType =
  | 'activities'
  | 'car-types'
  | 'categories'
  | 'products'
  | 'brands'
  | 'models'
  | 'energies'
  | 'policy-fees'
  | 'durations'
  | 'coverages'
  | 'csps'
  | 'titles'
  | 'countries'
  | 'discounts';

export interface CreateInsuranceSimulationDto {
  productCode: string;
  packCode: string;
  durationCode: string;
  countryCode: string;
  vehicle: {
    energyCode: string;
    fiscalPower: number;
    numberOfPlaces: number;
    registrationNumber: string;
    replacementCost: number;
    marketValue: number;
    dateOfFirstRegistration: string;
    brandCode: string;
    modelCode: string;
    carTypeCode: string;
    otherBrand?: string;
    otherModel?: string;
  };
  coverages: Array<{
    code: string;
    // Per swagger: AXA expects capitalAmount (number). The legacy `option` field
    // is sent by the older /insurance form; keep both until that flow is rewritten.
    capitalAmount?: number;
    option?: string | null;
  }>;
  discountCode?: string;
  bonus?: number;
  malus?: number;
  commercialReduction?: number;
  customerId?: number;
}

export interface InsuranceSimulationResponse {
  simulationId: number;
  createdAt: string;
  id?: number;
  productCode?: string;
  packCode?: string;
  durationCode?: string;
  countryCode?: string;
  totalPremium?: number;
  currency?: string;
  coverages?: Array<{
    code: string;
    label?: string;
    premium?: number;
    // Legacy field surfaced by the older /insurance UI; AXA's canonical response uses {label, premium}.
    option?: string | null;
  }>;
  // Detailed breakdown — present in actual API responses though not in the swagger sample.
  grossPrime?: number;
  taxe?: number;
  policyCost?: number;
  netPrime?: number;
  totalPrime?: number;
  status?: string;
  vehicleData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CreateInsuranceContractDto {
  simulationId: number;
  referenceTrxPayment: string;
  startDate: string;
  customer: {
    title: string;
    lastName: string;
    firstName: string;
    address: string;
    mobilePhone: string;
    email: string;
    cin: string;
    birthdate: string;
    city: string;
    activity?: string;
    csp: string;
    nationality: string;
    nativeCountry: string;
  };
}

export interface InsuranceContractResponse {
  contractNumber: string;
  simulationId: number;
  startDate: string;
  endDate: string;
  status: string;
  totalPremium: number;
  currency: string;
  [key: string]: unknown;
}

// Insurance payment — shapes inferred from the Bictorys pattern; tighten when the
// AXA payment schema is confirmed.
export interface InsurancePaymentCheckoutResponse {
  chargeId?: string;
  checkoutUrl: string;
  status?: string;
  amount?: number;
  simulationId?: number;
  [key: string]: unknown;
}

export interface InitiateInsuranceDirectPaymentDto {
  operator: string;
  phone: string;
  [key: string]: unknown;
}

export interface InsuranceDirectPaymentResponse {
  chargeId?: string;
  status?: string;
  amount?: number;
  simulationId?: number;
  [key: string]: unknown;
}

export interface InsurancePaymentStatusResponse {
  simulationId?: number;
  status: string;
  paidAt?: string;
  amount?: number;
  chargeId?: string;
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

// ==================== TICKET TYPES ====================
export interface TicketMessageResponse {
  id: number;
  ticketId: number;
  content: string;
  senderType: 'compagny' | 'manager';
  senderId: number;
  lu: boolean;
  createdAt: string;
}

export interface TicketResponse {
  id: number;
  subject: string;
  statut: string;
  initiatorType: string;
  messages: TicketMessageResponse[];
  managerId?: number;
  compagnyId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketDto {
  subject: string;
  message: string;
}

export interface CreateTicketMessageDto {
  content: string;
}

function translateErrors(raw: string | string[]): string {
  if (Array.isArray(raw)) {
    return raw.map(translateErrorMessage).join(', ');
  }
  return translateErrorMessage(raw);
}

// ==================== LOCATION DE SALLE TYPES ====================
export interface PriceOption {
  id: number;
  code: string;
  titre: string;
  description: string | null;
  prix: number;
  pricingMode: string;
  isActive: boolean;
  salleId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Salle {
  id: number;
  nom: string;
  description: string;
  capacite: number;
  prixParJour: number;
  prixParHeure: number;
  acompteRequis: boolean;
  acompteType: string | null;
  acompteValeur: number | null;
  images: string[];
  equipements: string[];
  lieuId: number;
  createdAt: string;
  updatedAt: string;
  priceOptions: PriceOption[];
}

export interface Partner {
  id: number;
  nomPartner: string;
  logo: string | null;
}

export interface Lieu {
  id: number;
  nom: string;
  description: string;
  pays: string;
  ville: string;
  adresseExacte: string;
  images: string[];
  equipements: string[];
  isPublier: boolean;
  isActive: boolean;
  blockedByAdmin: boolean;
  partnerId: number;
  createdAt: string;
  updatedAt: string;
  salles: Salle[];
  partner: Partner;
}

export interface LieuxListResponse {
  message: string;
  status: number;
  data: Lieu[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface LieuxDetailResponse {
  message?: string;
  statusCode?: number;
  data?: Lieu;
  error?: string;
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

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private getCompanyId(): number | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      return user?.id ?? null;
    } catch {
      return null;
    }
  }

  private saveNewToken(accessToken: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    document.cookie = `subito_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }

  private clearAuth() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'subito_token=; path=/; max-age=0';
  }

  private async attemptRefreshToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('[API] Attempting token refresh...');
        const res = await fetch(`${this.baseUrl}/auth/compagny/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          console.warn(`[API] Refresh token failed: ${res.status}`);
          return null;
        }

        const json = await res.json();
        const data = json?.data ?? json;
        const newAccess = data?.accessToken || data?.access_token;
        const newRefresh = data?.refreshToken || data?.refresh_token;
        if (newAccess) {
          console.log('[API] Token refreshed successfully');
          this.saveNewToken(newAccess, newRefresh);
          return newAccess as string;
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
      const text = await response.text();
      let error: { message?: string; [k: string]: unknown };
      const fallbackByStatus: Record<number, string> = {
        400: "Requête invalide — vérifiez les informations saisies",
        403: "Accès refusé",
        404: "Ressource introuvable",
        409: "Conflit — cette ressource existe déjà (email ou identifiant en doublon)",
        422: "Données non valides",
        429: "Trop de requêtes — patientez un instant",
      };
      try {
        error = JSON.parse(text);
      } catch {
        console.error(`[API] Non-JSON ${response.status} response on ${endpoint}:`, text.slice(0, 500));
        error = { message: fallbackByStatus[response.status] || `Erreur ${response.status}` };
      }

      const rawMsg = error.message;
      const msg = rawMsg
        ? translateErrors(rawMsg)
        : fallbackByStatus[response.status] || `Erreur ${response.status}`;

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

  // Helper: authenticated binary download (PDF, ZIP, etc.)
  private async authDownloadBlob(endpoint: string): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAuthToken();
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      if (response.status === 401) {
        const newToken = await this.attemptRefreshToken();
        if (newToken) {
          const retry = await fetch(url, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          if (retry.ok) return retry.blob();
        }
        this.clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/login?expired=true';
        }
        throw new Error('Session expirée');
      }
      let detail = '';
      try { const body = await response.json(); detail = body?.message || body?.error || JSON.stringify(body); } catch { /* ignore */ }
      throw new Error(detail || `Erreur ${response.status} lors du téléchargement`);
    }
    return response.blob();
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
      this.request<CompagnyUserProfile>('/auth/compagny/me', {
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
        method: 'PATCH',
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

    refreshToken: (refreshToken: string) =>
      this.request<{ accessToken: string; refreshToken: string }>('/auth/compagny/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),

    updateFcmToken: (fcmToken: string) =>
      this.authPost<void>('/auth/compagny/fcm-token', { fcmToken }),
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
    searchAirportShuttles: (villeDepartId: number, villeArriveeId: number, page = 1, pageSize = 50) =>
      this.authGet<TrajetAeroport[]>(`/bookings/airport-shuttle/search?villeDepartId=${villeDepartId}&villeArriveeId=${villeArriveeId}&page=${page}&pageSize=${pageSize}`),

    getTrajetInterVille: () =>
      this.authGet<{ data: TrajetInterVille[]; total: number; page: number; limit: number }>('/bookings/trajets-inter-ville'),

    getVtcTarifs: (country: string) =>
      this.authGet<VtcTarif[]>(`/bookings/vtc-tarifs?country=${country}`),

    getVtcGrid: (country: string) =>
      this.authGet<VtcPricingGrid>(`/bookings/vtc-tarifs/pricing?country=${country}`),

    getVilles: (pays?: string) =>
      this.authGet<Ville[]>(`/villes${pays ? `?pays=${encodeURIComponent(pays)}` : ''}`),

    getPays: () =>
      this.authGet<string[]>('/villes/pays'),

    getTravelDocumentTarifs: () =>
      this.request<TravelDocumentTarif[]>('/travel-documents/tarifs'),

    getPaymentOptions: () =>
      this.request<PaymentOption[]>('/payments/payment-options'),

    getInterCityCiCategories: () =>
      this.request<any[]>('/bookings/inter-city/ci/categories'),

    getInterCityCiOptions: () =>
      this.request<any[]>('/bookings/inter-city/ci/options'),
  };

  // ==================== BOOKINGS COMPANY ====================
  bookings = {
    // Create bookings
    createAirportShuttle: (data: CreateAirportShuttleBookingDto) =>
      this.authPost<BookingResponse>('/bookings/airport-shuttle/compagny/create', data),

    createInterCity: (data: CreateInterCityBookingDto) =>
      this.authPost<BookingResponse>('/bookings/inter-city/compagny/create', data),

    createVisaAssistance: (data: CreateVisaAssistanceRequestDto) =>
      this.authPost<BookingResponse>('/bookings/visa-assistance/compagny/create', data),

    createVtcHourly: (data: CreateVtcHourlyBookingDto) =>
      this.authPost<BookingResponse>('/bookings/vtc-hourly/compagny/create', data),

    // List bookings — no transversal list in microservices; use type-specific sub-lists
    list: (page = 1, limit = 10) =>
      this.authGet<PaginatedData<BookingResponse>>(`/bookings/airport-shuttle/compagny?page=${page}&limit=${limit}`),

    // Get single booking by type-specific endpoint (use sub-resource .get() where possible)
    get: (id: number) =>
      this.authGet<BookingResponse>(`/bookings/airport-shuttle/compagny/${id}`),

    // Cancel booking
    cancel: (id: number) =>
      this.authPatch<void>(`/bookings/compagny/${id}/cancel`),

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

    // Navette CI
    navetteCI: {
      getCategories: () =>
        this.request<NavetteCICategory[]>('/bookings/airport-shuttle/ci/categories'),
      getOptions: () =>
        this.request<NavetteCIOption[]>('/bookings/airport-shuttle/ci/options'),
      getQuote: (data: { departLat: number; departLng: number; arriveeLat: number; arriveeLng: number; pax: number; bagages23: number; bagages10: number; isOneWay?: boolean; departRetourLat?: number; departRetourLng?: number; arriveeRetourLat?: number; arriveeRetourLng?: number }) =>
        this.authPost<NavetteCIQuoteResponse>('/bookings/airport-shuttle/ci/quote', data),
      getPrice: (data: any) =>
        this.authPost<any>('/bookings/airport-shuttle/ci/price', data),
      create: (data: CreateNavetteCIBookingDto) =>
        this.authPost<BookingResponse>('/bookings/airport-shuttle/ci/compagny/create', data),
    },

    // Dashboard & Stats
    dashboard: () =>
      this.authGet<DashboardData>('/bookings/compagny/dashboard'),

    stats: (startDate: string, endDate: string, serviceType?: string) => {
      const q = new URLSearchParams({ startDate, endDate });
      if (serviceType) q.set('serviceType', serviceType);
      return this.authGet<StatsData>(`/bookings/compagny/stats?${q.toString()}`);
    },

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
      this.authPost<TravelDocumentResponse>('/travel-documents/company', data),

    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      return this.authGet<PaginatedData<TravelDocumentResponse>>(`/travel-documents/company?${q.toString()}`);
    },

    get: (id: number) =>
      this.authGet<TravelDocumentResponse>(`/travel-documents/company/${id}`),

    update: (id: number, data: Partial<CreateTravelDocumentDto>) =>
      this.authPut<TravelDocumentResponse>(`/travel-documents/company/${id}`, data),

    delete: (id: number) =>
      this.authDelete<void>(`/travel-documents/company/${id}`),

    dashboard: () =>
      this.authGet<DashboardData>('/travel-documents/company/dashboard'),

    stats: (startDate: string, endDate: string) =>
      this.authGet<StatsData>(`/travel-documents/company/stats?startDate=${startDate}&endDate=${endDate}`),

    paymentRequests: {
      list: (page = 1, limit = 10) =>
        this.authGet<PaginatedData<PaymentRequest>>(`/travel-documents/company/payment-requests?page=${page}&limit=${limit}`),
      approve: (id: number) =>
        this.authPut<void>(`/travel-documents/company/payment-requests/${id}/approve`),
      pay: (id: number) =>
        this.authPut<void>(`/travel-documents/company/payment-requests/${id}/pay`),
      reject: (id: number) =>
        this.authPut<void>(`/travel-documents/company/payment-requests/${id}/reject`),
    },
  };

  // ==================== DEPARTMENTS ====================
  // Users service: /users/companies/departments
  departments = {
    create: (data: CreateDepartmentDto) =>
      this.authPost<DepartmentResponse>('/users/companies/departments', data),

    list: (page = 1, limit = 50) =>
      this.authGet<PaginatedData<DepartmentResponse>>(`/users/companies/departments?page=${page}&limit=${limit}`),

    get: (id: number) =>
      this.authGet<DepartmentResponse>(`/users/companies/departments/${id}`),

    update: (id: number, data: UpdateDepartmentDto) =>
      this.authPatch<DepartmentResponse>(`/users/companies/departments/${id}`, data),

    delete: (id: number) =>
      this.authDelete<void>(`/users/companies/departments/${id}`),
  };

  // ==================== EMPLOYEES ====================
  // Users service: /users/companies/employees
  employees = {
    create: (data: CreateEmployeeDto) =>
      this.authPost<EmployeeResponse>('/users/companies/employees', data),

    list: (params?: { page?: number; limit?: number; departementId?: number; actif?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.departementId) q.set('departementId', params.departementId.toString());
      if (params?.actif !== undefined) q.set('actif', params.actif.toString());
      return this.authGet<PaginatedData<EmployeeResponse>>(`/users/companies/employees?${q.toString()}`);
    },

    get: (id: number) =>
      this.authGet<EmployeeResponse>(`/users/companies/employees/${id}`),

    update: (id: number, data: UpdateEmployeeDto) =>
      this.authPatch<EmployeeResponse>(`/users/companies/employees/${id}`, data),

    delete: (id: number) =>
      this.authDelete<void>(`/users/companies/employees/${id}`),
  };

  // ==================== INVOICES COMPANY ====================
  invoices = {
    requestInvoice: (data?: Record<string, unknown>) =>
      this.authPost<void>('/payments/invoices/compagny/request', data || {}),

    list: (params?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string }) => {
      const q = new URLSearchParams();
      q.set('page', (params?.page || 1).toString());
      q.set('limit', (params?.limit || 10).toString());
      if (params?.status) q.set('status', params.status);
      if (params?.startDate) q.set('startDate', params.startDate);
      if (params?.endDate) q.set('endDate', params.endDate);
      return this.authGet<PaginatedData<InvoiceResponse>>(`/payments/invoices/compagny?${q.toString()}`);
    },

    summary: () =>
      this.authGet<InvoiceSummary>('/payments/invoices/compagny/summary'),

    billingStats: () =>
      this.authGet<BillingStats>('/payments/invoices/compagny/billing-stats'),

    get: (id: number) =>
      this.authGet<InvoiceResponse>(`/payments/invoices/compagny/${id}`),

    pay: (id: number, data?: { paymentMethod?: string }) =>
      this.authPut<InvoiceResponse>(`/payments/invoices/compagny/${id}/pay`, data || {}),
  };

  // ==================== SERVICE RESERVATIONS COMPANY ====================
  serviceReservations = {
    quote: (data: QuoteRequestDto) =>
      this.request<QuoteResponseDto>('/reservations/quote', { method: 'POST', body: JSON.stringify(data) }),

    create: (data: CreateServiceReservationDto) =>
      this.authPost<ServiceReservationResponse>('/reservations/company/service-reservations', data),

    list: (page = 1, limit = 10, params?: { status?: string; serviceType?: string; search?: string }) => {
      const q = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (params?.status) q.set('status', params.status);
      if (params?.serviceType) q.set('serviceType', params.serviceType);
      if (params?.search) q.set('search', params.search);
      return this.authGet<PaginatedData<ServiceReservationResponse>>(`/reservations/company/service-reservations?${q.toString()}`);
    },

    get: (id: number) =>
      this.authGet<ServiceReservationResponse>(`/reservations/company/service-reservations/${id}`),

    cancel: (id: number, motif?: string) =>
      this.authPatch<ServiceReservationResponse>(`/reservations/company/service-reservations/${id}/cancel`, motif ? { motif } : undefined),

    // Paiement via le service payments
    pay: (id: number, data: PayReservationDto) =>
      this.authPost<ServiceReservationResponse>(`/payments/bictorys/initiate`, {
        serviceType: 'service_reservation',
        serviceId: id,
        ...data,
      }),
  };

  // ==================== PUBLIC CATALOGS (NO AUTH) ====================
  circuits = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<Circuit>>(`/catalog/circuits?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<Circuit>(`/catalog/circuits/${id}`),

    listActivitesEtCircuits: () =>
      this.request<ActiviteCircuitItem[]>(`/catalog/circuits`),
  };

  activites = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<Activite>>(`/catalog/activites?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<Activite>(`/catalog/activites/${id}`),
  };

  logements = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<Logement>>(`/catalog/logements?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<Logement>(`/catalog/logements/${id}`),

    searchPublic: (params: { location?: string; dateArrivee?: string; dateDepart?: string; nbChambres?: number; nbAdultes?: number; nbEnfants?: number }) => {
      const q = new URLSearchParams();
      if (params.location) q.set('location', params.location);
      if (params.dateArrivee) q.set('dateArrivee', params.dateArrivee);
      if (params.dateDepart) q.set('dateDepart', params.dateDepart);
      if (params.nbChambres) q.set('nbChambres', params.nbChambres.toString());
      if (params.nbAdultes) q.set('nbAdultes', params.nbAdultes.toString());
      if (params.nbEnfants) q.set('nbEnfants', params.nbEnfants.toString());
      return this.request<Logement[]>(`/catalog/logements?${q.toString()}`);
    },
  };

  vehiculesLocation = {
    listPublic: (page = 1, limit = 50) =>
      this.request<PaginatedData<VehiculeLocation>>(`/catalog/vehicules?page=${page}&limit=${limit}`),

    getPublic: (id: number) =>
      this.request<VehiculeLocation>(`/catalog/vehicules/${id}`),
  };

  // ==================== DELIVERIES COMPANY ====================
  deliveries = {
    types: () =>
      this.request<DeliveryType[]>('/deliveries/delivery-types/public'),

    estimate: (data: { deliveryTypeId: number; pickupLat: number; pickupLng: number; dropoffLat: number; dropoffLng: number }) =>
      this.authPost<DeliveryEstimate>('/deliveries/company/estimate', data),

    create: (data: CreateDeliveryDto) =>
      this.authPost<DeliveryResponse>('/deliveries/company', data),

    list: (params?: { page?: number; limit?: number; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.status) q.set('status', params.status);
      return this.authGet<DeliveryListResponse>(`/deliveries/company?${q.toString()}`);
    },

    get: (id: number) =>
      this.authGet<DeliveryResponse>(`/deliveries/company/${id}`),

    cancel: (id: number) =>
      this.authPatch<DeliveryResponse>(`/deliveries/company/${id}/cancel`),
  };

  // ==================== INSURANCE COMPANY ====================
  insurance = {
    // 1. Récupérer les données de référence AXA
    getReference: (type: InsuranceReferenceType, params?: { productCode?: string; categoryCode?: string; brandCode?: string }) => {
      const q = new URLSearchParams();
      if (params?.productCode) q.set('productCode', params.productCode);
      if (params?.categoryCode) q.set('categoryCode', params.categoryCode);
      if (params?.brandCode) q.set('brandCode', params.brandCode);
      const qs = q.toString();
      return this.authGet<InsuranceReferenceItem[]>(`/insurance/compagny/ref/${type}${qs ? `?${qs}` : ''}`);
    },

    // 1b. Produits par catégorie (path: /ref/categories/{id}/products)
    getProductsByCategory: (categoryId: string | number) =>
      this.authGet<unknown[]>(`/insurance/compagny/ref/categories/${categoryId}/products`),

    // 2. Créer une simulation tarifaire
    createSimulation: (data: CreateInsuranceSimulationDto) =>
      this.authPost<InsuranceSimulationResponse>('/insurance/compagny/simulations', data),

    // 3. Lister les simulations
    listSimulations: (page = 1, limit = 20) =>
      this.authGet<{ data: InsuranceSimulationResponse[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/insurance/compagny/simulations?page=${page}&limit=${limit}`
      ),

    // 4. Télécharger le PDF du devis
    downloadSimulationPdf: (simulationId: number) =>
      this.authDownloadBlob(`/insurance/compagny/simulations/${simulationId}/pdf`),

    // 4b. Initier le paiement checkout d'une simulation (URL hébergée)
    payCheckout: (simulationId: number) =>
      this.authPost<InsurancePaymentCheckoutResponse>(
        `/insurance/compagny/simulations/${simulationId}/pay`,
        {}
      ),

    // 4c. Initier le paiement mobile money direct (push USSD)
    payDirect: (simulationId: number, data: InitiateInsuranceDirectPaymentDto) =>
      this.authPost<InsuranceDirectPaymentResponse>(
        `/insurance/compagny/simulations/${simulationId}/pay/direct`,
        data
      ),

    // 4d. Statut de paiement d'une simulation
    getPaymentStatus: (simulationId: number) =>
      this.authGet<InsurancePaymentStatusResponse>(
        `/insurance/compagny/simulations/${simulationId}/payment-status`
      ),

    // 5. Créer un contrat d'assurance
    createContract: (data: CreateInsuranceContractDto) =>
      this.authPost<InsuranceContractResponse>('/insurance/compagny/contracts', data),

    // 6. Lister les contrats
    listContracts: (page = 1, limit = 20) =>
      this.authGet<{ data: InsuranceContractResponse[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        `/insurance/compagny/contracts?page=${page}&limit=${limit}`
      ),

    // 7. Télécharger les documents du contrat (ZIP)
    downloadContractDocuments: (contractNumber: string) =>
      this.authDownloadBlob(`/insurance/compagny/contracts/${contractNumber}/download`),
  };

  // ==================== TICKETS COMPANY ====================
  tickets = {
    create: (data: CreateTicketDto) =>
      this.authPost<TicketResponse>('/admin/compagny/tickets', data),

    list: (params?: { statut?: string }) => {
      const q = new URLSearchParams();
      if (params?.statut) q.set('statut', params.statut);
      const qs = q.toString();
      return this.authGet<TicketResponse[]>(`/admin/compagny/tickets${qs ? `?${qs}` : ''}`);
    },

    get: (id: number) =>
      this.authGet<TicketResponse>(`/admin/compagny/tickets/${id}`),

    sendMessage: (id: number, data: CreateTicketMessageDto) =>
      this.authPost<TicketMessageResponse>(`/admin/compagny/tickets/${id}/messages`, data),
  };

  // ==================== NOTIFICATIONS COMPANY ====================
  // TODO: vérifier le chemin exact du service notifications pour le rôle compagny
  notifications = {
    list: (limit = 100) =>
      this.authGet<NotificationListResponse>(`/admin/admin/messagerie/notifications/compagny?limit=${limit}`),

    unreadCount: () =>
      this.authGet<{ count: number }>('/admin/admin/messagerie/notifications/compagny/unread-count'),

    get: (id: number) =>
      this.authGet<CompagnyNotification>(`/admin/admin/messagerie/notifications/compagny/${id}`),

    markRead: (id: number) =>
      this.authPatch<void>(`/admin/admin/messagerie/notifications/compagny/${id}/read`),

    markAllRead: () =>
      this.authPatch<void>('/admin/admin/messagerie/notifications/compagny/read-all'),
  };

  // ==================== BICTORYS PAYMENT ====================
  bictorys = {
    /** Initier un paiement via Bictorys — retourne checkoutUrl */
    initiate: (data: InitiateBictorysPaymentDto) =>
      this.authPost<BictorysPaymentResponse>('/payments/bictorys/initiate', data),
  };

  // ==================== LOCATION DE SALLE (LIEUX) ====================
  lieux = {
    /** Lister tous les lieux publiqués */
    list: (pageSize = 20, page = 1, params?: { groupBy?: string; highlight?: string; ville?: string; search?: string }) =>
      this.request<Lieu[]>(
        `/catalog/lieux?pageSize=${pageSize}&page=${page}${params?.groupBy ? `&groupBy=${params.groupBy}` : ''}${params?.highlight ? `&highlight=${params.highlight}` : ''}${params?.ville ? `&ville=${params.ville}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`
      ),

    /** Récupérer le détail d'un lieu */
    detail: (id: number) =>
      this.request<Lieu>(`/catalog/lieux/${id}`),
  };

}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
