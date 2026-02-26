'use client';

// Base44 SDK removed — this stub prevents compile errors
// All entities return empty data. Replace with real API calls when backend supports them.

const noop = (..._args: any[]): Promise<any[]> => Promise.resolve([]);
const noopObj = (..._args: any[]): Promise<any> => Promise.resolve({});

function createEntityStub() {
  return {
    list: noop,
    filter: noop,
    get: noopObj,
    create: noopObj,
    update: noopObj,
    delete: noopObj,
  };
}

export const base44 = {
  entities: {
    Vehicle: createEntityStub(),
    Department: createEntityStub(),
    VehicleAlert: createEntityStub(),
    VehicleDocument: createEntityStub(),
    Driver: createEntityStub(),
    FuelRequest: createEntityStub(),
    MaintenanceRecord: createEntityStub(),
    DriverAssignment: createEntityStub(),
    Employee: createEntityStub(),
    FuelCard: createEntityStub(),
    FuelCardTransaction: createEntityStub(),
    ServiceProvider: createEntityStub(),
  },
  functions: {},
  analytics: {
    track: () => Promise.resolve(),
  },
  auth: {
    isLoggedIn: () => false,
    getUser: () => null,
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
  },
};

export type Base44Client = typeof base44;
