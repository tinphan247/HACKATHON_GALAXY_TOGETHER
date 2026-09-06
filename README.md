# 🎬 GALAXY TOGETHER — OPS HACKATHON 2026
> **"Đi cùng nhau. Đặt cùng nhau. Mỗi người tự quyết định và tự thanh toán."**  
> *Dự án tham gia cuộc thi OPS HACKATHON 2026 — Ý tưởng `YT-0032` (Đội thi Hihihaha — Galaxy Cinema Nguyễn Văn Quá).*

👉 **[Xem Tài Liệu Giải Pháp Dễ Hiểu (Dành cho Ban Giám Khảo & Người Dùng Phổ Thông)](./GIAI_PHAP_DAT_VE_NHOM.md)**

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
5. **Thanh toán linh hoạt (Split Payment / Host-Pays):** Hỗ trợ chia tiền tự động (mỗi người tự thanh toán phần của mình qua MoMo / ZaloPay / VNPAY / thẻ) hoặc Trưởng nhóm thanh toán toàn bộ (Host-Pays-All) kèm tính năng Trưởng nhóm trả hộ (Host bailout).
6. **Vé điện tử độc lập (Individual E-Tickets):** Sau khi hoàn tất, mỗi thành viên nhận mã vé, mã vạch Barcode và mã QR riêng để tự check-in độc lập tại rạp.

---

## 🏗️ 3. Cấu trúc Dự Án (Monorepo)

```text
galaxy together/
├── backend/                        # Backend Server & Database Engine
│   ├── database/                   # DDL SQL Schema & Migration script (Neon PostgreSQL)
│   │   ├── schema.sql              # 10 tables, uq_active_seat_hold constraint
│   │   └── migrate_neon.js         # Script kiểm tra & migrate tự động lên Cloud
│   ├── domain/                     # Entity, State Machine & Business Rules (Python)
│   │   ├── group_session.py        # GroupSession, SessionStatus, PaymentMode
│   │   ├── member.py               # Member, MemberRole, MemberStatus
│   │   └── seat_reservation.py     # SeatHold, Concurrency & Release rules
│   ├── src/                        # Node.js Express REST API & WebSocket Realtime Server
│   │   ├── routes/                 # /api/group-sessions, /api/invites, /api/health
│   │   ├── services/               # SessionService, CodeGenerator, Realtime Broadcast
│   │   ├── db.js                   # Kết nối pg Pool (Neon PostgreSQL)
│   │   └── server.js               # Entrypoint HTTP + WebSocket server (/ws)
│   └── tests/                      # Bộ kiểm thử tự động toàn diện (Python & JS)
│       ├── test_session_state.py   # Unit test trạng thái phiên (Python)
│       ├── test_seat_locking.py    # Unit test cơ chế khóa ghế (Python)
│       ├── test_member_state.py    # Unit test trạng thái thành viên (Python)
│       ├── integration_api.test.js # Test REST API (13/13 tests)
│       ├── test_realtime_ws.js     # Test WebSocket Realtime (<100ms)
│       ├── test_phase5_concurrency.js # Test tranh chấp ghế đồng thời (7/7 tests)
│       ├── test_phase6_fnb.js      # Test F&B cá nhân và giỏ nhóm (28/28 tests)
│       ├── test_phase7_payment.js  # Test thanh toán Split & Host (31/31 tests)
│       └── test_flow_state_leak.js # Test chống rò rỉ state Solo vs Group
│
├── frontend/                       # Production Frontend (React 19 + TS + Vite)
│   ├── public/
│   │   └── combos/                 # Ảnh thực tế 5 Combo bắp nước Galaxy Cinema
│   ├── src/
│   │   ├── api/                    # Client API & Network Error Classifier
│   │   ├── components/
│   │   │   ├── common/             # Header, CountdownBanner, StatusBar, GroupShareModal
│   │   │   ├── join/               # JoinGroupModal (Deep link & QR code scan)
│   │   │   └── simulation/         # SimulationBar (Multi-user demo cho BGK)
│   │   ├── constants/              # Token màu Galaxy, Member Slot Color (m1-m4)
│   │   ├── context/                # GroupSessionContext, ToastContext
│   │   ├── pages/                  # 10 Màn hình ứng dụng chuẩn Galaxy Cinema
│   │   │   ├── HomeScreen.tsx      # Trang chủ (Banner, Phim đang chiếu, Khởi động nhóm)
│   │   │   ├── ShowtimeScreen.tsx  # Chọn Rạp, Ngày & Suất chiếu động
│   │   │   ├── CreateGroupScreen.tsx # Tạo phòng Galaxy Together
│   │   │   ├── InviteScreen.tsx    # Chia sẻ mã QR & Passcode phòng
│   │   │   ├── LobbyScreen.tsx     # Phòng chờ thành viên Realtime
│   │   │   ├── SeatSelectionScreen.tsx # Sơ đồ ghế chọn chung Realtime
│   │   │   ├── FnBScreen.tsx       # Chọn Combo bắp nước (Cá nhân & Giỏ nhóm)
│   │   │   ├── PaymentScreen.tsx   # Thanh toán chia tiền / Trưởng nhóm trả
│   │   │   ├── ConfirmedScreen.tsx # Xác nhận đặt vé thành công
│   │   │   └── ETicketScreen.tsx   # Vé điện tử độc lập từng thành viên (QR/Barcode)
│   │   ├── services/
│   │   │   ├── data/               # Data Layer chuẩn Galaxy Cinema
│   │   │   │   ├── dataset.ts      # Dữ liệu Phim, Rạp, Suất, Ghế, Combo F&B
│   │   │   │   ├── movieRepository.ts
│   │   │   │   ├── theaterRepository.ts
│   │   │   │   ├── showtimeRepository.ts
│   │   │   │   ├── seatRepository.ts
│   │   │   │   └── fnbRepository.ts
│   │   │   ├── groupSessionService.ts
│   │   │   └── storageService.ts
│   │   ├── styles/                 # variables.css, app.css (Theme Galaxy Dark & Orange)
│   │   ├── types/                  # Session, Booking, Seat, FnB, API types
│   │   └── App.tsx
│   ├── package.json
│   ├── vercel.json                 # Cấu hình routing SPA cho Vercel
│   └── vite.config.ts
│
├── docs/                           # Tài liệu kỹ thuật chi tiết các Phase (0 -> 7)
├── package.json                    # Root package.json điều phối Monorepo build
├── vercel.json                     # Root Vercel config triển khai production
└── README.md
```

---

## 🚦 4. Tiến Độ Triển Khai (Progress Roadmap — 100% Complete)

- [x] **Concept & Design System:** Hoàn thành tài liệu Concept, Design System và Prototype tương tác 10 màn hình.
- [x] **Phase 0 — Discovery & Technical Validation:** Khảo sát toàn diện hệ thống Galaxy Cinema (API REST v2, CSDL, Seat Hold, F&B, Cổng thanh toán, Vé QR).
- [x] **Phase 1 — Domain & Database Foundation:** Hoàn thành DDL CSDL với ràng buộc duy nhất `uq_active_seat_hold` chặn triệt để xung đột ghế. Vượt qua **17/17 automated tests (100% Passed)**.
- [x] **Phase 2 — Group Session Backend API:** Xây dựng REST API tạo nhóm, mời bạn bè bằng mã QR/Code 6 ký tự, tham gia, rời phòng và phân quyền Host kết nối Neon PostgreSQL (**13/13 integration tests Passed**).
- [x] **Phase 3 — Group Session Frontend:** Chuyển đổi prototype sang ứng dụng **React + TypeScript + Vite** hoàn chỉnh, kết nối REST API thực tế, mã QR scannable thật, Deep link `?join=GTH-XXX`, Polling Lobby 2s và Simulation Bar gọi API thật.
- [x] **Phase 4 — Realtime Collaboration:** Hạ tầng WebSocket Server (`/ws`) và Room pub/sub hai chiều, đồng bộ thành viên tức thì (< 100ms), tự động kết nối lại (Auto-reconnect) và REST state reconciliation.
- [x] **Phase 5 — Shared Seat Booking:** Sơ đồ ghế realtime, cơ chế khóa ghế nguyên tử `uq_active_seat_hold` giải quyết xung đột đồng thời (**7/7 concurrency tests Passed**).
- [x] **Phase 6 — Individual F&B:** Giỏ hàng bắp nước riêng cho từng cá nhân, bảng tổng hợp F&B nhóm chống mua trùng thời gian thực qua WebSocket `FNB_UPDATED` (**28/28 integration tests Passed**).
- [x] **Phase 7 — Payment Orchestration:** Tính toán giá server-authoritative, hỗ trợ Split-Pay cá nhân (MoMo, ZaloPay, VNPAY, Thẻ), Host-Pays-All, trả hộ bạn (Host bailout), tự động chuyển ghế sang 'sold' và xác nhận đơn hàng Realtime (**31/31 automated tests Passed**).
- [x] **Phase 8 — Individual E-Tickets & Box-Office Validation:** Màn hình vé điện tử độc lập chuẩn Galaxy Cinema: chuyển đổi vé các thành viên, mã vé riêng `GLX-xxx`, mã vạch Barcode SVG, mã QR chuẩn soát vé rạp, tải vé về máy và chia sẻ nhanh.

---

## 🌟 5. Các Tính Năng Đột Phá & Trải Nghiệm Thực Tế

### 🎟️ 1. Dữ Liệu Thực Tế Chuẩn Rạp Galaxy Cinema (Data-Driven Flow)
- Đồng bộ thông tin phim chiếu rạp: *Đào, Phở và Piano*, *Mai*, *Kung Fu Panda 4*, *Dune: Part Two*.
- Chọn rạp thực tế thuộc hệ thống Galaxy: *Galaxy Nguyễn Văn Quá*, *Galaxy Tân Bình*, *Galaxy Quang Trung*, *Galaxy Kinh Dương Vương*.
- Chọn ngày chiếu, suất chiếu linh hoạt với định dạng 2D Phụ đề / Lồng tiếng.
- Tách biệt rạch ròi giữa luồng **Đặt vé cá nhân (Solo)** và **Đặt vé nhóm (Galaxy Together)**, loại bỏ triệt để tình trạng rò rỉ dữ liệu (state leak).

### 👥 2. Phòng Chờ (Lobby) & Mời Bạn Bè Đa Kênh
- **Mã QR Scannable:** Tạo QR chuẩn RFC bằng Canvas; bạn bè dùng camera điện thoại quét là mở thẳng phòng.
- **Deep Link & Web Share API:** Chia sẻ qua Zalo/Messenger chỉ với 1 click hoặc sao chép mã 6 ký tự.
- **Phân định thành viên bằng màu sắc nhận diện:**
  - 🟠 **Slot 1 (`m1`):** Cam Galaxy `#F58020` (Trưởng nhóm / Host)
  - 🟣 **Slot 2 (`m2`):** Tím Pastel `#7C3AED`
  - 🔵 **Slot 3 (`m3`):** Xanh Sky `#0EA5E9`
  - 🟢 **Slot 4 (`m4`):** Xanh Ngọc `#10B981`

### 💺 3. Chọn Ghế Chung Realtime & Chống Xung Đột (Shared Seat Map)
- Mọi thành viên cùng nhìn thấy sơ đồ ghế thời gian thực qua WebSocket.
- Ghế đang chọn hiển thị avatar màu của chính thành viên đó.
- Phân loại ghế chuẩn rạp: **Ghế Thường (Standard)**, **Ghế VIP**, và **Ghế Đôi (Sweetbox)**.
- Khi 2 người bấm cùng 1 ghế cùng lúc, tầng cơ sở dữ liệu xử lý nguyên tử (Atomic locking) với ràng buộc `uq_active_seat_hold`, phản hồi xung đột (409 Conflict) và giải phóng ghế lập tức nếu thành viên hủy chọn.

### 🍿 4. Bắp Nước F&B Cá Nhân & Chống Mua Trùng (Anti-Duplicate F&B)
- Tích hợp 5 Combo chính thức của Galaxy Cinema kèm hình ảnh chất lượng cao:
  - *Combo 1 Big Extra* (1 bắp ngọt lớn + 1 nước lớn + snack khoai tây).
  - *Combo 2 Big* (1 bắp ngọt lớn + 2 nước lớn).
  - *Combo 2 Big Extra* (1 bắp lắc phô mai + 2 nước lớn + snack).
  - *Combo Cheese Special* (1 bắp lắc phô mai đậm vị + 2 nước vị đào).
  - *Combo Family / Group 4* (2 bắp lớn + 4 nước lớn + 2 snack - tiết kiệm cho nhóm).
- Giỏ hàng cá nhân độc lập: Mỗi người tự chọn theo khẩu vị, không cần ai nhớ hộ.
- **Bảng tổng hợp F&B nhóm:** Hiển thị tức thì bạn bè đã đặt những combo gì để cả nhóm cùng nhìn thấy, tránh mua thừa.

### 💳 5. Thanh Toán Linh Hoạt (Split Payment & Host-Pays-All)
- **Chia tiền tự động (Split-Pay):** Mỗi thành viên chỉ thanh toán đúng phần tiền ghế + F&B của mình qua MoMo, ZaloPay, VNPAY, Thẻ ATM/Visa.
- **Trưởng nhóm thanh toán hết (Host-Pays-All):** Trưởng nhóm có thể bao trọn gói cho bạn bè.
- **Cứu trợ thanh toán (Host Bailout):** Nếu một thành viên hết tiền hoặc lỗi cổng thanh toán, Trưởng nhóm có thể nhấn "Thanh toán hộ" để đơn hàng không bị hủy.

### 📲 6. Vé Điện Tử Độc Lập (Individual E-Tickets)
- Mỗi thành viên nhận vé điện tử cá nhân với mã vé riêng `GLX-XXXXXX`.
- **Mã QR & Barcode SVG độc lập:** Từng thành viên tự đưa điện thoại vào máy soát vé tại cổng rạp để vào xem mà không cần đợi trưởng nhóm.
- Giao diện có tab chuyển đổi tiện lợi để xem vé của tất cả thành viên trong nhóm.
- Tích hợp nút tải vé về máy và chia sẻ trực tiếp.

### 🧪 7. Simulation Bar Cho Ban Giám Khảo Hackathon
- Thanh điều khiển mô phỏng ở cạnh dưới màn hình cho phép giả lập các thao tác của thành viên `An`, `Minh`, `Huy` (Gia nhập phòng, Chọn ghế, Chọn combo F&B, Thanh toán) ngay trên 1 trình duyệt.
- Tương tác trực tiếp và cập nhật cơ sở dữ liệu thật trên Neon PostgreSQL.

---

## 🚀 6. Hướng Dẫn Cài Đặt & Khởi Chạy

### 6.1. Yêu Cầu Hệ Thống
- **Node.js**: `v18.0+` (Khuyến nghị `v20+` hoặc `v22+`)
- **npm**: `v9+`
- **Python**: `3.10+` (cho bộ unit test domain)

### 6.2. Cài Đặt Dependencies

```bash
# Tại thư mục gốc của dự án:
cd "galaxy together"

# Cài đặt backend
cd backend && npm install

# Cài đặt frontend
cd ../frontend && npm install
```

### 6.3. Khởi Động Backend API & WebSocket Server
```bash
cd "galaxy together/backend"
npm start
# 🟢 HTTP REST API chạy tại: http://localhost:3000
# 🟢 WebSocket server chạy tại: ws://localhost:3000/ws
# 🟢 Health check: http://localhost:3000/api/health
```

### 6.4. Khởi Động Frontend
```bash
cd "galaxy together/frontend"

# Copy file môi trường (nếu chưa có)
cp .env.example .env

# Chạy Vite Dev Server
npm run dev
# 🟢 Ứng dụng chạy tại: http://localhost:5173
```

### 6.5. Triển Khai Lên Vercel (Production Deployment)
Dự án đã được cấu hình sẵn cho mô hình Monorepo với `package.json` và `vercel.json` ở thư mục gốc:
1. Đẩy mã nguồn lên GitHub.
2. Import repository vào **Vercel**.
3. Vercel sẽ tự động phát hiện `vercel.json`, thực thi lệnh build `cd frontend && npm install && npm run build`, và phục vụ thư mục `frontend/dist` với cơ chế SPA rewrites.
4. Cấu hình biến môi trường trên Vercel:
   - `VITE_API_BASE_URL`: URL của Backend API production (hoặc để trống để dùng fallback demo).

---

## 🧪 7. Kiểm Thử Toàn Diện (Test Suite)

Dự án sở hữu bộ kiểm thử tự động đa tầng với tỷ lệ vượt qua **100%**:

```bash
# 1. Unit Test Domain Entities & Logic khóa ghế (Python)
python backend/run_tests.py
# ✅ 17/17 tests passed

# 2. REST API Integration Test (Node.js + Neon PostgreSQL)
cd backend && npm run test:api
# ✅ 13/13 tests passed

# 3. Realtime WebSocket Test (Đồng bộ phòng & latency < 100ms)
cd backend && npm run test:ws
# ✅ WebSocket handshake, Room broadcast & reconnect passed

# 4. Kiểm thử Concurrency Khóa Ghế Đồng Thời (Phase 5)
cd backend && node tests/test_phase5_concurrency.js
# ✅ 7/7 concurrency conflict tests passed

# 5. Kiểm thử Giỏ hàng F&B Cá nhân & Nhóm (Phase 6)
cd backend && node tests/test_phase6_fnb.js
# ✅ 28/28 integration tests passed

# 6. Kiểm thử Luồng Thanh toán Split-Pay & Host-Pays (Phase 7)
cd backend && node tests/test_phase7_payment.js
# ✅ 31/31 automated tests passed

# 7. Kiểm thử chống rò rỉ State Solo vs Group Booking
cd backend && node tests/test_flow_state_leak.js
# ✅ State isolation tests passed

# 8. Type-check & Production Build Frontend
cd frontend && npm run build
# ✅ tsc -b && vite build hoàn tất thành công (0 errors)
```

---

## 👥 8. Đội Ngũ Phát Triển
- **Đội thi:** Hihihaha — Galaxy Cinema Nguyễn Văn Quá
- **Sản phẩm:** Galaxy Together (Mã ý tưởng `YT-0032`)
- **Cuộc thi:** OPS HACKATHON 2026
