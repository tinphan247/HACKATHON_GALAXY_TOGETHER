"""
GALAXY TOGETHER — DOMAIN TYPES & ENUMS
Phase 1: Domain & Database Foundation
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime


class PaymentMode(str, Enum):
    SPLIT = "split"
    HOST_PAYS = "host_pays"


class GroupSessionStatus(str, Enum):
    CREATED = "CREATED"
    WAITING_FOR_MEMBERS = "WAITING_FOR_MEMBERS"
    SELECTING = "SELECTING"
    PAYMENT = "PAYMENT"
    CONFIRMED = "CONFIRMED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class MemberRole(str, Enum):
    HOST = "host"
    MEMBER = "member"


class MemberStatus(str, Enum):
    INVITED = "INVITED"
    JOINED = "JOINED"
    SELECTING_SEAT = "SELECTING_SEAT"
    SEAT_SELECTED = "SEAT_SELECTED"
    SELECTING_FNB = "SELECTING_FNB"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    CONFIRMED = "CONFIRMED"
    LEFT = "LEFT"
    EXPIRED = "EXPIRED"
    PAYMENT_FAILED = "PAYMENT_FAILED"


class SeatHoldStatus(str, Enum):
    HELD = "held"
    SOLD = "sold"
    RELEASED = "released"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class FnbOrderStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PAID = "paid"
    CANCELLED = "cancelled"


class TicketStatus(str, Enum):
    VALID = "valid"
    USED = "used"
    CANCELLED = "cancelled"


class DomainException(Exception):
    """Base domain exception"""
    pass


class InvalidStateTransitionError(DomainException):
    """Raised when an illegal state transition is attempted"""
    def __init__(self, entity: str, current_state: str, target_state: str, reason: str = ""):
        self.entity = entity
        self.current_state = current_state
        self.target_state = target_state
        self.reason = reason
        msg = f"Invalid transition for {entity}: {current_state} -> {target_state}."
        if reason:
            msg += f" Reason: {reason}"
        super().__init__(msg)


class SeatConflictError(DomainException):
    """Raised when a seat is already held or sold"""
    def __init__(self, seat_id: str, showtime_id: str):
        self.seat_id = seat_id
        self.showtime_id = showtime_id
        super().__init__(f"Seat {seat_id} is already taken for showtime {showtime_id}")


class SessionExpiredError(DomainException):
    """Raised when an operation is performed on an expired session"""
    def __init__(self, session_id: str):
        self.session_id = session_id
        super().__init__(f"Group session {session_id} has expired")


class GroupCapacityError(DomainException):
    """Raised when group size limit is reached"""
    def __init__(self, max_members: int):
        self.max_members = max_members
        super().__init__(f"Group session has reached maximum capacity of {max_members} members")


class UnauthorizedActionError(DomainException):
    """Raised when a member performs an unauthorized action (e.g. non-host cancelling)"""
    def __init__(self, action: str, role: str):
        self.action = action
        self.role = role
        super().__init__(f"Action '{action}' is not permitted for role '{role}'")
