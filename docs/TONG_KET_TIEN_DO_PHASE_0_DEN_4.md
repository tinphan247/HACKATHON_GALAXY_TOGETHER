# TỔNG KẾT TIẾN ĐỘ TRIỂN KHAI DỰ ÁN: GALAXY TOGETHER
## BÁO CÁO TOÀN DIỆN TỪ PHASE 0 ĐẾN PHASE 4
**Dự án:** Galaxy Together (Mã ý tưởng: `YT-0032` — Ops Hackathon 2026)  
**Đơn vị:** Galaxy Cinema Nguyễn Văn Quá — Đội thi: Hihihaha  
**Đại diện dự án:** Phan Trung Tín  
**Trạng thái phê duyệt:** Đã được duyệt bởi Ban Quản lý / Giám khảo (`da_duyet` ngày 29/08/2026)  
**Tình trạng kỹ thuật:** **Hoàn thành 100% mục tiêu Phase 0, 1, 2, 3, 4**

---

## 1. Bối Cảnh & Mục Tiêu Dự Án (Executive Summary)

### 1.1. Vấn Đề Thực Tế Của Khách Hàng (Customer Pain Points)
Theo khảo sát vận hành tại cụm rạp Galaxy Cinema Nguyễn Văn Quá, khách hàng đi xem phim theo nhóm (4–8 người) thường gặp phải các ma sát lớn:
1. **Mất 20–40 phút bàn bạc:** Trao đổi qua chat (Zalo/Messenger) để chốt phim, chọn rạp, chọn suất chiếu.
2. **Nguy cơ mất ghế đẹp:** Trong lúc chờ mọi người phản hồi, các vị trí ghế trung tâm đã bị khách khác giữ hoặc mua mất.
3. **Gánh nặng cho Trưởng nhóm:** Một người phải đứng ra hỏi từng người ăn gì, chọn từng vị trí ghế, ứng trước toàn bộ số tiền vé và bắp nước (lên tới 500.000đ – 1.500.000đ), sau đó chịu trách nhiệm đi đòi tiền từng người.
4. **Lãng phí F&B do mua trùng combo:** Khi đặt lẻ theo cặp hoặc không thống nhất trước, các thành viên mua dư thừa bắp nước (ví dụ: nhóm 4 người nhưng mua nhầm 3 combo đôi), phát sinh khiếu nại tại quầy Concession.

### 1.2. Giải Pháp "Galaxy Together"
Chuyển đổi quy trình đặt vé từ **"Một người gánh toàn bộ"** sang **"Cả nhóm cùng tham gia vào một phiên duy nhất"** với các nguyên tắc cốt lõi:
- **Tạo nhóm tức thì:** Trưởng nhóm chọn suất chiếu $\rightarrow$ nhận mã phòng 6 ký tự (`GTH-XXX`) và mã QR tham gia.
- **Phòng chờ thời gian thực (Lobby):** Bạn bè quét QR/nhập code tham gia phòng với định danh màu riêng (`m1` đến `m8`).
- **Chọn ghế chung (Shared Seat Map):** Mọi người cùng nhìn thấy sơ đồ ghế, thấy ghế bạn mình đang chọn theo thời gian thực để ngồi cạnh nhau mà không lo bán trùng (nhờ cơ chế khóa ghế nguyên tử).
- **Giỏ hàng bắp nước riêng (Individual F&B):** Tự do chọn combo ưa thích, có bảng tổng hợp F&B nhóm để tránh mua trùng.
- **Chia tiền tự động (Split Payment):** Mỗi người tự thanh toán phần của mình qua MoMo / VNPAY / thẻ ngân hàng; không ai phải ứng tiền.
- **Vé điện tử riêng biệt (E-Tickets):** Sau khi hoàn tất, mỗi thành viên tự nhận mã QR vé độc lập trên điện thoại để quét vào rạp.

---

## 2. Ma Trận Tiến Độ Tổng Hợp (Progress Dashboard)

| Giai đoạn | Tên Phase | Trọng tâm kỹ thuật | Công nghệ sử dụng | Kết quả nghiệm thu |
|:---:|:---|:---|:---|:---|
| **Phase 0** | **Discovery & Validation** | Khảo sát hệ thống thật của Galaxy Cinema, giải quyết 10 điểm mù (*UNKNOWN Matrix*) | HAR Analysis, Galaxy REST v2, GraphQL, MoMo/VNPAY Gateway | **10/10 điểm mù được giải quyết sáng tỏ** |
| **Phase 1** | **Domain & Database** | Thiết kế CSDL 10 bảng, State Machine cho Session & Member, khóa ghế nguyên tử chống xung đột | PostgreSQL DDL, SQLite, Python State Machines | **17/17 Unit Tests passed 100%** |
| **Phase 2** | **Backend REST API** | REST API quản lý phiên, sinh mã mời `GTH-XXX`, join/leave/cancel phòng trên Cloud DB | Node.js (ESM), Express, Neon Serverless PostgreSQL | **13/13 Integration Tests passed 100%** |
| **Phase 3** | **Frontend Application** | Chuyển đổi prototype đơn file thành React App chuẩn module, tích hợp QR Canvas, Polling 2s | React 18, TypeScript, Vite, Vanilla CSS Tokens | **10 màn hình hoàn chỉnh, Zero Build Errors** |
| **Phase 4** | **Realtime Collaboration** | Hạ tầng WebSocket hai chiều đồng bộ thành viên phòng chờ tức thì (<100ms) | WebSocket Server (`ws`), React Hook, Auto-Reconnect | **Độ trễ 35–65ms (vượt SLA), Test suite passed** |
| **UX Redesign** | **Home Screen Production** | Tái thiết kế toàn diện màn hình Home bám sát Galaxy Cinema production app (Image 2) | Carousel Banner, Movie Cards 2:3, 5-tab BottomNav | **Giao diện chuẩn rạp chiếu phim hiện đại** |

---

## 3. Chi Tiết Các Việc Đã Làm Qua Từng Phase

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           GALAXY TOGETHER                               │
│                         LỘ TRÌNH TRIỂN KHAI                             │
└─────────────────────────────────────────────────────────────────────────┘
      │
      ├─► PHASE 0: Khảo sát thực tế & Giải mã API Galaxy Cinema
      │   └── Giải quyết 10 điểm mù: CSDL, Giữ ghế, F&B, Cổng thanh toán, QR
      │
      ├─► PHASE 1: Nền tảng DDL & Mô hình miền (Domain Engine)
      │   └── CSDL 10 bảng + Khóa ghế nguyên tử uq_active_seat_hold + 17 Tests
      │
      ├─► PHASE 2: Xây dựng Backend REST API & Kết nối Cloud DB
      │   └── Node.js Express + Neon PostgreSQL + API Session & Mã mời GTH-XXX
      │
      ├─► PHASE 3: Phát triển Ứng dụng Frontend (React + TS + Vite)
      │   └── 10 màn hình + QR Scannable + Deep Link + Polling dự phòng
      │
      ├─► PHASE 4: Hạ tầng Realtime hai chiều (WebSocket Gateway)
      │   └── Đồng bộ phòng chờ tức thì (<65ms) + Auto-reconnect + Toast alerts
      │
      └─► UI/UX REDESIGN: Màn hình Home Galaxy Cinema Production
          └── Banner Carousel + Poster chuẩn 2:3 + Tích hợp Galaxy Together
```

---

### PHASE 0: KHẢO SÁT KỸ THUẬT & GIẢI MÃ HỆ THỐNG GALAXY CINEMA
> **Tài liệu gốc:** [phase_0_discovery_report.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_0_discovery_report.md)

- **Phân tích dữ liệu thực tế:** Trích xuất và giải mã toàn bộ luồng mạng từ file HAR `ops-hackathon.galaxystudio.vn.har`.
- **Giải quyết trọn vẹn 10 điểm mù (*UNKNOWN Matrix*):**
  1. *Frontend Stack:* Xác định hệ thống chạy Next.js/React với TailwindCSS.
  2. *API Gateway:* Galaxy sử dụng REST v2 (`https://www.galaxycine.vn/api/v2/mobile/`) cho booking và GraphQL cho inventory.
  3. *Cơ chế giữ ghế (Seat Hold):* Cơ chế Session-based hold thông qua `POST .../booking/orders/create` $\rightarrow$ sinh ra `orderId` và `userSessionId` kèm timestamp `expiredAt`. Giữ ghế qua `POST .../seats/set`.
  4. *Sơ đồ ghế:* Endpoint `GET .../seats/layout/session/:sessionId` trả về trạng thái chi tiết của từng ghế (`0: Available, 1: Sold, 2: Held/Selecting`).
  5. *Menu F&B:* Endpoint `GET .../concessions/order/:orderId` và lưu giỏ qua `POST .../concessions/set`.
  6. *Cổng thanh toán:* Galaxy Cinema kích hoạt thanh toán theo từng `orderId` (`POST .../booking/:orderId/submit2`) hỗ trợ MoMo, VNPAY, ZaloPay, ShopeePay.
  7. *Phát hiện bước ngoặt về Chia tiền (Split-Pay):* Mỗi thành viên trong phiên nhóm được mô hình hóa thành một **Sub-Order** gắn với phiên nhóm chính. Mỗi người gọi thanh toán trên thiết bị của mình mà không cần sửa đổi cổng thanh toán cốt lõi của Galaxy Cinema.
  8. *Soát vé QR:* Endpoint `GET .../user/transactions2/:id` cung cấp `bookingId` và `qrcode` riêng biệt cho từng thành viên.
  9. *Nhận diện người dùng:* Qua tài khoản thành viên G-Star (SMS OTP, token).
  10. *Nguyên tắc Non-Regression:* Bảo đảm luồng đặt vé cá nhân (Solo Booking) không bị ảnh hưởng khi mở rộng thêm tính năng Together.

---

### PHASE 1: NỀN TẢNG CƠ SỞ DỮ LIỆU & MÔ HÌNH MIỀN (DOMAIN FOUNDATION)
> **Tài liệu gốc:** [phase_1_domain_and_database_foundation.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_1_domain_and_database_foundation.md)

1. **Thiết kế DDL Cơ sở dữ liệu 10 bảng thực thể:**
   - `group_sessions`: Quản lý thông tin suất chiếu, rạp, host, tên nhóm, số lượng thành viên (2–8) và thời hạn phiên (`expires_at`).
   - `group_members`: Lưu danh sách thành viên, vai trò (`host`/`member`), vị trí slot màu (`m1` đến `m8`), và ánh xạ `sub_order_id`.
   - `invites`: Lưu mã mời ngẫu nhiên 6 ký tự (`code`, ví dụ `GTH-786`) và chữ ký QR số.
   - `seat_holds`: Lưu trạng thái giữ ghế tạm thời.
   - `fnb_orders` & `fnb_order_items`: Giỏ hàng bắp nước độc lập cho từng thành viên.
   - `payments`: Lưu lịch sử giao dịch thanh toán thành phần.
   - `group_bookings`, `booking_items`, `tickets`: Vé điện tử hoàn tất kèm mã barcode và QR riêng biệt cho từng cá nhân.
2. **Cơ chế Khóa ghế nguyên tử chống xung đột (Atomic Concurrency Locking):**
   - Thiết lập ràng buộc Unique Partial Index trong CSDL:
     ```sql
     CREATE UNIQUE INDEX uq_active_seat_hold 
     ON seat_holds (showtime_id, seat_id) 
     WHERE status IN ('held', 'sold');
     ```
   - Khi hai người cùng bấm vào một ghế trong cùng một tích tắc, người đến sau sẽ bị CSDL chặn ngay lập tức ở cấp độ phần cứng và hệ thống ném ngoại lệ `SeatConflictError`.
3. **Xây dựng State Machine chuẩn xác:**
   - `GroupSession State Machine`: `CREATED` $\rightarrow$ `WAITING_FOR_MEMBERS` $\rightarrow$ `SELECTING` $\rightarrow$ `PAYMENT` $\rightarrow$ `CONFIRMED` (kèm các nhánh `EXPIRED`, `CANCELLED`, `FAILED`).
   - `GroupMember State Machine`: `INVITED` $\rightarrow$ `JOINED` $\rightarrow$ `SELECTING_SEAT` $\rightleftharpoons$ `SEAT_SELECTED` $\rightarrow$ `SELECTING_FNB` $\rightarrow$ `PAYMENT_PENDING` $\rightarrow$ `PAID` $\rightarrow$ `CONFIRMED`.
4. **Kiểm thử tự động:** Vượt qua **17/17 Unit Tests** kiểm tra toàn bộ luồng đổi ghế, thử lại khi thanh toán lỗi và chống bán trùng ghế.

---

### PHASE 2: XÂY DỰNG REST API BACKEND & KẾT NỐI CLOUD DATABASE
> **Tài liệu gốc:** [phase_2_group_session_backend_api.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_2_group_session_backend_api.md)

1. **Kiến trúc Server:** Xây dựng bằng Node.js / Express (ESM), kết nối qua `pg.Pool` có SSL trực tiếp tới cơ sở dữ liệu đám mây **Neon Serverless PostgreSQL (AWS Singapore)**.
2. **Bộ API Endpoints cốt lõi:**
   - `POST /api/group-sessions`: Khởi tạo phiên nhóm, cấp quyền host và gán slot màu `m1` (Galaxy Orange), tự động sinh mã mời.
   - `GET /api/invites/:code`: Xem trước thông tin phòng mời (tên phim, rạp, suất chiếu, số lượng hiện tại).
   - `POST /api/invites/:code/join`: Tham gia nhóm bằng mã mời hoặc quét QR. Tự động cấp slot màu tiếp theo (`m2`, `m3`, `m4`), kiểm soát giới hạn `maxMembers` và bảo đảm tính lũy đẳng (Idempotency).
   - `GET /api/group-sessions/:id`: Lấy thông tin phòng và danh sách thành viên chi tiết theo thời gian thực.
   - `POST /api/group-sessions/:id/leave`: Thành viên thoát phòng, tự động giải phóng ghế đang giữ và nhường slot màu.
   - `POST /api/group-sessions/:id/cancel`: Trưởng nhóm hủy phiên đặt vé (phân quyền nghiêm ngặt, chặn thành viên thường).
   - `GET /api/health`: Health-check kiểm tra trạng thái kết nối DB và thời gian phản hồi.
3. **Kiểm thử tích hợp trên Cloud Database:** Hoàn thành **13/13 Integration Tests** kiểm tra toàn bộ kịch bản tạo phòng, mời bạn, kiểm tra trùng lặp và phân quyền.

---

### PHASE 3: PHÁT TRIỂN ỨNG DỤNG FRONTEND (REACT + TYPESCRIPT + VITE)
> **Tài liệu gốc:** [phase_3_group_session_frontend.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_3_group_session_frontend.md)

1. **Hiện đại hóa kiến trúc:** Tái cấu trúc file prototype đơn lẻ `files/index.html` (92KB, 2.125 dòng) thành dự án React 18 + TypeScript + Vite có cấu trúc module phân tầng chuyên nghiệp.
2. **Hệ thống 10 Màn hình hoàn chỉnh:**
   - `HomeScreen`: Màn hình chủ Galaxy Cinema tích hợp banner quảng bá Galaxy Together.
   - `ShowtimeScreen`: Xem suất chiếu, chọn ngày, nút bấm "👥 Tạo nhóm xem phim".
   - `CreateGroupScreen`: Điền tên nhóm, cấu hình 2–8 người, chọn chế độ thanh toán (chia đều / host trả), gọi API thật.
   - `InviteScreen`: Hiển thị mã phòng thực tế, render mã QR bằng Canvas chuẩn thư viện `qrcode` có thể quét bằng camera điện thoại thật, nút copy và share mạng xã hội.
   - `LobbyScreen`: Phòng chờ hiển thị thành viên theo màu slot (`m1`–`m4`), các slot trống viền đứt nét, tự động đồng bộ qua polling 2s.
   - `SeatSelectionScreen`: Sơ đồ 15 hàng ghế, hiển thị ghế nhóm theo màu từng người.
   - `FnBScreen`: Chọn combo bắp nước cá nhân và bảng tổng kết giỏ hàng nhóm.
   - `PaymentScreen`: Thanh tiến độ thanh toán nhóm, trạng thái thanh toán từng thành viên.
   - `ConfirmedScreen`: Màn hình chúc mừng đặt vé thành công.
   - `ETicketScreen`: Thẻ vé điện tử cá nhân kèm mã vạch và mã QR độc lập để vào rạp.
3. **Deep Link tự động (`?join=GTH-XXX`):** Quét mã QR từ điện thoại sẽ mở ngay modal tham gia nhóm, điền tên và vào thẳng phòng chờ.
4. **Simulation Bar (Thanh mô phỏng cho Ban giám khảo):** Các nút bấm "+ Minh tham gia", "+ An tham gia" gọi trực tiếp API Backend thật và ghi nhận vào cơ sở dữ liệu Neon DB, giúp giám khảo kiểm tra tính năng mà không cần nhiều thiết bị.
5. **Chế độ Offline Fallback:** Tự động phát hiện mất mạng và hiển thị cảnh báo, chuyển sang chế độ Demo mà không làm ứng dụng bị lỗi.
6. **Kiểm tra biên dịch:** `npm run build` thành công xuất sắc, **Zero Errors & Zero Warnings**.

---

### PHASE 4: HẠ TẦNG THỜI GIAN THỰC (REALTIME COLLABORATION WEBSOCKET)
> **Tài liệu gốc:** [phase_4_realtime_collaboration.md](file:///d:/dh/hackathon/galaxy%20together/docs/phase_4_realtime_collaboration.md)

1. **Nâng cấp từ Polling 2s lên WebSocket hai chiều:**
   - Khởi tạo `RealtimeGateway` bằng thư viện `ws` trên cùng HTTP Server port 3000 tại đường dẫn `/ws`.
   - Quản lý kênh kết nối theo phòng: `rooms: sessionId -> Set<WebSocket>`.
   - Cơ chế Ping/Pong Heartbeat (30s) giữ kết nối ổn định.
2. **Hệ thống sự kiện thời gian thực:**
   - `GROUP_MEMBER_JOINED`: Bạn bè quét QR tham gia $\rightarrow$ màn hình Host lập tức hiển thị thành viên mới trong **35ms – 65ms** (đạt SLA < 100ms, nhanh hơn 40 lần so với HTTP Polling).
   - `GROUP_MEMBER_LEFT`: Thành viên rời phòng $\rightarrow$ lập tức cập nhật lại slot trống.
   - `GROUP_CANCELLED`: Trưởng nhóm hủy phòng $\rightarrow$ thông báo và chuyển hướng tất cả thành viên về Home.
3. **Kiến trúc Client bền vững (Client Resilience):**
   - Service `RealtimeService` hỗ trợ **Exponential Backoff** tự động kết nối lại khi mất mạng.
   - Cơ chế **Reconciliation:** Khi kết nối socket được khôi phục, ứng dụng tự động gọi REST API để bù đắp bất kỳ dữ liệu nào bị thiếu sót trong lúc gián đoạn.
   - Cơ chế **Hybrid Fallback:** Nếu WebSocket ngắt kết nối hoặc gặp tường lửa chặn, ứng dụng tự động chuyển về chế độ Polling 2s để đảm bảo trải nghiệm không bao giờ bị gián đoạn.
4. **Cải tiến UI/UX:**
   - Đèn báo trạng thái trực quan: `⚡ LIVE WS` (Xanh lá - Realtime), `POLLING (2s)` (Vàng - Dự phòng), `◌ TÁI KẾT NỐI` (Cam).
   - Thông báo Toast tức thời: *"⚡ Minh vừa tham gia nhóm! (Realtime WS)"*.
5. **Kiểm thử tự động:** Script kiểm thử `backend/tests/test_realtime_ws.js` xác nhận toàn bộ luồng WebSocket hoạt động hoàn hảo với độ trễ siêu tốc.

---

### BỔ SUNG: REDESIGN MÀN HÌNH HOME THEO CHUẨN PRODUCTION GALAXY CINEMA
> **Tài liệu thiết kế:** [implementation_plan.md](file:///C:/Users/tinph/.gemini/antigravity-ide/brain/5a1e66e3-ec94-4892-9679-62a50191f543/implementation_plan.md)

Nhằm xóa bỏ hoàn toàn cảm giác "prototype sinh viên" và đưa ứng dụng lên đẳng cấp sản phẩm thương mại thực tế (**Production Cinema App**), màn hình Home đã được thiết kế lại toàn diện:

1. **So sánh & Loại bỏ khuyết điểm cũ:**
   - ❌ Loại bỏ khối header xanh đậm đặc, chật chội của giao diện cũ.
   - ❌ Loại bỏ các poster phim dạng hình vuông màu gradient kèm emoji đơn giản.
   - ❌ Di dời banner Galaxy Together khỏi vị trí áp sát đỉnh đầu gây cản trở trải nghiệm duyệt phim chính.
2. **Thiết kế mới bám sát 100% chuẩn giao diện thực tế Galaxy Cinema (Image 2 Reference):**
   - **Header sáng hiện đại:** Logo Galaxy Cinema xoay sắc nét, bộ chọn vị trí cụ thể (`📍 TP Hồ Chí Minh` với modal chọn tỉnh/thành phố: Hà Nội, Đà Nẵng, Cần Thơ...), chuông thông báo có badge đỏ.
   - **Hero Promotion Carousel:** Banner khổ lớn tỷ lệ điện ảnh (16:9), bo góc 16px, hiệu ứng peek hé lộ một phần của banner tiếp theo, dải chấm pagination dots chuyển động mượt mà, hỗ trợ swipe chạm tay.
     - *Banner 1:* Khai trương Galaxy Cinema Vincom Đan Phượng (quà tặng photobooth, pepsi, voucher).
     - *Banner 2:* Quảng bá tính năng Galaxy Together (đặt vé nhóm thông minh, tự chia tiền).
   - **Thanh Tab Đang chiếu & Sắp chiếu:** Tab active hiển thị màu xanh thương hiệu (`#0B3B60`) với gạch chân nổi bật, góc phải tích hợp nút chuyển nhanh vị trí rạp.
   - **Lưới phim 2 cột (2-Column Grid) với Poster điện ảnh thực tế:**
     - Tỷ lệ poster chuẩn điện ảnh ~2:3 sắc nét (Hope Vùng Tử Địa, Hộ Linh Tráng Sĩ, Quý Tử Vượt Giàu, Chiikawa, Thám Tử Conan).
     - Huy hiệu xếp hạng sao (`⭐ 9.7`) và nhãn độ tuổi (`T16`, `T13`, `K`, `P`) nằm trực tiếp ở góc dưới poster với lớp phủ gradient tinh tế.
     - Tiêu đề phim 15px semi-bold, hỗ trợ rút gọn 2 dòng gọn gàng.
   - **Thẻ quảng bá Galaxy Together tự nhiên:**
     - Thiết kế dạng Feature Card cao cấp với gam màu cam ấm (`#FFF9F3` $\rightarrow$ `#FFF2E5`), viền cam sang trọng.
     - Bố trí xen kẽ tự nhiên giữa danh mục phim (sau 2 phim nổi bật đầu tiên), giữ vững luồng duyệt phim chính của rạp.
     - Nút bấm **"Thử ngay →"** kết nối trực tiếp vào luồng tạo nhóm xem phim.
   - **Fixed Bottom Navigation 5 tab:** Chuẩn xác theo Image 2: `Trang chủ` (active có pill xanh), `Rạp phim`, `CineTag#`, `Điện ảnh`, `Tài khoản` với kích thước touch target chuẩn mobile (>= 44px).

---

## 4. Tổng Hợp Các Kết Quả Kiểm Thử (Verification & Quality Assurance)

| Hạng mục kiểm thử | Công cụ / Tệp thực thi | Số lượng ca kiểm thử | Kết quả | Ghi chú |
|:---|:---|:---:|:---:|:---|
| **Domain State Machines** | `backend/tests/test_session_state.py`<br>`test_member_state.py` | 14 tests | **14/14 PASS** | Kiểm tra vòng đời Session & Member, hủy phòng, thử lại thanh toán |
| **Seat Concurrency Locking** | `backend/tests/test_seat_locking.py` | 3 tests | **3/3 PASS** | Kiểm tra khóa ghế nguyên tử `uq_active_seat_hold`, chống bán trùng |
| **Backend REST API** | `backend/tests/test_integration_api.js` | 13 tests | **13/13 PASS** | Kiểm tra toàn bộ 6 REST endpoints trực tiếp trên **Neon Cloud PostgreSQL** |
| **Realtime WebSocket Gateway** | `backend/tests/test_realtime_ws.js` | 4 tests | **4/4 PASS** | Đo độ trễ phát sự kiện `GROUP_MEMBER_JOINED`: **35ms – 65ms** |
| **Frontend TypeScript & Build** | `npm run build` (Vite 8) | Toàn bộ dự án | **ZERO ERRORS** | Tệp bundle tối ưu 269KB JS, 20KB CSS, nạp trong 290ms |

---

## 5. Danh Mục Cấu Trúc Mã Nguồn Hoàn Thiện

```text
galaxy together/
├── backend/                               # Hệ thống Dịch vụ & CSDL Backend
│   ├── database/
│   │   ├── database.py                    # Connection Pool & SeatRepository khóa ghế
│   │   └── schema.sql                     # Script DDL 10 bảng thực thể
│   ├── domain/
│   │   ├── group_session.py               # State machine vòng đời phiên nhóm
│   │   ├── group_member.py                # State machine thành viên & slot màu
│   │   └── types.py                       # Enums & Domain exceptions
│   ├── src/
│   │   ├── controllers/                   # SessionController, InviteController
│   │   ├── routes/                        # /api/group-sessions, /api/invites, /api/health
│   │   ├── services/                      # SessionService, CodeGenerator (GTH-XXX)
│   │   ├── realtime/                      # WebSocket Gateway (/ws, broadcast events)
│   │   └── server.js                      # HTTP & WebSocket Server entrypoint
│   └── tests/                             # Bộ kiểm thử tự động Python & Node.js
│
├── frontend/                              # Ứng dụng Giao diện Khách hàng (React TS)
│   ├── public/
│   │   ├── banners/                       # Banner carousel Vincom Đan Phượng, Galaxy Together
│   │   └── posters/                       # Poster chuẩn điện ảnh: Hope, Hộ Linh Tráng Sĩ, Quý Tử...
│   ├── src/
│   │   ├── api/client.ts                  # Centralized typed API wrapper
│   │   ├── components/
│   │   │   ├── common/                    # StatusBar, BottomNav (5 tabs), RealQrCode...
│   │   │   ├── home/                      # HomeHeader, PromotionCarousel, MovieTabs, MovieCard...
│   │   │   ├── join/                      # JoinGroupModal (Deep Link handler)
│   │   │   └── simulation/                # SimulationBar (API thật cho BGK)
│   │   ├── context/                       # GroupSessionContext, ToastContext
│   │   ├── hooks/                         # useSessionRealtime (WS hook + reconciliation)
│   │   ├── pages/                         # 10 Màn hình trải nghiệm người dùng
│   │   ├── services/                      # realtimeService, groupSessionService, storageService
│   │   └── styles/                        # variables.css, app.css (Galaxy Cinema Design System)
│   ├── package.json
│   └── vite.config.ts
│
└── docs/                                  # Toàn bộ hồ sơ báo cáo kỹ thuật từng giai đoạn
    ├── phase_0_discovery_report.md
    ├── phase_1_domain_and_database_foundation.md
    ├── phase_2_group_session_backend_api.md
    ├── phase_3_group_session_frontend.md
    ├── phase_4_realtime_collaboration.md
    └── TONG_KET_TIEN_DO_PHASE_0_DEN_4.md  # Tài liệu tổng kết hợp nhất này
```

---

## 6. Định Hướng Kế Tiếp (Phase 5 Roadmap)

Sau khi hoàn thành xuất sắc toàn bộ nền tảng từ Phase 0 đến Phase 4:
1. **Phase 5 — Shared Seat Booking (Sơ đồ ghế thời gian thực):**
   - Kết nối sơ đồ ghế tương tác với WebSocket: khi thành viên A click chọn ghế `G08`, ghế lập tức đổi sang màu của thành viên A trên màn hình của tất cả các thành viên khác trong phòng.
   - Tích hợp gọi API khóa ghế nguyên tử `POST /api/group-sessions/:id/seats/hold` xuống CSDL Neon PostgreSQL.
2. **Phase 6 — Individual F&B & Split Payment Completion:**
   - Hoàn tất giỏ F&B cá nhân đồng bộ và tích hợp mô phỏng thanh toán Sub-order đa cổng (MoMo / VNPAY / Thẻ quốc tế).
   - Xuất vé điện tử QR cá nhân hoàn chỉnh cho từng thành viên vào rạp.

---

*Báo cáo được tổng hợp và hoàn thành bởi Nhóm dự án Galaxy Together — Ops Hackathon 2026.*
