import type { Showtime, Theater } from '../../types/booking';
import { MOCK_SHOWTIMES, MOCK_THEATERS } from './dataset';

export interface DateOption {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // "Thứ Hai"
  numDisplay: string; // "07/09"
}

export const showtimeRepository = {
  /**
   * Get distinct dates that actually have showtimes for a specific movie
   */
  async getAvailableDatesForMovie(movieId: string): Promise<DateOption[]> {
    const movieShowtimes = MOCK_SHOWTIMES.filter((st) => st.movieId === movieId);
    const dateMap = new Map<string, DateOption>();

    for (const st of movieShowtimes) {
      if (!dateMap.has(st.date)) {
        dateMap.set(st.date, {
          date: st.date,
          dayOfWeek: st.dayOfWeekDisplay,
          numDisplay: st.dateDisplay,
        });
      }
    }

    // Sort by date ascending
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Get theaters that have showtimes for a specific movie and date
   */
  async getTheatersForMovieAndDate(movieId: string, date: string): Promise<Theater[]> {
    const matchingShowtimes = MOCK_SHOWTIMES.filter(
      (st) => st.movieId === movieId && st.date === date
    );
    const theaterIds = new Set(matchingShowtimes.map((st) => st.theaterId));
    return MOCK_THEATERS.filter((t) => theaterIds.has(t.id));
  },

  /**
   * Get showtimes matching movie, date, and theater
   */
  async getShowtimes(query: {
    movieId: string;
    date: string;
    theaterId: string;
  }): Promise<Showtime[]> {
    return MOCK_SHOWTIMES.filter(
      (st) =>
        st.movieId === query.movieId &&
        st.date === query.date &&
        st.theaterId === query.theaterId
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  /**
   * Get all showtimes for a movie and date across all theaters (grouped by theater)
   */
  async getShowtimesForMovieAndDate(
    movieId: string,
    date: string
  ): Promise<Showtime[]> {
    return MOCK_SHOWTIMES.filter(
      (st) => st.movieId === movieId && st.date === date
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  /**
   * Get a showtime by its ID
   */
  async getShowtimeById(showtimeId: string): Promise<Showtime | null> {
    const st = MOCK_SHOWTIMES.find((s) => s.id === showtimeId);
    return st || null;
  },
};
