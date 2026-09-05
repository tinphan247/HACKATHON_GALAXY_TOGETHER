export interface Movie {
  id: string;
  title: string;
  slug: string;
  poster: string;
  backdrop?: string;
  description: string;
  duration: number; // in minutes
  genre: string;
  rating: number;
  ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18';
  status: 'now_showing' | 'upcoming';
  releaseDate?: string;
}

export interface Theater {
  id: string;
  name: string;
  address: string;
  city: string;
  distanceKm?: number;
}

export interface ScreenRoom {
  id: string;
  theaterId: string;
  name: string; // e.g. "Phòng 1", "Phòng 3", "Phòng IMAX"
  totalRows: number;
  seatsPerRow: number;
  rows: string[];
  vipRows: string[];
  coupleRows?: string[];
}

export interface Showtime {
  id: string;
  movieId: string;
  theaterId: string;
  screenId: string;
  screenName: string;
  date: string; // YYYY-MM-DD
  dateDisplay: string; // e.g. "07/09"
  dayOfWeekDisplay: string; // e.g. "Thứ Hai"
  startTime: string; // e.g. "17:30"
  endTime: string; // e.g. "19:45"
  format: string; // e.g. "2D PHỤ ĐỀ", "IMAX 2D"
  ticketPriceStandard: number;
  ticketPriceVip: number;
  ticketPriceCouple?: number;
}

export type SeatType = 'STANDARD' | 'VIP' | 'COUPLE';
export type SeatStatus = 'AVAILABLE' | 'SOLD' | 'HELD_BY_ME' | 'HELD_BY_OTHER';

export interface SeatInfo {
  id: string; // e.g. "A1", "D5"
  row: string;
  number: number;
  type: SeatType;
  price: number;
  status: SeatStatus;
}

export interface SeatMapConfig {
  showtimeId: string;
  screenRoom: ScreenRoom;
  seats: SeatInfo[];
  soldSeatIds: string[];
}

export interface FnBProduct {
  id: string;
  name: string;
  desc: string;
  icon?: string;
  image?: string;
  price: number;
  category: 'single' | 'combo' | 'group';
}

export interface BookingState {
  movieId: string;
  date: string; // YYYY-MM-DD
  theaterId: string;
  showtimeId: string;
  screenName: string;
  format: string;
  selectedSeats: string[]; // e.g. ["D5", "D6"]
  ticketPrice: number;
  foodItems: Record<string, number>; // comboId -> quantity
}
