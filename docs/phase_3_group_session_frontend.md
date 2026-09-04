# Báo Cáo Kỹ Thuật: Phase 3 — Group Session Frontend Application

Dự án: **Galaxy Together — YT-0032 — Ops Hackathon 2026**  
Đội thi: **Hihihaha (Galaxy Cinema Nguyễn Văn Quá)**  
Trạng thái: **Hoàn thành 100% (Completed)**  

---

## 1. Tổng Quan Kiến Trúc & Công Nghệ

Phase 3 đã chuyển đổi thành công nguyên mẫu tĩnh đơn file `files/index.html` (92KB, 2.125 dòng) thành **Frontend Application hoàn chỉnh** với kiến trúc phân tầng module chuyên nghiệp:

- **Framework & Runtime:** React 18 + TypeScript + Vite 8
- **Styling:** Vanilla CSS module hóa (`variables.css`, `app.css`), bảo tồn 100% tokens của Galaxy Cinema (`--orange: #F58020`, `--navy: #0B3B60`, typography Roboto, mobile shell 390×844px responsive).
- **Mã QR Scannable:** Thư viện chuẩn `qrcode`, render Canvas thực tế có thể quét được bằng bất kỳ camera điện thoại thông minh nào.
- **REST API Client:** Centralized typed API wrapper (`src/api/client.ts`) với phân loại lỗi chi tiết (400, 404, 409 Conflict, 500, Network Error) và thông điệp tiếng Việt thân thiện.
- **Quản lý trạng thái:** `GroupSessionContext` & `ToastContext` quản lý dữ liệu phiên, người dùng hiện tại, cơ chế đồng bộ polling 2 giây và điều hướng 10 màn hình.

---

## 2. Chi Tiết Các Màn Hình Đã Di Chuyển (Screen Migration)

| STT | Màn hình (Screen) | Tệp nguồn React TSX | Nguồn dữ liệu (Data Source) | Trạng thái tích hợp |
|:---:|:---|:---|:---|:---|
| 1 | **Home** | `src/pages/HomeScreen.tsx` | Galaxy Cinema Movies | Hiển thị phim, banner Galaxy Together |
| 2 | **Showtimes** | `src/pages/ShowtimeScreen.tsx` | Suất chiếu 2D / Nguyễn Văn Quá | Chọn suất chiếu, nút CTA Tạo nhóm xem phim |
| 3 | **Create Group** | `src/pages/CreateGroupScreen.tsx` | **Live Backend REST API** | Gọi `POST /api/group-sessions`, validation, loading state |
| 4 | **Invite & QR** | `src/pages/InviteScreen.tsx` | **Live Backend REST API** | Mã code thật từ DB, QR Canvas scannable, Copy, Native Share |
| 5 | **Lobby** | `src/pages/LobbyScreen.tsx` | **Live Polling 2s REST API** | Gọi `GET /api/group-sessions/:id`, danh sách thành viên `m1`–`m4`, empty slots |
| 6 | **Shared Seats** | `src/pages/SeatSelectionScreen.tsx` | Interactive State Machine | Sơ đồ ghế 15 hàng, vị trí nhóm theo màu thành viên |
| 7 | **Individual F&B** | `src/pages/FnBScreen.tsx` | Interactive Stepper | Giỏ hàng bắp nước độc lập từng cá nhân |
| 8 | **Payment** | `src/pages/PaymentScreen.tsx` | Split Payment State | Tiến độ thanh toán cả nhóm, trạng thái từng người |
| 9 | **Confirmed** | `src/pages/ConfirmedScreen.tsx` | Group Booking State | Xác nhận đặt vé thành công cho cả nhóm |
| 10 | **E-Ticket** | `src/pages/ETicketScreen.tsx` | Scannable Ticket QR | Vé điện tử cá nhân kèm mã barcode/QR soát vé |

---

## 3. Các Tính Năng Nổi Bật

### 3.1. Tạo Nhóm (Create Group) với API Thật
- Gửi yêu cầu `POST /api/group-sessions` với đầy đủ tham số suất chiếu và cấu hình nhóm:
  ```json
  {
    "showtimeId": "21:00",
    "cinemaId": "cin-nvq",
    "cinemaName": "Galaxy Cinema Nguyễn Văn Quá",
    "movieId": "mv-01",
    "movieTitle": "Quý Tử Vượt Giàu",
    "showDate": "07/09/2026",
    "showTime": "21:00",
    "screenName": "Phòng 3",
    "hostUserId": "usr_host_...",
    "hostName": "Phan Trung Tín",
    "name": "Friday Movie Night",
    "paymentMode": "SPLIT_EQUAL",
    "maxMembers": 4
  }
  ```
- Nhận phản hồi từ Backend, lưu `sessionId` và mã mời thực tế (ví dụ `GTH-786`) vào `localStorage` và `GroupSessionContext`.
- Giao diện có validation chặn tên rỗng, giới hạn 2–8 thành viên, và nút bấm có loading state chống click kép.

### 3.2. Mã QR Thực Tế & Chia Sẻ Đa Kênh
- Mã QR được render bởi thư viện `qrcode` mã hóa trực tiếp đường link tham gia:
  ```text
  http://<domain>/?join=GTH-XXX
  ```
- Có thể dùng camera điện thoại thật quét mã trên màn hình máy tính để mở trang tham gia ngay lập tức.
- Nút **Sao chép mã**, **Sao chép liên kết** và **Chia sẻ (`navigator.share`)** tích hợp thông báo Toast mượt mà.

### 3.3. Deep Link Tự Động Nhận Diện (`?join=GTH-XXX`)
- Ứng dụng tự động kiểm tra tham số `?join=` hoặc `?code=` trên URL khi tải trang.
- Mở modal popup **"Tham gia Galaxy Together"** cho phép nhập tên bạn bè.
- Tự động nạp thông tin tóm tắt của nhóm qua `GET /api/invites/:code` và gửi `POST /api/invites/:code/join`.
- Chuyển hướng trực tiếp vào phòng chờ Lobby sau khi tham gia thành công.

### 3.4. Phòng Chờ Tự Động Đồng Bộ (Polling 2 Giây)
- Chu kỳ gọi `GET /api/group-sessions/:id` mỗi 2.000ms khi người dùng đang ở màn hình Lobby.
- Tự động hủy interval khi chuyển sang màn hình khác để tối ưu tài nguyên.
- Cơ chế **Overlap Protection**: Không gửi request mới nếu request trước đó đang ở trạng thái pending.
- Phân bổ màu đại diện theo vị trí slot:
  - **Host (Slot 1):** `#F58020` (Galaxy Orange)
  - **Thành viên 2:** `#7C3AED` (Tím)
  - **Thành viên 3:** `#0EA5E9` (Xanh dương)
  - **Thành viên 4:** `#10B981` (Xanh lá)
- Slot chưa có người vào hiển thị viền đứt nét kèm biểu tượng chờ động.

### 3.5. Thanh Mô Phỏng (Simulation Bar) Gọi API Thật
- Để phục vụ chấm thi Hackathon, các nút **"+ Minh tham gia"**, **"+ An tham gia"**, **"+ Huy tham gia"** trên thanh mô phỏng sẽ gửi API `POST /api/invites/:code/join` trực tiếp vào Backend và ghi nhận vào bảng `group_members` của cơ sở dữ liệu Neon PostgreSQL.
- Giám khảo có thể quan sát phòng chờ cập nhật thành viên theo thời gian thực mà không cần thao tác trên nhiều thiết bị.

### 3.6. Chế Độ Dự Phòng Demo (Offline Fallback)
- Nếu backend không phản hồi hoặc mất kết nối mạng, ứng dụng không bị crash màn hình trắng mà hiển thị banner:
  > *⚠️ Không thể kết nối máy chủ — Đang hoạt động ở Chế độ Demo*
- Thanh mô phỏng tự động chuyển sang nhãn `DEMO` và cho phép trải nghiệm toàn bộ các màn hình kế tiếp một cách mượt mà.

---

## 4. Kết Quả Kiểm Thử (Verification Results)

### 4.1. TypeScript & Vite Production Build
- Lệnh: `npm run build` tại thư mục `frontend/`
- Kết quả: **Thành công (Zero Errors, Zero Warnings)**
  ```text
  dist/index.html                   0.74 kB │ gzip:  0.48 kB
  dist/assets/index-BQN5kuFL.css   20.41 kB │ gzip:  4.40 kB
  dist/assets/index-uqns-SxJ.js   269.76 kB │ gzip: 81.71 kB
  ✓ built in 290ms
  ```

### 4.2. Kiểm Thử Vòng Đời End-to-End
1. **Khởi động:** Backend chạy port `3000`, Frontend chạy port `5174`.
2. **Tạo nhóm:** Chọn phim $\rightarrow$ Suất 21:00 $\rightarrow$ Nhập "Friday Movie Night Live" $\rightarrow$ Backend tạo thành công phiên và trả về mã mời.
3. **Mã QR:** Render sắc nét bằng Canvas, giải mã đúng URL `http://localhost:5174/?join=GTH-XXX`.
4. **Mô phỏng bạn bè tham gia:**
   - Minh tham gia $\rightarrow$ Backend ghi nhận `group_members` (Status: `JOINED`, Slot `m2` màu tím).
   - An tham gia $\rightarrow$ Backend ghi nhận `group_members` (Status: `JOINED`, Slot `m3` màu xanh dương).
5. **Đồng bộ phòng chờ:** Sau 2 giây, phòng chờ của Host cập nhật hiển thị 3/4 thành viên kèm Toast chúc mừng.
6. **Lưu trữ phiên (Persistence):** Khi bấm F5 tải lại trang, dữ liệu phòng và thông tin thành viên vẫn được nạp lại đầy đủ từ backend.

---

## 5. Kết Luận
**Phase 3 — Group Session Frontend** đã hoàn thành xuất sắc toàn bộ tiêu chí nghiệm thu đề ra. Dự án đã sẵn sàng bước vào **Phase 4: Realtime Collaboration (WebSocket)** để đồng bộ hóa việc chọn ghế thời gian thực.
