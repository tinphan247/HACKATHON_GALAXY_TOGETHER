# BÁO CÁO THIẾT KẾ & TRIỂN KHAI (PHASE 2 — GROUP SESSION BACKEND API)
## DỰ ÁN: GALAXY TOGETHER (Ý TƯỞNG YT-0032 — OPS HACKATHON 2026)

> **Trọng tâm Phase 2:** Xây dựng hệ thống REST API hoàn chỉnh phục vụ phiên đặt vé nhóm (`GroupSession`), tạo mã mời (`Invite Code & QR`), xử lý tham gia phòng (`Join`), rời phòng (`Leave`), hủy phòng (`Cancel`) kết nối trực tiếp với CSDL **Neon Serverless PostgreSQL**.  
> **Trạng thái:** **HOÀN THÀNH 100% — PASSED 13/13 INTEGRATION TESTS TRÊN NEON DB**

---

## 1. Tổng quan Kiến trúc API Backend

Hệ thống backend được xây dựng bằng **Node.js / Express (ESM)**, sử dụng Connection Pool (`pg.Pool`) với cơ chế mã hóa SSL kết nối tới cụm đám mây Neon PostgreSQL (AWS Singapore).

```
Client (App / Web / Test Runner)
         │
         ▼
[Express Server :3000]
         │
         ├── Middleware (CORS, JSON Parser, Error Handler)
         │
         ├── /api/group-sessions (Session Controller & Routes)
         ├── /api/invites        (Invite & Join Controller & Routes)
         └── /api/health         (Health Check & DB Ping)
         │
         ▼
[SessionService Domain Layer]
         │
         ├── Unique Code Generator (GTH-XXX, Collision Retry)
         ├── QR Payload Signer (HMAC-SHA256)
         └── Capacity & Color Slot Allocator (m1 -> m8)
         │
         ▼
[Neon Serverless PostgreSQL (neondb)]
```

---

## 2. Chi tiết các REST API Endpoints

### 2.1. Tạo phiên đặt vé nhóm (Create Group Session)
- **Method:** `POST`
- **Endpoint:** `/api/group-sessions`
- **Mô tả:** Khởi tạo phiên nhóm, tự động tạo Host với vai trò `host` và slot màu `m1` (Cam Galaxy), đồng thời sinh mã mời ban đầu.
- **Request Body:**
  ```json
  {
    "showtimeId": "st-mai-2026-0905",
    "cinemaId": "cin-nguyen-van-qua",
    "cinemaName": "Galaxy Nguyễn Văn Quá",
    "movieId": "mov-mai-2",
    "movieTitle": "Mai 2",
    "showDate": "2026-09-05",
    "showTime": "19:30",
    "screenName": "Screen 2",
    "hostUserId": "user-tin-ops",
    "hostName": "Phan Trung Tín",
    "name": "Ops Team Galaxy Together",
    "paymentMode": "split",
    "maxMembers": 4
  }
  ```
- **Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "session": {
        "id": "b291b51d-7ba7-4cf9-9f17-c14e84e16485",
        "name": "Ops Team Galaxy Together",
        "status": "WAITING_FOR_MEMBERS",
        "max_members": 4,
        "payment_mode": "split",
        "expires_at": "2026-09-05T01:58:10.000Z"
      },
      "host": {
        "id": "1e5c54d1-8176-4767-a249-11f81335b2e3",
        "name": "Phan Trung Tín",
        "role": "host",
        "color_slot": "m1",
        "status": "JOINED"
      },
      "invite": {
        "code": "GTH-786",
        "expiresAt": "2026-09-05T01:58:10.000Z"
      }
    }
  }
  ```

---

### 2.2. Xem trước thông tin phòng mời (Preview Invite)
- **Method:** `GET`
- **Endpoint:** `/api/invites/:code`
- **Mô tả:** Lấy thông tin tóm tắt của phòng xem phim trước khi bấm xác nhận tham gia (phục vụ hiển thị trang trung gian khi mở link/quét QR).
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "code": "GTH-786",
      "session_name": "Ops Team Galaxy Together",
      "movie_title": "Mai 2",
      "cinema_name": "Galaxy Nguyễn Văn Quá",
      "show_date": "2026-09-05",
      "show_time": "19:30",
      "screen_name": "Screen 2",
      "host_name": "Phan Trung Tín",
      "max_members": 4,
      "current_members": 1
    }
  }
  ```

---

### 2.3. Tham gia phòng bằng mã mời (Join by Code / QR)
- **Method:** `POST`
- **Endpoint:** `/api/invites/:code/join`
- **Mô tả:** Người dùng nhập mã code 6 ký tự hoặc quét QR để vào phòng. Tự động cấp slot màu tiếp theo (`m2`, `m3`, `m4`...).
- **Request Body:**
  ```json
  {
    "userId": "user-minh-ops",
    "name": "Minh"
  }
  ```
- **Response (`201 Created` - Thành viên mới):**
  ```json
  {
    "success": true,
    "data": {
      "member": {
        "id": "7ab12ce4-...",
        "name": "Minh",
        "role": "member",
        "color_slot": "m2",
        "status": "JOINED"
      },
      "isNew": true
    }
  }
  ```
- **Tính năng Lũy đẳng (Idempotency):** Nếu user đã ở trong phòng, API trả về `200 OK` kèm bản ghi thành viên hiện tại mà không tạo bản ghi rác.
- **Kiểm soát dung lượng (Capacity Constraint):** Nếu số lượng thành viên đã đạt `max_members`, API từ chối với mã lỗi `409 Conflict: Group session has reached maximum capacity`.

---

### 2.4. Lấy chi tiết phòng & Danh sách thành viên (Get Session Details)
- **Method:** `GET`
- **Endpoint:** `/api/group-sessions/:id`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "b291b51d-7ba7-4cf9-9f17-c14e84e16485",
      "name": "Ops Team Galaxy Together",
      "status": "WAITING_FOR_MEMBERS",
      "members": [
        { "name": "Phan Trung Tín", "role": "host", "color_slot": "m1", "status": "JOINED" },
        { "name": "Minh", "role": "member", "color_slot": "m2", "status": "JOINED" },
        { "name": "An", "role": "member", "color_slot": "m3", "status": "JOINED" }
      ]
    }
  }
  ```

---

### 2.5. Thành viên rời phòng (Leave Session)
- **Method:** `POST`
- **Endpoint:** `/api/group-sessions/:id/leave`
- **Mô tả:** Thành viên thoát khỏi phòng chờ. Trạng thái chuyển thành `LEFT`, ghế đang giữ được giải phóng tự động, và slot màu được nhường cho người khác vào sau.
- **Request Body:** `{ "userId": "user-an-ops" }`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "message": "Member An has left the group"
    }
  }
  ```

---

### 2.6. Hủy phòng đặt vé (Cancel Session)
- **Method:** `POST`
- **Endpoint:** `/api/group-sessions/:id/cancel`
- **Phân quyền:** Chỉ Trưởng nhóm (`hostUserId`) mới có quyền hủy phòng. Nếu thành viên thường gọi sẽ bị từ chối với mã lỗi `403 Forbidden`.
- **Request Body:** `{ "actorUserId": "user-tin-ops" }`
- **Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "message": "Group session has been cancelled"
    }
  }
  ```

---

## 3. Cơ chế Mã mời & Chữ ký số QR

1. **Sinh mã Code ngẫu nhiên chống trùng lặp (`generateInviteCode`):**
   - Cấu trúc: `GTH-XXX` với 3 chữ số ngẫu nhiên (hoặc tiền tố tùy chỉnh), sử dụng thư viện `crypto.randomInt` chuẩn mã hóa an toàn.
   - Cơ chế thử lại (Retry Loop): Khi có xung đột Unique Constraint trên bảng `invites`, hệ thống tự động sinh lại mã mới tối đa 5 lần.
2. **Ký số Payload QR (`generateQRPayload`):**
   - Payload chứa: `sessionId`, `code`, `expiresAt`.
   - Chữ ký số: Tạo bằng mã băm `HMAC-SHA256` với khóa bí mật `INVITE_SECRET`.
   - Ngăn chặn kẻ xấu giả mạo mã QR để inject vào các phòng chiếu khác.

---

## 4. Báo Cáo Kiểm Thử Tích Hợp (Automated Integration Tests)

Toàn bộ 13 ca kiểm thử tích hợp được thực thi trực tiếp trên máy chủ Express và cơ sở dữ liệu **Neon PostgreSQL**:

```bash
$ npm run test:api
```

### Kết quả chi tiết:
```
==================================================
🚀 STARTING INTEGRATION TESTS FOR PHASE 2 API
==================================================
Test server running at http://localhost:55096

[Test 1] Health Check & Neon DB Connectivity
  ✓ /api/health returned 200 OK (DB connected)

[Test 2] Create Group Session (POST /api/group-sessions)
  ✓ Session created: b291b51d-7ba7-4cf9-9f17-c14e84e16485
  ✓ Host: Phan Trung Tín (Slot: m1)
  ✓ Invite Code: GTH-786

[Test 3] Preview Invite Details (GET /api/invites/:code)
  ✓ Invite preview verified for: Ops Team Galaxy Together

[Test 4] Member 2 Joins Session (POST /api/invites/:code/join)
  ✓ Member 2 joined: Minh (Slot: m2)

[Test 5] Member 3 Joins Session (POST /api/invites/:code/join)
  ✓ Member 3 joined: An (Slot: m3)

[Test 6] Idempotency: Member 2 Joins Again
  ✓ Idempotent: returned existing member record

[Test 7] Capacity Limit Enforcement (Max 3 Members)
  ✓ Successfully rejected 4th member: Group session has reached maximum capacity of 3 members

[Test 8] Fetch Full Session Details (GET /api/group-sessions/:id)
  ✓ Session has 3 active members: Phan Trung Tín, Minh, An

[Test 9] Member Leaves Session (POST /api/group-sessions/:id/leave)
  ✓ Member An has left session

[Test 10] Slot Reclaimed: Member 4 can now join in place of Member 3
  ✓ Member Huy joined and took reclaimed slot: m3

[Test 11] Authorization Check: Non-host Cannot Cancel
  ✓ Unauthorized cancel blocked: Unauthorized: Only the host can cancel the session

[Test 12] Host Cancels Session
  ✓ Session cancelled by host

[Test 13] Cannot Join Cancelled Session
  ✓ Join to cancelled session blocked: Cannot join session with status: CANCELLED

==================================================
🎉 ALL 13 INTEGRATION TESTS PASSED (100%)
==================================================
```

---

## 5. Hướng Dẫn Khởi Chạy Backend Server

1. **Cấu hình môi trường:**
   Đảm bảo tệp `backend/.env` có cấu hình `DATABASE_URL` tới Neon PostgreSQL.
2. **Khởi chạy máy chủ API:**
   ```bash
   cd "galaxy together/backend"
   npm start
   ```
   Máy chủ sẽ lắng nghe tại: `http://localhost:3000`
3. **Chạy kiểm thử tích hợp:**
   ```bash
   npm run test:api
   ```
