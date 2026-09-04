# 🎬 GALAXY TOGETHER — OPS HACKATHON 2026
> **"Đi cùng nhau. Đặt cùng nhau. Mỗi người tự quyết định và tự thanh toán."**  
> *Dự án tham gia cuộc thi OPS HACKATHON 2026 — Ý tưởng `YT-0032` (Đội thi Hihihaha — Galaxy Cinema Nguyễn Văn Quá).*

---

## 📌 1. Bối cảnh & Vấn đề (Problem Statement)
Đi xem phim theo nhóm (4–8 người) là một trải nghiệm phổ biến nhưng quy trình đặt vé truyền thống gặp rất nhiều ma sát:
- **Tốn thời gian bàn bạc (20–40 phút):** Phải nhắn tin qua Zalo/Messenger để thống nhất phim, rạp, suất chiếu.
- **Rủi ro mất ghế:** Trong lúc chờ mọi người phản hồi, các ghế đẹp có thể đã bị người khác đặt mất.
- **Gánh nặng cho người đại diện:** Một người phải đứng ra hỏi từng người ăn gì, chọn từng vị trí ghế, ứng trước toàn bộ tiền vé + bắp nước, và chịu trách nhiệm đòi tiền từng người sau đó.
- **Mua trùng combo F&B:** Khi đặt lẻ theo cặp, các thành viên không nắm được đơn của nhau dẫn đến việc mua dư thừa combo (ví dụ nhóm 4 người nhưng mua nhầm 3 combo 2), làm phát sinh khiếu nại tới BQL rạp.

---

## 💡 2. Giải pháp Galaxy Together
**Galaxy Together** chuyển mô hình đặt vé nhóm từ *"một người gánh toàn bộ"* sang *"cả nhóm cùng tham gia vào một phiên booking duy nhất"* ngay trên ứng dụng Galaxy Cinema:

1. **Tạo phiên nhóm:** Trưởng nhóm chọn suất chiếu $\rightarrow$ nhận mã phòng (6 ký tự) và mã QR mời bạn bè.
2. **Tham gia phòng chờ (Lobby):** Bạn bè quét QR hoặc nhập code là vào thẳng phòng, thấy danh sách thành viên trực quan.
3. **Chọn ghế chung thời gian thực (Shared Seat Map):** Mọi người cùng nhìn thấy sơ đồ ghế theo thời gian thực; mỗi người có màu nhận diện riêng (`m1` đến `m4`), thấy bạn mình đang chọn ghế nào để ngồi cạnh mà không cần hỏi.
4. **Giỏ hàng bắp nước riêng (Individual F&B):** Mỗi thành viên tự thêm combo vào giỏ cá nhân, đồng thời có bảng tổng hợp F&B nhóm để chống mua trùng.
5. **Thanh toán linh hoạt (Split Payment / Host-Pays):** Hỗ trợ chia tiền tự động (mỗi người tự thanh toán phần của mình qua MoMo / VNPAY / thẻ) hoặc Trưởng nhóm trả toàn bộ.
6. **Vé điện tử độc lập (Individual E-Tickets):** Sau khi hoàn tất, mỗi thành viên nhận mã vé và mã QR riêng để tự soát vé tại rạp.

---

## 🏗️ 3. Cấu trúc Dự Án

```
galaxy together/
├── backend/
│   ├── database/
│   │   ├── schema.sql              # DDL 10 bảng thực thể & Unique Index chống trùng ghế
│   │   └── database.py             # SQLite/Postgres connection & SeatRepository
│   ├── domain/
│   │   ├── types.py                # Enums, Dataclasses & Domain Exceptions
│   │   ├── group_session.py        # GroupSession Entity & State Machine
│   │   └── group_member.py         # GroupMember Entity & State Machine
│   ├── tests/
│   │   ├── test_session_state.py   # 7 Tests kiểm thử vòng đời GroupSession
│   │   ├── test_member_state.py    # 7 Tests kiểm thử vòng đời GroupMember
│   │   └── test_seat_locking.py    # 3 Tests kiểm thử Concurrency khóa ghế
│   └── run_tests.py                # Test Runner tự động
├── docs/
│   ├── phase_0_discovery_report.md # Khảo sát kỹ thuật hệ thống Galaxy Cinema
│   └── phase_1_domain_and_database_foundation.md # Thiết kế chi tiết CSDL & State Machine
├── files/
│   ├── GALAXY_TOGETHER_DESIGN_CONCEPT.md # Tài liệu Product Concept & UX Journey
│   ├── GALAXY_TOGETHER_DESIGN_SYSTEM.md  # Quy chuẩn Design System & Member Tokens
│   ├── GALAXY_TOGETHER_IMPLEMENTATION_PLAN.md # Kế hoạch triển khai 12 Phase
│   └── index.html                  # Interactive Prototype (10 màn hình + thanh mô phỏng)
└── README.md
```

---

## 🚦 4. Tiến Độ Triển Khai (Progress Roadmap)

- [x] **Concept & Design System:** Hoàn thành tài liệu Concept, Design System và Prototype tương tác 10 màn hình.
- [x] **Phase 0 — Discovery & Technical Validation:** Khảo sát toàn diện hệ thống Galaxy Cinema (API REST v2, CSDL, Seat Hold, F&B, Cổng thanh toán, Vé QR).
- [x] **Phase 1 — Domain & Database Foundation:** 
  - Hoàn thành DDL CSDL với ràng buộc duy nhất `uq_active_seat_hold` chặn triệt để xung đột ghế.
  - Xây dựng State Machine cho `GroupSession` và `GroupMember`.
  - Vượt qua **17/17 automated tests (100% Passed)**.
- [ ] **Phase 2 — Group Session Backend API:** Xây dựng REST API tạo nhóm, mời bạn bè, tham gia và rời phòng.
- [ ] **Phase 3 — Group Session Frontend:** Kết nối giao diện Create Group, Invite, Lobby.
- [ ] **Phase 4 — Realtime Collaboration:** Triển khai WebSocket Server đồng bộ trạng thái phòng và chọn ghế.
- [ ] **Phase 5 — Shared Seat Booking:** Sơ đồ ghế realtime và xử lý tranh chấp ghế.
- [ ] **Phase 6 — Individual F&B:** Giỏ hàng bắp nước riêng và bảng tổng hợp nhóm.
- [ ] **Phase 7 — Payment Orchestration:** Tích hợp Split-Pay & Host-Pays với cổng thanh toán.
- [ ] **Phase 8 — Ticket & Confirmation:** Xuất vé điện tử riêng cho từng thành viên.

---

## 🧪 5. Hướng Dẫn Chạy Thử Nghiệm

### 5.1. Trải nghiệm Prototype Giao diện
Mở tệp [`files/index.html`](files/index.html) trực tiếp trên bất kỳ trình duyệt nào (Chrome, Safari, Edge) để trải nghiệm toàn bộ luồng 10 màn hình đặt vé nhóm trên khung điện thoại di động kèm thanh **"🎮 Mô phỏng"**.

### 5.2. Chạy Bộ Kiểm Thử Tự Động Backend
Yêu cầu Python 3.10+ (không cần cài đặt thư viện bên ngoài):

```bash
# Di chuyển vào thư mục dự án
cd "galaxy together"

# Chạy test suite
python backend/run_tests.py
```

**Kết quả kỳ vọng:**
```
Ran 17 tests in 0.021s
OK
```

---
*Dự án thực hiện bởi Team Hihihaha — Ops Hackathon 2026.*
