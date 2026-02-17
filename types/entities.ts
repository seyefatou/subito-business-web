// Core Entity Types for Subito Business

export interface Vehicle {
  id: string;
  registration: string;
  brand: string;
  model: string;
  year?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  fuel_type?: string;
  fuel_card_number?: string;
  current_odometer?: number;
  department?: string;
  assigned_driver?: string;
  insurance_expiry?: string;
  technical_control_expiry?: string;
  created_date?: string;
  updated_date?: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  status: 'active' | 'inactive' | 'on_leave';
  license_number?: string;
  license_expiry?: string;
  assigned_vehicle?: string;
  department?: string;
  hire_date?: string;
  created_date?: string;
  updated_date?: string;
}

export interface Order {
  id: string;
  created_date: string;
  service_category: 'airport_shuttle' | 'inter_city' | 'parcel_delivery' | 'travel_documents';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  pickup_location?: string;
  dropoff_location?: string;
  passenger_name?: string;
  passenger_phone?: string;
  estimated_cost?: number;
  final_cost?: number;
  driver_id?: string;
  vehicle_id?: string;
  department?: string;
  notes?: string;
  created_by?: string;
  updated_date?: string;
}

export interface FuelRequest {
  id: string;
  vehicle_registration: string;
  driver_name: string;
  quantity_liters?: number;
  estimated_cost?: number;
  actual_cost?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  fuel_type?: string;
  station?: string;
  odometer_reading?: number;
  department?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_date?: string;
  updated_date?: string;
}

export interface FuelCard {
  id: string;
  card_number: string;
  vehicle_registration?: string;
  driver_name?: string;
  status: 'active' | 'inactive' | 'blocked';
  balance?: number;
  monthly_limit?: number;
  expiry_date?: string;
  created_date?: string;
  updated_date?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  type: 'scheduled' | 'repair' | 'inspection' | 'emergency';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description?: string;
  estimated_cost?: number;
  actual_cost?: number;
  service_provider?: string;
  scheduled_date?: string;
  completed_date?: string;
  next_maintenance_date?: string;
  odometer_at_service?: number;
  created_date?: string;
  updated_date?: string;
}

export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  role?: string;
  status: 'active' | 'inactive';
  hire_date?: string;
  created_date?: string;
  updated_date?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  manager?: string;
  budget?: number;
  status: 'active' | 'inactive';
  created_date?: string;
  updated_date?: string;
}

export interface Company {
  id: string;
  name: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  status: 'active' | 'inactive';
  created_date?: string;
  updated_date?: string;
}

export interface Notification {
  id: string;
  type: 'order_accepted' | 'order_completed' | 'fuel_approved' | 'maintenance_due' | 'document_expiry' | 'alert' | 'info';
  title: string;
  message: string;
  recipient_email?: string;
  is_read: boolean;
  action_url?: string;
  created_date?: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  document_type: 'insurance' | 'registration' | 'technical_control' | 'permit' | 'other';
  document_name: string;
  expiry_date?: string;
  file_url?: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  created_date?: string;
  updated_date?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  type: 'fuel_auto_approval' | 'maintenance_alert' | 'document_expiry' | 'invoice_generation';
  is_active: boolean;
  conditions?: {
    max_amount?: number;
    approved_vehicles?: string[];
    approved_drivers?: string[];
    departments?: string[];
    days_before?: number;
  };
  actions?: {
    notify?: boolean;
    auto_approve?: boolean;
    create_alert?: boolean;
  };
  created_date?: string;
  updated_date?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  company_id?: string;
  department?: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string;
  paid_date?: string;
  breakdown?: {
    service_type: string;
    count: number;
    amount: number;
  }[];
  created_date?: string;
  updated_date?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  due_date?: string;
  completed_date?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_by?: string;
  created_date?: string;
  updated_date?: string;
}

export interface VehicleAlert {
  id: string;
  vehicle_id: string;
  alert_type: 'maintenance_due' | 'document_expiry' | 'fuel_low' | 'inspection_due';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  is_resolved: boolean;
  resolved_at?: string;
  created_date?: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  type: 'garage' | 'fuel_station' | 'insurance' | 'inspection' | 'other';
  address?: string;
  phone?: string;
  email?: string;
  rating?: number;
  status: 'active' | 'inactive';
  created_date?: string;
  updated_date?: string;
}

export interface AirportCity {
  id: string;
  city_name: string;
  airport_code?: string;
  airport_name?: string;
  country?: string;
  is_active: boolean;
  base_price?: number;
  created_date?: string;
  updated_date?: string;
}

// User and Auth types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
}

export interface AppPublicSettings {
  id: string;
  public_settings: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
