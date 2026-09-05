import type { Theater } from '../../types/booking';
import { MOCK_THEATERS } from './dataset';

export const theaterRepository = {
  /**
   * Get all theaters, optionally filtered by city
   */
  async getTheaters(city?: string): Promise<Theater[]> {
    if (city) {
      return MOCK_THEATERS.filter((t) => t.city.toLowerCase() === city.toLowerCase());
    }
    return MOCK_THEATERS;
  },

  /**
   * Get a theater by ID
   */
  async getTheaterById(theaterId: string): Promise<Theater | null> {
    const theater = MOCK_THEATERS.find((t) => t.id === theaterId);
    return theater || null;
  },
};
