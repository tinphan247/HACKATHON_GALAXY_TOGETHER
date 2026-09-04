"""
GALAXY TOGETHER — GROUP MEMBER DOMAIN MODEL & STATE MACHINE
Phase 1: Domain & Database Foundation
"""

from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid

from .types import (
    MemberRole,
    MemberStatus,
    InvalidStateTransitionError,
    UnauthorizedActionError
)


# Allowed member status transitions
ALLOWED_MEMBER_TRANSITIONS: Dict[MemberStatus, Set[MemberStatus]] = {
    MemberStatus.INVITED: {
        MemberStatus.JOINED,
        MemberStatus.LEFT,
        MemberStatus.EXPIRED
    },
    MemberStatus.JOINED: {
        MemberStatus.SELECTING_SEAT,
        MemberStatus.LEFT,
        MemberStatus.EXPIRED
    },
    MemberStatus.SELECTING_SEAT: {
        MemberStatus.SEAT_SELECTED,
        MemberStatus.LEFT,
        MemberStatus.EXPIRED
    },
    MemberStatus.SEAT_SELECTED: {
        MemberStatus.SELECTING_SEAT,  # if deselected all seats
        MemberStatus.SELECTING_FNB,
        MemberStatus.LEFT,
        MemberStatus.EXPIRED
    },
    MemberStatus.SELECTING_FNB: {
        MemberStatus.SEAT_SELECTED,   # back to seat map
        MemberStatus.PAYMENT_PENDING,
        MemberStatus.LEFT,
        MemberStatus.EXPIRED
    },
    MemberStatus.PAYMENT_PENDING: {
        MemberStatus.PAID,
        MemberStatus.PAYMENT_FAILED,
        MemberStatus.EXPIRED
    },
    MemberStatus.PAYMENT_FAILED: {
        MemberStatus.PAYMENT_PENDING, # Retry payment
        MemberStatus.EXPIRED,
        MemberStatus.LEFT
    },
    MemberStatus.PAID: {
        MemberStatus.CONFIRMED,
        # Note: A paid member NEVER expires into losing their ticket without refund!
    },
    # Terminal states
    MemberStatus.CONFIRMED: set(),
    MemberStatus.LEFT: set(),
    MemberStatus.EXPIRED: set()
}


@dataclass
class GroupMember:
    id: str
    group_session_id: str
    user_id: str
    name: str
    role: MemberRole = MemberRole.MEMBER
    color_slot: str = "m1"
    status: MemberStatus = MemberStatus.INVITED
    sub_order_id: Optional[str] = None
    joined_at: Optional[datetime] = None
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create_host(
        cls,
        group_session_id: str,
        user_id: str,
        name: str,
        member_id: Optional[str] = None
    ) -> "GroupMember":
        now = datetime.now(timezone.utc)
        return cls(
            id=member_id or str(uuid.uuid4()),
            group_session_id=group_session_id,
            user_id=user_id,
            name=name,
            role=MemberRole.HOST,
            color_slot="m1", # Organizer is always m1 (Galaxy Orange)
            status=MemberStatus.JOINED, # Host is automatically joined
            joined_at=now,
            updated_at=now
        )

    @classmethod
    def create_invited_member(
        cls,
        group_session_id: str,
        user_id: str,
        name: str,
        color_slot: str,
        member_id: Optional[str] = None
    ) -> "GroupMember":
        return cls(
            id=member_id or str(uuid.uuid4()),
            group_session_id=group_session_id,
            user_id=user_id,
            name=name,
            role=MemberRole.MEMBER,
            color_slot=color_slot,
            status=MemberStatus.INVITED
        )

    def _validate_transition(self, target_status: MemberStatus, reason: str = ""):
        allowed = ALLOWED_MEMBER_TRANSITIONS.get(self.status, set())
        if target_status not in allowed:
            raise InvalidStateTransitionError(
                entity=f"GroupMember({self.name}, {self.id})",
                current_state=self.status.value,
                target_state=target_status.value,
                reason=reason or f"Transition not allowed from {self.status.value}"
            )

    def join(self) -> None:
        """INVITED -> JOINED: Member clicks link / scans QR and enters lobby"""
        self._validate_transition(MemberStatus.JOINED)
        now = datetime.now(timezone.utc)
        self.status = MemberStatus.JOINED
        self.joined_at = now
        self.updated_at = now

    def enter_seat_selection(self) -> None:
        """JOINED -> SELECTING_SEAT: Opens seat map"""
        self._validate_transition(MemberStatus.SELECTING_SEAT)
        self.status = MemberStatus.SELECTING_SEAT
        self.updated_at = datetime.now(timezone.utc)

    def select_seat(self) -> None:
        """SELECTING_SEAT -> SEAT_SELECTED: Has at least one seat held"""
        self._validate_transition(MemberStatus.SEAT_SELECTED)
        self.status = MemberStatus.SEAT_SELECTED
        self.updated_at = datetime.now(timezone.utc)

    def deselect_all_seats(self) -> None:
        """SEAT_SELECTED -> SELECTING_SEAT: Deselected all seats"""
        self._validate_transition(MemberStatus.SELECTING_SEAT)
        self.status = MemberStatus.SELECTING_SEAT
        self.updated_at = datetime.now(timezone.utc)

    def enter_fnb_selection(self) -> None:
        """SEAT_SELECTED -> SELECTING_FNB: Proceeds to F&B selection"""
        self._validate_transition(MemberStatus.SELECTING_FNB)
        self.status = MemberStatus.SELECTING_FNB
        self.updated_at = datetime.now(timezone.utc)

    def back_to_seats(self) -> None:
        """SELECTING_FNB -> SEAT_SELECTED: Go back to adjust seats"""
        self._validate_transition(MemberStatus.SEAT_SELECTED)
        self.status = MemberStatus.SEAT_SELECTED
        self.updated_at = datetime.now(timezone.utc)

    def proceed_to_payment(self, sub_order_id: str) -> None:
        """SELECTING_FNB -> PAYMENT_PENDING: Submitted cart, awaiting payment completion"""
        if not sub_order_id:
            raise ValueError("sub_order_id is required to proceed to payment")
        self._validate_transition(MemberStatus.PAYMENT_PENDING)
        self.sub_order_id = sub_order_id
        self.status = MemberStatus.PAYMENT_PENDING
        self.updated_at = datetime.now(timezone.utc)

    def mark_paid(self) -> None:
        """PAYMENT_PENDING -> PAID: Gateway confirmed transaction success"""
        self._validate_transition(MemberStatus.PAID)
        self.status = MemberStatus.PAID
        self.updated_at = datetime.now(timezone.utc)

    def mark_payment_failed(self, reason: str = "") -> None:
        """PAYMENT_PENDING -> PAYMENT_FAILED: Gateway returned error / declined"""
        self._validate_transition(MemberStatus.PAYMENT_FAILED, reason=reason)
        self.status = MemberStatus.PAYMENT_FAILED
        self.updated_at = datetime.now(timezone.utc)

    def retry_payment(self) -> None:
        """PAYMENT_FAILED -> PAYMENT_PENDING: User re-attempts payment"""
        self._validate_transition(MemberStatus.PAYMENT_PENDING)
        self.status = MemberStatus.PAYMENT_PENDING
        self.updated_at = datetime.now(timezone.utc)

    def confirm_ticket(self) -> None:
        """PAID -> CONFIRMED: Final e-ticket issued"""
        self._validate_transition(MemberStatus.CONFIRMED)
        self.status = MemberStatus.CONFIRMED
        self.updated_at = datetime.now(timezone.utc)

    def leave(self) -> None:
        """Member leaves group before payment"""
        self._validate_transition(MemberStatus.LEFT)
        self.status = MemberStatus.LEFT
        self.updated_at = datetime.now(timezone.utc)

    def expire(self) -> None:
        """Unpaid member timed out when session expired"""
        self._validate_transition(MemberStatus.EXPIRED)
        self.status = MemberStatus.EXPIRED
        self.updated_at = datetime.now(timezone.utc)
