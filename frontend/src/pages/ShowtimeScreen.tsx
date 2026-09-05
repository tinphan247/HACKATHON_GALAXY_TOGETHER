import React, { useState, useEffect } from 'react';
import { useGroupSession } from '../context/GroupSessionContext';
import { StatusBar } from '../components/common/StatusBar';
import { Header } from '../components/common/Header';
import { movieRepository } from '../services/data/movieRepository';
import { showtimeRepository, type DateOption } from '../services/data/showtimeRepository';
import type { Movie, Theater, Showtime } from '../types/booking';

interface TheaterShowtimeGroup {
  theater: Theater;
  showtimes: Showtime[];
}

export const ShowtimeScreen: React.FC = () => {
  const {
    goTo,
    goBack,
    selectedMovieId,
    selectedDate,
    selectDate,
    selectShowtimeById,
    startSoloBooking,
  } = useGroupSession();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [availableDates, setAvailableDates] = useState<DateOption[]>([]);
  const [theaterGroups, setTheaterGroups] = useState<TheaterShowtimeGroup[]>([]);
  const [expandedTheaters, setExpandedTheaters] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Fetch movie & available dates when selectedMovieId changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      const currentMovie = await movieRepository.getMovieById(selectedMovieId);
      const dates = await showtimeRepository.getAvailableDatesForMovie(selectedMovieId);

      if (!isMounted) return;
      setMovie(currentMovie);
      setAvailableDates(dates);

      // If current selectedDate is not in available dates, fallback to first date
      const hasDate = dates.some((d) => d.date === selectedDate);
      if (!hasDate && dates.length > 0) {
        await selectDate(dates[0].date);
      }
      setIsLoading(false);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedMovieId]);

  // 2. Fetch theaters & showtimes when selectedDate changes
  useEffect(() => {
    let isMounted = true;

    const loadShowtimes = async () => {
      if (!selectedMovieId || !selectedDate) return;

      const theaters = await showtimeRepository.getTheatersForMovieAndDate(selectedMovieId, selectedDate);
      const groups: TheaterShowtimeGroup[] = [];

      for (const t of theaters) {
        const sts = await showtimeRepository.getShowtimes({
          movieId: selectedMovieId,
          date: selectedDate,
          theaterId: t.id,
        });
        groups.push({
          theater: t,
          showtimes: sts,
        });
      }

      if (!isMounted) return;
      setTheaterGroups(groups);

      // Auto-expand first theater
      if (groups.length > 0) {
        setExpandedTheaters({ [groups[0].theater.id]: true });
      }
    };

    loadShowtimes();
    return () => {
      isMounted = false;
    };
  }, [selectedMovieId, selectedDate]);

  // Toggle accordion
  const toggleTheaterAccordion = (theaterId: string) => {
    setExpandedTheaters((prev) => ({
      ...prev,
      [theaterId]: !prev[theaterId],
    }));
  };

  // Handle select showtime slot
  const handleSelectShowtime = async (showtime: Showtime) => {
    console.log('[Showtime] User selected showtime:', showtime.id, showtime.startTime);
    startSoloBooking();
    await selectShowtimeById(showtime.id);
    goTo('screen-seats');
  };

  const movieTitle = movie?.title || 'Lịch Chiếu Phim';
  const ageRating = movie?.ageRating || 'K';

  return (
    <div className="screen">
      <StatusBar />
      <Header
        title={movieTitle}
        onBack={goBack}
        rightAction={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B3B60" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
          </svg>
        }
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
        <div
          style={{
            padding: '11px 0',
            marginRight: 20,
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--navy)',
            borderBottom: '3px solid var(--navy)',
          }}
        >
          Suất Chiếu
        </div>
        <div style={{ padding: '11px 0', marginRight: 20, fontSize: 14, color: 'var(--text-muted)' }}>
          Thông Tin
        </div>
        <div style={{ padding: '11px 0', fontSize: 14, color: 'var(--text-muted)' }}>
          Tin Tức
        </div>
      </div>

      {/* Filter row: City & Format */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', flexShrink: 0 }}>
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r)',
            fontSize: 13,
            color: 'var(--text-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          TP Hồ Chí Minh <span style={{ color: 'var(--text-muted)' }}>▾</span>
        </div>
        <div
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r)',
            fontSize: 13,
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Tất cả rạp <span>▾</span>
        </div>
      </div>

      {/* Dynamic Date strip */}
      {availableDates.length > 0 ? (
        <div className="date-strip">
          {availableDates.map((d) => {
            const isActive = d.date === selectedDate;
            return (
              <div
                key={d.date}
                className={`date-card ${isActive ? 'active' : ''}`}
                onClick={() => selectDate(d.date)}
              >
                <div className="day">{d.dayOfWeek}</div>
                <div className="num">{d.numDisplay}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Chưa có lịch chiếu cho phim này.
        </div>
      )}

      {/* Sub-label for selected date */}
      {availableDates.find((d) => d.date === selectedDate) && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8, flexShrink: 0 }}>
          {availableDates.find((d) => d.date === selectedDate)?.dayOfWeek},{' '}
          {availableDates.find((d) => d.date === selectedDate)?.numDisplay}
        </div>
      )}

      {/* Main Body */}
      <div className="body">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            Đang tải suất chiếu...
          </div>
        ) : theaterGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            Không có suất chiếu cho ngày này. Vui lòng chọn ngày khác.
          </div>
        ) : (
          theaterGroups.map(({ theater, showtimes }) => {
            const isOpen = !!expandedTheaters[theater.id];

            return (
              <div className="cinema-item" key={theater.id}>
                <div
                  className="cinema-header"
                  onClick={() => toggleTheaterAccordion(theater.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="cinema-name">{theater.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {theater.distanceKm && (
                      <span className="cinema-km">📍 {theater.distanceKm} km</span>
                    )}
                    <span>{isOpen ? '^' : 'v'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="cinema-content open">
                    {/* Formats present for this theater */}
                    <div className="format-label">
                      {showtimes[0]?.format || '2D PHỤ ĐỀ'} • {ageRating}
                    </div>

                    <div className="showtime-grid">
                      {showtimes.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className="showtime-btn"
                          onClick={() => handleSelectShowtime(st)}
                          title={`${st.screenName} - ${st.ticketPriceStandard.toLocaleString('vi-VN')}đ`}
                        >
                          {st.startTime}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
