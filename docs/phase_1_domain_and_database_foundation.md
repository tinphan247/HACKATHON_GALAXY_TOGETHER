# BÁO CÁO THIẾT KẾ & TRIỂN KHAI (PHASE 1 — DOMAIN & DATABASE FOUNDATION)
## DỰ ÁN: GALAXY TOGETHER (Ý TƯỞNG YT-0032 — OPS HACKATHON 2026)

> **Trọng tâm Phase 1:** Thiết lập toàn bộ nền tảng Cơ sở dữ liệu (Database Schema DDL), Mô hình miền (Domain Models), Máy trạng thái (State Machines) cho Phiên nhóm (`GroupSession`) & Thành viên (`GroupMember`), và Cơ chế khóa ghế nguyên tử chống xung đột (Concurrency Seat Locking).  
> **Trạng thái:** **HOÀN THÀNH 100% — PASSED 17/17 AUTOMATED TESTS**

---

## 1. Tổng quan & Danh mục Mã nguồn Đã Tạo

Toàn bộ mã nguồn của Phase 1 được tổ chức trong thư mục `galaxy together/backend/`:

| Tệp tin | Vai trò / Chức năng | Đường dẫn liên kết |
|---|---|---|
| `schema.sql` | Script DDL định nghĩa 10 bảng thực thể, khóa ngoại và index | [schema.sql](file:///d:/dh/hackathon/galaxy%20together/backend/database/schema.sql) |
| `types.py` | Định nghĩa Enums, Dataclasses và các Domain Exceptions | [types.py](file:///d:/dh/hackathon/galaxy%20together/backend/domain/types.py) |
| `group_session.py` | Entity & State Machine cho vòng đời phiên đặt vé nhóm | [group_session.py](file:///d:/dh/hackathon/galaxy%20together/backend/domain/group_session.py) |
| `group_member.py` | Entity & State Machine cho từng thành viên tham gia | [group_member.py](file:///d:/dh/hackathon/galaxy%20together/backend/domain/group_member.py) |
| `database.py` | DB Connection, Migration Runner & `SeatRepository` khóa ghế | [database.py](file:///d:/dh/hackathon/galaxy%20together/backend/database/database.py) |
| `test_session_state.py` | 7 Unit tests kiểm thử vòng đời & ngoại lệ của `GroupSession` | [test_session_state.py](file:///d:/dh/hackathon/galaxy%20together/backend/tests/test_session_state.py) |
| `test_member_state.py` | 7 Unit tests kiểm thử vòng đời, đổi ghế, thử lại thanh toán của `GroupMember` | [test_member_state.py](file:///d:/dh/hackathon/galaxy%20together/backend/tests/test_member_state.py) |
| `test_seat_locking.py` | 3 Tests kiểm thử tính nguyên tử, khóa ghế đồng thời và nhả ghế | [test_seat_locking.py](file:///d:/dh/hackathon/galaxy%20together/backend/tests/test_seat_locking.py) |
| `run_tests.py` | Script thực thi toàn bộ test suite tự động | [run_tests.py](file:///d:/dh/hackathon/galaxy%20together/backend/run_tests.py) |

---

## 2. Thiết kế Cơ sở Dữ liệu Chi tiết (Database Schema DDL)

Cơ sở dữ liệu được thiết kế tương thích với cả **PostgreSQL** và **SQLite/In-Memory**, đảm bảo tính toàn vẹn dữ liệu thông qua Foreign Keys, Enums, Checks và Unique Constraints.

```
                    ┌─────────────────────────┐
                    │      group_sessions     │
                    │  (Phiên đặt vé nhóm)    │
                    └────────────┬────────────┘
                                 │ 1:N
         ┌───────────────────────┼───────────────────────┐
         │ 1:1                   │ 1:N                   │ 1:1
         ▼                       ▼                       ▼
   ┌───────────┐         ┌───────────────┐        ┌──────────────┐
   │  invites  │         │ group_members │        │group_bookings│
   │ (QR/Code) │         │ (Thành viên)  │        │ (Đơn vé tổng)│
   └───────────┘         └───────┬───────┘        └──────┬───────┘
                                 │                       │ 1:N
                 ┌───────────────┼───────────────┐       ▼
                 │ 1:N           │ 1:N           │ 1:N ┌───────────────┐
                 ▼               ▼               ▼     │ booking_items │
          ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │(Ghế xác nhận) │
          │ seat_holds  │ │ fnb_orders  │ │ payments │ └───────┬───────┘
          │(Khóa ghế đt)│ │ (Giỏ F&B)   │ │(Sub-pays)│         │ 1:1
          └─────────────┘ └──────┬──────┘ └──────────┘         ▼
                                 │ 1:N                   ┌─────────────┐
                                 ▼                       │   tickets   │
                          ┌──────────────┐               │(Vé QR riêng)│
                          │fnb_order_items               └─────────────┘
```

### 2.1. Danh mục 10 Bảng Thực thể

1. **`group_sessions` (Phiên đặt vé nhóm):**
   - Lưu trữ thông tin suất chiếu (`showtime_id`, `cinema_id`, `movie_title`, `show_date`, `show_time`, `screen_name`), thông tin Trưởng nhóm (`host_user_id`), tên nhóm, số lượng thành viên tối đa (2–8) và chế độ thanh toán (`split` hoặc `host_pays`).
   - Thời gian đếm ngược của phiên được kiểm soát qua trường `expires_at` (đồng bộ với thời gian hold ghế của Galaxy Cinema).

2. **`group_members` (Thành viên phiên nhóm):**
   - Lưu trữ thông tin từng người tham gia, vai trò (`host` hoặc `member`), vị trí màu định danh (`m1` đến `m8`, trong đó Host mặc định là `m1` - Cam Galaxy).
   - Trường `sub_order_id`: Ánh xạ trực tiếp tới `orderId` của API Galaxy Cinema để thực hiện thanh toán chia tiền độc lập.
   - Ràng buộc: `UNIQUE (group_session_id, user_id)` tránh 1 user join 2 lần vào 1 nhóm.

3. **`invites` (Mã mời & QR):**
   - Mã nhóm ngẫu nhiên 6 ký tự không trùng lặp (`code`, ví dụ: `GTH-471`).
   - Payload mã QR có chữ ký số để quét tham gia trực tiếp.

4. **`seat_holds` (Khóa ghế nguyên tử chống bán trùng):**
   - Lưu các ghế đang được giữ hoặc đã bán.
   - **Ràng buộc duy nhất (Unique Partial Index):**
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS uq_active_seat_hold 
     ON seat_holds (showtime_id, seat_id) 
     WHERE status IN ('held', 'sold');
     ```
     Đây là lá chắn kỹ thuật quan trọng nhất của dự án: Bất kỳ nỗ lực nào nhằm giữ một ghế đã có trạng thái `held` hoặc `sold` trong cùng một suất chiếu (`showtime_id`) đều bị Database Engine từ chối ngay lập tức ở mức phần cứng/giao dịch.

5. **`fnb_orders` & `fnb_order_items` (Bắp nước từng người):**
   - Mỗi thành viên sở hữu 1 `fnb_orders` độc lập gắn với `sub_order_id`.
   - Giúp bảng tổng hợp F&B nhóm (Group F&B Summary) chỉ là một câu truy vấn `SELECT` đọc dữ liệu tổng hợp, ngăn chặn triệt để tình trạng mua trùng bắp nước.

6. **`payments` (Thanh toán con Sub-order):**
   - Quản lý các giao dịch thanh toán thành phần theo mô hình `split` hoặc gộp theo `host_pays`.
   - Lưu `gateway_ref` trả về từ MoMo / VNPAY / ZaloPay / ShopeePay.

7. **`group_bookings`, `booking_items` & `tickets` (Vé điện tử riêng biệt):**
   - `group_bookings`: Đại diện cho đơn đặt vé nhóm đã xác nhận thành công.
   - `booking_items`: Từng vị trí ghế của từng người.
   - `tickets`: Vé điện tử độc lập cấp cho từng người gồm `ticket_code`, `qr_payload`, `qr_url` để mỗi người tự quét mã vào rạp.

---

## 3. Kiến trúc Máy Trạng Thái (State Machines)

### 3.1. GroupSession State Machine
Quản lý trạng thái từ lúc Trưởng nhóm khởi tạo đến khi cả nhóm nhận vé:

```
[CREATED] 
    │  (Host điền thông tin nhóm)
    ▼
[WAITING_FOR_MEMBERS] 
    │  (Bắt đầu chọn ghế -> Server kích hoạt đếm ngược expires_at)
    ▼
[SELECTING] 
    │  (Tất cả thành viên đã chốt ghế & F&B)
    ▼
[PAYMENT] 
    │  (Tất cả các giao dịch thanh toán thành công)
    ▼
[CONFIRMED]
```

*Các nhánh ngoại lệ:*
- `CANCELLED`: Chỉ Trưởng nhóm (`host_user_id`) mới có quyền kích hoạt; chuyển sang trạng thái hủy và giải phóng ghế.
- `EXPIRED`: Kích hoạt tự động khi thời gian hiện tại vượt quá `expires_at` mà chưa thanh toán xong.
- `FAILED`: Kích hoạt khi có thành viên thanh toán thất bại và hết thời gian chờ thử lại.

### 3.2. GroupMember State Machine
Quản lý trạng thái của từng thành viên trong phiên:

```
[INVITED] 
    │  (Quét QR / Nhập mã code)
    ▼
[JOINED] 
    │  (Vào sơ đồ ghế)
    ▼
[SELECTING_SEAT] ◄────┐ (Bỏ chọn hết ghế)
    │                 │
    ▼ (Giữ ≥ 1 ghế)   │
[SEAT_SELECTED] ──────┘
    │  ▲ (Quay lại đổi ghế)
    │  │
    ▼  │ (Vào chọn combo)
[SELECTING_FNB]
    │  (Xác nhận giỏ hàng -> gán sub_order_id)
    ▼
[PAYMENT_PENDING] ◄───┐
    │                 │ (Thử lại khi lỗi)
    ├─────────────────┴─► [PAYMENT_FAILED]
    ▼ (Thanh toán thành công)
[PAID]
    │ (Phiên nhóm đạt CONFIRMED)
    ▼
[CONFIRMED] (Nhận vé điện tử riêng)
```

*Xử lý tình huống đặc biệt:*
- **Thành viên rời nhóm (`LEFT`):** Giải phóng toàn bộ `seat_holds` và giỏ F&B của người đó, thông báo cho nhóm.
- **Thanh toán thất bại & Thử lại:** Trạng thái chuyển từ `PAYMENT_PENDING` sang `PAYMENT_FAILED`, cho phép bấm thanh toán lại (`retry_payment`) mà không bị mất ghế đang giữ cho đến khi hết hạn phiên.

---

## 4. Cơ chế Khóa Ghế Nguyên Tử (Atomic Seat Locking)

Triển khai tại `SeatRepository` trong [database.py](file:///d:/dh/hackathon/galaxy%20together/backend/database/database.py):

```python
def hold_seat(self, hold_id, showtime_id, seat_id, seat_code, ...):
    query = """
    INSERT INTO seat_holds (
        id, showtime_id, seat_id, seat_code, seat_type,
        price, group_session_id, group_member_id, status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'held', ?)
    """
    try:
        with self.conn:
            self.conn.execute(query, (...))
    except sqlite3.IntegrityError as e:
        # Bắt lỗi vi phạm ràng buộc UNIQUE của DB và chuyển hóa thành ngoại lệ nghiệp vụ
        raise SeatConflictError(seat_id=seat_id, showtime_id=showtime_id) from e
```

Khi 2 thành viên (ví dụ: Tín và Minh) cùng bấm chọn ghế `G08` trong cùng 1 tích tắc:
1. Giao dịch của người đến trước (ví dụ: Tín) chèn bản ghi thành công $\rightarrow$ ghế đổi sang màu của Tín.
2. Giao dịch của người thứ hai (Minh) vi phạm ràng buộc `uq_active_seat_hold` $\rightarrow$ DB lập tức hủy giao dịch và ném `SeatConflictError`.
3. Phía API/Frontend sẽ bắt lỗi này và hiển thị thông báo thân thiện: *"Ghế G08 vừa được người khác chọn"*.

---

## 5. Báo Cáo Kiểm Thử Tự Động (Automated Test Execution)

Bộ test suite bao gồm 17 ca kiểm thử chuyên sâu được thực thi tự động qua [run_tests.py](file:///d:/dh/hackathon/galaxy%20together/backend/run_tests.py):

```bash
$ python "d:\dh\hackathon\galaxy together\backend\run_tests.py"
```

### Kết quả chi tiết từng ca kiểm thử:

```
test_create_host_member (test_member_state.TestGroupMember.test_create_host_member) ... ok
test_create_invited_member (test_member_state.TestGroupMember.test_create_invited_member) ... ok
test_member_back_and_forth_selection (test_member_state.TestGroupMember.test_member_back_and_forth_selection) ... ok
test_member_happy_path_lifecycle (test_member_state.TestGroupMember.test_member_happy_path_lifecycle) ... ok
test_member_invalid_transitions (test_member_state.TestGroupMember.test_member_invalid_transitions) ... ok
test_member_leaving (test_member_state.TestGroupMember.test_member_leaving) ... ok
test_member_payment_failure_and_retry (test_member_state.TestGroupMember.test_member_payment_failure_and_retry) ... ok
test_atomic_seat_hold_success (test_seat_locking.TestSeatLocking.test_atomic_seat_hold_success) ... ok
test_concurrent_seat_conflict_detection (test_seat_locking.TestSeatLocking.test_concurrent_seat_conflict_detection) ... ok
test_seat_release_allows_reclaim (test_seat_locking.TestSeatLocking.test_seat_release_allows_reclaim) ... ok
test_host_cancellation (test_session_state.TestGroupSession.test_host_cancellation) ... ok
test_invalid_transitions (test_session_state.TestGroupSession.test_invalid_transitions) ... ok
test_session_capacity_bounds (test_session_state.TestGroupSession.test_session_capacity_bounds) ... ok
test_session_creation (test_session_state.TestGroupSession.test_session_creation) ... ok
test_session_empty_name (test_session_state.TestGroupSession.test_session_empty_name) ... ok
test_session_expiration (test_session_state.TestGroupSession.test_session_expiration) ... ok
test_valid_session_lifecycle (test_session_state.TestGroupSession.test_valid_session_lifecycle) ... ok

----------------------------------------------------------------------
Ran 17 tests in 0.021s

OK (100% PASSED)
```

---

## 6. Kết luận & Sẵn sàng cho Phase 2

1. **Toàn vẹn kiến trúc:** Phase 1 đã cung cấp một nền tảng CSDL và State Machine hoàn chỉnh, độc lập, không phụ thuộc vào bất kỳ framework bên ngoài nào, sẵn sàng triển khai trên môi trường Production.
2. **Sẵn sàng cho Phase 2 (Group Session Backend API):**
   - Xây dựng REST API (`POST /group-sessions`, `POST /invites/:code/join`, `POST /leave`, `GET /group-sessions/:id`).
   - Tích hợp trực tiếp các models và state machine này vào tầng API Controller.
