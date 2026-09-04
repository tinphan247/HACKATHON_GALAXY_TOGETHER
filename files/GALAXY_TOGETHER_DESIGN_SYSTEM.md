# GALAXY TOGETHER — DESIGN SYSTEM EXTENSION

> This document extends `GALAXY_CINEMA_CURRENT_UI_UX_SPEC.md`.
> No brand colors, fonts, or radii are introduced. Only member-identity tokens
> and new component patterns are added.

---

## 1. Reused Components (unchanged)

| Component | Source screen | Reuse notes |
|---|---|---|
| Galaxy Circular Back Button | All | Identical 40px circle, navy arrow |
| Galaxy Primary CTA Button | All bottom bars | Same orange/peach active/disabled states |
| Countdown Banner | Seat, F&B, Payment | Same orange full-width bar; now persists across 3 steps instead of 2 |
| Seat Map Matrix & Legend | Shared Seat Map | Same A–O rows, same screen-at-bottom convention, legend extended (see §3) |
| Bottom Summary Dock | Seat, F&B, Payment | Same left-info / right-CTA layout |
| Cinema Accordion / Date Strip / Showtime Grid | Showtime screen | Fully unchanged |
| F&B Combo Card + Stepper | F&B screen | Same card anatomy; only a "Đang chọn cho: [Name]" context strip added above the list |
| E-Ticket | Ticket screen | Same navy header + dashed-divider + QR layout |

---

## 2. New Tokens — Member Identity System

Member colors are **identity-only** tokens. They never replace Galaxy Orange as the action/brand color and are never used for CTAs, countdown, or navigation.

```json
{
  "color": {
    "member": {
      "m1": "#F58020",  // Organizer default = Galaxy Orange (brand-consistent)
      "m2": "#7C3AED",  // Purple
      "m3": "#0EA5E9",  // Blue
      "m4": "#10B981"   // Green
    }
  }
}
```

Rules:
- Member 1 (organizer, "you" in solo view) always maps to Galaxy Orange — this keeps the "your seat" visual consistent with the existing single-user seat-selected state.
- Members 2–4 use purple / blue / green — chosen for maximum contrast from each other and from orange/navy, in HSL bands that don't compete with the age-rating orange badge or sold-seat gray.
- Beyond 4 members, cycle a secondary tint set at 70% lightness (not specified further — recommend capping visible group size at 8 with initials-only fallback for members 5–8 rather than adding more hues, to avoid seat-map clutter).

---

## 3. Extended Seat States

The existing 6-state seat legend (Ghế đơn / VIP / Đôi / Ba / Đã bán / Đang chọn) is extended with **ownership states**, not replaced:

| State | Visual | Meaning |
|---|---|---|
| Available | White, gray/gold border (existing) | Unclaimed |
| My Selected | Solid `--m1` orange, initial letter | You hold this seat |
| Other Member Selected | Solid member color, initial letter | Held by teammate, live |
| Sold | Solid gray (existing) | Unavailable |
| Held (expiring) | *(recommended, not yet built)* member color at 50% opacity + small clock glyph | Countdown-critical, not yet paid |
| Released/Expired | Reverts to Available | Timed out, freed automatically |

---

## 4. New Components

### GroupSessionHeader
Navy strip (`--navy` background), replaces nothing — sits below the screen header wherever a Group Session is active. Always shows: group name, movie/cinema/showtime context. Purpose: the user must never lose track of *which* group and *which* showtime they're in mid-flow.

### MemberAvatar
38px circle (34px in compact contexts), member color background, single-letter initial, white text. Dashed-border + `+` glyph variant for "not yet joined" placeholder.

### MemberStatus pill
Reuses the existing badge pill shape (radius-full, small padding) with 4 semantic states:
```
status-confirmed  → bg #DCFCE7 / text #16A34A  (Đã tham gia / Đã trả)
status-selecting  → bg #FEF9C3 / text #CA8A04  (Đang chọn...)
status-waiting    → bg surface / text muted     (Chờ tham gia...)
status-pending    → bg #FEE2E2 / text #DC2626  (payment overdue only)
```

### GroupSeatSummary (bottom dock, seat screen)
Compact list, one row per member: color dot + name + seats chosen (or "Chưa chọn"). Sits *above* the existing Bottom Action Bar, does not replace it — both remain visible simultaneously.

### GroupFnbSummary
Read-only card on the F&B screen listing every member's combo selection in one place. Explicit purpose: prevent duplicate combo purchases (evidence-backed pain point) by giving the whole group one visible order ledger.

### PaymentProgress
Standard progress bar token (`--orange` fill, `--border` track, 8px height, 4px radius) + text label `"X / Y người đã thanh toán"`.

### PaymentStatusRow
Per-member row: avatar + name + what they booked (seats/combo) + amount + action (Pay button for self / static "Đã trả" or "Chưa trả" for others).

---

## 5. Interaction Patterns

| Pattern | Behavior |
|---|---|
| Realtime seat claim | Tapping a seat instantly recolors it to the acting member's color across the shared map — no page reload, no screen transition (simulated via direct DOM state changes keyed by member) |
| Activity ticker | A dismissible inline banner (`📡 [Name] vừa chọn ghế...`) surfaces real-time events without interrupting the current screen |
| Countdown persistence | A single logical timer value is carried forward across Seat → F&B → Payment; each screen's banner reads from the same running countdown rather than resetting |
| Toast feedback | Every state-changing action (join, seat pick, payment) triggers a short bottom toast — this substitutes for the "ask in group chat" confirmation loop |
| Simulation controls | Dark "🎮 Mô phỏng" bar lets a solo demoer trigger other members' actions deterministically, standing in for a live multi-device backend |

---

## 6. What Must Not Change

Per the source spec's non-negotiables — carried into this extension unmodified:

- Galaxy Orange `#F58020` remains the only action/brand accent color.
- Galaxy Navy `#0B3B60` remains the only structural/trust color.
- Seat map screen indicator stays at the **bottom** of the matrix.
- Bottom Summary/Action Bar is never removed from any funnel step.
- No new fonts, no dark mode, no icon-heavy decoration on seat cells.
- Member colors are additive identity markers only — never used for CTAs or navigation state.
