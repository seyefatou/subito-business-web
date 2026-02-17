// Re-export all entity types
export * from './entities';

// Common utility types
export type Status = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ServiceCategory = 'airport_shuttle' | 'inter_city' | 'parcel_delivery' | 'travel_documents';

// Navigation item type for layout
export interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Form props type helper
export interface FormProps<T> {
  initialData?: T;
  onSubmit: (data: T) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

// Table column definition
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

// Filter option
export interface FilterOption {
  label: string;
  value: string;
}

// Chart data point
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

// KPI data
export interface KPIData {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}
