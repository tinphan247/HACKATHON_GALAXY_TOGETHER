"""
GALAXY TOGETHER — GROUP SESSION DOMAIN MODEL & STATE MACHINE
Phase 1: Domain & Database Foundation
"""

from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid

from .types import (
    GroupSessionStatus,
    PaymentMode,
    InvalidStateTransitionError,
    UnauthorizedActionError,
    SessionExpiredError,
    GroupCapacityError
)


# Allowed forward and error transitions for GroupSession
ALLOWED_SESSION_TRANSITIONS: Dict[GroupSessionStatus, Set[GroupSessionStatus]] = {
    GroupSessionStatus.CREATED: {
        GroupSessionStatus.WAITING_FOR_MEMBERS,
        GroupSessionStatus.CANCELLED
    },
    GroupSessionStatus.WAITING_FOR_MEMBERS: {
        GroupSessionStatus.SELECTING,
        GroupSessionStatus.CANCELLED,
        GroupSessionStatus.EXPIRED
    },
    GroupSessionStatus.SELECTING: {
        GroupSessionStatus.PAYMENT,
        GroupSessionStatus.CANCELLED,
        GroupSessionStatus.EXPIRED
    },
    GroupSessionStatus.PAYMENT: {
        GroupSessionStatus.CONFIRMED,
        GroupSessionStatus.CANCELLED,
        GroupSessionStatus.EXPIRED,
        GroupSessionStatus.FAILED
    },
    # Terminal states have no transitions out
    GroupSessionStatus.CONFIRMED: set(),
    GroupSessionStatus.EXPIRED: set(),
    GroupSessionStatus.CANCELLED: set(),
    GroupSessionStatus.FAILED: set(),
}


@dataclass
class GroupSession:
    id: str
    showtime_id: str
    cinema_id: str
    cinema_name: str
    movie_id: str
    movie_title: str
    show_date: str
    show_time: str
    screen_name: str
    host_user_id: str
    host_name: str
    name: str
    payment_mode: PaymentMode = PaymentMode.SPLIT
    max_members: int = 4
    status: GroupSessionStatus = GroupSessionStatus.CREATED
    expires_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(
        cls,
        showtime_id: str,
        cinema_id: str,
        cinema_name: str,
        movie_id: str,
        movie_title: str,
        show_date: str,
        show_time: str,
        screen_name: str,
        host_user_id: str,
        host_name: str,
        name: str,
        payment_mode: PaymentMode = PaymentMode.SPLIT,
        max_members: int = 4,
        session_id: Optional[str] = None
    ) -> "GroupSession":
        if max_members < 2 or max_members > 8:
            raise ValueError(f"max_members must be between 2 and 8, got {max_members}")
        if not name.strip():
            raise ValueError("Group name cannot be empty")

        return cls(
            id=session_id or str(uuid.uuid4()),
            showtime_id=showtime_id,
            cinema_id=cinema_id,
            cinema_name=cinema_name,
            movie_id=movie_id,
            movie_title=movie_title,
            show_date=show_date,
            show_time=show_time,
            screen_name=screen_name,
            host_user_id=host_user_id,
            host_name=host_name,
            name=name.strip(),
            payment_mode=payment_mode,
            max_members=max_members,
            status=GroupSessionStatus.CREATED
        )

    def is_expired(self, current_time: Optional[datetime] = None) -> bool:
        """Check if current time is past session expiration"""
        if self.expires_at is None:
            return False
        now = current_time or datetime.now(timezone.utc)
        return now > self.expires_at

    def _validate_transition(self, target_status: GroupSessionStatus, reason: str = ""):
        """Validates that a transition from current status to target status is permitted"""
        allowed = ALLOWED_SESSION_TRANSITIONS.get(self.status, set())
        if target_status not in allowed:
            raise InvalidStateTransitionError(
                entity=f"GroupSession({self.id})",
                current_state=self.status.value,
                target_state=target_status.value,
                reason=reason or f"Transition not allowed from {self.status.value}"
            )

    def publish_invite(self) -> None:
        """CREATED -> WAITING_FOR_MEMBERS: host finished setup, invite code is active"""
        self._validate_transition(GroupSessionStatus.WAITING_FOR_MEMBERS)
        self.status = GroupSessionStatus.WAITING_FOR_MEMBERS
        self.updated_at = datetime.now(timezone.utc)

    def start_selection(self, expires_at: datetime) -> None:
        """
        WAITING_FOR_MEMBERS -> SELECTING:
        The whole group enters seat selection, official countdown starts server-side.
        """
        self._validate_transition(GroupSessionStatus.SELECTING)
        now = datetime.now(timezone.utc)
        if expires_at <= now:
            raise ValueError("expires_at must be in the future")
        self.expires_at = expires_at
        self.status = GroupSessionStatus.SELECTING
        self.updated_at = now

    def proceed_to_payment(self) -> None:
        """
        SELECTING -> PAYMENT:
        Seats selected and F&B cart submitted, entering payment window.
        """
        if self.is_expired():
            self.expire()
            raise SessionExpiredError(self.id)

        self._validate_transition(GroupSessionStatus.PAYMENT)
        self.status = GroupSessionStatus.PAYMENT
        self.updated_at = datetime.now(timezone.utc)

    def confirm_booking(self) -> None:
        """
        PAYMENT -> CONFIRMED:
        All required payments have succeeded, booking is confirmed.
        """
        self._validate_transition(GroupSessionStatus.CONFIRMED)
        self.status = GroupSessionStatus.CONFIRMED
        self.updated_at = datetime.now(timezone.utc)

    def cancel(self, actor_user_id: str) -> None:
        """Host cancels the session"""
        if actor_user_id != self.host_user_id:
            raise UnauthorizedActionError("cancel_session", f"user({actor_user_id}) is not host")

        self._validate_transition(GroupSessionStatus.CANCELLED)
        self.status = GroupSessionStatus.CANCELLED
        self.updated_at = datetime.now(timezone.utc)

    def expire(self) -> None:
        """System marks session as expired when countdown hits 0"""
        self._validate_transition(GroupSessionStatus.EXPIRED)
        self.status = GroupSessionStatus.EXPIRED
        self.updated_at = datetime.now(timezone.utc)

    def mark_failed(self, reason: str = "") -> None:
        """Session failed to complete payment within window"""
        self._validate_transition(GroupSessionStatus.FAILED, reason=reason)
        self.status = GroupSessionStatus.FAILED
        self.updated_at = datetime.now(timezone.utc)
