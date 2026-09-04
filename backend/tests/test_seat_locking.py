"""
Integration & Concurrency Tests for Database Schema & Seat Locking (unittest)
"""

import unittest
from datetime import datetime, timezone, timedelta
import uuid

from backend.database.database import get_db_connection, init_db, SeatRepository
from backend.domain.types import SeatConflictError


class TestSeatLocking(unittest.TestCase):

    def setUp(self):
        """Sets up an in-memory SQLite database with schema initialized"""
        self.conn = get_db_connection(":memory:")
        init_db(self.conn)

        self.sess_id = str(uuid.uuid4())
        self.m1_id = str(uuid.uuid4())
        self.m2_id = str(uuid.uuid4())

        self.conn.execute("""
            INSERT INTO group_sessions (
                id, showtime_id, cinema_id, cinema_name, movie_id, movie_title,
                show_date, show_time, screen_name, host_user_id, host_name, name, payment_mode
            ) VALUES (
                ?, 'st-999', 'cin-1', 'Galaxy Nguyễn Văn Quá', 'mov-1', 'Mai',
                '2026-09-05', '19:30', 'Screen 2', 'u-tin', 'Tín', 'Team Weekend', 'split'
            )
        """, (self.sess_id,))

        self.conn.execute("""
            INSERT INTO group_members (id, group_session_id, user_id, name, role, color_slot, status)
            VALUES (?, ?, 'u-tin', 'Tín', 'host', 'm1', 'JOINED')
        """, (self.m1_id, self.sess_id))

        self.conn.execute("""
            INSERT INTO group_members (id, group_session_id, user_id, name, role, color_slot, status)
            VALUES (?, ?, 'u-minh', 'Minh', 'member', 'm2', 'JOINED')
        """, (self.m2_id, self.sess_id))

        self.conn.commit()
        self.repo = SeatRepository(self.conn)

    def tearDown(self):
        self.conn.close()

    def test_atomic_seat_hold_success(self):
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        result = self.repo.hold_seat(
            hold_id=str(uuid.uuid4()),
            showtime_id="st-999",
            seat_id="G08",
            seat_code="G8",
            seat_type="vip",
            price=110000.0,
            group_session_id=self.sess_id,
            group_member_id=self.m1_id,
            expires_at=expires
        )

        self.assertEqual(result["seat_id"], "G08")
        self.assertEqual(result["status"], "held")
        self.assertEqual(result["group_member_id"], self.m1_id)

        # Verify hold exists in DB
        holds = self.repo.get_active_holds("st-999")
        self.assertEqual(len(holds), 1)
        self.assertEqual(holds[0]["seat_id"], "G08")

    def test_concurrent_seat_conflict_detection(self):
        """
        Validates that if Tín already holds G08,
        Minh attempting to hold G08 simultaneously gets a SeatConflictError.
        """
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)

        # 1. Tín holds G08 first
        self.repo.hold_seat(
            hold_id=str(uuid.uuid4()),
            showtime_id="st-999",
            seat_id="G08",
            seat_code="G8",
            seat_type="vip",
            price=110000.0,
            group_session_id=self.sess_id,
            group_member_id=self.m1_id,
            expires_at=expires
        )

        # 2. Minh tries to hold G08 concurrently -> must be rejected with SeatConflictError
        with self.assertRaises(SeatConflictError) as cm:
            self.repo.hold_seat(
                hold_id=str(uuid.uuid4()),
                showtime_id="st-999",
                seat_id="G08",
                seat_code="G8",
                seat_type="vip",
                price=110000.0,
                group_session_id=self.sess_id,
                group_member_id=self.m2_id,
                expires_at=expires
            )

        self.assertIn("Seat G08 is already taken", str(cm.exception))

        # Verify only 1 hold exists for G08, owned by Tín
        holds = self.repo.get_active_holds("st-999")
        self.assertEqual(len(holds), 1)
        self.assertEqual(holds[0]["group_member_id"], self.m1_id)

    def test_seat_release_allows_reclaim(self):
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        hold1_id = str(uuid.uuid4())

        # 1. Tín holds G08
        self.repo.hold_seat(
            hold_id=hold1_id,
            showtime_id="st-999",
            seat_id="G08",
            seat_code="G8",
            seat_type="standard",
            price=95000.0,
            group_session_id=self.sess_id,
            group_member_id=self.m1_id,
            expires_at=expires
        )

        # 2. Tín releases G08
        released = self.repo.release_seat(hold1_id, self.m1_id)
        self.assertTrue(released)

        # Active holds should now be 0
        self.assertEqual(len(self.repo.get_active_holds("st-999")), 0)

        # 3. Minh now claims G08 successfully
        hold2_id = str(uuid.uuid4())
        result = self.repo.hold_seat(
            hold_id=hold2_id,
            showtime_id="st-999",
            seat_id="G08",
            seat_code="G8",
            seat_type="standard",
            price=95000.0,
            group_session_id=self.sess_id,
            group_member_id=self.m2_id,
            expires_at=expires
        )
        self.assertEqual(result["group_member_id"], self.m2_id)
        self.assertEqual(len(self.repo.get_active_holds("st-999")), 1)


if __name__ == '__main__':
    unittest.main()
