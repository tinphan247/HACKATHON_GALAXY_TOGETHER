"""
Unit Tests for GroupSession Domain Model & State Machine (unittest)
"""

import unittest
from datetime import datetime, timezone, timedelta

from backend.domain.group_session import GroupSession
from backend.domain.types import (
    GroupSessionStatus,
    PaymentMode,
    InvalidStateTransitionError,
    UnauthorizedActionError,
    SessionExpiredError
)


def create_sample_session() -> GroupSession:
    return GroupSession.create(
        showtime_id="st-12345",
        cinema_id="cin-nguyen-van-qua",
        cinema_name="Galaxy Nguyễn Văn Quá",
        movie_id="mov-mai-2026",
        movie_title="Mai 2",
        show_date="2026-09-05",
        show_time="19:30",
        screen_name="Screen 2",
        host_user_id="user-tin",
        host_name="Phan Trung Tín",
        name="Team Cuối Tuần",
        payment_mode=PaymentMode.SPLIT,
        max_members=4
    )


class TestGroupSession(unittest.TestCase):

    def test_session_creation(self):
        session = create_sample_session()
        self.assertEqual(session.status, GroupSessionStatus.CREATED)
        self.assertEqual(session.payment_mode, PaymentMode.SPLIT)
        self.assertEqual(session.max_members, 4)
        self.assertEqual(session.host_user_id, "user-tin")
        self.assertEqual(session.name, "Team Cuối Tuần")
        self.assertIsNone(session.expires_at)

    def test_session_capacity_bounds(self):
        with self.assertRaises(ValueError):
            GroupSession.create(
                showtime_id="st-1", cinema_id="c-1", cinema_name="C",
                movie_id="m-1", movie_title="M", show_date="2026-09-05",
                show_time="19:00", screen_name="S1", host_user_id="u-1",
                host_name="T", name="Group", max_members=1
            )

        with self.assertRaises(ValueError):
            GroupSession.create(
                showtime_id="st-1", cinema_id="c-1", cinema_name="C",
                movie_id="m-1", movie_title="M", show_date="2026-09-05",
                show_time="19:00", screen_name="S1", host_user_id="u-1",
                host_name="T", name="Group", max_members=9
            )

    def test_session_empty_name(self):
        with self.assertRaises(ValueError):
            GroupSession.create(
                showtime_id="st-1", cinema_id="c-1", cinema_name="C",
                movie_id="m-1", movie_title="M", show_date="2026-09-05",
                show_time="19:00", screen_name="S1", host_user_id="u-1",
                host_name="T", name="   "
            )

    def test_valid_session_lifecycle(self):
        session = create_sample_session()

        # 1. CREATED -> WAITING_FOR_MEMBERS
        session.publish_invite()
        self.assertEqual(session.status, GroupSessionStatus.WAITING_FOR_MEMBERS)

        # 2. WAITING_FOR_MEMBERS -> SELECTING
        future_time = datetime.now(timezone.utc) + timedelta(minutes=10)
        session.start_selection(expires_at=future_time)
        self.assertEqual(session.status, GroupSessionStatus.SELECTING)
        self.assertEqual(session.expires_at, future_time)
        self.assertFalse(session.is_expired())

        # 3. SELECTING -> PAYMENT
        session.proceed_to_payment()
        self.assertEqual(session.status, GroupSessionStatus.PAYMENT)

        # 4. PAYMENT -> CONFIRMED
        session.confirm_booking()
        self.assertEqual(session.status, GroupSessionStatus.CONFIRMED)

    def test_invalid_transitions(self):
        session = create_sample_session()

        # Cannot jump directly from CREATED to CONFIRMED
        with self.assertRaises(InvalidStateTransitionError):
            session.confirm_booking()

        # Cannot jump directly from CREATED to PAYMENT
        with self.assertRaises(InvalidStateTransitionError):
            session.proceed_to_payment()

        # Cannot start selection without publishing invite
        with self.assertRaises(InvalidStateTransitionError):
            session.start_selection(datetime.now(timezone.utc) + timedelta(minutes=5))

        session.publish_invite()
        # Cannot jump from WAITING_FOR_MEMBERS to CONFIRMED
        with self.assertRaises(InvalidStateTransitionError):
            session.confirm_booking()

    def test_host_cancellation(self):
        session = create_sample_session()
        session.publish_invite()

        # Non-host cannot cancel
        with self.assertRaises(UnauthorizedActionError):
            session.cancel(actor_user_id="user-imposter")

        # Host can cancel
        session.cancel(actor_user_id="user-tin")
        self.assertEqual(session.status, GroupSessionStatus.CANCELLED)

        # Cancelled is terminal
        with self.assertRaises(InvalidStateTransitionError):
            session.publish_invite()

    def test_session_expiration(self):
        session = create_sample_session()
        session.publish_invite()

        past_time = datetime.now(timezone.utc) - timedelta(seconds=1)
        with self.assertRaises(ValueError):
            session.start_selection(expires_at=past_time)

        # Set valid future time
        session.start_selection(expires_at=datetime.now(timezone.utc) + timedelta(seconds=2))
        self.assertEqual(session.status, GroupSessionStatus.SELECTING)

        # Test expired detection with simulated future time
        future_check = datetime.now(timezone.utc) + timedelta(seconds=10)
        self.assertTrue(session.is_expired(current_time=future_check))

        # Trigger expiration
        session.expire()
        self.assertEqual(session.status, GroupSessionStatus.EXPIRED)

        # Expired is terminal
        with self.assertRaises(InvalidStateTransitionError):
            session.proceed_to_payment()


if __name__ == '__main__':
    unittest.main()
