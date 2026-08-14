# Build Prompt: Artiva — Frontend (React + Tailwind + Vite)

## Context
Frontend for Artiva, a mobile-first marketplace connecting clients to verified local artisans in Life Camp, Abuja. Clients post jobs, get matched to available verified artisans, pay a match fee held in escrow, communicate in-app, and release payment when the job is confirmed complete.

**Stack** (per PRD): React 18 + Tailwind CSS + Vite. PWA manifest + service worker. Deployed on Vercel.

**Performance targets:** match list loads in under 3 seconds on 3G. Lighthouse performance >85, accessibility >90. Tested at 320px, 375px, 414px widths — low-end Android is the primary target device, not desktop-first.

---

## 1. Design tokens — locked, use exactly as specified

```js
colors: {
  primary: "#16858F",
  wordmark: "#16D4C6",
  navy: "#0E3B40",       // text
  background: "#F4F8F8",
  surface: "#FFFFFF",
  gold: {
    DEFAULT: "#FAB804",
    speed: "#FDC80B",
    accent: "#D59F0F",
  },
  success: "#2E7D32",
  error: "#D32F2F",
}
```

Dark gradient (splash/onboarding only): `#184E53` → `#1A5B61` → `#0B3033`, radial from center.

**Do not use ghosted background tool-icon patterns anywhere** — this was tested and explicitly dropped from the approved design.

Logo: shield badge, `#16858F` outer border, crossed wrench + screwdriver in cobalt blue with gold handle accents, gold speed lines to the left of the shield, gold star to the upper right. Wordmark "Artiva" in `#16D4C6`, bold rounded sans-serif. Tagline: lowercase, "verified, fast protected."

Contrast: verify every text/background pairing against WCAG AA (4.5:1 body, 3:1 large/graphical) rather than assuming — several earlier iterations of this palette had contrast issues that only showed up when actually checked.

---

## 2. Screen inventory

Full list organized by flow: see the separate Figma screen-set reference (33 screens across Onboarding, Auth, Client flow, Artisan flow, Shared, Admin). Onboarding (3 screens: splash, value props, final CTA/role selection) is finalized — build to match that exactly, it's the style reference for everything else.

**Explicit exclusions — do not build these:**
- No wallet/balance screen, no "Add Funds" flow. Payment is per-job escrow only.
- No live GPS map tracking screen.
- No email/password signup form for client/artisan accounts — phone + OTP only. (A separate admin dashboard has its own email/password login, but that's out of scope for this build.)

**Explicit inclusions — make sure these aren't missed:**
- In-app chat screen (replaces WhatsApp — this is now required, not optional)
- NIN input + services multi-select as part of artisan signup (steps 3-4 of the 5-step flow)
- Verification-pending waiting screen for artisans between signup and admin approval
- Empty state for zero matched artisans
- Loading state on every API-dependent screen
- Failed-payment / retry screen

---

## 3. API integration

Full endpoint reference: see the separate API contract document. Key things to build around:

- Every authenticated request needs `Authorization: Bearer <firebase_id_token>`
- `POST /jobs/:id/rating` returns `409` if already rated — handle this as a specific UI state ("you've already rated this job"), not a generic error toast
- `GET /jobs/:id/matches` can return an empty array — this is a valid, expected state with its own screen, not an error
- Chat can only be opened after `POST /jobs/:id/unlock-chat` succeeds, which itself only works once payment is confirmed `held` — don't let the UI attempt to open a chat thread before that gate clears
- Confirm with Backend whether messages use Firestore real-time listeners or plain fetch before building the chat screen's data-fetching pattern — this changes the implementation, not just a config flag

---

## 4. Non-functional requirements (from PRD, non-negotiable for MVP)

1. Post-a-job form must complete in under 60 seconds on a low-end Android device
2. All screens tested at 320px, 375px, 414px — mobile-first, not responsive-as-an-afterthought
3. WCAG AA contrast, 44×44px minimum touch targets, semantic HTML
4. Loading state on every screen that depends on an API call
5. Error state with retry on every failure path — Nigerian mobile networks mean intermittent connectivity is the expected case, not the exception
6. NDPR consent (checkbox or notice, confirm which with PM) visible at signup

---

## 5. Known open items — flag back to the team, don't silently decide

- Canonical tagline: "Verified. Fast. Protected." vs. "Verified Craft. Trusted Pros." — both are in circulation, pick one before final copy pass
- Real-time chat delivery mechanism (Firestore listeners vs. fetch) — affects architecture, not just polish
- Whether the wallet screens seen in early mockups represent a real, intended pivot or were built in error — currently building against per-job escrow only; if this changes, it's a significant rework, not a small patch
