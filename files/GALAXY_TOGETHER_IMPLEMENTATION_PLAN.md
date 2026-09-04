# GALAXY TOGETHER — IMPLEMENTATION PLAN

> Source artifacts read in full before writing this plan:
> `GALAXY_TOGETHER_DESIGN_CONCEPT.md`, `GALAXY_TOGETHER_DESIGN_SYSTEM.md`, `galaxy-together/index.html` (HTML+CSS+JS, single-file, no backend, `window.state` object, vanilla `goTo()` screen-swap navigation, `setInterval`-based countdowns, hardcoded mock seat/member/payment data, a black "🎮 Mô phỏng" simulation bar standing in for realtime).
>
> This is an **implementation blueprint**, not a redesign. No UI, design tokens, or prototype files are modified by this document.

---

## 1. Executive Summary

The prototype proves the UX: one Group Session, one shared seat map, individual F&B carts, split or organizer payment, individual e-tickets. It is a static, single-device, single-file HTML/CSS/JS mock with **no backend, no persistence, no real concurrency, no real payment, and no real realtime** — every "realtime" event in the prototype is a local DOM mutation triggered by a simulation button, not a network event.

Turning this into a production feature requires building, from zero:
1. A Group Session domain model and its backend services.
2. Real seat inventory locking with concurrency guarantees.
3. A real realtime transport (WebSocket/SSE) replacing the simulation bar.
4. Individual F&B ordering wired to real inventory/pricing.
5. A payment orchestration layer supporting both organizer-pays and split-pay, including partial-failure handling.
6. Server-authoritative countdown/expiration replacing the frontend `setInterval` timer.
7. Individual ticket issuance and QR validation.
8. Full test, security, observability, and phased rollout on top of the **existing** Galaxy Cinema booking system, without regressing Solo Booking.

This plan sequences that work into 12 phases with explicit dependencies, acceptance criteria, and a Definition of Done. Anything about the existing Galaxy Cinema backend (current stack, DB, payment provider, auth, ticketing system) is **UNKNOWN** from the artifacts provided and is flagged as a Phase 0 discovery item rather than assumed.

---

## 2. Current State

| Area | Status | Evidence |
|---|---|---|
| Product concept | DONE | `GALAXY_TOGETHER_DESIGN_CONCEPT.md` — journey, screens, rationale |
| UX/UI design system | DONE | `GALAXY_TOGETHER_DESIGN_SYSTEM.md` — tokens, components, states |
| Clickable prototype | DONE | `index.html` — 10 screens, static Vietnamese demo data |
| Frontend framework/architecture | NOT STARTED | Prototype is vanilla JS with global `state` object and manual DOM manipulation; no component framework, no router, no API layer |
| Backend services | NOT STARTED | No server code exists in any artifact |
| Database | NOT STARTED | No schema exists; prototype data is hardcoded in `<script>` |
| Realtime infrastructure | NOT STARTED | Prototype uses `onclick`-triggered local state mutation (`simSeatStep`, `simPay`, `simLobbyStep`) as a stand-in |
| Authentication | UNKNOWN | Not present in prototype; existing Galaxy Cinema app presumably has its own auth — not documented here |
| Payment integration | NOT STARTED | Prototype `makePay()`/`simPay()` just flips a boolean; no gateway, no real money movement |
| F&B inventory/pricing | PARTIAL | Prototype has 4 hardcoded combos with fixed prices; no inventory, no dynamic pricing, no backend source of truth |
| Ticketing | PARTIAL | Prototype renders a static visual QR (decorative divs, not a real QR-encodable payload) and static ticket fields |
| Seat inventory / hold locking | NOT STARTED | Prototype seat states (`sold`, `available`, member colors) are a static array (`soldSeats`) with no lock, no TTL, no persistence |
| Testing | NOT STARTED | No automated tests in any artifact |
| Deployment | NOT STARTED | Prototype is a static file with no build pipeline |
| Monitoring | NOT STARTED | No logging/metrics in any artifact |
| Existing Galaxy Cinema backend/DB/payment stack | UNKNOWN | Not described in any provided document — must be confirmed in Phase 0 |
| Existing Galaxy Cinema auth system | UNKNOWN | Same as above |
| Existing Galaxy Cinema ticketing/QR system | UNKNOWN | Same as above |

---

## 3. Product Scope

In scope for Galaxy Together as a production feature (per Design Concept §2–3):
- Group Session creation, invite (QR + code), join.
- Shared realtime seat map with per-member seat ownership.
- Individual F&B carts + group F&B summary (anti-duplication).
- Two payment modes: organizer-pays-all, split-pay-per-member.
- Server-controlled seat hold countdown spanning seat → F&B → payment.
- Individual e-ticket issuance per member.
- Coexistence with existing Solo Booking flow (no regression).

Out of scope for this plan (not specified in source artifacts, flagged for future discovery):
- In-app chat between group members.
- Group booking history / "book again" for past groups.
- Loyalty points / promotions applied at group level.
- Cross-cinema or cross-showtime group sessions.
- Non-Vietnamese localization (prototype is Vietnamese-only; no i18n architecture exists).

---

## 4. Prototype → Production Gap Analysis

### Product
| Gap | Prototype | Needed for Production |
|---|---|---|
| Group Session lifecycle | Implicit — screens just navigate forward; no persisted session state | Explicit server-owned state machine (§8) |
| Member lifecycle | Hardcoded 4 members (Tín/Minh/An/Huy), toggled via sim buttons | Real invite → join → per-member state tracked server-side |
| Group size limit | Stepper allows 2–8 in Create Group screen, but seat map/UI is hand-built for exactly 4 | Dynamic UI for 2–8 (or whatever max is chosen) + enforced server-side cap |
| Host/member permissions | None — every user sees the same static screen, no role distinction in code | Host-only actions (e.g., cancel group, remind to pay) vs member actions must be authorized server-side |
| Session expiration | Countdown is a client `setInterval` with no consequence when it hits 0 | Server-side expiry job that releases holds and updates session state |
| Member leaving | Documented only in the design docs ("Huy đã rời nhóm..."), not implemented in prototype | Leave endpoint + seat/F&B release + notification |
| Group cancellation | Not present | Explicit cancel flow + refund handling for already-paid members |

### Booking
| Gap | Prototype | Needed for Production |
|---|---|---|
| Seat inventory | Static JS array `soldSeats` | Real inventory tied to showtime, decremented on confirmed sale |
| Seat hold | None — clicking a seat just recolors a `<div>` | Server-side hold record with TTL |
| Seat locking / concurrency | None — two browser tabs on the prototype can "select" the same seat with no conflict | Atomic locking (§10) |
| Race conditions | Not applicable (no backend) | Must be designed for from day one |
| Seat expiration | Countdown UI only, no seat release logic | Expiry job releasing unpaid holds |

### Realtime
| Gap | Prototype | Needed for Production |
|---|---|---|
| Transport | None — `sim*()` functions mutate local DOM directly | WebSocket or SSE (§11) |
| Presence | Static "2/4 joined" text | Live presence tracking |
| Seat/F&B/payment sync across devices | Not possible (single device, single tab) | Server broadcast to all session participants |
| Reconnection | Not applicable | Must handle drop/reconnect without losing state |

### F&B
| Gap | Prototype | Needed for Production |
|---|---|---|
| Individual cart | 4 hardcoded combos, quantities stored in local `state.comboQty`, always attributed to "Tín" | Per-member persisted cart tied to session + member ID |
| Inventory | None | Backend combo catalog with pricing/availability, likely from existing F&B system |
| Duplicate prevention | Manual, via a read-only "Group F&B Summary" card | Same UX pattern, but backed by real aggregated data across members |

### Payment
| Gap | Prototype | Needed for Production |
|---|---|---|
| Host pays all | Radio option exists in Create Group screen but has no distinct downstream screen logic | Full flow: single charge covering all members' items |
| Split payment | `makePay()`/`simPay()` flips booleans, no real transaction | Real gateway integration, one charge per member |
| Payment timeout | Not implemented | Tied to server-side session expiry |
| Payment failure | Not modeled (payment always "succeeds" in prototype) | Explicit failure state + retry + seat release rule |
| Partial payment | Bottom bar disables the final CTA until `paidCount >= 4`, but this is purely a UI gate | Must be enforced server-side, with correct handling of "3 of 4 paid, 1 timed out" |
| Refund | Not present | Required for cancellations / partial-group failures |

### Ticket
| Gap | Prototype | Needed for Production |
|---|---|---|
| Individual ticket | Static HTML card with decorative QR grid | Real ticket record + real scannable QR payload |
| Group booking record | Implied but not modeled | Must persist as a distinct entity linking all member bookings |
| QR | Decorative `<div>` grid, not an actual encoded QR | Real QR generation + signature/validation |
| Ticket validation at cinema | Not present | Must integrate with existing box-office/scanner system (UNKNOWN — discovery needed) |
| Cancellation/refund | Not present | Needed for member-leaves and group-cancel cases |

### Security
| Gap | Prototype | Needed for Production |
|---|---|---|
| Invite link/code | Static string `"GTH-471"` shown to everyone, no expiry, no validation | Must be treated as a low-trust identifier only (§17) |
| Authorization | None — anyone who opens the file sees the "Tín" (host) view | Server-side session membership checks on every action |
| Payment security | N/A (no real payment) | PCI-scope handling via gateway, no card data touching Galaxy servers |
| QR security | N/A (decorative) | Signed/expiring QR payload to prevent forgery |
| Rate limiting | None | Needed on join/invite endpoints to prevent brute-force code guessing |

### Operations
| Gap | Prototype | Needed for Production |
|---|---|---|
| Admin/BQL visibility into group bookings | Not present | New admin view needed (likely extending existing booking admin tools — UNKNOWN) |
| Support tooling for payment troubleshooting | Not present | Needed given split-payment partial-failure cases |
| Seat conflict handling for staff | Not present | Needed for box-office edge cases |
| Audit log | Not present | Needed for payment disputes |

### Monitoring
All metrics in Design Concept §7/Design System are UI-facing progress indicators, not instrumentation. None of `group_session_creation_rate`, `join_rate`, `booking_conversion`, `payment_failure_rate`, `timeout_rate`, `realtime_connection_errors` exist anywhere in the prototype. All must be built from scratch (§20).

---

## 5. MVP Definition

### Must Have
- Create Group Session (name, expected member count, payment mode).
- Invite via code + QR; join via code/QR/link.
- Shared seat map with real-time-visible per-member seat holds (WebSocket-backed).
- Atomic seat hold with server TTL; no double-booking under concurrent selection.
- Individual F&B cart per member, drawn from real combo catalog.
- Group F&B summary (read-only rollup) to address the duplicate-purchase pain point.
- Split payment (each member pays their own items) via the existing/chosen payment gateway.
- Organizer-pays-all as an alternate mode.
- Server-side countdown/expiration with automatic release of unpaid seats.
- Individual e-ticket with a real, scannable QR per member, only after their payment succeeds.
- Solo Booking flow unaffected (regression-tested).

### Should Have
- Member leave handling (seat/F&B release, group notified).
- Payment reminder (push/in-app notification to unpaid members).
- Host cancels group session (with refund for already-paid members).
- Basic admin visibility into active group sessions for support/BQL.

### Could Have
- Group booking history ("book again with the same group").
- In-session lightweight chat or reactions.
- Auto-suggest adjacent seats for members who haven't chosen yet.
- Loyalty point accrual at group level.

### Out of Scope (MVP)
- Cross-cinema / cross-showtime sessions.
- Non-VND currency / i18n.
- Group-level promotions or coupon stacking logic.
- Social sharing beyond QR/code/link (e.g., direct Zalo/Messenger API integration).

---

## 6. System Architecture

### Frontend
- **Architecture:** Component-based SPA (framework choice — UNKNOWN, depends on the existing Galaxy Cinema app's stack; recommend re-using whatever the current production app already uses rather than introducing a second frontend stack). The prototype's flat `goTo(screenId)` show/hide pattern must be replaced with real routing (screen ↔ route ↔ session-state mapping) so that a joining member can deep-link straight into an active Group Session (e.g., via QR).
- **State management:** A single Group Session store (client-side) hydrated from the backend on load and kept in sync via realtime events — replacing the prototype's single global `state` object, which currently exists only in one browser tab and is never persisted or shared.
- **API layer:** Typed REST (or GraphQL — UNKNOWN, follow existing convention) client with retry/backoff for non-realtime calls (create session, submit F&B, initiate payment).
- **Realtime client:** WebSocket (or SSE, see §11) client that subscribes to a session channel on entering Lobby/Seat/F&B/Payment screens and unsubscribes on leaving.
- **Error handling:** Every prototype screen currently assumes success (no loading/empty/error states exist in the HTML). Production must add, per screen: loading skeleton, empty state (e.g., "no members joined yet" already partially exists visually but has no real empty-data trigger), and explicit error states (seat conflict, payment failure, session expired, connection lost).

### Backend
Recommended service boundaries (can be modules within a modular monolith or separate services — decision depends on existing Galaxy Cinema backend architecture, which is UNKNOWN):
- **Group Session Service** — owns session + member lifecycle, invite codes.
- **Seat/Booking Service** — owns seat inventory, holds, locking; likely extends the *existing* Solo Booking seat service rather than duplicating it, since seat inventory must be shared between Solo and Together bookings for the same showtime.
- **F&B Service** — owns combo catalog, per-member cart, group order rollup; likely wraps the *existing* F&B/concessions system.
- **Payment Service** — orchestrates host-pay and split-pay against the chosen payment gateway(s); must support "N independent charges belonging to one logical booking."
- **Ticket Service** — issues individual tickets/QR once a member's payment (or the host's payment covering them) succeeds; likely extends the *existing* ticketing system.
- **Notification Service** (recommended, not confirmed as existing) — invite shares, join alerts, payment reminders, timeout warnings.

### Database
Minimum entities (map onto existing tables where equivalents already exist — do not assume greenfield):

| Entity | Purpose | Key fields | Relationship | Ownership | Lifecycle |
|---|---|---|---|---|---|
| `User` | Existing Galaxy Cinema account | id, name, phone/email | 1—N GroupMember | Existing auth system (UNKNOWN) | Pre-existing |
| `GroupSession` | Root object for a Together booking | id, showtime_id, host_user_id, name, payment_mode, status, expires_at | 1—N GroupMember, 1—1 GroupBooking | Owned by host | See §8 |
| `GroupMember` | A participant in a session | id, group_session_id, user_id, role (host/member), status | N—1 GroupSession | Owned by GroupSession | See §9 |
| `Invite` | Join credential for a session | id, group_session_id, code, qr_payload, expires_at, max_uses/uses | 1—1 GroupSession | Owned by GroupSession | Created with session, expires with it |
| `Movie`, `Cinema`, `Showtime` | Existing catalog entities | — | Showtime N—1 Movie, N—1 Cinema | Existing system | Pre-existing |
| `Seat` | Physical seat definition per auditorium | id, cinema_room_id, row, number, type (single/vip/couple) | N—1 CinemaRoom | Existing system | Pre-existing |
| `SeatHold` | Temporary claim on a seat for a showtime | id, showtime_id, seat_id, group_member_id (nullable for solo), held_at, expires_at, status | N—1 Seat, N—1 Showtime, N—1 GroupMember | Owned by holder | Created on select, resolved to sold/released |
| `GroupBooking` | Confirmed aggregate booking for the session | id, group_session_id, status, total_amount | 1—1 GroupSession, 1—N BookingItem | Owned by GroupSession | Created on confirmation |
| `BookingItem` | A single seat's confirmed booking line, per member | id, group_booking_id, group_member_id, seat_id, price | N—1 GroupBooking, N—1 GroupMember | Owned by member | Created on payment success |
| `FnbOrder` | A member's combo order within the session | id, group_session_id, group_member_id, status | N—1 GroupMember | Owned by member | Draft → submitted → paid |
| `FnbOrderItem` | Line item within an FnbOrder | id, fnb_order_id, combo_id, quantity, unit_price | N—1 FnbOrder | Owned by FnbOrder | Immutable once order submitted |
| `Payment` | A single charge (one per member in split mode, one for host in host-pay mode) | id, group_session_id, group_member_id (nullable if host-pay), amount, status, gateway_ref | N—1 GroupSession | Owned by payer | pending → success/failed |
| `Ticket` | Individual issued ticket | id, booking_item_id, fnb_order_id (nullable), qr_payload, status | 1—1 BookingItem | Owned by member | Issued on payment success, valid → used/cancelled |

### Realtime
See §11 — proposed as a dedicated architecture section given its cross-cutting nature.

---

## 7. Domain Model

The entity table in §6 is the authoritative domain model for this plan. Two relationships deserve explicit callout because they are the crux of "shared inventory, individual ownership":

- `Seat` is a shared resource across **all** booking types (Solo and Together) for a given `Showtime` — `SeatHold` and `BookingItem` must be the single source of truth Solo Booking also writes to, or the two flows will be able to double-sell a seat.
- `FnbOrder`/`Payment` are always scoped to exactly one `GroupMember`, never to the `GroupSession` directly — this is what makes "individual cart, group visibility" possible: the group summary is a *query* across members' orders, not a shared mutable cart.

---

## 8. Group Session State Machine

```
CREATED
   ↓ (host completes Create Group form)
WAITING_FOR_MEMBERS
   ↓ (host proceeds, or configured min-members reached)
SELECTING            ← seat + F&B selection window, countdown running
   ↓ (all required seats held + all required F&B submitted)
PAYMENT
   ↓ (all required payments succeed)
CONFIRMED
```

Terminal / error states, reachable from `WAITING_FOR_MEMBERS`, `SELECTING`, or `PAYMENT`:
```
EXPIRED     — countdown hit 0 before PAYMENT completed
CANCELLED   — host explicitly cancelled
FAILED      — payment could not be completed for required members within the allowed window
```

| Transition | Actor | Validation | Side effect | Rollback |
|---|---|---|---|---|
| `CREATED → WAITING_FOR_MEMBERS` | Host | Showtime still on sale; member count within allowed range | Invite generated | Delete session if invite generation fails |
| `WAITING_FOR_MEMBERS → SELECTING` | Host (manual "proceed") or system (auto once min members joined — decision needed, see Open Questions) | At least host + host's own seat intent present | Countdown starts server-side; `expires_at` set | Revert to `WAITING_FOR_MEMBERS` if countdown-start fails |
| `SELECTING → PAYMENT` | System, once every member with a held seat has a non-empty (possibly zero-item) F&B submission | All held seats still valid (not expired) | Payment records created per member (split) or one for host (host-pay) | If payment-record creation fails, remain in `SELECTING` |
| `PAYMENT → CONFIRMED` | System, on last required payment success | All required `Payment` rows = success | `GroupBooking`, `BookingItem`, `Ticket` rows created transactionally (§13) | DB transaction rollback; session stays in `PAYMENT` |
| `* → EXPIRED` | System (expiry job) | `now() > expires_at` and not yet `CONFIRMED` | Release all unpaid `SeatHold`s; mark unpaid `Payment`s cancelled; notify group | N/A — terminal |
| `* → CANCELLED` | Host | Host role verified | Release all holds; refund any completed payments (§12) | N/A — terminal |
| `PAYMENT → FAILED` | System, if a required member's payment fails and is not retried before expiry | N/A | Same as EXPIRED for unpaid members; already-paid members' bookings stand (per Design Concept "already-paid members are never affected") | N/A — terminal |

---

## 9. Member State Machine

```
INVITED
  ↓ (opens invite link/QR/code)
JOINED
  ↓ (enters seat map)
SELECTING_SEAT
  ↓ (holds ≥1 seat)
SEAT_SELECTED
  ↓ (enters F&B screen)
SELECTING_FNB
  ↓ (submits cart, possibly empty)
PAYMENT_PENDING
  ↓ (own payment succeeds)
PAID
  ↓ (GroupSession reaches CONFIRMED)
CONFIRMED
```

Side branches:
- `SELECTING_SEAT`/`SEAT_SELECTED` → `LEFT` (member leave action) → releases their `SeatHold`s and any draft `FnbOrder`, notifies remaining members.
- `PAYMENT_PENDING` → `PAYMENT_FAILED` → member may retry (returns to `PAYMENT_PENDING`) up to session expiry, after which their line reverts to `EXPIRED` and their seat is released without blocking other members' `CONFIRMED` status.

This matches the Design Concept's `MemberStatus` pill states (`Joined / Selecting / Paid / Pending`) directly — no new UI concepts are introduced, only backend enforcement of what the UI already visualizes.

---

## 10. Seat Concurrency Strategy

**Problem restated:** Tín and Minh both tap seat G8 within the same second. The prototype has no answer to this because it has no shared server state — each browser tab is its own universe. Production must guarantee exactly one of them can hold G8.

**Approach:**
1. **Unit of locking:** one row per `(showtime_id, seat_id)` in `SeatHold`, with a unique constraint on `(showtime_id, seat_id)` where `status IN ('held', 'sold')`. This turns "seat is taken" into a database-enforced invariant rather than an application-level check.
2. **Locking mechanism:** pessimistic row lock (`SELECT ... FOR UPDATE`) inside a short transaction for the hold-creation path is the safer default over optimistic locking, because seat selection is a low-frequency, low-contention-per-seat, high-cost-of-error operation (a mis-issued double hold means a booking dispute at the box office). Optimistic locking (version column + retry) is an acceptable alternative if the existing Solo Booking seat service already uses it — reuse whatever pattern is already proven in production rather than introducing a second concurrency strategy for the same table (UNKNOWN — confirm in Phase 0).
3. **Atomicity:** the hold-creation endpoint must, in one transaction: (a) verify no active hold/sold row exists for the seat, (b) insert the new `SeatHold` with `expires_at`, (c) commit. The losing concurrent request must receive a deterministic `409 Conflict` — not a silent overwrite — so the frontend can show "Ghế G8 vừa được người khác chọn" (already a documented error state in the Design Concept).
4. **TTL:** every `SeatHold` carries `expires_at` = session `expires_at` (not a per-seat independent timer) so all holds within a session expire together, matching the "one countdown across the whole group" UX. A background sweep job (or lazy expiry check on read) transitions expired holds to `released`.
5. **Idempotency:** the hold-creation request must accept a client-generated idempotency key so a retried network request (e.g., after a timeout on the member's phone) cannot create a duplicate hold for the same member/seat pair.
6. **Cross-flow consistency:** because `SeatHold` is shared with Solo Booking (§16), the same locking rule applies whether the competing request comes from another Together member or a completely unrelated Solo Booking user — the seat table does not need to know which flow is asking.

---

## 11. Realtime Architecture

```
Member's Client (Seat/Lobby/Payment screen)
   ↓ subscribe(group_session_id)
Realtime Gateway (WebSocket, or SSE if bi-directional push isn't otherwise needed)
   ↓
Group Session Service (publishes on state change)
   ↓ broadcast to all subscribed clients for that session
Other Members' Clients
```

**Transport choice:** WebSocket is recommended over SSE because the client also needs to *send* low-latency actions (seat tap) in the same channel model as receiving updates from others, and because presence (who's currently connected) is native to WebSocket connection lifecycle. SSE remains a fallback if the existing infrastructure already standardizes on it — UNKNOWN, confirm in Phase 0.

**Events** (replacing every `sim*()` function in the prototype with a real server-pushed equivalent):

| Event | Producer | Payload | Consumer | Side effect on client |
|---|---|---|---|---|
| `GROUP_MEMBER_JOINED` | Group Session Service | member id, name, avatar color slot | All session subscribers | Update Lobby member list (replaces `simLobbyStep`) |
| `GROUP_MEMBER_LEFT` | Group Session Service | member id | All session subscribers | Remove from list, release their seats visually |
| `SEAT_HELD` | Seat/Booking Service | seat id, member id, color | All session subscribers | Recolor seat cell (replaces `simSeatStep`) |
| `SEAT_RELEASED` | Seat/Booking Service | seat id | All session subscribers | Revert seat cell to available |
| `SEAT_SELECTED` | Seat/Booking Service | (alias of `SEAT_HELD` if "select" and "hold" are the same action in this product; kept separate only if a future two-step select-then-confirm flow is added) | — | — |
| `FNB_UPDATED` | F&B Service | member id, order summary | All session subscribers | Update Group F&B Summary card |
| `PAYMENT_STARTED` | Payment Service | member id | All session subscribers | Show "Đang xử lý..." for that member's row |
| `PAYMENT_SUCCESS` | Payment Service | member id, amount | All session subscribers | Flip that member's pay button to "✓ Đã trả" (replaces `simPay`), update progress bar |
| `PAYMENT_FAILED` | Payment Service | member id, reason | All session subscribers | Show retry affordance for that member |
| `GROUP_CONFIRMED` | Group Session Service | booking id | All session subscribers | Navigate to Confirmed screen |
| `GROUP_EXPIRED` | Group Session Service (expiry job) | reason | All session subscribers | Show expiry modal, navigate back to showtime selection |

**Reconnection:** on reconnect, the client must re-fetch full session state via REST (not just resume the socket) to reconcile any events missed while disconnected — the socket stream is a convenience layer, not the source of truth. Source of truth is always the database via the REST/query layer.

**Multiple devices per member:** out of scope for MVP (assume one active device per member); flagged as a Should-Have follow-up if the existing Galaxy Cinema account system supports multi-device sessions.

---

## 12. Payment Architecture

### Host Pays All
```
GroupSession (payment_mode = host_pays)
   ↓
Single Payment record, group_member_id = host
   ↓ gateway charge for sum(all members' seats + all members' F&B)
   ↓ success
GroupBooking confirmed → BookingItem + Ticket created for every member
```

### Split Payment
```
GroupSession (payment_mode = split)
   ↓
One Payment record per member, amount = that member's seats + their own F&B
   ↓ each member independently completes gateway charge
   ↓ GroupSession watches: all required Payments = success?
   → yes → GroupBooking confirmed, Tickets issued for all members
   → no (some still pending, none failed, time remains) → wait
```

### Explicit case: mixed outcome before expiry
```
Tín   PAID
Minh  PAID
An    FAILED
Huy   PENDING
```
Rule (derived from Design Concept's "already-paid members are never affected"):
- Tín and Minh's `BookingItem`/`Ticket` are **not** created yet — `GroupBooking` confirmation is all-or-nothing for the *required* member set at the moment of confirmation, but their successful `Payment` and `SeatHold` are preserved and are **not released** while the session is still within its expiry window.
- An gets a retry affordance; failure does not immediately release An's seat — only expiry does, to avoid punishing a single transient gateway failure.
- Huy remains pending; his `SeatHold` also survives until expiry.
- At expiry: any member without a `success` `Payment` has their `SeatHold` released and their line marked `EXPIRED`. **Tín and Minh, being already paid, must still get their `BookingItem`/`Ticket` created** — i.e., group confirmation is **not** strictly all-or-nothing at expiry time; it degrades to "confirm whoever paid, release whoever didn't." This is a **business rule requiring explicit product sign-off** before implementation (flagged in Open Questions §29) because it changes "GroupBooking confirmed" from a single atomic event to a partial-confirmation-at-expiry event.

### Refund
Needed when: host cancels a session after some members already paid; a member leaves after paying; a booking is disputed at the box office. Refund flow must call the gateway's refund API per `Payment` record and transition the corresponding `Ticket` to `cancelled`. Refund policy (full/partial, time-based cutoffs) is a business decision — UNKNOWN, needs product input.

---

## 13. Timeout & Expiration

The prototype's countdown (`startCountdown()`, three independent `setInterval` calls per screen, reset to hardcoded values like 480/380/315 seconds on each screen load) is purely decorative and must not survive into production as the source of truth.

**Production model:**
```
GroupSession.expires_at   (set once, at SELECTING start; single value for the whole session)
        ↓
Client countdown = local display timer seeded from expires_at, re-synced on every realtime event and on reconnect
```

On timeout (server-side expiry job, not client `setInterval`):
```
For each GroupMember without a successful Payment:
    → release their SeatHold(s)
    → cancel their draft/submitted FnbOrder
    → mark their member state EXPIRED
    → emit GROUP_EXPIRED-scoped notification to the group
Members who already paid: BookingItem/Ticket created per §12's mixed-outcome rule (pending sign-off)
```

The client-side countdown UI (banner, urgent-pulse under 60s) is pure presentation and can be kept exactly as designed — only its data source changes from a local timer to a server-provided `expires_at` timestamp.

---

## 14. API Plan

Indicative REST surface (adjust to existing API conventions — UNKNOWN):

| Method | Endpoint | Purpose | Auth | Idempotency |
|---|---|---|---|---|
| POST | `/group-sessions` | Create session (Create Group screen) | User session required | Client idempotency key |
| GET | `/group-sessions/:id` | Fetch full session state (hydrate on load/reconnect) | Member of session | N/A (read) |
| POST | `/group-sessions/:id/invite` | (Re)issue invite code/QR | Host only | N/A |
| POST | `/invites/:code/join` | Join via code/QR | User session required | Yes — repeated join is a no-op if already a member |
| POST | `/group-sessions/:id/leave` | Member leaves | Member of session | Yes |
| POST | `/group-sessions/:id/seats/hold` | Attempt to hold a seat | Member of session | Client idempotency key, required (§10) |
| DELETE | `/group-sessions/:id/seats/:seatId` | Release own held seat | Member who holds it | Yes |
| GET | `/group-sessions/:id/seats` | Current seat map state | Member of session | N/A (read) |
| POST | `/group-sessions/:id/fnb` | Submit/update own F&B cart | Member of session | Yes |
| GET | `/group-sessions/:id/fnb-summary` | Group F&B rollup | Member of session | N/A (read) |
| POST | `/group-sessions/:id/payment` | Initiate own payment (split) or host payment (host-pay) | Member of session (self only, unless host-pay) | Client idempotency key, required |
| GET | `/group-sessions/:id/payment-status` | Poll fallback if socket unavailable | Member of session | N/A (read) |
| POST | `/group-sessions/:id/payment/:paymentId/retry` | Retry a failed payment | Owning member | Client idempotency key |
| POST | `/group-sessions/:id/remind` | Host sends payment reminder | Host only | Rate-limited |
| POST | `/group-sessions/:id/cancel` | Host cancels session | Host only | Yes |
| GET | `/group-sessions/:id/confirm-status` | Poll for final confirmation | Member of session | N/A (read) |
| GET | `/tickets/:ticketId` | Fetch individual ticket for display | Owning member | N/A (read) |

Each endpoint requires: request/response schema definition, validation rules (e.g., seat belongs to the session's showtime; F&B combo belongs to active catalog; payment amount matches server-computed total, never client-supplied), and defined error codes (`409` seat conflict, `410` session expired, `403` not a member/not host, `422` invalid state transition) — to be specified in detail during Phase 2/API design, not fully enumerated here pending Phase 0 confirmation of existing API conventions.

---

## 15. Frontend Implementation Plan

| Prototype screen | Production feature | API | Realtime event(s) | New states needed |
|---|---|---|---|---|
| Home | Together entry point | Existing home/listing API + feature flag check | — | Flag-off fallback (hide strip) |
| Showtime | Group booking CTA | Existing showtime API | — | Disable "Tạo nhóm" if showtime not eligible (e.g., sold out) |
| Create Group | `POST /group-sessions` | — | Loading (submit), error (validation, showtime unavailable) |
| Invite | Session + invite fetch | `GET /group-sessions/:id`, `POST .../invite` | `GROUP_MEMBER_JOINED` | Loading (QR generation), error (invite creation failed) |
| Lobby | Realtime member presence | `GET /group-sessions/:id` | `GROUP_MEMBER_JOINED`, `GROUP_MEMBER_LEFT` | Empty (0 joined besides host), reconnecting |
| Seat Map | Realtime seat state | `GET .../seats`, `POST .../seats/hold`, `DELETE .../seats/:seatId` | `SEAT_HELD`, `SEAT_RELEASED` | Seat conflict error (409), session-expired redirect |
| F&B | Individual cart | `POST .../fnb`, `GET .../fnb-summary` | `FNB_UPDATED` | Loading (submit), error (combo unavailable) |
| Payment | Payment orchestration | `POST .../payment`, `GET .../payment-status`, retry endpoint | `PAYMENT_STARTED/SUCCESS/FAILED` | Processing, failed+retry, partial-group-paid |
| Confirmed | Booking result | `GET .../confirm-status` | `GROUP_CONFIRMED` | Partial-confirmation display (per §12 mixed-outcome rule) |
| E-ticket | Ticket retrieval | `GET /tickets/:ticketId` | — | Loading, "not yet issued" (if own payment still pending) |

Cross-cutting frontend work not visible per-screen: global session-expired interceptor (any screen), global reconnect banner, and a route guard that redirects a member into the correct screen based on their current server-side `MemberState` (so refreshing the page or opening the link late doesn't desync them from the group).

---

## 16. Backend Implementation Plan

Backend tasks are written at "ready for a developer to pick up" granularity, grouped by service.

### Group Session Service
- [ ] Implement `POST /group-sessions`: validate showtime is bookable, validate member-count bounds, create `GroupSession` row in `CREATED`, transition to `WAITING_FOR_MEMBERS`, generate and persist `Invite`.
- [ ] Implement invite code generation: collision-checked short code (e.g., 6 alphanumeric chars), plus a signed QR payload distinct from the human-readable code (§17).
- [ ] Implement `POST /invites/:code/join`: validate invite not expired/exhausted, validate session not already `CONFIRMED`/`EXPIRED`/`CANCELLED`, create `GroupMember` row, emit `GROUP_MEMBER_JOINED`.
- [ ] Implement `POST /group-sessions/:id/leave`: validate not host (or define host-leaves rule — Open Question), release member's `SeatHold`s and draft `FnbOrder`, emit `GROUP_MEMBER_LEFT`.
- [ ] Implement session state machine transitions (§8) as an explicit, testable state module — not scattered `if` checks across endpoints.
- [ ] Implement expiry sweep job (cron or scheduled worker): find sessions past `expires_at` still in `SELECTING`/`PAYMENT`, apply §13 release logic, apply §12 mixed-outcome confirmation rule.
- [ ] Implement `POST /group-sessions/:id/cancel`: host-only, trigger refunds for paid members (§12), release all holds, emit cancellation notification.

### Seat/Booking Service
- [ ] Implement atomic `SeatHold` creation with the locking strategy in §10, including the unique-constraint-based conflict rejection.
- [ ] Implement idempotency-key handling on the hold endpoint.
- [ ] Implement `DELETE .../seats/:seatId` for self-release (deselecting a seat before payment).
- [ ] Implement shared-inventory integration point with existing Solo Booking seat service so both flows read/write the same `SeatHold`/seat-sold state (coordination task — depends on Phase 0 discovery of the existing service).
- [ ] Implement seat-map read endpoint returning per-seat status (available/held-by-whom/sold) scoped to the requesting member's session.

### F&B Service
- [ ] Implement combo catalog read (likely proxy/wrap existing F&B system rather than duplicate pricing data).
- [ ] Implement `POST .../fnb`: create/update a member's `FnbOrder` + `FnbOrderItem`s, validate combo availability and pricing server-side (never trust client-submitted price).
- [ ] Implement `GET .../fnb-summary`: aggregate query across all members' `FnbOrder`s for the session.

### Payment Service
- [ ] Implement per-member `Payment` record creation for split mode; single host-scoped `Payment` for host-pay mode.
- [ ] Integrate with chosen/existing payment gateway (UNKNOWN — Phase 0).
- [ ] Implement webhook/callback handler for async gateway confirmation, updating `Payment.status` and emitting `PAYMENT_SUCCESS`/`PAYMENT_FAILED`.
- [ ] Implement retry endpoint reusing the same `Payment` record (or superseding it) without creating duplicate charges (idempotency key required).
- [ ] Implement the mixed-outcome expiry rule from §12 as an explicit, tested function.
- [ ] Implement refund invocation for cancel/leave-after-payment cases.

### Ticket Service
- [ ] Implement transactional `GroupBooking` + `BookingItem` + `Ticket` creation (§13's DB transaction).
- [ ] Implement real QR payload generation (signed, containing booking/ticket identifiers) replacing the prototype's decorative QR grid.
- [ ] Implement ticket validation endpoint for box-office/scanner integration (UNKNOWN target system — Phase 0).
- [ ] Implement ticket cancellation for refund cases.

---

## 17. Database Implementation Plan

- [ ] Confirm whether Galaxy Cinema already has `User`, `Movie`, `Cinema`, `Showtime`, `Seat` tables (near-certain given it's a live app) and obtain their actual schema — do not create parallel tables (Phase 0 discovery, blocking).
- [ ] Design and migrate new tables: `GroupSession`, `GroupMember`, `Invite`, `SeatHold` (or extend existing seat-hold table if Solo Booking already has one — likely, since Solo Booking also has a countdown/hold mechanism per the base spec), `GroupBooking`, `BookingItem`, `FnbOrder`, `FnbOrderItem`, `Payment`, `Ticket` (or extend existing `Ticket` table with a `group_booking_id` nullable FK if one already exists for Solo Booking).
- [ ] Add the unique constraint described in §10 on active `SeatHold`/sold rows per `(showtime_id, seat_id)`.
- [ ] Add indices for hot paths: `GroupSession.expires_at` (expiry sweep), `GroupMember.(group_session_id, user_id)`, `SeatHold.(showtime_id, seat_id, status)`, `Payment.(group_session_id, group_member_id, status)`.
- [ ] Define retention/archival policy for `EXPIRED`/`CANCELLED` sessions (product/compliance decision — Open Question).

---

## 18. Security

- **Invite code vs. authorization:** the 6-character code (e.g. `GTH-471`) shown on-screen must be treated purely as a **discovery/convenience identifier**, never as a bearer credential. Joining via code must still create a `GroupMember` row tied to an authenticated `User` (existing Galaxy Cinema login) — the code alone must not grant any read/write access without that authenticated join step completing server-side.
- **Invite expiration:** invites expire with the session (or sooner, if product wants a shorter join window than the full booking window — Open Question).
- **Rate limiting:** join-by-code endpoint must be rate-limited per IP/account to prevent brute-forcing the 6-character space.
- **Authorization on every mutating endpoint:** every seat-hold, F&B-submit, and payment-initiate call must verify the caller is an active `GroupMember` of that specific session; every host-only action (cancel, remind, re-invite) must verify host role.
- **Payment security:** no card/payment-instrument data should ever be stored by Galaxy servers — delegate to the gateway's tokenization/hosted-fields flow (standard PCI-DSS scope reduction), consistent with however existing Solo Booking payment already works (Phase 0 discovery).
- **QR security:** ticket QR payload must be signed (e.g., HMAC or gateway-issued token) and time/venue-bound if the existing ticketing system supports it, to prevent screenshot-and-reuse forgery — mirror whatever anti-forgery approach the existing Solo Booking ticket QR already uses (UNKNOWN, Phase 0).
- **Abuse prevention:** cap on concurrent active `GroupSession`s per host account to prevent seat-hold spam/inventory griefing.

---

## 19. Testing Strategy

**Unit**
- Group Session state machine transitions (all valid/invalid transitions from §8).
- Member state machine transitions (§9).
- Seat hold conflict logic (constraint violation → correct `409` mapping).
- Payment total calculation (seats + F&B, per member vs. host-pay aggregate).
- F&B pricing calculation from server-side catalog, ignoring any client-supplied price.
- Expiry sweep logic, including the §12 mixed-outcome rule.

**Integration**
- Create group → invite generated → join succeeds → member appears in session state.
- Hold seat → appears in seat-map read for all members.
- Submit F&B → appears in group F&B summary.
- Initiate split payment → webhook callback → `Payment.status` updates → `PAYMENT_SUCCESS` emitted.
- Full confirmation → `GroupBooking`/`BookingItem`/`Ticket` created transactionally.

**E2E** (matches the Design Concept's demo path almost exactly, now driven by real accounts/devices instead of the sim bar):
```
Host creates group → Member 2 joins → Member 3 joins → Member 4 joins
→ all select seats → each selects F&B → split payment
→ confirmation → individual tickets retrievable
```

**Concurrency (mandatory, not optional)**
- Two simulated clients issue a hold request for the same seat within the same request window; assert exactly one succeeds and the other receives `409`.
- Repeat under load (e.g., 20 concurrent hold attempts across a full seat map) to validate the locking strategy holds under contention, not just in the two-client case.

**Failure**
- Payment gateway returns failure → member sees retry, other members unaffected.
- Network disconnect during Seat screen → reconnect → client state reconciles via REST fetch, no duplicate holds created from replayed actions (idempotency key coverage).
- Member leaves mid-session → seat/F&B released, group notified, session continues for remaining members.
- Session expires with a mixed paid/unpaid group → assert §12's rule is applied exactly as specified.
- Duplicate/replayed requests (e.g., double-tap on "Pay") → assert idempotency key prevents duplicate charges.

**Regression**
- Full existing Solo Booking flow (showtime → seat → F&B → payment → ticket) must pass unchanged after Together's seat-locking changes are integrated into the shared `SeatHold` table — this is the single highest-risk regression surface in the entire project and should have dedicated regression coverage before Phase 5 (Shared Seat Booking) is considered done.

---

## 20. Observability

**Logs** (structured, one event per line, correlated by `group_session_id`):
```
group_session_created
member_joined
member_left
seat_held
seat_hold_conflict
seat_released
fnb_order_submitted
payment_started
payment_success
payment_failed
payment_retried
booking_confirmed
group_expired
group_cancelled
```

**Metrics**
```
group_session_creation_rate
group_join_rate                     (joins / invites sent)
group_booking_conversion             (CONFIRMED / CREATED)
booking_completion_time              (CREATED → CONFIRMED duration)
payment_success_rate
payment_timeout_rate
seat_conflict_rate                   (409s / hold attempts)
fnb_attach_rate                      (sessions with ≥1 non-empty FnbOrder / total)
realtime_connection_error_rate
realtime_reconnect_count
```

**Alerts** (minimum set):
- `seat_conflict_rate` spike — may indicate a locking bug, not just normal contention.
- `payment_success_rate` drop below baseline — gateway integration issue.
- `realtime_connection_error_rate` spike — infra/transport issue affecting the core "shared seat map" value prop.
- Expiry sweep job failure/latency — if it stops running, seats never get released back to inventory.

---

## 21. Implementation Phases

Phases are sequenced by business capability and dependency, not by architectural layer. Each is independently demoable.

## Phase 0 — Discovery & Technical Validation

### Objective
Resolve every UNKNOWN in §2/§4 before any Together-specific code is written.

### Business Outcome
Confidence that Together can be built on top of the existing system without duplicating or conflicting with it, especially seat inventory and payment.

### Scope
Read-only investigation of the existing Galaxy Cinema backend, DB, auth, payment, and ticketing systems.

### Tasks
#### Backend
- [ ] Document existing seat-hold/booking service API and schema.
- [ ] Document existing payment gateway integration and supported charge patterns (single charge only, or can it support N independent charges per logical order?).
- [ ] Document existing ticket/QR issuance and validation mechanism.
#### Database
- [ ] Obtain existing schema for `User`, `Movie`, `Cinema`, `Showtime`, `Seat`, existing seat-hold table, existing `Ticket` table.
#### Realtime
- [ ] Determine if any realtime infrastructure (WebSocket/SSE) already exists in the stack.
#### DevOps
- [ ] Confirm deployment/CI pipeline conventions for adding a new service or module.

### Dependencies
None — this is the entry point.

### Technical Decisions
- Whether Together is built as new services or as modules within the existing booking monolith.

### Deliverables
A discovery report resolving every row currently marked UNKNOWN in §2 and §4.

### Acceptance Criteria
No UNKNOWN rows remain for: seat locking mechanism in use today, payment gateway capabilities, ticket/QR system, realtime infra availability, auth mechanism.

### Risks
Existing systems may not support required capabilities (e.g., gateway may not support multi-charge-per-order) — if so, this phase must surface that early, not after Phase 7 is underway.

### Definition of Done
Discovery report reviewed and signed off by engineering lead before Phase 1 starts.

---

## Phase 1 — Domain & Database Foundation

### Objective
Stand up the new schema and shared-inventory integration point.

### Business Outcome
None user-visible yet; this is pure foundation.

### Scope
§17 tasks.

### Tasks
#### Database
- [ ] Migrate `GroupSession`, `GroupMember`, `Invite` tables.
- [ ] Migrate or extend `SeatHold` with the group-aware unique constraint (§10).
- [ ] Migrate `GroupBooking`, `BookingItem`, `FnbOrder`, `FnbOrderItem`, `Payment`.
- [ ] Migrate or extend `Ticket` with nullable `group_booking_id`.
#### Backend
- [ ] Implement domain models/entities for all new tables.
- [ ] Implement the state-machine module for `GroupSession` and `GroupMember` as standalone, unit-testable code (no HTTP layer yet).

### Dependencies
BLOCKING on Phase 0.

### Technical Decisions
Locking strategy confirmed (pessimistic vs. reuse of existing pattern) per §10.

### Deliverables
Migrated schema; passing unit tests for both state machines.

### Acceptance Criteria
State machine unit tests cover every transition and every invalid-transition rejection in §8/§9.

### Risks
Schema decisions made here are expensive to change later — get Phase 0 sign-off before migrating.

### Definition of Done
Migrations applied to a staging DB; state machine unit tests green in CI.

---

## Phase 2 — Group Session Backend

### Objective
Working create/invite/join API, no seat/F&B/payment yet.

### Business Outcome
A host can create a session and members can join it — demoable via API calls / Postman, not yet via UI.

### Scope
§16 "Group Session Service" tasks.

### Tasks
#### Backend
- [ ] `POST /group-sessions`
- [ ] `POST /group-sessions/:id/invite`
- [ ] `POST /invites/:code/join`
- [ ] `POST /group-sessions/:id/leave`
- [ ] `GET /group-sessions/:id`
#### Testing
- [ ] Integration tests: create → invite → join → leave.
#### DevOps
- [ ] Deploy to staging behind a feature flag (no frontend yet).

### Dependencies
BLOCKING on Phase 1.

### Deliverables
Deployed, testable Group Session API.

### Acceptance Criteria
A session can be created, joined by multiple accounts, and left, with correct state transitions, verified via integration tests.

### Risks
Invite code collision handling under load — test explicitly.

### Definition of Done
API deployed to staging; integration tests green; API documented (OpenAPI or equivalent).

---

## Phase 3 — Group Session Frontend (Create/Invite/Lobby)

### Objective
Real UI for Create Group, Invite, and Lobby screens wired to Phase 2's API — no seat map yet.

### Business Outcome
First end-to-end demoable slice: a host can create a real session and see real members join in the Lobby (via polling; realtime comes in Phase 4).

### Scope
Frontend implementation of prototype screens 2–4 (Create Group, Invite, Lobby) per §15, using REST polling as an interim stand-in for realtime.

### Tasks
#### Frontend
- [ ] Build Create Group screen against `POST /group-sessions`.
- [ ] Build Invite screen: real QR (encoding the signed invite payload, not decorative), real invite code from API.
- [ ] Build Lobby screen with polling-based member list refresh (interim, replaced in Phase 4).
- [ ] Add loading/error states per §15 for all three screens.
#### Testing
- [ ] E2E: create → invite displayed → second test account joins via code → appears in Lobby (polled).

### Dependencies
BLOCKING on Phase 2. PARALLEL with Phase 1/2's later hardening work if staffed separately.

### Deliverables
Deployed, internally-demoable Create/Invite/Lobby flow.

### Acceptance Criteria
A real host and a real second account, on two devices, can create and join a session, visible (with some polling delay) in the Lobby.

### Risks
QR payload format needs to be finalized here since it's user-visible; changing it later affects already-shared invites.

### Definition of Done
Deployed behind feature flag; E2E test green; product sign-off on Invite screen QR/code UX matching Design System.

---

## Phase 4 — Realtime Collaboration

### Objective
Replace polling with real WebSocket-based sync for Lobby, and lay the transport groundwork Seat/F&B/Payment will reuse.

### Business Outcome
Lobby updates instantly instead of on a poll interval — first real "wow moment" infrastructure in place.

### Scope
§11 in full, applied first to Lobby's `GROUP_MEMBER_JOINED`/`GROUP_MEMBER_LEFT` events.

### Tasks
#### Backend
- [ ] Implement realtime gateway (WebSocket server) and session-channel subscription model.
- [ ] Wire `GROUP_MEMBER_JOINED`/`GROUP_MEMBER_LEFT` emission into the Phase 2 join/leave endpoints.
#### Frontend
- [ ] Implement realtime client, replacing Lobby's polling with subscription.
- [ ] Implement reconnection-triggers-REST-refetch behavior (§11).
#### Testing
- [ ] Integration test: join event received by a second subscribed client within an acceptable latency bound.
- [ ] Failure test: forced disconnect → reconnect → state reconciles correctly.

### Dependencies
BLOCKING on Phase 3 (needs real Lobby to attach to). NON-BLOCKING relative to Phase 5–7's business logic, which can be developed in parallel and simply plug into this same channel once ready.

### Deliverables
Realtime-updated Lobby in staging.

### Acceptance Criteria
Two live devices see each other join without manual refresh, within a defined latency SLA (to be set — Open Question).

### Risks
This is new infrastructure if Phase 0 found none existing — budget extra time; do not underestimate operational complexity of WebSocket infra (scaling, sticky sessions/pub-sub fanout across server instances).

### Definition of Done
Realtime Lobby deployed to staging; reconnection test passes; latency SLA measured and documented.

---

## Phase 5 — Shared Seat Booking

### Objective
Real, concurrency-safe, realtime seat map — the product's core differentiator.

### Business Outcome
The "wow moment" from the Design Concept becomes real and safe: multiple members can select seats simultaneously with no double-booking, visible live to the whole group.

### Scope
§10 (concurrency) + §11's seat events + §15's Seat Map screen, fully replacing the prototype's `soldSeats` array and `sim*` seat functions.

### Tasks
#### Backend
- [ ] Implement atomic seat-hold creation per §10 (locking, TTL, idempotency key).
- [ ] Implement seat-release endpoint.
- [ ] Wire `SEAT_HELD`/`SEAT_RELEASED` realtime emission.
- [ ] Integrate with existing Solo Booking seat inventory per Phase 0 findings (shared `SeatHold`/sold state).
#### Frontend
- [ ] Build real seat map fetching live inventory, rendering per-member colors from real `GroupMember` data (not the hardcoded m1–m4 CSS classes tied to fixed names).
- [ ] Wire seat tap to hold-creation API with optimistic UI + rollback on `409`.
- [ ] Subscribe to `SEAT_HELD`/`SEAT_RELEASED` for live updates from other members.
- [ ] Implement seat-conflict error UI ("Ghế G8 vừa được người khác chọn").
#### Database
- [ ] Apply and load-test the unique constraint from §10.
#### Testing
- [ ] Concurrency test suite (§19) — mandatory before this phase can be marked done.
- [ ] Regression suite for Solo Booking seat flow, since it now shares the same table/locking path.

### Dependencies
BLOCKING on Phase 1 (schema) and Phase 4 (realtime transport). Concurrency work itself can start in PARALLEL with Phase 3/4 frontend work since it's backend-only until integration.

### Deliverables
Deployed, concurrency-tested, realtime shared seat map.

### Acceptance Criteria
Automated concurrency test (two simultaneous holds on the same seat) passes consistently across repeated runs; Solo Booking regression suite passes unchanged.

### Risks
**Highest-risk phase in the entire project.** A concurrency bug here means real double-sold seats and box-office disputes. Do not compress this phase's testing time.

### Definition of Done
Concurrency tests green in CI (not just once locally); Solo Booking regression green; seat map deployed to staging with two real devices verified live.

---

## Phase 6 — Individual F&B

### Objective
Real per-member F&B carts and group summary.

### Business Outcome
Addresses the documented duplicate-combo-purchase pain point with real data instead of the prototype's hardcoded summary text.

### Scope
§16 "F&B Service" tasks + §15's F&B screen.

### Tasks
#### Backend
- [ ] Implement combo catalog read (proxy existing F&B system or new catalog table if none exists — Phase 0 dependent).
- [ ] Implement `POST .../fnb` with server-side price/availability validation.
- [ ] Implement `GET .../fnb-summary` aggregation query.
- [ ] Wire `FNB_UPDATED` realtime emission.
#### Frontend
- [ ] Build real F&B screen against the catalog API, replacing the 4 hardcoded combos.
- [ ] Build real Group F&B Summary card from the aggregation endpoint, replacing hardcoded per-member text.

### Dependencies
BLOCKING on Phase 1. PARALLEL with Phase 5 — F&B has no seat-locking complexity and can be developed independently once schema exists.

### Deliverables
Deployed real F&B cart + group summary.

### Acceptance Criteria
Two members submitting different combos both appear correctly, in real time, in the group summary card.

### Risks
Pricing drift if F&B catalog isn't the single source of truth shared with existing concessions ordering — must not duplicate price data.

### Definition of Done
Deployed to staging; integration test covers multi-member F&B submission and summary aggregation.

---

## Phase 7 — Payment

### Objective
Real payment orchestration for both host-pay and split-pay modes.

### Business Outcome
The other headline feature — real, per-person payment — becomes functional, including the hardest edge case (§12's mixed outcome).

### Scope
§12 in full + §16 "Payment Service" tasks + §15's Payment screen.

### Tasks
#### Backend
- [ ] Implement `Payment` record creation for both modes.
- [ ] Integrate gateway per Phase 0 findings.
- [ ] Implement webhook/callback handling.
- [ ] Implement retry endpoint with idempotency.
- [ ] Implement the mixed-outcome expiry rule (requires product sign-off per §12 — do not implement ahead of that decision).
- [ ] Implement refund invocation.
- [ ] Wire `PAYMENT_STARTED`/`PAYMENT_SUCCESS`/`PAYMENT_FAILED` realtime emission.
#### Frontend
- [ ] Build real Payment screen: per-member pay buttons wired to the API, real progress bar from live `Payment` states, replacing `makePay()`/`simPay()`.
- [ ] Build failure/retry UI.
#### Testing
- [ ] Failure-mode tests from §19 (gateway failure, mixed outcome, duplicate charge prevention).

### Dependencies
BLOCKING on Phase 1, Phase 5 (needs final seat totals), Phase 6 (needs final F&B totals) — payment amounts are computed from both. BLOCKING on product sign-off for the mixed-outcome rule.

### Deliverables
Deployed real payment flow for both modes.

### Acceptance Criteria
Split-payment E2E test (§19) passes with real gateway sandbox; mixed-outcome scenario produces the product-approved result exactly.

### Risks
Gateway sandbox/production parity issues; the mixed-outcome business rule is a genuine open design question, not just an engineering detail — escalate early, don't let it block the whole phase silently.

### Definition of Done
Deployed to staging with gateway sandbox; all §19 payment-related failure tests green; product sign-off obtained on mixed-outcome behavior.

---

## Phase 8 — Ticket & Confirmation

### Objective
Real transactional booking confirmation and individual ticket issuance.

### Business Outcome
Members receive real, scannable tickets — the flow's actual deliverable to the customer.

### Scope
§13 (transaction) + §16 "Ticket Service" tasks + §15's Confirmed/E-ticket screens.

### Tasks
#### Backend
- [ ] Implement the transactional `GroupBooking`/`BookingItem`/`Ticket` creation per §13.
- [ ] Implement real QR payload generation and signing.
- [ ] Implement ticket validation endpoint integration with existing box-office system (Phase 0 dependent).
#### Frontend
- [ ] Build real Confirmed screen from `GET .../confirm-status`.
- [ ] Build real E-ticket screen from `GET /tickets/:ticketId`, rendering an actual scannable QR (replacing the decorative CSS grid).
#### Testing
- [ ] E2E full-flow test including ticket retrieval and (if a sandbox scanner is available) validation.

### Dependencies
BLOCKING on Phase 7.

### Deliverables
Deployed end-to-end bookable, ticketable Together flow.

### Acceptance Criteria
A confirmed group booking produces one real, individually-scannable ticket per paid member.

### Risks
Integration with box-office scanning hardware/software is likely the least-controlled dependency in this plan (Phase 0 UNKNOWN) — validate this early within the phase, not at the end.

### Definition of Done
Full E2E flow (create → join → seat → F&B → pay → confirm → ticket) passes in staging with real accounts; ticket format validated against existing scanning system.

---

## Phase 9 — Security & Reliability Hardening

### Objective
Close the gaps identified in §18 before any real users are exposed.

### Business Outcome
Reduced risk of invite abuse, unauthorized access, payment fraud, and QR forgery.

### Scope
§18 in full.

### Tasks
#### Backend
- [ ] Rate limiting on join/invite endpoints.
- [ ] Full authorization audit across every mutating endpoint.
- [ ] QR signing/anti-forgery verification.
- [ ] Session-per-host concurrency cap.
#### Testing
- [ ] Security test pass: attempt join with expired/invalid code, attempt action as non-member, attempt replayed/forged QR.

### Dependencies
BLOCKING on Phase 8 (needs full flow to test against). Can start SOONER in parallel as a checklist applied incrementally per endpoint as each phase ships, rather than strictly waiting — recommended as ongoing hardening alongside Phases 2–8, with this phase as the final audit gate.

### Deliverables
Security audit report + fixes applied.

### Acceptance Criteria
No critical/high findings open at phase close.

### Risks
Security issues found late are expensive — treat this phase's checklist as a running gate on every prior phase's Definition of Done, not a one-time bolt-on.

### Definition of Done
Security audit signed off by whoever owns security review for the existing Galaxy Cinema platform.

---

## Phase 10 — Testing & Performance

### Objective
Full regression, load, and performance validation before pilot.

### Business Outcome
Confidence the system holds up under real concurrent group traffic and peak-hour load, and that Solo Booking is unaffected.

### Scope
§19 in full, plus load/performance testing not otherwise covered.

### Tasks
#### Testing
- [ ] Full regression suite run (Solo Booking + Together).
- [ ] Load test: peak-hour showtime with multiple concurrent group sessions competing for the same seat map.
- [ ] Load test: realtime gateway under many concurrent connected sessions.
- [ ] Performance baseline: booking-completion-time metric under load vs. target.

### Dependencies
BLOCKING on Phase 8/9.

### Deliverables
Test report with pass/fail against defined thresholds.

### Acceptance Criteria
No regression in Solo Booking; realtime and seat-locking hold correctness under load (not just correctness under the small concurrency test from Phase 5 — this phase scales it up).

### Risks
Load characteristics are hard to predict without real traffic data — treat pilot (Phase 11) as the real validation and keep this phase's thresholds conservative.

### Definition of Done
Test report reviewed; no blocking regressions; go/no-go decision made for pilot.

---

## Phase 11 — Pilot & Rollout

### Objective
Controlled, monitored release.

### Business Outcome
Real-world validation of conversion, adoption, and operational load before full rollout.

### Scope
§25 rollout strategy.

### Tasks
#### DevOps
- [ ] Feature flag configured for staged rollout (internal → limited cinema → limited user % → full).
- [ ] Monitoring dashboards live (§20 metrics) before first real user traffic.
- [ ] Rollback procedure documented and tested (flag flip + in-flight session handling).
#### Product
- [ ] Baseline metrics captured pre-pilot (§24 — "TBD, measure before pilot" is resolved here).
- [ ] Success criteria for advancing each rollout stage defined and agreed.

### Dependencies
BLOCKING on Phase 9/10.

### Deliverables
Staged production rollout with monitoring.

### Acceptance Criteria
Each rollout stage's success criteria met before advancing to the next; no critical incidents.

### Risks
Real users behave unpredictably compared to test scenarios — keep the pilot stage small and monitored long enough to catch issues before wider exposure.

### Definition of Done
Full rollout reached, or a documented decision to pause/rollback with reasons.

---

## Phase 12 — Optimization

### Objective
Post-launch refinement based on real usage data.

### Business Outcome
Improve conversion, reduce payment timeout rate, reduce support load — using real metrics rather than assumptions.

### Scope
Data-driven; specific tasks depend on Phase 11 findings (e.g., if `payment_timeout_rate` is high, investigate countdown duration or gateway UX friction; if `seat_conflict_rate` is high, investigate UI affordances for showing holds sooner).

### Tasks
To be defined from pilot data — not pre-specified here to avoid solving problems that may not materialize.

### Dependencies
BLOCKING on Phase 11 producing real data.

### Deliverables
TBD based on findings.

### Acceptance Criteria
TBD.

### Risks
N/A — this phase's scope is intentionally open pending real data.

### Definition of Done
N/A until scoped.

---

## 22. Dependency Graph

```
Phase 0 (Discovery)
   ↓ BLOCKING
Phase 1 (Domain & DB)
   ↓ BLOCKING
        ┌────────────────────┬────────────────────┐
        ↓ BLOCKING            ↓ PARALLEL            ↓ PARALLEL
   Phase 2 (Group Session   (nothing else can    (nothing else can
    Backend)                 start yet — Phase 2   start yet — Phase 2
        ↓ BLOCKING            is itself blocking)   is itself blocking)
   Phase 3 (Group Session Frontend)
        ↓ BLOCKING
   Phase 4 (Realtime)
        ↓ BLOCKING for integration, but backend logic can start PARALLEL
        ├──────────────┬──────────────┐
        ↓               ↓               
   Phase 5 (Seat)   Phase 6 (F&B)   [Phase 5 and 6 run PARALLEL —
        ↓               ↓            independent domains once
        └───────┬───────┘            schema + realtime exist]
                ↓ BLOCKING (needs both totals)
          Phase 7 (Payment)
                ↓ BLOCKING
          Phase 8 (Ticket & Confirmation)
                ↓ BLOCKING (final audit gate; hardening itself runs
          Phase 9 (Security)   PARALLEL alongside Phases 2–8 incrementally)
                ↓ BLOCKING
          Phase 10 (Testing & Performance)
                ↓ BLOCKING
          Phase 11 (Pilot & Rollout)
                ↓ BLOCKING
          Phase 12 (Optimization)
```

Key parallelism opportunities: Phase 5 (Seat) and Phase 6 (F&B) backend work can run concurrently once Phase 1/4 land, since they touch different tables and different realtime event families. Security hardening (Phase 9) should be applied incrementally per endpoint as each earlier phase ships, with Phase 9 itself serving as the final consolidated audit rather than the first time security is considered.

---

## 23. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Seat race condition causes double-booking | Medium | Critical | Atomic locking + mandatory concurrency test suite (§10, §19); dedicated Phase 5 with no shortcuts on testing time |
| Payment gateway doesn't natively support N independent charges per logical order | Medium | High | Resolve in Phase 0 before Payment Service design; may require modeling split-pay as N separate simple orders linked by `group_session_id` |
| Realtime disconnect causes desync between members' seat views | Medium | High | REST re-fetch on reconnect as source of truth (§11), not reliance on socket replay |
| Session expires with mixed paid/unpaid members — undefined business behavior | High (certain to occur at scale) | High | Explicit rule proposed in §12, requires product sign-off before Phase 7 |
| Duplicate F&B purchases despite group summary | Low | Medium | Group F&B Summary is read-only visibility, not a hard block — acceptable per Design Concept's stated approach; monitor via `fnb_attach_rate`/support tickets post-launch |
| Partial payment / refund complexity | Medium | High | Explicit refund flow (§12) scoped into Phase 7/9, not deferred |
| Legacy Solo Booking integration breaks due to shared seat table changes | Medium | Critical | Mandatory regression suite gating Phase 5 completion (§19) |
| Peak-hour load on seat locking / realtime gateway | Medium | High | Dedicated load testing in Phase 10 before pilot |
| QR/invite abuse (code guessing, forged QR) | Low | Medium | Rate limiting + signed QR payload (§17/§18) |
| Existing systems (payment, ticketing, auth) have undocumented constraints | High | High | Phase 0 discovery is mandatory and blocking for a reason — do not skip or compress it |

---

## 24. KPI & Success Metrics

Per §21/Design Concept — no baselines exist yet; all marked TBD pending pre-pilot measurement (Phase 11).

### Customer
- Group booking conversion (Baseline: TBD — measure before pilot; Target: TBD; Actual: TBD)
- Booking completion rate (Baseline/Target/Actual: TBD)
- Time to complete group booking (Baseline/Target/Actual: TBD)
- Abandonment rate (Baseline/Target/Actual: TBD)

### Payment
- Split payment adoption (Baseline/Target/Actual: TBD)
- Payment success rate (Baseline/Target/Actual: TBD)
- Payment timeout rate (Baseline/Target/Actual: TBD)

### F&B
- F&B attach rate (Baseline/Target/Actual: TBD)
- Average F&B spend/group (Baseline/Target/Actual: TBD)
- Duplicate F&B incidents (Baseline/Target/Actual: TBD — tracked via support tickets until/unless instrumented directly)

### Operations
- Support requests related to group booking (Baseline/Target/Actual: TBD)
- Group booking incidents (Baseline/Target/Actual: TBD)
- Payment-related support volume (Baseline/Target/Actual: TBD)

No numeric targets are asserted in this plan — asserting them without real baseline data would be fabrication. Phase 11 explicitly includes a baseline-capture step before pilot advancement decisions are made.

---

## 25. Rollout Strategy

```
Development
   ↓
QA (Phase 10)
   ↓
Staging (all phases deploy here first)
   ↓
Internal Pilot            — Galaxy staff only, real showtimes, monitored closely
   ↓ success criteria met
Limited Cinema Pilot       — one or a small number of physical cinemas
   ↓ success criteria met
Limited User %             — feature-flagged rollout to a percentage of users across all cinemas
   ↓ success criteria met
Full Rollout
```

- **Feature flag:** single top-level flag gating the "Tạo nhóm xem phim" CTA's visibility (Home/Showtime screens); can be scoped per-cinema and per-user-percentage.
- **Rollback:** flag flip to disable new session creation; existing in-flight sessions at time of rollback must still be allowed to complete (or be gracefully expired with full refund) rather than abandoned mid-payment — this must be explicitly handled, not assumed.
- **Monitoring:** §20 dashboards must be live and reviewed *before* Internal Pilot begins, not added afterward.
- **Success criteria per stage:** to be defined jointly with product before Internal Pilot begins (Open Question — not fabricated here).

---

## 26. Traceability Matrix

| Product Requirement | UX Screen | Backend | Database | API | Test Case |
|---|---|---|---|---|---|
| Group Session creation | Create Group | Group Session Service | `GroupSession` | `POST /group-sessions` | INT-GRP-001 |
| Invite via QR/code | Invite | Group Session Service | `Invite` | `POST .../invite`, `POST /invites/:code/join` | INT-GRP-002, E2E-JOIN-001 |
| Realtime member presence | Lobby | Group Session Service + Realtime Gateway | `GroupMember` | `GET .../group-sessions/:id` + `GROUP_MEMBER_JOINED` event | INT-RT-001 |
| Shared seat map | Seat Map | Seat/Booking Service | `SeatHold` | `POST .../seats/hold`, `GET .../seats` | CONC-SEAT-001 (mandatory concurrency test) |
| Seat conflict prevention | Seat Map | Seat/Booking Service | `SeatHold` (unique constraint) | `POST .../seats/hold` → `409` | CONC-SEAT-002 |
| Individual F&B cart | F&B | F&B Service | `FnbOrder`, `FnbOrderItem` | `POST .../fnb` | INT-FNB-001 |
| Group F&B summary (anti-duplication) | F&B | F&B Service | `FnbOrder` (aggregate query) | `GET .../fnb-summary` | INT-FNB-002 |
| Split payment | Payment | Payment Service | `Payment` | `POST .../payment` (per member) | E2E-PAY-001 |
| Organizer-pays-all | Payment | Payment Service | `Payment` | `POST .../payment` (host) | E2E-PAY-002 |
| Mixed-outcome expiry handling | Payment/Confirmed | Payment Service + Group Session Service | `Payment`, `SeatHold` | expiry sweep job (no direct endpoint) | FAIL-PAY-001 |
| Server-controlled countdown | Seat/F&B/Payment | Group Session Service | `GroupSession.expires_at` | `GET .../group-sessions/:id` | INT-EXP-001 |
| Individual e-ticket | E-ticket | Ticket Service | `Ticket` | `GET /tickets/:ticketId` | E2E-TIX-001 |
| Solo Booking non-regression | (existing flow) | Existing Seat/Booking Service | shared `SeatHold` | existing Solo Booking APIs | REG-SOLO-001..N |

This matrix should be extended as each phase's detailed design is finalized — the rows above cover every Must-Have from §5's MVP definition, ensuring none is dropped during development.

---

## 27. Prototype → Production Mapping

| Prototype behavior | Production implementation |
|---|---|
| `state` global JS object holding seats/members/payments in one browser tab | Server-persisted `GroupSession`/`GroupMember`/`SeatHold`/`Payment` rows, fetched and kept in sync per client |
| `goTo(screenId)` show/hide of `<div class="screen">` elements | Real client-side routing, with route guards driven by server-side `MemberState` |
| `simLobbyStep('all-joined')` button | Real `GROUP_MEMBER_JOINED` events from real accounts joining via the invite link/QR/code, pushed over WebSocket |
| `simSeatStep('minh')` / `simSeatStep('an')` / `simSeatStep('huy')` buttons | Real seat-hold API calls from those members' own devices, subject to the concurrency-safe locking in §10, broadcast via `SEAT_HELD` |
| `simPay('an')` / `simPay('huy')` buttons | Real payment initiation from each member's own device against the payment gateway, with `PAYMENT_SUCCESS`/`FAILED` driven by gateway webhook, not a button flip |
| `startCountdown()` — three independent client `setInterval`s reset to hardcoded seconds on each screen | One server-authoritative `expires_at` on `GroupSession`, with the client displaying a countdown derived from it and re-synced on every realtime event/reconnect |
| Decorative CSS-grid "QR code" on Invite and Ticket screens | Real QR encoding a signed invite payload (Invite screen) and a signed ticket payload (E-ticket screen) |
| Hardcoded `soldSeats` array and 4 fixed member colors (`m1`–`m4` tied to "Tín/Minh/An/Huy") | Live seat inventory query; dynamic color assignment per real `GroupMember`, up to the product-approved max group size |
| `comboQty`/`comboPrices` hardcoded in JS | Combo catalog fetched from (existing or new) F&B backend, priced server-side |
| Payment "Tổng cộng nhóm: 407.000đ" computed client-side from hardcoded numbers | Total computed server-side from actual seat prices + actual F&B order totals, never trusted from the client |
| No persistence — reloading the page resets everything | Full server persistence; reloading/reopening the link resumes the member's actual current state |

---

## 28. Definition of Done

Galaxy Together is production-ready only when all of the following hold:

- [ ] Group Session lifecycle operates in production per §8, fully server-authoritative.
- [ ] Member join/leave operates in production per §9.
- [ ] Realtime state sync operates across real, independent devices (§11).
- [ ] Seat locking is proven safe under concurrent load (§10, §19 concurrency tests, Phase 5/10).
- [ ] Individual F&B cart and group summary operate against real inventory/pricing (§16).
- [ ] Host-pays-all payment operates end-to-end with the real gateway (§12).
- [ ] Split payment operates end-to-end, including the product-approved mixed-outcome rule (§12).
- [ ] Server-side timeout/expiration replaces the client timer as source of truth (§13).
- [ ] Individual tickets are issued with real, signed, scannable QR codes (§16).
- [ ] Error handling exists for every documented edge case (§4, §19 failure tests).
- [ ] Security review completed with no open critical/high findings (§18, Phase 9).
- [ ] Unit, integration, E2E, and concurrency test suites are green in CI (§19).
- [ ] Performance/load testing meets agreed thresholds (§19, Phase 10).
- [ ] Monitoring dashboards and alerts are live (§20).
- [ ] Rollback plan is documented and has been exercised at least once in staging (§25).
- [ ] Solo Booking regression suite passes unchanged (§19, §23).
- [ ] Pilot success criteria (once defined, per §25 Open Question) are met before full rollout.

---

## 29. Open Questions / Technical Decisions

These require product/engineering-lead decisions before the corresponding phase can proceed — not answered unilaterally in this plan:

1. **Mixed-outcome payment rule (§12):** does a `GroupBooking` partially confirm at expiry (paid members get tickets, unpaid members' seats release), or is the whole group's confirmation strictly all-or-nothing? This plan proposes partial confirmation as consistent with the Design Concept's stated intent, but it needs explicit product sign-off before Phase 7.
2. **Auto-advance vs. host-gated `WAITING_FOR_MEMBERS → SELECTING` transition (§8):** does the host manually proceed once enough members joined, or does the system auto-advance at a configured minimum? Not specified in any source artifact.
3. **Invite expiration window:** should the invite link/code expire with the full session countdown, or on a shorter, separate "join window" before seat selection even starts? Not specified.
4. **Host-leaves case:** if the host leaves their own session, does the session auto-cancel, or does host role transfer to another member? Not addressed in any source artifact.
5. **Max group size for production:** prototype UI supports a stepper up to 8, but the seat-map/member-color system was only visually validated for 4. Confirm the actual supported max before Phase 5/6 UI work.
6. **Refund policy specifics:** full refund always, or time-based cutoffs? Needed before Phase 7/9 refund implementation.
7. **Multi-device-per-member support:** explicitly out of MVP scope in this plan — confirm that's acceptable, or scope it in.
8. **Existing backend stack, DB, payment gateway, auth system, ticketing/QR system, and realtime infra** — all UNKNOWN per §2; Phase 0 is the mechanism for resolving these, but they must actually be resolved (not assumed) before Phase 1 begins.
9. **Rollout success criteria per stage (§25):** not defined in this plan since no baseline data exists; must be agreed before Internal Pilot.
10. **Data retention/archival policy for expired/cancelled sessions (§17):** compliance/product decision, not an engineering default.

---

## 30. Recommended Next Step

Begin **Phase 0 — Discovery & Technical Validation** immediately. It is the single blocking dependency for every other phase, is pure investigation (no user-facing risk), and resolves the highest-leverage unknowns in this plan: whether the existing payment gateway can support split charges, whether existing seat-hold locking can be extended rather than duplicated, and whether any realtime infrastructure already exists. Every other phase's cost and risk estimate in this plan is conditional on Phase 0's findings.
