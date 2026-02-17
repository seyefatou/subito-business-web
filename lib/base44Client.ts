'use client';

// Base44 SDK disabled - using custom API instead
// This file is kept as a stub to prevent import errors

export const base44 = {
  entities: {},
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
