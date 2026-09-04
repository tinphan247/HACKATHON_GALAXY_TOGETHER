-- ==============================================================================
-- GALAXY TOGETHER — DATABASE SCHEMA DDL
-- Phase 1: Domain & Database Foundation
-- Compatible with PostgreSQL & SQLite
-- ==============================================================================

-- 1. GROUP SESSIONS (Phiên đặt vé nhóm)
CREATE TABLE IF NOT EXISTS group_sessions (
    id VARCHAR(36) PRIMARY KEY,
    showtime_id VARCHAR(64) NOT NULL,
    cinema_id VARCHAR(64) NOT NULL,
    cinema_name VARCHAR(128) NOT NULL,
    movie_id VARCHAR(64) NOT NULL,
    movie_title VARCHAR(255) NOT NULL,
    show_date VARCHAR(32) NOT NULL,
    show_time VARCHAR(16) NOT NULL,
    screen_name VARCHAR(64) NOT NULL,
    host_user_id VARCHAR(64) NOT NULL,
    host_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('split', 'host_pays')),
    max_members INTEGER NOT NULL DEFAULT 4 CHECK (max_members >= 2 AND max_members <= 8),
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED' CHECK (
        status IN ('CREATED', 'WAITING_FOR_MEMBERS', 'SELECTING', 'PAYMENT', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'FAILED')
    ),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_sessions_expires_at ON group_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_group_sessions_status ON group_sessions(status);
CREATE INDEX IF NOT EXISTS idx_group_sessions_showtime ON group_sessions(showtime_id);

-- 2. GROUP MEMBERS (Thành viên tham gia phiên nhóm)
CREATE TABLE IF NOT EXISTS group_members (
    id VARCHAR(36) PRIMARY KEY,
    group_session_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'member' CHECK (role IN ('host', 'member')),
    color_slot VARCHAR(8) NOT NULL CHECK (color_slot IN ('m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8')),
    status VARCHAR(32) NOT NULL DEFAULT 'INVITED' CHECK (
        status IN ('INVITED', 'JOINED', 'SELECTING_SEAT', 'SEAT_SELECTED', 'SELECTING_FNB', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED', 'LEFT', 'EXPIRED', 'PAYMENT_FAILED')
    ),
    sub_order_id VARCHAR(64) NULL, -- Ánh xạ tới Galaxy Cinema orderId thực tế
    joined_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE,
    UNIQUE (group_session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_session ON group_members(group_session_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- 3. INVITES (Mã mời & QR mời tham gia nhóm)
CREATE TABLE IF NOT EXISTS invites (
    id VARCHAR(36) PRIMARY KEY,
    group_session_id VARCHAR(36) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    qr_payload TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);

-- 4. SEAT HOLDS (Khóa ghế ngăn chặn xung đột chọn ghế đồng thời)
CREATE TABLE IF NOT EXISTS seat_holds (
    id VARCHAR(36) PRIMARY KEY,
    showtime_id VARCHAR(64) NOT NULL,
    seat_id VARCHAR(32) NOT NULL,            -- ví dụ: "G08" hoặc "G-8"
    seat_code VARCHAR(32) NOT NULL,          -- ví dụ: "G8"
    seat_type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (seat_type IN ('standard', 'vip', 'couple', 'bed')),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    group_session_id VARCHAR(36) NOT NULL,
    group_member_id VARCHAR(36) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'sold', 'released')),
    held_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (group_member_id) REFERENCES group_members(id) ON DELETE CASCADE
);

-- Ràng buộc chống bán trùng ghế: Trong cùng một suất chiếu, một ghế không thể vừa bị 2 người 'held' hoặc 'sold'
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_seat_hold 
ON seat_holds (showtime_id, seat_id) 
WHERE status IN ('held', 'sold');

CREATE INDEX IF NOT EXISTS idx_seat_holds_session ON seat_holds(group_session_id);
CREATE INDEX IF NOT EXISTS idx_seat_holds_member ON seat_holds(group_member_id);

-- 5. FNB ORDERS (Đơn bắp nước riêng của từng thành viên)
CREATE TABLE IF NOT EXISTS fnb_orders (
    id VARCHAR(36) PRIMARY KEY,
    group_session_id VARCHAR(36) NOT NULL,
    group_member_id VARCHAR(36) NOT NULL,
    sub_order_id VARCHAR(64) NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'paid', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (group_member_id) REFERENCES group_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fnb_orders_session ON fnb_orders(group_session_id);
CREATE INDEX IF NOT EXISTS idx_fnb_orders_member ON fnb_orders(group_member_id);

-- 6. FNB ORDER ITEMS (Chi tiết combo bắp nước)
CREATE TABLE IF NOT EXISTS fnb_order_items (
    id VARCHAR(36) PRIMARY KEY,
    fnb_order_id VARCHAR(36) NOT NULL,
    combo_id VARCHAR(64) NOT NULL,
    combo_name VARCHAR(128) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fnb_order_id) REFERENCES fnb_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fnb_order_items_order ON fnb_order_items(fnb_order_id);

-- 7. PAYMENTS (Các giao dịch thanh toán con theo mô hình Split-Pay hoặc Host-Pays)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    group_session_id VARCHAR(36) NOT NULL,
    group_member_id VARCHAR(36) NULL,        -- Null nếu host_pays cho toàn bộ
    sub_order_id VARCHAR(64) NOT NULL,       -- Mã đơn gửi sang cổng thanh toán
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL,     -- 'momo', 'vnpay', 'zalopay', 'shopeepay', 'card'
    gateway_ref VARCHAR(128) NULL,           -- Transaction ID trả về từ cổng thanh toán
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded')),
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (group_member_id) REFERENCES group_members(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(group_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(group_member_id);

-- 8. GROUP BOOKINGS (Đơn đặt vé tổng hợp đã xác nhận)
CREATE TABLE IF NOT EXISTS group_bookings (
    id VARCHAR(36) PRIMARY KEY,
    group_session_id VARCHAR(36) NOT NULL UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'refunded')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_session_id) REFERENCES group_sessions(id) ON DELETE CASCADE
);

-- 9. BOOKING ITEMS (Chi tiết ghế đã chốt theo từng thành viên)
CREATE TABLE IF NOT EXISTS booking_items (
    id VARCHAR(36) PRIMARY KEY,
    group_booking_id VARCHAR(36) NOT NULL,
    group_member_id VARCHAR(36) NOT NULL,
    seat_id VARCHAR(32) NOT NULL,
    seat_code VARCHAR(32) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_booking_id) REFERENCES group_bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (group_member_id) REFERENCES group_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(group_booking_id);

-- 10. TICKETS (Vé điện tử riêng biệt cho từng thành viên kèm mã QR)
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(36) PRIMARY KEY,
    booking_item_id VARCHAR(36) NOT NULL UNIQUE,
    group_member_id VARCHAR(36) NOT NULL,
    ticket_code VARCHAR(32) NOT NULL UNIQUE,
    qr_payload TEXT NOT NULL,
    qr_url TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_item_id) REFERENCES booking_items(id) ON DELETE CASCADE,
    FOREIGN KEY (group_member_id) REFERENCES group_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_member ON tickets(group_member_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
