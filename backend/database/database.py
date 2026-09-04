"""
GALAXY TOGETHER — DATABASE CONNECTION & REPOSITORY HELPERS
Phase 1: Domain & Database Foundation
"""

import sqlite3
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from ..domain.types import SeatConflictError


SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_db_connection(db_path: str = ":memory:") -> sqlite3.Connection:
    """Creates a sqlite3 connection configured with foreign keys and row factory"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(conn: sqlite3.Connection, schema_path: str = SCHEMA_PATH) -> None:
    """Executes the DDL schema to initialize tables and indexes"""
    with open(schema_path, "r", encoding="utf-8") as f:
        ddl_script = f.read()
    conn.executescript(ddl_script)
    conn.commit()


class SeatRepository:
    """Repository handling seat operations with atomic concurrency guarantees"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def hold_seat(
        self,
        hold_id: str,
        showtime_id: str,
        seat_id: str,
        seat_code: str,
        seat_type: str,
        price: float,
        group_session_id: str,
        group_member_id: str,
        expires_at: datetime
    ) -> Dict[str, Any]:
        """
        Attempts to hold a seat atomically.
        If another active hold or sale exists for (showtime_id, seat_id),
        sqlite3.IntegrityError will be caught and mapped to SeatConflictError.
        """
        query = """
        INSERT INTO seat_holds (
            id, showtime_id, seat_id, seat_code, seat_type,
            price, group_session_id, group_member_id, status, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'held', ?)
        """
        try:
            with self.conn:
                self.conn.execute(
                    query,
                    (
                        hold_id,
                        showtime_id,
                        seat_id,
                        seat_code,
                        seat_type,
                        price,
                        group_session_id,
                        group_member_id,
                        expires_at.isoformat()
                    )
                )
        except sqlite3.IntegrityError as e:
            # Map database constraint violation to domain exception
            raise SeatConflictError(seat_id=seat_id, showtime_id=showtime_id) from e

        return {
            "id": hold_id,
            "showtime_id": showtime_id,
            "seat_id": seat_id,
            "seat_code": seat_code,
            "status": "held",
            "group_member_id": group_member_id
        }

    def release_seat(self, hold_id: str, group_member_id: str) -> bool:
        """Releases a held seat"""
        query = """
        UPDATE seat_holds
        SET status = 'released'
        WHERE id = ? AND group_member_id = ? AND status = 'held'
        """
        with self.conn:
            cursor = self.conn.execute(query, (hold_id, group_member_id))
            return cursor.rowcount > 0

    def get_active_holds(self, showtime_id: str) -> List[Dict[str, Any]]:
        """Returns all currently held seats for a showtime"""
        query = """
        SELECT id, showtime_id, seat_id, seat_code, group_member_id, status, expires_at
        FROM seat_holds
        WHERE showtime_id = ? AND status IN ('held', 'sold')
        """
        cursor = self.conn.execute(query, (showtime_id,))
        return [dict(row) for row in cursor.fetchall()]
