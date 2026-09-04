# 🎬 GALAXY TOGETHER — OPS HACKATHON 2026
> **"Đi cùng nhau. Đặt cùng nhau. Mỗi người tự quyết định và tự thanh toán."**  
> *Dự án tham gia cuộc thi OPS HACKATHON 2026 — Ý tưởng `YT-0032` (Đội thi Hihihaha — Galaxy Cinema Nguyễn Văn Quá).*

---

## 📌 1. Bối cảnh & Vấn đề (Problem Statement)
Đi xem phim theo nhóm (4–8 người) là một trải nghiệm phổ biến nhưng quy trình đặt vé truyền thống gặp rất nhiều ma sát:
- **Tốn thời gian bàn bạc (20–40 phút):** Phải nhắn tin qua Zalo/Messenger để thống nhất phim, rạp, suất chiếu.
- **Rủi ro mất ghế:** Trong lúc chờ mọi người phản hồi, các ghế đẹp có thể đã bị người khác đặt mất.
- **Gánh nặng cho người đại diện:** Một người phải đứng ra hỏi từng người ăn gì, chọn từng vị trí ghế, ứng trước toàn bộ tiền vé + bắp nước, và chịu trách nhiệm đòi tiền từng người sau đó.
- **Mua trùng combo F&B:** Khi đặt lẻ theo cặp, các thành viên không nắm được đơn của nhau dẫn đến việc mua dư thừa combo, làm phát sinh khiếu nại tới BQL rạp.

---

## 💡 2. Giải pháp Galaxy Together
**Galaxy Together** chuyển mô hình đặt vé nhóm từ *"một người gánh toàn bộ"* sang *"cả nhóm cùng tham gia vào một phiên booking duy nhất"* ngay trên ứng dụng Galaxy Cinema:

1. **Tạo phiên nhóm:** Trưởng nhóm chọn suất chiếu $\rightarrow$ nhận mã phòng (6 ký tự) và mã QR mời bạn bè.
2. **Tham gia phòng chờ (Lobby):** Bạn bè quét QR hoặc nhập code là vào thẳng phòng, thấy danh sách thành viên trực quan theo thời gian thực.
3. **Chọn ghế chung thời gian thực (Shared Seat Map):** Mọi người cùng nhìn thấy sơ đồ ghế; mỗi người có màu nhận diện riêng (`m1` đến `m4`), thấy bạn mình đang chọn ghế nào để ngồi cạnh mà không cần hỏi.
4. **Giỏ hàng bắp nước riêng (Individual F&B):** Mỗi thành viên tự thêm combo vào giỏ cá nhân, đồng thời có bảng tổng hợp F&B nhóm để chống mua trùng.
5. **Thanh toán linh hoạt (Split Payment / Host-Pays):** Hỗ trợ chia tiền tự động (mỗi người tự thanh toán phần của mình qua MoMo / VNPAY / thẻ) hoặc Trưởng nhóm trả toàn bộ.
6. **Vé điện tử độc lập (Individual E-Tickets):** Sau khi hoàn tất, mỗi thành viên nhận mã vé và mã QR riêng để tự soát vé tại rạp.

---

## 🏗️ 3. Cấu trúc Dự Án

```text
galaxy together/
├── backend/                        # Phase 1 & 2: REST API & Database Foundation
│   ├── database/                   # DDL SQL Schema (10 tables, unique concurrency constraints)
│   ├── domain/                     # Python Entity & State Machine models
│   ├── src/                        # Node.js Express REST API (CORS, error handling)
│   │   ├── routes/                 # /api/group-sessions, /api/invites, /api/health
│   │   ├── services/               # SessionService, CodeGenerator
│   │   └── server.js               # Express app entrypoint
│   └── tests/                      # Python unit tests & Node.js API integration tests
│
├── frontend/                       # Phase 3: Production Frontend (React + TS + Vite)
│   ├── src/
│   │   ├── api/                    # API client wrapper with friendly error classification
│   │   ├── components/             # Reusable UI, Status bar, QR, Simulation Bar, Join Modal
│   │   ├── constants/              # Config, theme & member color slot mappings
│   │   ├── context/                # GroupSessionContext, ToastContext
│   │   ├── pages/                  # 10 Screens: Home, Showtime, Create, Invite, Lobby, etc.
│   │   ├── services/               # groupSessionService, storageService
│   │   ├── styles/                 # variables.css, app.css (Galaxy Cinema tokens)
│   │   └── types/                  # Session, API contracts, DisplayMember
│   ├── .env.example                # VITE_API_BASE_URL=http://localhost:3000
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                           # Chi tiết báo cáo kỹ thuật các phase
│   ├── phase_0_discovery_report.md
│   ├── phase_1_domain_and_database_foundation.md
│   ├── phase_2_group_session_backend_api.md
│   ├── phase_3_group_session_frontend.md
│   └── phase_4_realtime_collaboration.md
│
├── files/                          # Thiết kế gốc & Prototype ban đầu
│   ├── GALAXY_TOGETHER_DESIGN_CONCEPT.md
│   ├── GALAXY_TOGETHER_DESIGN_SYSTEM.md
│   ├── GALAXY_TOGETHER_IMPLEMENTATION_PLAN.md
│   └── index.html
└── README.md
```

---

## 🚦 4. Tiến Độ Triển Khai (Progress Roadmap)

- [x] **Concept & Design System:** Hoàn thành tài liệu Concept, Design System và Prototype tương tác 10 màn hình.
- [x] **Phase 0 — Discovery & Technical Validation:** Khảo sát toàn diện hệ thống Galaxy Cinema (API REST v2, CSDL, Seat Hold, F&B, Cổng thanh toán, Vé QR).
- [x] **Phase 1 — Domain & Database Foundation:** Hoàn thành DDL CSDL với ràng buộc duy nhất `uq_active_seat_hold` chặn triệt để xung đột ghế. Vượt qua **17/17 automated tests (100% Passed)**.
- [x] **Phase 2 — Group Session Backend API:** Xây dựng REST API tạo nhóm, mời bạn bè bằng mã QR/Code 6 ký tự, tham gia, rời phòng và phân quyền Host kết nối Neon PostgreSQL (Vượt qua **13/13 integration tests**).
- [x] **Phase 3 — Group Session Frontend:** Chuyển đổi prototype sang ứng dụng **React + TypeScript + Vite** hoàn chỉnh, kết nối REST API thực tế, mã QR scannable thật, Deep link `?join=GTH-XXX`, Polling Lobby 2s và Simulation Bar gọi API thật.
- [x] **Phase 4 — Realtime Collaboration:** Hạ tầng WebSocket Server (`/ws`) và Room pub/sub hai chiều, đồng bộ thành viên tức thì (< 100ms), tự động kết nối lại (Auto-reconnect) và REST state reconciliation.
- [ ] **Phase 5 — Shared Seat Booking:** Sơ đồ ghế realtime và xử lý tranh chấp ghế.
- [ ] **Phase 6 — Individual F&B:** Giỏ hàng bắp nước riêng và bảng tổng hợp nhóm.
- [ ] **Phase 7 — Payment Orchestration:** Tích hợp Split-Pay & Host-Pays với cổng thanh toán.
- [ ] **Phase 8 — Ticket & Confirmation:** Xuất vé điện tử riêng cho từng thành viên.

---

## 🚀 5. Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 5.1. Yêu Cầu Hệ Thống
- Node.js `v18.0+` (Khuyến nghị Node.js `v20+` hoặc `v22+`)
- npm `v9+`
- Python `3.10+` (cho bộ unit test domain Phase 1)

### 5.2. Khởi Động Backend API
```bash
# 1. Đi vào thư mục backend
cd "galaxy together/backend"

# 2. Cài đặt dependencies (nếu chưa cài)
npm install

# 3. Chạy server Express
npm start
# Server chạy tại: http://localhost:3000
# Endpoint kiểm tra sức khỏe: http://localhost:3000/api/health
```

### 5.3. Khởi Động Frontend Application
```bash
# 1. Mở terminal mới, đi vào thư mục frontend
cd "galaxy together/frontend"

# 2. Cài đặt dependencies (nếu chưa cài)
npm install

# 3. Tạo file cấu hình môi trường
cp .env.example .env

# 4. Khởi chạy Vite Dev Server
npm run dev
# Ứng dụng chạy tại: http://localhost:5173 (hoặc port khả dụng kế tiếp)
```

---

## 📱 6. Tính Năng Nổi Bật Của Frontend (Phase 3)

### 1. Luồng Tạo Nhóm & Kết Nối Backend Thật
- Tạo nhóm qua `POST /api/group-sessions`, lưu `sessionId` và `inviteCode` tự động.
- Kiểm tra hợp lệ: Tên nhóm bắt buộc, số lượng thành viên từ 2–8 người, lựa chọn hình thức thanh toán.

### 2. Mã QR Thật & Scannable
- Sử dụng thư viện `qrcode` vẽ mã QR Canvas chuẩn RFC.
- Camera điện thoại thật quét mã sẽ mở link tham gia: `http://<domain>/?join=GTH-XXX`.
- Hỗ trợ nút **Sao chép mã**, **Sao chép liên kết** và **Web Share API (`navigator.share`)** với thông báo Toast tức thì.

### 3. Deep Link Tự Động Nhận Diện
- Mở link có tham số `?join=GTH-XXX` sẽ tự động hiển thị modal **"Tham gia Galaxy Together"**.
- Tải trước thông tin phim, suất chiếu, số thành viên hiện tại qua `GET /api/invites/:code`.
- Nhập tên và gửi `POST /api/invites/:code/join`, sau đó tự động điều hướng vào phòng chờ.

### 4. Phòng Chờ Lobby Polling 2 Giây
- Tự động gọi `GET /api/group-sessions/:id` mỗi 2 giây với cơ chế chống gửi yêu cầu chồng lấn (overlap protection).
- Gán màu đại diện theo vị trí slot độc lập với tên:
  - **Slot 1 (`m1`):** Cam Galaxy `#F58020` (Trưởng nhóm)
  - **Slot 2 (`m2`):** Tím `#7C3AED`
  - **Slot 3 (`m3`):** Xanh dương `#0EA5E9`
  - **Slot 4 (`m4`):** Xanh lá `#10B981`
- Hiệu ứng thông báo Toast sinh động khi có thành viên mới gia nhập phòng.

### 5. Thanh Mô Phỏng (Simulation Bar) Tác Động Cơ Sở Dữ Liệu Thật
- Các nút **"+ Minh tham gia"**, **"+ An tham gia"**, **"+ Huy tham gia"** khi bấm sẽ gọi trực tiếp `POST /api/invites/:code/join` vào cơ sở dữ liệu Neon PostgreSQL.
- Giúp ban giám khảo Hackathon có thể kiểm thử luồng nhiều thành viên cùng lúc trên một màn hình duy nhất.

### 6. Chế Độ Dự Phòng Demo (Offline Fallback)
- Nếu backend bị ngắt kết nối, ứng dụng hiển thị banner cảnh báo nhẹ nhàng và cho phép tiếp tục trải nghiệm ở Chế độ Demo mà không bị crash hay trắng trang.

---

## 🧪 7. Kiểm Thử (Testing)

### 7.1. Chạy Unit Test Backend Domain (Python)
```bash
python backend/run_tests.py
# 17/17 tests passed (0.015s)
```

### 7.2. Chạy Integration Test Backend API (Node.js)
```bash
cd "galaxy together/backend"
npm run test:api
# 13/13 tests passed kết nối Neon DB
```

### 7.3. Kiểm Thử Build Frontend (TypeScript & Vite)
```bash
cd "galaxy together/frontend"
npm run build
# tsc -b && vite build hoàn tất không có lỗi
```

### 7.4. Kiểm Thử Realtime WebSocket (Node.js)
```bash
cd "galaxy together/backend"
npm run test:ws
# Kiểm tra kết nối ws://localhost:3000/ws, latency < 100ms
```

---
*Dự án thực hiện bởi Team Hihihaha — Ops Hackathon 2026.*
