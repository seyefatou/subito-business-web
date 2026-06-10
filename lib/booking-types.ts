export type ProductType = 'logement' | 'activite' | 'circuit' | 'vehicule';

export interface SelectedOptions {
  pensionIds?: number[];
  priceOptionIds?: number[];
}

export interface ClientData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  notes?: string;
}

export interface BookingData {
  productType: ProductType;
  productId: number;
  productName?: string;
  dateDebut?: Date;
  dateFin?: Date;
  heureDebut?: string;
  heureFin?: string;
  nombrePersonnes: number;
  selectedOptions: SelectedOptions;
  clientData?: ClientData;
}

export interface BookingContextType {
  bookingData: BookingData;
  setBookingData: (data: BookingData) => void;
  updateProductSelection: (productType: ProductType, productId: number, productName?: string) => void;
  updateDates: (dateDebut?: Date, dateFin?: Date, heureDebut?: string, heureFin?: string) => void;
  updateParticipants: (count: number) => void;
  updateSelectedOptions: (options: SelectedOptions) => void;
  updateClientData: (data: ClientData) => void;
  clearBooking: () => void;
}

export interface ReservationWizardState {
  step: 1 | 2 | 3 | 4;
  dateDebut?: Date;
  dateFin?: Date;
  heureDebut?: string;
  heureFin?: string;
  nombrePersonnes: number;
  selectedPensions: number[];
  selectedPriceOptions: number[];
  paymentMethod?: 'company_account' | 'client';
}
