import type { Movie } from '../../types/booking';
import { MOCK_MOVIES } from './dataset';

export const movieRepository = {
  /**
   * Get all movies, optionally filtered by status ('now_showing' | 'upcoming')
   */
  async getMovies(status?: 'now_showing' | 'upcoming'): Promise<Movie[]> {
    // In production, this can be an apiClient.get('/api/movies')
    if (status) {
      return MOCK_MOVIES.filter((m) => m.status === status);
    }
    return MOCK_MOVIES;
  },

  /**
   * Get a movie by its unique ID
   */
  async getMovieById(movieId: string): Promise<Movie | null> {
    const movie = MOCK_MOVIES.find((m) => m.id === movieId);
    return movie || null;
  },

  /**
   * Get a movie by title (case-insensitive fuzzy/exact match)
   */
  async getMovieByTitle(title: string): Promise<Movie | null> {
    if (!title) return null;
    const clean = title.trim().toLowerCase();
    const movie = MOCK_MOVIES.find(
      (m) =>
        m.title.toLowerCase() === clean ||
        clean.includes(m.title.toLowerCase()) ||
        m.title.toLowerCase().includes(clean)
    );
    return movie || null;
  },
};
