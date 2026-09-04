/**
 * App Configuration & Environment Variables
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';

export const POLLING_INTERVAL_MS = 2000;

export const DEFAULT_COUNTDOWN_SECONDS = {
  seat: 480,
  fnb: 380,
  payment: 315,
};
