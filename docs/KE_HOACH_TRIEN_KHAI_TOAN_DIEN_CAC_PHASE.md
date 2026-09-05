# KẾ HOẠCH TRIỂN KHAI TOÀN DIỆN CÁC PHASE (MASTER IMPLEMENTATION PLAN)
## DỰ ÁN: GALAXY TOGETHER (Ý TƯỞNG YT-0032 — OPS HACKATHON 2026)

**Đơn vị:** Galaxy Cinema Nguyễn Văn Quá — Đội thi: Hihihaha  
**Đại diện dự án:** Phan Trung Tín  
**Trạng thái phê duyệt:** Đã được duyệt bởi Ban Quản lý / Giám khảo (`da_duyet` ngày 29/08/2026)  
**Tôn chỉ giải pháp:** *"Đi cùng nhau. Đặt cùng nhau. Mỗi người tự quyết định và tự thanh toán."*

---

## 1. Bảng Tổng Quan Lộ Trình 12 Phase (Master Roadmap Overview)

Toàn bộ dự án Galaxy Together được phân rã thành **12 Phase chiến lược**, đi từ khảo sát thực tế, xây dựng kiến trúc, phát triển tính năng, kiểm thử tải, đến triển khai thí điểm tại rạp:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        LỘ TRÌNH 12 PHASE DỰ ÁN GALAXY TOGETHER                         │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [TIỀN ĐỀ VÀNG: KHẢO SÁT & NỀN TẢNG CỐT LÕI]
 ├── Phase 0: Discovery & Technical Validation ──────────── [ĐÃ HOÀN THÀNH 100%]
 ├── Phase 1: Domain & Database Foundation ──────────────── [ĐÃ HOÀN THÀNH 100%]
 ├── Phase 2: Group Session Backend API ─────────────────── [ĐÃ HOÀN THÀNH 100%]
 ├── Phase 3: Group Session Frontend Application ────────── [ĐÃ HOÀN THÀNH 100%]
 └── Phase 4: Realtime Collaboration (WebSocket) ────────── [ĐÃ HOÀN THÀNH 100%]
      └── [UI/UX Redesign]: Production Galaxy Home Screen ─ [ĐÃ HOÀN THÀNH 100%]

 [TÍNH NĂNG NGHIỆP VỤ ĐẶT VÉ CHUNG & THANH TOÁN]
 ├── Phase 5: Shared Seat Booking & Concurrency Locking ─── [ĐÃ HOÀN THÀNH 100%]
 ├── Phase 6: Individual F&B (Giỏ bắp nước riêng) ───────── [ĐÃ HOÀN THÀNH 100%]
 ├── Phase 7: Split & Host Payment Orchestration ────────── [ĐÃ HOÀN THÀNH 100%]
 ├── Phase 8: Individual E-Ticket & Box-Office Validation ─ [KẾ HOẠCH BẮT ĐẦU]

 [TỐI ƯU HÓA, BẢO MẬT & ĐƯA VÀO VẬN HÀNH THỰC TẾ]
 ├── Phase 9: Security, Authorization & Hardening ───────── [KẾ HOẠCH]
 ├── Phase 10: Testing, Load Testing & Non-Regression ───── [KẾ HOẠCH]
 └── Phase 11: Pilot at Cinema & Production Rollout ─────── [KẾ HOẠCH]
```

---

## 2. Chi Tiết Nội Dung Cần Làm Của Từng Phase

---

### PHASE 0: DISCOVERY & TECHNICAL VALIDATION (KHẢO SÁT KỸ THUẬT)
- **Mục tiêu:** Khảo sát trực tiếp kiến trúc hệ thống hiện hữu của Galaxy Cinema từ dữ liệu mạng thực tế (`ops-hackathon.galaxystudio.vn.har`), xóa bỏ toàn bộ 10 điểm mù kỹ thuật (*UNKNOWN Matrix*).
- **Các nội dung công việc cần làm:**
  1. Phân tích Frontend Stack hiện hữu (Next.js, SSR, TailwindCSS).
  2. Xác định các Gateway & API Endpoints thực tế: REST API v2 (`/api/v2/mobile/`) và GraphQL (`/galaxy-inventory/graphql`).
  3. Khảo sát cơ chế Khóa ghế (Seat Hold / Locking): Session-based hold qua `orders/create`, `seats/set` kèm thời gian hết hạn `expiredAt`.
  4. Khảo sát cấu trúc sơ đồ ghế (Seat Matrix layout, mã loại ghế, trạng thái ghế trống/đã bán/đang giữ).
  5. Khảo sát hệ thống đặt bắp nước (Concessions/F&B API theo rạp).
  6. Khảo sát cổng thanh toán (MoMo, VNPAY, ZaloPay, ShopeePay, thẻ ATM/Visa).
  7. **Đề xuất giải pháp kiến trúc Chia tiền (Split Payment):** Mô hình hóa mỗi thành viên như một **Sub-Order** gắn với phiên nhóm chính (`group_session_id`), giúp mỗi người tự gọi thanh toán độc lập mà không phá vỡ hệ thống thanh toán cốt lõi của Galaxy Cinema.
  8. Khảo sát cơ chế xuất vé điện tử & mã QR soát vé tại rạp.
  9. Khảo sát cơ chế xác thực thành viên G-Star (SMS OTP, Token).
  10. Xác lập nguyên tắc bảo vệ luồng Solo Booking (Non-Regression).
- **Kết quả nghiệm thu:** Bản báo cáo [phase_0_discovery_report.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_0_discovery_report.md) giải quyết sáng tỏ 10/10 điểm mù.

---

### PHASE 1: DOMAIN & DATABASE FOUNDATION (THIẾT KẾ CSDL & MÔ HÌNH MIỀN)
- **Mục tiêu:** Xây dựng toàn bộ nền tảng Cơ sở dữ liệu quan hệ, mô hình trạng thái (State Machines) và cơ chế khóa ghế nguyên tử.
- **Các nội dung công việc cần làm:**
  1. **Thiết kế DDL CSDL 10 bảng thực thể:**
     - `group_sessions`: Quản lý phiên nhóm, suất chiếu, thời hạn đếm ngược `expires_at`.
     - `group_members`: Thành viên tham gia, vai trò host/member, vị trí màu slot `m1`–`m8`.
     - `invites`: Mã mời 6 ký tự (`GTH-XXX`) và chữ ký QR.
     - `seat_holds`: Quản lý giữ ghế tạm thời.
     - `fnb_orders` & `fnb_order_items`: Giỏ hàng bắp nước độc lập cho từng người.
     - `payments`: Lịch sử giao dịch thanh toán con (Sub-payments).
     - `group_bookings`, `booking_items`, `tickets`: Đơn vé tổng và vé điện tử riêng của từng cá nhân.
  2. **Thiết lập Khóa ghế nguyên tử (Atomic Seat Locking):**
     - Tạo ràng buộc Unique Partial Index trong SQL:
       ```sql
       CREATE UNIQUE INDEX uq_active_seat_hold 
       ON seat_holds (showtime_id, seat_id) 
       WHERE status IN ('held', 'sold');
       ```
     - Chặn đứng 100% tình trạng 2 người bấm trùng 1 ghế ở cấp độ phần cứng CSDL.
  3. **Xây dựng State Machine:**
     - `GroupSession`: `CREATED` $\rightarrow$ `WAITING_FOR_MEMBERS` $\rightarrow$ `SELECTING` $\rightarrow$ `PAYMENT` $\rightarrow$ `CONFIRMED` (kèm nhánh `CANCELLED`, `EXPIRED`, `FAILED`).
     - `GroupMember`: `INVITED` $\rightarrow$ `JOINED` $\rightarrow$ `SELECTING_SEAT` $\rightleftharpoons$ `SEAT_SELECTED` $\rightarrow$ `SELECTING_FNB` $\rightarrow$ `PAYMENT_PENDING` $\rightarrow$ `PAID` $\rightarrow$ `CONFIRMED`.
  4. **Kiểm thử tự động:** Viết bộ test Python kiểm tra toàn bộ luồng đổi ghế, rời nhóm, thử lại thanh toán.
- **Kết quả nghiệm thu:** 17/17 Unit Tests passed 100% ([phase_1_domain_and_database_foundation.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_1_domain_and_database_foundation.md)).

---

### PHASE 2: GROUP SESSION BACKEND API (REST API QUẢN LÝ PHIÊN NHÓM)
- **Mục tiêu:** Triển khai các REST API phục vụ vòng đời phòng đặt vé nhóm, kết nối CSDL đám mây thực tế.
- **Các nội dung công việc cần làm:**
  1. Khởi tạo dịch vụ Backend Node.js / Express (ESM), thiết lập `pg.Pool` kết nối bảo mật SSL tới **Neon Serverless PostgreSQL (AWS Singapore)**.
  2. Xây dựng thuật toán sinh mã mời ngẫu nhiên 6 ký tự `GTH-XXX` có cơ chế retry chống trùng lặp.
  3. Xây dựng 6 API endpoints cốt lõi:
     - `POST /api/group-sessions`: Khởi tạo phòng, tự động gán host slot màu `m1` (Galaxy Orange).
     - `GET /api/invites/:code`: Xem trước thông tin phòng trước khi vào.
     - `POST /api/invites/:code/join`: Tham gia phòng bằng mã mời/quét QR, kiểm soát sức chứa `maxMembers` (2–8 người) và tính lũy đẳng (Idempotency).
     - `GET /api/group-sessions/:id`: Lấy chi tiết phòng và danh sách thành viên thời gian thực.
     - `POST /api/group-sessions/:id/leave`: Xử lý thành viên rời phòng, giải phóng ghế và nhường slot màu.
     - `POST /api/group-sessions/:id/cancel`: Trưởng nhóm hủy phòng (phân quyền nghiêm ngặt chặn thành viên thường).
  4. Viết kịch bản Integration Test tự động gọi API trực tiếp vào Cloud Neon DB.
- **Kết quả nghiệm thu:** 13/13 Integration Tests passed 100% ([phase_2_group_session_backend_api.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_2_group_session_backend_api.md)).

---

### PHASE 3: GROUP SESSION FRONTEND APPLICATION (ỨNG DỤNG CLIENT REACT)
- **Mục tiêu:** Chuyển đổi mã nguyên mẫu tĩnh đơn file thành ứng dụng React 18 + TypeScript + Vite hoàn chỉnh.
- **Các nội dung công việc cần làm:**
  1. Thiết lập kiến trúc thư mục module hóa: `api/`, `components/`, `context/`, `pages/`, `services/`, `styles/`, `types/`.
  2. Bảo tồn 100% Design Tokens thương hiệu Galaxy Cinema (`--orange: #F58020`, `--navy: #0B3B60`, khung mobile chuẩn 390×844px responsive).
  3. Xây dựng đầy đủ **10 màn hình người dùng**:
     - `HomeScreen`: Trang chủ với banner Galaxy Together.
     - `ShowtimeScreen`: Suất chiếu với nút "👥 Tạo nhóm xem phim".
     - `CreateGroupScreen`: Khởi tạo nhóm, chọn số lượng (2–8), chọn chế độ thanh toán (chia đều / host trả).
     - `InviteScreen`: Mã code thật từ DB, render mã QR bằng Canvas chuẩn thư viện `qrcode` có thể quét bằng camera điện thoại thật, nút Copy và Share.
     - `LobbyScreen`: Phòng chờ hiển thị slot màu `m1`–`m4`, slot trống viền đứt nét, tự động cập nhật qua Polling 2s.
     - `SeatSelectionScreen`: Sơ đồ ghế 15 hàng tương tác theo màu người chọn.
     - `FnBScreen`: Chọn bắp nước cá nhân và bảng tổng hợp F&B nhóm.
     - `PaymentScreen`: Tiến độ thanh toán cả nhóm và trạng thái từng thành viên.
     - `ConfirmedScreen`: Chúc mừng đặt vé thành công.
     - `ETicketScreen`: Thẻ vé điện tử cá nhân kèm mã barcode và QR riêng biệt.
  4. Tích hợp Deep Link tự động: Bắt tham số `?join=GTH-XXX` trên URL khi quét mã, tự động mở modal tham gia nhóm.
  5. Xây dựng Thanh mô phỏng (Simulation Bar) gọi API thật để phục vụ Ban giám khảo chấm thi.
  6. Xây dựng cơ chế dự phòng Offline Fallback an toàn khi mất mạng.
- **Kết quả nghiệm thu:** `npm run build` thành công, Zero Errors ([phase_3_group_session_frontend.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_3_group_session_frontend.md)).

---

### PHASE 4: REALTIME COLLABORATION (HẠ TẦNG WEBSOCKET HAI CHIỀU)
- **Mục tiêu:** Xóa bỏ độ trễ của Polling 2s, đem lại trải nghiệm tham gia phòng tức thì dưới 100ms.
- **Các nội dung công việc cần làm:**
  1. Khởi tạo `RealtimeGateway` bằng thư viện `ws`, gắn trực tiếp vào Express HTTP Server tại `/ws`.
  2. Quản lý kết nối theo phòng: `rooms: sessionId -> Set<WebSocket>`.
  3. Định nghĩa các sự kiện thời gian thực: `GROUP_MEMBER_JOINED`, `GROUP_MEMBER_LEFT`, `GROUP_CANCELLED`, `PING/PONG` (Heartbeat 30s).
  4. Xây dựng `RealtimeService` và React Hook `useSessionRealtime` trên Frontend:
     - Tự động kết nối lại theo thuật toán **Exponential Backoff**.
     - Cơ chế **Reconciliation:** Khi kết nối lại, tự động refetch qua REST API để tránh mất dữ liệu.
     - Cơ chế **Hybrid Fallback:** Tự động chuyển về Polling 2s nếu mạng chặn WebSocket.
  5. Cải tiến giao diện: Đèn báo trạng thái `⚡ LIVE WS` (xanh lá) / `POLLING (2s)` (vàng) và Toast thông báo bạn bè gia nhập tức thì.
- **Kết quả nghiệm thu:** Đo độ trễ tham gia phòng đạt **35ms – 65ms** (vượt chuẩn SLA < 100ms) ([phase_4_realtime_collaboration.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_4_realtime_collaboration.md)).

---

### UI/UX REDESIGN: PRODUCTION GALAXY CINEMA HOME SCREEN
- **Mục tiêu:** Nâng cấp màn hình Home từ dạng compact/prototype lên giao diện chuẩn **Production Galaxy Cinema** (Image 2 Reference).
- **Các nội dung công việc cần làm:**
  1. Header sáng thanh thoát: Logo Galaxy Cinema, bộ chọn tỉnh thành (`📍 TP Hồ Chí Minh` kèm modal chọn cụm rạp: Hà Nội, Đà Nẵng, Cần Thơ...), chuông thông báo có badge đỏ.
  2. Hero Promotion Carousel: Banner khổ lớn (16:9), bo góc 16px, hiệu ứng peek hé lộ banner kế tiếp, dải pagination dots lướt mượt mà (Khai trương Vincom Đan Phượng, Galaxy Together).
  3. Thanh Tab Đang chiếu & Sắp chiếu kết hợp đường dẫn đổi rạp.
  4. Lưới phim 2 cột với Poster điện ảnh thực tế (2:3), tích hợp trực tiếp badge sao (`⭐ 9.7`) và nhãn tuổi (`T16`, `T13`, `K`, `P`) trên poster.
  5. Thẻ tính năng **Galaxy Together** sang trọng màu cam ấm, đặt tự nhiên giữa danh mục phim kèm nút *"Thử ngay →"*.
  6. Fixed Bottom Navigation 5 tab chuẩn xác: `Trang chủ`, `Rạp phim`, `CineTag#`, `Điện ảnh`, `Tài khoản`.
- **Kết quả nghiệm thu:** Bản kế hoạch thiết kế và mã nguồn hoàn thiện ([implementation_plan.md](file:///C:/Users/tinph/.gemini/antigravity-ide/brain/5a1e66e3-ec94-4892-9679-62a50191f543/implementation_plan.md)).

---

### PHASE 5: SHARED SEAT BOOKING & CONCURRENCY LOCKING (SƠ ĐỒ GHẾ THỜI GIAN THỰC)
- **Mục tiêu:** Kết nối sơ đồ ghế 15 hàng trên Frontend với hạ tầng WebSocket và API khóa ghế nguyên tử dưới CSDL Neon PostgreSQL.
- **Các nội dung công việc cần làm:**
  1. Xây dựng API giữ ghế và nhả ghế theo phiên:
     - `POST /api/group-sessions/:id/seats/hold`: Nhận mảng ghế muốn giữ, gọi `SeatRepository` kiểm tra ràng buộc `uq_active_seat_hold`.
     - `POST /api/group-sessions/:id/seats/release`: Nhả ghế khi thành viên click bỏ chọn hoặc rời phòng.
  2. Tích hợp sự kiện WebSocket cho sơ đồ ghế:
     - Phát sự kiện `SEAT_HELD` tới tất cả thành viên trong phòng: Ghế vừa chọn lập tức đổi sang màu của người đó (`m1` đến `m4`).
     - Phát sự kiện `SEAT_RELEASED`: Ghế trở lại trạng thái ghế trống (màu trắng).
  3. Xử lý xung đột thời gian thực trên giao diện: Nếu thành viên B bấm vào ghế mà thành viên A vừa giữ trước 0.05s, giao diện hiển thị Toast báo lỗi thân thiện: *"Ghế này vừa được [Tên A] chọn"*.
  4. Tích hợp thanh đếm ngược phiên (`expires_at`): Tự động nhả toàn bộ ghế nếu hết thời gian giữ chỗ mà nhóm chưa hoàn tất.
- **Tiêu chí nghiệm thu (Definition of Done):** 2 thiết bị cùng mở sơ đồ ghế thấy ghế của nhau đổi màu tức thì trong < 100ms; không bao giờ xảy ra tình trạng bán trùng ghế.

---

### PHASE 6: INDIVIDUAL F&B ORDERING (GIỎ HÀNG BẮP NƯỚC RIÊNG & CHỐNG MUA TRÙNG)
- **Mục tiêu:** Cho phép từng thành viên tự chọn combo bắp nước cá nhân và hiển thị Bảng tổng hợp F&B nhóm để ngăn chặn mua trùng combo.
- **Các nội dung công việc cần làm:**
  1. Xây dựng API nạp danh mục combo bắp nước theo cụm rạp:
     - `GET /api/concessions/:cinemaId`: Lấy danh sách combo (Combo 1, Combo 2, Family Combo...).
  2. Xây dựng API quản lý giỏ hàng F&B từng thành viên:
     - `POST /api/group-sessions/:id/members/:memberId/fnb`: Cập nhật số lượng combo của cá nhân.
  3. Xây dựng bảng **Group F&B Summary (Tổng hợp bắp nước của nhóm)**:
     - Truy vấn tổng hợp từ bảng `fnb_order_items` hiển thị danh sách toàn nhóm: *"Nhóm đã có 2 bắp ngọt, 3 ly Pepsi, 1 bắp phô mai"*.
     - Cảnh báo trực quan nếu số lượng bắp nước vượt quá số lượng thành viên (ví dụ nhóm 4 người nhưng chọn 3 combo đôi).
  4. Phát sự kiện WebSocket `FNB_UPDATED` để bảng tổng hợp bắp nước cập nhật ngay khi bạn bè thêm combo.
- **Tiêu chí nghiệm thu:** Mỗi thành viên tự lưu giỏ hàng F&B riêng gắn vào `sub_order_id`, bảng tổng hợp nhóm cập nhật chính xác 100%.

---

### PHASE 7: SPLIT & HOST PAYMENT ORCHESTRATION (THANH TOÁN CHIA TIỀN & GỘP)
- **Mục tiêu:** Hiện thực hóa cơ chế thanh toán chia tiền (Split-Pay) và thanh toán gộp (Host-Pays) với cổng thanh toán thực tế.
- **Các nội dung công việc cần làm:**
  1. Tính toán giá trị thanh toán chuẩn xác từ Server (Server-authoritative Calculation): Tiền ghế + Tiền F&B của từng người.
  2. **Chế độ 1 — Host Pays All (Trưởng nhóm trả toàn bộ):**
     - Tạo 1 đơn thanh toán tổng gộp toàn bộ ghế và bắp nước của cả nhóm.
     - Trưởng nhóm mở cổng thanh toán (MoMo / VNPAY / Thẻ). Khi thành công, toàn bộ nhóm được chuyển sang `CONFIRMED`.
  3. **Chế độ 2 — Split Payment (Mỗi người tự trả phần mình):**
     - Kích hoạt cổng thanh toán độc lập cho từng `sub_order_id` của từng thành viên.
     - Thanh `PaymentProgressBar` cập nhật trạng thái thanh toán của từng người theo thời gian thực (`paidCount / totalMembers`).
  4. **Xử lý các tình huống ngoại lệ phức tạp:**
     - Xử lý thành viên thanh toán thất bại (`PAYMENT_FAILED`): Cho phép bấm thanh toán lại (`retry_payment`) mà không mất ghế đang giữ.
     - Xử lý khi hết thời gian chờ mà có 1 thành viên không thanh toán: Quy tắc xử lý hủy đơn hoặc Trưởng nhóm trả hộ cho thành viên đó.
- **Tiêu chí nghiệm thu:** Cả 2 chế độ thanh toán hoạt động trơn tru; webhook ghi nhận trạng thái `PAID` chuẩn xác cho từng thành viên.

---

### PHASE 8: INDIVIDUAL E-TICKETS & BOX-OFFICE VALIDATION (XUẤT VÉ QR RIÊNG)
- **Mục tiêu:** Cấp vé điện tử cá nhân độc lập cho từng thành viên và hỗ trợ tích hợp máy quét soát vé tại rạp.
- **Các nội dung công việc cần làm:**
  1. Tạo bản ghi `group_bookings`, `booking_items`, và sinh vé `tickets` riêng cho từng thành viên.
  2. Mã hóa chữ ký bảo mật (HMAC-SHA256) vào mã QR vé điện tử để chống giả mạo / chụp màn hình tái sử dụng.
  3. Hiển thị màn hình `ETicketScreen` hoàn chỉnh trên điện thoại của mỗi người:
     - Mã vé cá nhân (ví dụ: `GLX-8492048-M1`).
     - Mã vạch Barcode và mã QR scannable.
     - Thông tin chi tiết: Tên phim, suất chiếu, phòng chiếu, số ghế của người đó, combo bắp nước cá nhân đã mua.
  4. Xây dựng API kiểm tra và kích hoạt vé cho máy quét POS tại rạp:
     - `POST /api/tickets/validate`: Quét QR tại cửa kiểm soát để xác nhận vào rạp.
- **Tiêu chí nghiệm thu:** Mỗi thành viên tự cầm điện thoại của mình quét mã vào rạp mà không cần đứng đợi trưởng nhóm.

---

### PHASE 9: SECURITY, AUTHORIZATION & RELIABILITY HARDENING (BẢO MẬT & PHÂN QUYỀN)
- **Mục tiêu:** Gia cố an ninh toàn diện, ngăn chặn gian lận, tấn công vét cạn và rò rỉ dữ liệu.
- **Các nội dung công việc cần làm:**
  1. Phân quyền chặt chẽ (RBAC): Chỉ Host mới có quyền hủy phòng hoặc đổi suất chiếu; thành viên chỉ được sửa ghế và bắp nước của chính mình.
  2. Chống vét cạn mã mời (Rate Limiting): Giới hạn số lần thử mã code `GTH-XXX` trên endpoint `/api/invites/:code/join` (tối đa 5 lần/phút/IP) để chống Brute-Force.
  3. Xác thực tính toàn vẹn của giá tiền: Giá ghế và F&B luôn được tính toán và kiểm tra từ phía Server, từ chối mọi giá trị do Client tự gửi lên.
  4. Bảo mật dữ liệu thanh toán tuân thủ PCI-DSS: Không lưu trữ thông tin thẻ ngân hàng trên server của Galaxy.
  5. Audit Log: Ghi log toàn bộ các giao dịch thanh toán và thay đổi trạng thái phiên để phục vụ tra soát khiếu nại.
- **Tiêu chí nghiệm thu:** Vượt qua kiểm tra bảo mật OWASP Top 10, không có lỗ hổng IDOR hay giả mạo thanh toán.

---

### PHASE 10: TESTING, LOAD TESTING & NON-REGRESSION (KIỂM THỬ TẢI & HỆ THỐNG)
- **Mục tiêu:** Đảm bảo hệ thống chịu tải cao vào các dịp cao điểm (phim bom tấn, lễ Tết) và bảo toàn tuyệt đối luồng Solo Booking.
- **Các nội dung công việc cần làm:**
  1. **Kiểm thử hồi quy Solo Booking (Non-Regression Testing):**
     - Đảm bảo khách đặt vé 1 mình (Solo) trên web và app Galaxy Cinema vẫn hoạt động 100% bình thường, không gặp bất kỳ lỗi nào khi bảng `seat_holds` được tích hợp chung.
  2. **Kiểm thử tải đồng thời (Stress & Concurrency Load Test):**
     - Dùng k6 / Artillery mô phỏng 1.000 nhóm (4.000 người dùng) cùng mở phòng, chọn ghế và gửi yêu cầu giữ ghế cùng một thời điểm.
     - Đảm bảo tỷ lệ lỗi tranh chấp ghế được xử lý mượt mà, không xảy ra deadlock CSDL.
  3. **Kiểm thử ngắt kết nối & Phục hồi mạng (Chaos Testing):**
     - Mô phỏng mạng chập chờn, rớt kết nối WebSocket đột ngột và kiểm tra cơ chế tự động bù đắp dữ liệu (Reconciliation).
- **Tiêu chí nghiệm thu:** Hệ thống duy trì thời gian phản hồi API < 200ms và WebSocket < 100ms dưới tải 1.000 phòng đồng thời; 0% lỗi bán trùng ghế.

---

### PHASE 11: PILOT TESTING & PRODUCTION ROLLOUT (THÍ ĐIỂM & TRIỂN KHAI TOÀN DIỆN)
- **Mục tiêu:** Đưa tính năng ra vận hành thực tế tại cụm rạp thử nghiệm, thu thập phản hồi và triển khai trên toàn bộ hệ thống Galaxy Cinema.
- **Các nội dung công việc cần làm:**
  1. **Triển khai thí điểm (Pilot Phase):**
     - Kích hoạt tính năng Galaxy Together tại **Galaxy Cinema Nguyễn Văn Quá** (cụm rạp phát xuất ý tưởng).
     - Đặt standee và mã QR hướng dẫn trải nghiệm đặt vé nhóm tại sảnh rạp.
     - Đào tạo nhân viên soát vé và nhân viên quầy Concession về quy trình hỗ trợ khách hàng Together.
  2. **Thu thập chỉ số vận hành (Key Operational Metrics):**
     - Đo lường thời gian chốt vé nhóm: Mục tiêu giảm từ 20–40 phút xuống còn **dưới 5 phút**.
     - Tỷ lệ giảm khiếu nại mua trùng combo bắp nước: Mục tiêu giảm **80%**.
     - Tỷ lệ hoàn tất thanh toán thành công (Conversion Rate).
  3. **Mở rộng toàn quốc (Full System Rollout):**
     - Bật tính năng trên toàn bộ các cụm rạp Galaxy Cinema tại TP.HCM, Hà Nội, Đà Nẵng, Hải Phòng, Cần Thơ, v.v.
     - Tích hợp chiến dịch Marketing: Tặng voucher ưu đãi bắp nước cho các nhóm đặt vé qua Galaxy Together.
- **Tiêu chí nghiệm thu:** Tính năng vận hành ổn định trên toàn quốc, chỉ số hài lòng khách hàng (CSAT) đạt trên 90%.

---

## 3. Bảng Phân Công Tài Liệu & Kết Quả Tương Ứng

| Phase | Trạng thái hiện tại | Tài liệu kỹ thuật chi tiết |
|:---:|:---:|:---|
| **Phase 0** | **ĐÃ XONG** | [phase_0_discovery_report.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_0_discovery_report.md) |
| **Phase 1** | **ĐÃ XONG** | [phase_1_domain_and_database_foundation.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_1_domain_and_database_foundation.md) |
| **Phase 2** | **ĐÃ XONG** | [phase_2_group_session_backend_api.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_2_group_session_backend_api.md) |
| **Phase 3** | **ĐÃ XONG** | [phase_3_group_session_frontend.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_3_group_session_frontend.md) |
| **Phase 4** | **ĐÃ XONG** | [phase_4_realtime_collaboration.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_4_realtime_collaboration.md) |
| **Tổng kết 0–4** | **ĐÃ XONG** | [TONG_KET_TIEN_DO_PHASE_0_DEN_4.md](file:///d:/dh/hackathon/galaxy%20together/docs/TONG_KET_TIEN_DO_PHASE_0_DEN_4.md) |
| **UI/UX Redesign**| **ĐÃ XONG** | [implementation_plan.md](file:///C:/Users/tinph/.gemini/antigravity-ide/brain/5a1e66e3-ec94-4892-9679-62a50191f543/implementation_plan.md) |
| **Phase 5** | **ĐÃ XONG** | [phase_5_shared_seat_booking.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_5_shared_seat_booking.md) |
| **Phase 6** | **ĐÃ XONG** | [phase_6_individual_fnb.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_6_individual_fnb.md) |
| **Phase 7** | **ĐÃ XONG** | [phase_7_payment_orchestration.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_7_payment_orchestration.md) |
| **Phase 8** | *Kế tiếp* | Sẽ tạo: `docs/phase_8_tickets_and_boxoffice.md` |
| **Phase 9–11** | *Kế hoạch* | Sẽ tạo: `docs/phase_9_11_security_load_pilot.md` |

---

*Tài liệu kế hoạch tổng thể này là kim chỉ nam kỹ thuật cho toàn bộ đội ngũ phát triển dự án Galaxy Together — Ops Hackathon 2026.*
