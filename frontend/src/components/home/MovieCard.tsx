import React from 'react';

export interface Movie {
  id: string;
  title: string;
  poster: string;
  rating?: number;
  ageRating: 'T18' | 'T16' | 'T13' | 'K' | 'P';
  releaseDate?: string;
  category?: 'now_showing' | 'upcoming';
}

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect }) => {
  return (
    <article
      className="production-movie-card"
      onClick={() => onSelect(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(movie);
        }
      }}
    >
      {/* Poster with 2:3 ratio and badges */}
      <div className="movie-poster-box">
        <img
          src={movie.poster}
          alt={movie.title}
          className="movie-poster-img"
          loading="lazy"
        />

        {/* Bottom subtle gradient overlay */}
        <div className="poster-bottom-overlay">
          <div className="poster-badges-col">
            {movie.rating && (
              <div className="poster-rating-pill">
                <span className="star-icon">★</span>
                <span className="rating-num">{movie.rating.toFixed(1)}</span>
              </div>
            )}
            <div className={`poster-age-badge age-${movie.ageRating.toLowerCase()}`}>
              {movie.ageRating}
            </div>
          </div>
        </div>
      </div>

      {/* Movie title below poster */}
      <h3 className="production-movie-title" title={movie.title}>
        {movie.title}
      </h3>

      {movie.releaseDate && (
        <span className="movie-release-date">Khởi chiếu {movie.releaseDate}</span>
      )}
    </article>
  );
};
