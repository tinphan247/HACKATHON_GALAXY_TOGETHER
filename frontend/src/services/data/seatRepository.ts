import type { SeatMapConfig, SeatInfo } from '../../types/booking';
import { MOCK_SCREENS, MOCK_SOLD_SEATS_MAP, MOCK_SHOWTIMES } from './dataset';

export const seatRepository = {
  /**
   * Get dynamic seat map configuration for a given showtime
   */
  async getSeatMapForShowtime(showtimeId: string): Promise<SeatMapConfig | null> {
    const showtime = MOCK_SHOWTIMES.find((st) => st.id === showtimeId);
    if (!showtime) return null;

    const screenRoom = MOCK_SCREENS[showtime.screenId] || MOCK_SCREENS['scr-cin-nvq-3'];
    const soldSeatIds = MOCK_SOLD_SEATS_MAP[showtimeId] || ['A3', 'A4', 'B5'];

    const seats: SeatInfo[] = [];

    for (const row of screenRoom.rows) {
      const isVipRow = screenRoom.vipRows.includes(row);
      const isCoupleRow = screenRoom.coupleRows?.includes(row) ?? false;

      for (let num = 1; num <= screenRoom.seatsPerRow; num++) {
        const seatId = `${row}${num}`;
        const isSold = soldSeatIds.includes(seatId);

        let type: SeatInfo['type'] = 'STANDARD';
        let price = showtime.ticketPriceStandard;

        if (isCoupleRow) {
          type = 'COUPLE';
          price = showtime.ticketPriceCouple || showtime.ticketPriceVip * 1.5;
        } else if (isVipRow) {
          type = 'VIP';
          price = showtime.ticketPriceVip;
        }

        seats.push({
          id: seatId,
          row,
          number: num,
          type,
          price,
          status: isSold ? 'SOLD' : 'AVAILABLE',
        });
      }
    }

    return {
      showtimeId,
      screenRoom,
      seats,
      soldSeatIds,
    };
  },
};
