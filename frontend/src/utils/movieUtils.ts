import { MOCK_MOVIES } from '../services/data/dataset';

/**
 * Resolves the accurate movie poster image based on title and/or movieId.
 * Avoids unintended fallback to the default poster when a movie title is known.
 */
export function resolveMoviePoster(
  movieTitle?: string,
  movieId?: string,
  explicitPoster?: string
): string {
  // If an explicit valid poster path is provided and is NOT the generic fallback, use it
  if (explicitPoster && explicitPoster !== '/posters/poster_quytuvuotgiau.jpg') {
    return explicitPoster;
  }

  // Look up by movieId in MOCK_MOVIES
  if (movieId) {
    const movie = MOCK_MOVIES.find((m) => m.id === movieId);
    if (movie?.poster) return movie.poster;
  }

  // Look up by movieTitle
  if (movieTitle) {
    const clean = movieTitle.trim().toLowerCase();

    if (clean.includes('hope')) return '/posters/poster_hope.jpg';
    if (clean.includes('hộ linh') || clean.includes('tráng sĩ') || clean.includes('ho linh')) {
      return '/posters/poster_holinhtrangsi.jpg';
    }
    if (clean.includes('quý tử') || clean.includes('quy tu')) {
      return '/posters/poster_quytuvuotgiau.jpg';
    }
    if (clean.includes('chiikawa')) return '/posters/poster_chiikawa.jpg';
    if (clean.includes('conan')) return '/posters/poster_conan.jpg';

    const movie = MOCK_MOVIES.find(
      (m) =>
        m.title.toLowerCase() === clean ||
        clean.includes(m.title.toLowerCase()) ||
        m.title.toLowerCase().includes(clean)
    );
    if (movie?.poster) return movie.poster;
  }

  // If explicitPoster is given (even quytuvuotgiau if title is actually Quy Tu)
  if (explicitPoster) return explicitPoster;

  return '/posters/poster_hope.jpg';
}

/**
 * Resolves the movie age rating tag (e.g. T16, T13, K, P) based on title and movieId.
 */
export function resolveMovieAgeRating(
  movieTitle?: string,
  movieId?: string,
  explicitRating?: string
): string {
  if (explicitRating && explicitRating !== 'K' && explicitRating !== 'T18') {
    return explicitRating;
  }
  if (movieId) {
    const movie = MOCK_MOVIES.find((m) => m.id === movieId);
    if (movie?.ageRating) return movie.ageRating;
  }
  if (movieTitle) {
    const clean = movieTitle.trim().toLowerCase();
    if (clean.includes('hope')) return 'T16';
    if (clean.includes('hộ linh') || clean.includes('tráng sĩ') || clean.includes('ho linh')) return 'T13';
    if (clean.includes('quý tử') || clean.includes('quy tu')) return 'K';
    if (clean.includes('chiikawa')) return 'P';
    if (clean.includes('conan')) return 'K';
  }
  return explicitRating || 'T16';
}
