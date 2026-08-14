# PRD Delta — Changes Since v1.1

Everything confirmed by the team since the v1.1 merged draft, organized for direct merge into the next PRD revision. Split into confirmed changes (ready to write in) and open decisions (need a PM call before they can be written in).

---

## 1. Confirmed changes — ready to merge into PRD

### Rebrand: Verifix → Artiva
Project renamed during branding exploration. "Arti" (Artisan) + "Va" (Verified). New tagline candidates in use across mockups: "Verified. Fast. Protected." and "Verified Craft. Trusted Pros." — pick one as canonical before the next PRD pass, since both are currently live in different design assets.

### WhatsApp handoff removed — all communication now in-app
Section 5.1/5.2 and Section 7.3 need updating: the WhatsApp deep-link handoff (previously "Yes" in MVP scope, contact-reveal-then-WhatsApp flow) is replaced by in-app messaging. Client and artisan now communicate entirely within the app after payment confirmation, not via a wa.me link.

**Schema impact:** new `messages` collection (see firestore-schema.md). This is a structurally new requirement — real-time chat infrastructure wasn't scoped for MVP originally, and needs a decision on whether Firestore listeners (live delivery) or simple fetch-on-open is acceptable for the 4-week timeline.

### NIN verification added to artisan signup
New requirement: artisans provide their National Identification Number at signup, in addition to the existing ID document upload. Positions Verifix/Artiva closer to competitor verification standards (CraftRanked and SortAm both use NIN/BVN + biometric checks via QoreID).

**Schema impact:** `artisan_profiles.nin` (sensitive PII, admin-only access, never client-facing) and `artisan_profiles.nin_verified` (boolean).

**Open decision below** — whether this is manually reviewed (cheap, matches existing admin queue) or automated via a third-party API like QoreID (expensive, actually closes the competitive gap).

### Service selection added to artisan signup
Artisans now select specific services within their trade at signup (e.g. a Plumber selecting "Pipe Installation," "Leak Repair," "Drain Cleaning"), not just the trade category. Displays as chips on the artisan profile.

**Schema impact:** `artisan_profiles.services` (array<string>).

**Open decision below** — locked list per trade vs. free text.

### Competitive landscape update
Section 2.2's "gap nobody owns" framing needs revising. Confirmed live/near-live competitors as of this pass:
- **CraftRanked** — NIN + biometric verification (QoreID), in-app pre-booking chat, 15% commission
- **SortAm** — multi-city, AI-assisted job posting, live artisan map, "ready to work in minutes" positioning
- **Fixit.ng** — nationwide "Nigeria's #1 serviceplace," broader service categories beyond home repair, not previously in the PRD's competitor list at all

Recommend repositioning around density (one estate, guaranteed match) and founder-vetted trust rather than claiming an unmatched trust+speed combination outright. Full writeup in the competitive-positioning doc if useful for the next deck revision.

### Brand visual identity
Logo, color tokens, and onboarding screens have gone through several iterations (sage-teal-and-gold → deep-teal gradient with gold accents). Latest locked palette:
- Primary: `#16858F`
- Dark gradient (splash): `#184E53` → `#1A5B61` → `#0B3033`
- Wordmark: `#16D4C6`
- Text: `#0E3B40`
- Backgrounds: `#F4F8F8` / `#FFFFFF`

Full token file (Tailwind config + CSS variables) available separately for Frontend handoff once the two remaining contrast/hex gaps (shield border contrast, subtext color) are resolved.

---

## 2. Open decisions — need a PM call before these can be written into the PRD

### Auth mechanism conflict (urgent — blocks Frontend)
Recent mockups show a "Create your account" screen collecting full name, email, phone, **and password** for the client/artisan signup flow. This directly contradicts the current PRD (Section 7.1: "Phone OTP via Firebase Auth — no email required") and user story A-001, and conflicts with what Backend has actually built (phone-OTP-only for clients/artisans; email+password was deliberately scoped to admin/dashboard access only).

**Needs a decision:** is this mockup an error, or is it an actual PRD change to add email/password as an option? If real, this is a significant scope addition — a second full auth pathway, not a UI tweak — and Backend needs to know before building further.

### Wallet vs. per-job escrow (raised three times, unresolved)
Multiple mockup rounds show a persistent "Wallet Balance" screen with an "Add Funds" button — implying clients maintain a topped-up balance they spend from. The current PRD and everything Backend has built assumes pay-per-job escrow: client pays for one specific job, funds held until Mark Complete, then released minus commission. No wallet/balance data model exists.

**Needs a decision:** is Wallet a real, intended feature, or is it in the mockups without being an actual scope decision? If real, this changes the payment architecture (new collection, different fraud/abuse surface for Cybersecurity, different UX for "how much do I pay and when") — not a small addition.

### NIN verification: manual or automated?
Directly affects Backend build effort. Automated (QoreID-style third-party API) actually closes the verification gap against CraftRanked/SortAm, but means new infrastructure and a per-verification cost. Manual (admin reviews NIN like they already review ID documents) is far less work but doesn't functionally match what competitors offer, even though the field will look the same in the schema either way.

### Services: locked list or free text?
Recommend a locked list per trade (same reasoning as the existing trade enum — avoids "Pipe fixing" vs "Pipe Installation" vs "Pipes" fragmenting the data). Needs sign-off before the signup screen's service-selection step is finalized.

### Canonical tagline
"Verified. Fast. Protected." and "Verified Craft. Trusted Pros." are both live across different mockups. Pick one before the next pitch deck / PRD pass so marketing copy, onboarding screens, and the executive summary all match.

---

## Recommendation
The two "urgent" items (auth mechanism, wallet) are the ones actively blocking downstream work — Frontend and Backend are building against mockups that contradict the current source-of-truth PRD, and every week that passes without a decision means more screens/endpoints potentially need rework. Worth resolving those two first, even ahead of the lower-stakes tagline/services questions.
