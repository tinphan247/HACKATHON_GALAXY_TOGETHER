"""
Unit Tests for GroupMember Domain Model & State Machine (unittest)
"""

import unittest

from backend.domain.group_member import GroupMember
from backend.domain.types import (
    MemberRole,
    MemberStatus,
    InvalidStateTransitionError
)


class TestGroupMember(unittest.TestCase):

    def test_create_host_member(self):
        host = GroupMember.create_host(
            group_session_id="sess-100",
            user_id="user-tin",
            name="Phan Trung Tín"
        )
        self.assertEqual(host.role, MemberRole.HOST)
        self.assertEqual(host.color_slot, "m1")
        self.assertEqual(host.status, MemberStatus.JOINED)
        self.assertIsNotNone(host.joined_at)

    def test_create_invited_member(self):
        member = GroupMember.create_invited_member(
            group_session_id="sess-100",
            user_id="user-minh",
            name="Minh",
            color_slot="m2"
        )
        self.assertEqual(member.role, MemberRole.MEMBER)
        self.assertEqual(member.color_slot, "m2")
        self.assertEqual(member.status, MemberStatus.INVITED)
        self.assertIsNone(member.joined_at)

    def test_member_happy_path_lifecycle(self):
        member = GroupMember.create_invited_member(
            group_session_id="sess-100",
            user_id="user-minh",
            name="Minh",
            color_slot="m2"
        )

        # 1. INVITED -> JOINED
        member.join()
        self.assertEqual(member.status, MemberStatus.JOINED)
        self.assertIsNotNone(member.joined_at)

        # 2. JOINED -> SELECTING_SEAT
        member.enter_seat_selection()
        self.assertEqual(member.status, MemberStatus.SELECTING_SEAT)

        # 3. SELECTING_SEAT -> SEAT_SELECTED
        member.select_seat()
        self.assertEqual(member.status, MemberStatus.SEAT_SELECTED)

        # 4. SEAT_SELECTED -> SELECTING_FNB
        member.enter_fnb_selection()
        self.assertEqual(member.status, MemberStatus.SELECTING_FNB)

        # 5. SELECTING_FNB -> PAYMENT_PENDING
        member.proceed_to_payment(sub_order_id="ord-sub-999")
        self.assertEqual(member.status, MemberStatus.PAYMENT_PENDING)
        self.assertEqual(member.sub_order_id, "ord-sub-999")

        # 6. PAYMENT_PENDING -> PAID
        member.mark_paid()
        self.assertEqual(member.status, MemberStatus.PAID)

        # 7. PAID -> CONFIRMED
        member.confirm_ticket()
        self.assertEqual(member.status, MemberStatus.CONFIRMED)

    def test_member_back_and_forth_selection(self):
        member = GroupMember.create_host("sess-1", "user-tin", "Tín")
        member.enter_seat_selection()
        member.select_seat()
        self.assertEqual(member.status, MemberStatus.SEAT_SELECTED)

        # Deselect all seats -> back to selecting
        member.deselect_all_seats()
        self.assertEqual(member.status, MemberStatus.SELECTING_SEAT)

        # Re-select and go to F&B
        member.select_seat()
        member.enter_fnb_selection()
        self.assertEqual(member.status, MemberStatus.SELECTING_FNB)

        # Back from F&B to seats
        member.back_to_seats()
        self.assertEqual(member.status, MemberStatus.SEAT_SELECTED)

    def test_member_payment_failure_and_retry(self):
        member = GroupMember.create_host("sess-1", "user-tin", "Tín")
        member.enter_seat_selection()
        member.select_seat()
        member.enter_fnb_selection()
        member.proceed_to_payment("ord-123")

        # Payment fails on gateway
        member.mark_payment_failed(reason="Insufficient balance")
        self.assertEqual(member.status, MemberStatus.PAYMENT_FAILED)

        # Retry payment
        member.retry_payment()
        self.assertEqual(member.status, MemberStatus.PAYMENT_PENDING)

        # Second try succeeds
        member.mark_paid()
        self.assertEqual(member.status, MemberStatus.PAID)

    def test_member_invalid_transitions(self):
        member = GroupMember.create_invited_member("sess-1", "user-an", "An", "m3")

        # Cannot pay without joining and selecting seats
        with self.assertRaises(InvalidStateTransitionError):
            member.mark_paid()

        # Cannot skip from INVITED to PAYMENT_PENDING
        with self.assertRaises(InvalidStateTransitionError):
            member.proceed_to_payment("ord-fake")

        member.join()
        # Cannot confirm before paying
        with self.assertRaises(InvalidStateTransitionError):
            member.confirm_ticket()

    def test_member_leaving(self):
        member = GroupMember.create_invited_member("sess-1", "user-huy", "Huy", "m4")
        member.join()
        member.enter_seat_selection()
        member.select_seat()

        # Huy decides to leave
        member.leave()
        self.assertEqual(member.status, MemberStatus.LEFT)

        # Left is terminal
        with self.assertRaises(InvalidStateTransitionError):
            member.enter_seat_selection()


if __name__ == '__main__':
    unittest.main()
