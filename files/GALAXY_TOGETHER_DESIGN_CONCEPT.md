# GALAXY TOGETHER — DESIGN CONCEPT

> Extension of Galaxy Cinema. Not a new app.
> "Đi cùng nhau. Đặt cùng nhau. Mỗi người tự quyết định và tự thanh toán."

---

## 1. Product Vision

Galaxy Together chuyển mô hình đặt vé nhóm từ **"một người đặt cho cả nhóm"** sang **"cả nhóm cùng tham gia một phiên đặt vé"**.

```
BEFORE                              AFTER
Zalo/Messenger                      Create Group
 ↓ 20–40 phút bàn bạc                ↓
Một người đặt                       Share QR
 ↓                                   ↓
Một người trả                       Everyone joins
 ↓                                   ↓
Hỏi từng người ăn gì                Everyone chooses seat
 ↓                                   ↓
Tính lại tiền                       Everyone chooses F&B
 ↓                                   ↓
Nhắc chuyển khoản                   Everyone pays their part
 ↓                                   ↓
Có thể mua trùng combo              Everyone gets their ticket
```

Không phá vỡ mental model booking hiện tại — Galaxy Together là **evolution**, không phải rebuild:

```
Showtime → Create Group → Group Session → Shared Seat → Countdown
→ Individual F&B → Individual Payment → Group Confirmation
```

---

## 2. User Journey (Primary Flow)

```
HOME → MOVIE → SHOWTIME
   ↓
"Đặt một mình" [hoặc] "Tạo nhóm xem phim"
   ↓
CREATE GROUP (tên nhóm, số thành viên, chế độ thanh toán)
   ↓
GROUP CREATED → SHARE INVITE (QR + mã nhóm)
   ↓
GROUP LOBBY (member status realtime)
   ↓
SHARED SEAT MAP (mỗi người chọn ghế, thấy ghế người khác realtime)
   ↓
INDIVIDUAL F&B (giỏ hàng riêng, group summary chống mua trùng)
   ↓
PAYMENT (split hoặc organizer-pays, progress bar nhóm)
   ↓
GROUP CONFIRMED
   ↓
INDIVIDUAL E-TICKETS
```

This is exactly the flow implemented in the interactive prototype (`galaxy-together/index.html`), 10 screens, fully clickable, no dead ends.

---

## 3. Screen Architecture

| # | Screen | Core job |
|---|--------|----------|
| 0 | Home | Entry point; "Galaxy Together" strip introduces the feature without replacing normal booking |
| 1 | Showtime | Unchanged Galaxy UI + two CTAs: "Đặt một mình" / "Tạo nhóm xem phim" |
| 2 | Create Group | Group name, expected member count, payment mode — 3 fields, no more |
| 3 | Invite | QR + 6-char invite code + copy/share + live member preview |
| 4 | Group Lobby | Realtime member join status; session info card; entry to seat map |
| 5 | Shared Seat Map | **Wow Moment #1** — one seat matrix, per-member color ownership, group seat summary dock |
| 6 | F&B (Individual Cart) | Each member's own combo cart + group F&B summary (single source of truth) |
| 7 | Payment | **Wow Moment #2** — split payment, per-member pay button, group progress bar |
| 8 | Group Confirmed | Aggregated summary: seats, F&B, member roster |
| 9 | E-Ticket | Individual ticket, QR, other members' ticket status |

---

## 4. Key UX Decisions & Rationale

### Why Group Session (not "Booking + Group button")?
Because the pain isn't "can't invite friends" — it's that one person becomes a de facto *booking manager*. A Group Session is a first-class object (members, shared seat map, individual carts, payment status) that the whole flow orbits around, so no single person has to hold the state in their head or their Zalo thread.

### Why Shared Seat Map (not individual seat pickers)?
Seat coordination failure ("F10 taken while we were still discussing") only exists because people were choosing *blind* to each other. Showing one seat matrix with live per-member ownership removes the blind spot — everyone sees the same room state at the same time.

### Why Individual Cart (not one shared cart)?
People have different budgets and appetites. A shared cart forces negotiation ("who's paying for whose popcorn?"). Individual carts let each person add exactly what they want — while the Group F&B Summary still gives the group (and the organizer) one place to see the whole order, preventing duplicate combo purchases.

### Why Split Payment (not organizer-pays-only)?
Organizer-pays-all is kept as an option (for families, treats, etc.) but split payment is the headline feature because it removes the single biggest friction point in the current flow: one person fronting money and chasing repayment. Each member pays exactly their share, at the moment of booking, not after.

### Why Persistent Countdown (carried across all steps)?
The seat hold timer already exists in Galaxy Cinema and must not reset — a group session adds *more* steps (join, seat, F&B, pay per member), so the timer has to survive all of them without restarting, otherwise groups would routinely lose their seats mid-flow.

### Why Member Status (Joined / Selecting / Paid...)?
This replaces the organizer manually asking "did you pick a seat yet?" in the group chat. Visible status is what lets a group self-coordinate without a designated coordinator.

### Why a Group Payment Dashboard?
Split payment only works if everyone can see progress. A progress bar + per-member state (paid / pending) turns "did everyone pay?" from a manual head-count into a glance.

### Why Individual E-Tickets?
Because each person now owns their own seat and paid for it themselves — giving them their own ticket (not one ticket the organizer holds) matches the new ownership model and is what they'd expect at the door.

---

## 5. Interaction States & Edge Cases

| State | Behavior |
|---|---|
| Member hasn't joined | Dashed avatar placeholder, pulsing "Chờ tham gia..." |
| Member selecting seat | Yellow "Đang chọn ghế..." status |
| Seat taken by someone else in real time | Seat immediately renders in that member's color; toast notification |
| Countdown < 60s | Banner pulses (urgent state), no color change beyond animation |
| Countdown hits 0, member unpaid | Their seat is released; **already-paid members are never affected** |
| Payment fails / pending | Neutral gray "Chưa trả ◌" pill, not alarming red, until deadline pressure |
| All members paid | Progress bar hits 100%, CTA unlocks, confirmation toast |
| Member leaves | (Documented pattern) "Huy đã rời nhóm — Ghế G12 đã được trả lại" |

---

## 6. Component Architecture

```
GalaxyHeader              (existing) — circular back button + title
CountdownBar              (existing, extended) — persists across group steps
GroupSessionHeader        (new) — navy strip: group name + movie/cinema/showtime
MemberAvatar              (new) — colored circle + initial, one color per member
MemberStatus              (new) — pill: joined / selecting / paid / pending
GroupMemberList           (new) — vertical list of MemberAvatar + MemberStatus
SharedSeatMap             (existing seat matrix, extended) — per-member seat color
GroupSeatSummary          (new) — bottom dock: one row per member, seats chosen
ComboCard                 (existing) — F&B card, unchanged visual language
PersonalCart              (new) — "Đang chọn cho: [Name]" context strip
GroupFnbSummary           (new) — read-only rollup of every member's order
PaymentStatusRow          (new) — per-member row: amount + pay button/paid state
PaymentProgress           (new) — progress bar + "X / Y người đã thanh toán"
GroupConfirmation         (new) — navy summary card + stats row
ETicket                   (existing ticket style, extended) — QR + group context tag
BottomActionBar           (existing) — unchanged pattern, reused everywhere
```

All new components inherit color tokens, radii, typography and spacing from the existing Galaxy Cinema system — none introduce new visual language.

---

## 7. Success Criteria

A person looking at the prototype for ~10 seconds should be able to say:

1. This is still Galaxy Cinema.
2. This is a group booking feature.
3. Friends can join together.
4. Everyone sees the same seat map.
5. Everyone picks their own seat.
6. Everyone picks their own F&B.
7. Everyone can pay for themselves.
8. The organizer no longer has to front the money.
9. The countdown protects seat inventory.
10. Everyone ends up with their own ticket.

---

## 8. Demo Path (Hackathon storytelling)

```
01 Tạo nhóm → 02 QR xuất hiện → 03 Bạn bè join → 04 Member avatars xuất hiện
→ 05 Shared seat map → 06 Hai người cùng chọn ghế (sim buttons)
→ 07 Mỗi người chọn F&B → 08 Split payment → 09 Payment progress
→ 10 Group confirmed → 11 Individual tickets
```

The prototype includes a black "🎮 Mô phỏng" simulation bar on the Lobby, Seat Map and Payment screens specifically so this path can be demoed live on a single device without a backend.
