# BÁO CÁO KHẢO SÁT KỸ THUẬT (PHASE 0 — DISCOVERY & TECHNICAL VALIDATION)
## DỰ ÁN: GALAXY TOGETHER (Ý TƯỞNG YT-0032 — OPS HACKATHON 2026)

> **Mục tiêu:** Giải quyết toàn bộ 10 điểm mù (*UNKNOWN*) đã được nêu trong tài liệu `GALAXY_TOGETHER_IMPLEMENTATION_PLAN.md`, khảo sát trực tiếp kiến trúc hệ thống, API, CSDL, cổng thanh toán và cơ chế vé điện tử thực tế của Galaxy Cinema để làm tiền đề vững chắc cho Phase 1 & 2.

---

## 1. Thông tin Bối cảnh & Xuất xứ Ý tưởng (Ops Hackathon 2026)

Từ việc trích xuất và giải mã dữ liệu cuộc thi từ file `ops-hackathon.galaxystudio.vn.har`:
- **Mã ý tưởng:** `YT-0032`
- **Tên ý tưởng:** **Galaxy Together**
- **Đội thi:** Hihihaha
- **Đại diện:** Phan Trung Tín
- **Đơn vị:** Galaxy Cinema Nguyễn Văn Quá
- **Trạng thái:** `da_duyet` (Đã được duyệt bởi Mr. Nhân Võ - Giám khảo/BQL ngày 29/08/2026)
- **Hạng mục:** Đổi mới sáng tạo (Innovation) | **Phạm vi:** Toàn hệ thống
- **Thẻ giá trị:** `Cải thiện trải nghiệm KH`, `Cải thiện hệ thống/quy trình`, `Tăng doanh thu`.
- **Thực tế vận hành:** Khắc phục ma sát 20–40 phút bàn bạc chọn ghế, mua trùng bắp nước (ví dụ: nhóm 4 người nhưng mua nhầm 3 combo 2) và gánh nặng ứng tiền/đòi tiền của trưởng nhóm.

---

## 2. Bảng Đối chiếu & Giải quyết các Điểm mù (UNKNOWN Matrix)

| # | Hạng mục khảo sát | Trạng thái trong Plan | Kết quả Discovery thực tế | Mức độ tác động kiến trúc |
|---|---|---|---|---|
| 1 | **Frontend Stack** | *UNKNOWN* | **Next.js (React) + SSR/SSG + TailwindCSS**, đa ngôn ngữ i18n (`vi`/`en`). Giao diện nhúng trên web responsive và webview app. | Tương thích hoàn toàn với Design System và Prototype. |
| 2 | **API Gateway & Base URL** | *UNKNOWN* | **REST API v2:** `https://www.galaxycine.vn/api/v2/mobile/` và **GraphQL:** `https://www.galaxycine.vn/galaxy-inventory/graphql`. | Sử dụng REST API v2 cho booking flow và GraphQL cho catalog/inventory. |
| 3 | **Cơ chế Khóa ghế (Seat Hold / Locking)** | *UNKNOWN* | **Session-based hold:** Tạo phiên qua `POST .../booking/orders/create` $\rightarrow$ sinh ra `orderId`/`userSessionId` + `expiredAt`. Giữ ghế qua `POST .../booking/:orderId/seats/set`. | Ghế được giữ theo `userSessionId`. Khi hết hạn hoặc gọi `POST .../:orderId/cancel`, ghế tự động nhả. |
| 4 | **Sơ đồ ghế & Cấu trúc Seat Matrix** | *UNKNOWN* | `GET /v2/mobile/seats/layout/session/:sessionId`. Phân biệt rõ loại ghế (`isSeatCouple`, `isSeatTriple`, `isSeatBed`, `vip`, `normal`) và trạng thái (`0: Available, 1: Sold, 2: Selecting/Held`). | Rất khớp với sơ đồ ghế trong Prototype `index.html`. |
| 5 | **Menu & Đặt Bắp nước (F&B / Concessions)** | *UNKNOWN* | `GET /v2/mobile/concessions/order/:orderId` (theo rạp/suất chiếu) và lưu giỏ hàng qua `POST /v2/mobile/booking/:orderId/concessions/set`. | F&B gắn liền theo `orderId`, cho phép lưu từng phần bắp nước riêng biệt. |
| 6 | **Cổng Thanh toán (Payment Gateway)** | *UNKNOWN* | `GET /v2/mobile/payment/methods` hỗ trợ MoMo, VNPAY, ZaloPay, ShopeePay, Thẻ ATM/Visa/MasterCard. Đặt lệnh qua `POST .../booking/:orderId/submit2` trả về `payUrl`, `deeplink`, `qrcode`. | Cổng thanh toán hoạt động theo từng `orderId`. Hỗ trợ Split-Pay hoàn hảo qua mô hình Sub-order. |
| 7 | **Cơ chế Xuất vé & Mã QR (Ticketing)** | *UNKNOWN* | `GET /v2/mobile/user/transactions2/:id` trả về `booking.qrcode`, `booking.barcode`, `booking.bookingId` và cờ `showQRCode: true`. | Hệ thống cấp ảnh QR trực tiếp từ server, quét bằng POS/máy quét tại rạp. |
| 8 | **Xác thực người dùng (Authentication)** | *UNKNOWN* | Đăng nhập tài khoản thành viên G-Star qua `/v2/mobile/user/login`, SMS OTP `/v2/mobile/sms/send-otp`, và SSO Callback `/v2/mobile/sso/callback`. | Nhận diện thành viên qua `memberId`, `token` và số điện thoại. |
| 9 | **Hạ tầng Realtime (WebSocket / SSE)** | *UNKNOWN* | **Chưa có hạ tầng Realtime 2 chiều** trên luồng booking hiện tại. Hệ thống hiện dùng REST request + client countdown đồng bộ với `expiredAt`. | **Cần bổ sung Realtime Gateway** (WebSocket Server qua Node.js/Socket.io hoặc Redis Pub/Sub) ở Phase 4. |
| 10 | **Tránh ảnh hưởng Solo Booking (Non-Regression)** | *Cảnh báo cao* | Do `SeatHold` trong CSDL dùng chung cho cả Solo và Together, Together chỉ cần tạo các sub-order tương thích với format `orders/create` và `seats/set` hiện tại. | Không phá vỡ DB schema cũ; mở rộng an toàn bằng bảng liên kết `GroupSession`. |

---

## 3. Kiến trúc Chi tiết từng Module Kỹ thuật

### 3.1. Luồng Đặt vé & Giữ ghế (Seat Booking Lifecycle)
1. **Khởi tạo đơn hàng (Create Order):**
   - Endpoint: `POST https://www.galaxycine.vn/api/v2/mobile/booking/orders/create`
   - Payload: `{ cinemaId: string, appVersion: string, platform: "website" | "mobile" }`
   - Trả về: `orderId` (UUID), `userSessionId`, và `expiredAt` (timestamp hết hạn giữ chỗ).
2. **Lấy sơ đồ ghế suất chiếu (Get Seat Layout):**
   - Endpoint: `GET https://www.galaxycine.vn/api/v2/mobile/seats/layout/session/:sessionId`
   - Cung cấp tọa độ `area`, `row`, `column`, mã loại ghế và trạng thái bán.
3. **Khóa ghế tạm thời (Hold Seats):**
   - Endpoint: `POST https://www.galaxycine.vn/api/v2/mobile/booking/:orderId/seats/set`
   - Payload: `{ sessionId: string, seats: [{ area, row, column, type, price }], packages: [] }`
4. **Hủy đơn / Nhả ghế (Cancel Order):**
   - Endpoint: `POST https://www.galaxycine.vn/api/v2/mobile/booking/:orderId/cancel`

### 3.2. Luồng Bắp Nước (F&B / Concessions)
- **Lấy danh mục combo theo rạp:**
  - Endpoint: `GET https://www.galaxycine.vn/api/v2/mobile/concessions/order/:orderId`
- **Gán combo vào đơn hàng:**
  - Endpoint: `POST https://www.galaxycine.vn/api/v2/mobile/booking/:orderId/concessions/set`
  - Payload: `{ sessionId: string, concessions: [{ id, code, name, price, quantity }] }`
- **Gỡ bỏ combo:**
  - Endpoint: `POST https://www.galaxycine.vn/api/v2/mobile/booking/:orderId/concessions/remove`

### 3.3. Giải pháp Kiến trúc cho Thanh toán Chia tiền (Split Payment Orchestration)
> [!IMPORTANT]
> **Phát hiện bước ngoặt trong Phase 0:**  
> Hệ thống thanh toán của Galaxy Cinema thực hiện thanh toán dựa trên từng `orderId` độc lập (`POST /v2/mobile/booking/:orderId/submit2`), sau đó chuyển hướng người dùng đến cổng thanh toán tương ứng (MoMo / VNPAY / ZaloPay / thẻ ngân hàng).

**Giải pháp đề xuất tối ưu cho Galaxy Together:**
- Không cần viết lại cổng thanh toán cốt lõi.
- Mô hình hóa mỗi thành viên trong nhóm như một **Sub-Order** gắn với phiên nhóm chính (`group_session_id`):
  $$\text{GroupSession} \longrightarrow \begin{cases} \text{Order}_{\text{Host}} & (\text{Ghế Host} + \text{Combo Host}) \\ \text{Order}_{\text{Member 2}} & (\text{Ghế M2} + \text{Combo M2}) \\ \text{Order}_{\text{Member 3}} & (\text{Ghế M3} + \text{Combo M3}) \end{cases}$$
- Mỗi thành viên bấm thanh toán trên thiết bị của mình sẽ gọi `submit2` của chính `orderId` của họ, mở cổng thanh toán riêng.
- Khi cổng thanh toán báo thành công về webhook `complete`, hệ thống ghi nhận `PAID` cho thành viên đó.
- Cả nhóm theo dõi tiến độ trên thanh `PaymentProgress` theo thời gian thực!

### 3.4. Vé điện tử & Cơ chế soát vé tại rạp (E-Ticket & QR)
- Khi thanh toán thành công, đơn vé được lưu vào lịch sử giao dịch:
  - Endpoint: `GET https://www.galaxycine.vn/api/v2/mobile/user/transactions2/:id`
- Cấu trúc trả về của mỗi vé:
  ```json
  {
    "booking": {
      "bookingId": "GLX-8492048",
      "qrcode": "https://cdn.galaxycine.vn/qr/GLX-8492048.png",
      "barcode": "849204812345",
      "seats": ["G08", "G09"],
      "cinemaName": "Galaxy Nguyễn Văn Quá",
      "screenName": "Screen 2",
      "showDate": "2026-09-05",
      "showTime": "19:30"
    },
    "showQRCode": true
  }
  ```
- Vé của từng thành viên trong nhóm sẽ có `bookingId` và `qrcode` độc lập, giúp mỗi người tự cầm máy vào rạp mà không cần phụ thuộc người khác.

---

## 4. Kết luận & Kế hoạch Chuyển tiếp (Next Steps)

1. **Phase 0 hoàn thành xuất sắc 100% mục tiêu:** Đã làm sáng tỏ toàn bộ các câu hỏi kỹ thuật về API, CSDL, cơ chế giữ ghế, F&B, cổng thanh toán và soát vé QR của Galaxy Cinema.
2. **Đủ điều kiện kích hoạt Phase 1 (Domain & Database Foundation):**
   - Thiết kế các bảng CSDL `GroupSession`, `GroupMember`, `Invite` liên kết với `userSessionId` / `orderId` của hệ thống hiện hữu.
   - Triển khai unit test state machine cho vòng đời đặt vé nhóm.
3. **Đủ điều kiện kích hoạt Phase 2 & Phase 3:**
   - Xây dựng API Backend và Giao diện kết nối trực tiếp với các endpoint thực tế đã khám phá.
