As the Backend Engineer, here's how I'd close out Day 3. Days 1 and 2 gave me a live schema, tested endpoints for OTP auth, artisan signup, job posting, matching, payment initialization, and webhook confirmation. Day 3 is about two things: closing yesterday's open item from Cybersecurity and building the endpoints Week 2's most critical feature — the escrow release — depends on.

## Step 1: Close Cybersecurity's input validation fix before writing any new code

Yesterday Cybersecurity flagged and assigned me a specific fix: reject empty required fields and cap string lengths on the job-posting endpoint. I close this first, before touching anything new. I add server-side validation — empty trade field returns a 400 with a clear error message, location strings over a reasonable character limit get rejected, urgency values outside the allowed set (Today/This Week/Flexible) get rejected. I test all three rejection scenarios myself, then confirm with Cybersecurity so they can mark it closed on their checklist.

## Step 2: Fix the file-type validation gap Cybersecurity flagged this morning

Cybersecurity tested the photo upload and found that Backend is accepting files based on extension only, not actual file type. I fix this today by checking the file's MIME type server-side — not trusting what the client declares, but reading the actual file signature. Images only (JPEG, PNG, WebP) get accepted; everything else gets rejected with a clear error message before it touches Firebase Storage.

## Step 3: Fix the availability toggle IDOR vulnerability

Cybersecurity also flagged that the availability toggle endpoint doesn't verify the requesting user owns the profile being updated. I add an authorization check: the endpoint reads the authenticated user's UID from the session token and confirms it matches the artisan_profile being toggled before making any change. A request trying to toggle someone else's availability gets a 403, not a silent success.

## Step 4: Build the "Mark Complete" endpoint — the most critical piece this week

The entire revenue model depends on this endpoint: when a client marks a job complete, the platform releases the artisan's share (job value minus 10% commission) and retains the commission. I build this today, in Week 1, rather than leaving it for Week 2 — because this is the escrow mechanism the pitch makes claims about, and I want it tested before Frontend starts building the UI around it.

The logic is:
1. Verify the requesting user is the client who posted the job
2. Update the job status to "complete"
3. Calculate commission: job_value × 0.10
4. Update the transaction document: status → "released", commission_retained = calculated amount
5. Log the release timestamp

## Step 5: Test the commission calculation against edge cases

I don't just test the happy path — I test edge cases that could embarrass the team on stage: what happens if the job value is zero? What if the commission calculation produces a fractional kobo? What if "Mark Complete" is called twice on the same job? I handle each one explicitly rather than letting the code behave unpredictably.

## Step 6: Build the admin verification queue endpoint

The admin verification flow — where a team member manually approves an artisan's "Verified" badge after reviewing their ID upload — needs an endpoint today. This is simpler than it sounds: a GET endpoint to list artisans with verified = false and a POST endpoint to set verified = true for a specific artisan UID. I add Cybersecurity's required check: this endpoint only responds to a pre-defined admin UID, not any authenticated user.

## Step 7: Add the held vs. released fund data to the artisan dashboard feed

Frontend is building the artisan dashboard screen showing held funds versus released funds. I wire up the data feed today — a query against the transactions collection filtered by the artisan's UID, returning the sum of held transactions and the sum of released transactions separately, so Frontend can display both figures without doing math client-side.

## Step 8: Sync with Data Science on the matching concentration fix

Data Science flagged a real risk: the same few centrally-located artisans could dominate every match result. PM brought this to a decision at today's standup. If the fix is a simple rotation weight or consecutive-match cap, I implement it today alongside the existing matching query — it's a small adjustment to the sort logic, not a rebuild. I confirm the fix with Data Science against their validation script before pushing it.

## Step 9: Run a full end-to-end test of the complete money flow

With the "Mark Complete" endpoint now built, I can test the full financial loop for the first time: client posts job → match → client pays ₦500 match fee (held) → artisan contacted → client marks complete → commission retained → artisan share released. I run this end-to-end with test data and confirm every transaction status update fires correctly, in sequence, without manual intervention. This is the live demo's money moment — it has to work cleanly.

## Step 10: Send Frontend and UI/UX the updated API contract

I write up every new endpoint from today — Mark Complete, admin verification queue, artisan dashboard fund feed — with the exact request/response format, so Frontend can build against real specifications rather than guessing. I also update the existing endpoint list to reflect the input validation changes, so nothing Frontend already built breaks against the updated validation rules.

*End of Day 3, I hand off*: all three of Cybersecurity's flagged items closed (input validation, file-type check, IDOR fix), a working and tested "Mark Complete" escrow-release endpoint with commission calculation, an admin verification queue, an artisan dashboard data feed, a matching concentration fix confirmed with Data Science, a full end-to-end money flow test passed, and an updated API contract shared with Frontend — everything Week 2's build needs to land on solid ground.


DAY 4:                                                                                                                                                                                           As the Backend Engineer, here's how I'd close out Day 4. Day 3 gave me five confirmed working endpoints, a tested Mark Complete escrow-release flow, an admin verification queue, an artisan dashboard fund feed, and a full end-to-end money flow confirmed working. Day 4 is about hardening what exists, responding to Cybersecurity's new checks, and pre-building what Week 2 will immediately depend on.

Step 1: Check Cybersecurity's Day 4 test results before writing any new code

Cybersecurity ran three abuse tests against Mark Complete today: a commission manipulation check, an admin queue access control test, and a WhatsApp reveal gate check. I read their findings first — if any test failed, I fix that before touching anything new. A known vulnerability that I knowingly deferred into Week 2 is a much bigger problem than a delayed new feature.

Step 2: Fix any Mark Complete authorisation gaps Cybersecurity found

If Cybersecurity's tests revealed that an artisan can call Mark Complete on their own job without client confirmation, or that an unauthenticated request with a valid job ID gets through, I fix those specific gaps today with precision — not a general tightening of all endpoints, but the exact authorisation check that was missing. I test each fix against Cybersecurity's specific test scenario, not just against the happy path.

Step 3: Lock the job value at booking, not at release

Cybersecurity flagged a subtle risk: the job value could theoretically be manipulated between posting and Mark Complete, reducing the commission. I fix this today by storing a locked_job_value field on the transaction document at the moment of payment initialisation — this is the value the commission is calculated against at release, regardless of any subsequent changes to the job document. Commission = locked_job_value × 0.10, always.

Step 4: Move the admin UID out of the source code into an environment variable

Cybersecurity flagged that the admin UID shouldn't be hardcoded. I moved it to .env today and updated the admin queue endpoint to read from process.env.ADMIN_UID rather than a hardcoded string. I confirm the .env file is in .gitignore and do a quick check that the old hardcoded value isn't still sitting in any committed file.

Step 5: Confirm the WhatsApp reveal gate is genuinely payment-gated

Cybersecurity tested whether the phone number reveal endpoint can be called without a confirmed payment. I check the endpoint's logic specifically: it should query the transactions collection for a matching match_id with status = "held" before returning the phone number — not just check that the user is authenticated. If the gate is only checking authentication and not payment status, I will add the payment status check today.

Step 6: Build the rating submission endpoint

Frontend built the rating screen on Day 3 — it needs a real endpoint behind it. I built POST /api/jobs/:id/rating today: accepts a 1–5 star value from the authenticated client, validates it's within range, stores it against the match document, and triggers a reputation score recalculation for the artisan. I add Cybersecurity's pre-brief check: can a client submit multiple ratings for the same job? The endpoint checks whether a rating already exists for this job before writing — if one exists, it returns a 409 Conflict rather than overwriting.

Step 7: Build the reputation score calculation

With the rating endpoint live, I implement the reputation score aggregation: a simple average of all ratings for a given artisan across all completed jobs. I store this as a reputation_score field on the artisan_profile document, updated every time a new rating comes in. I test it by submitting two ratings for the same test artisan and confirming the score updates correctly both times.

Step 8: Check the reputation score against Data Science's matching heuristic

Data Science's heuristic uses rating as a Phase 2 tiebreaker once data exists. I confirm that my reputation_score field name matches what their validation script expects — if their script queries for rating and I've stored it as reputation_score, the tiebreaker silently fails. I align the field name with Data Science today rather than discovering the mismatch in Week 2.

Step 9: Seed a complete test transaction for Frontend and Data Science

Frontend's artisan dashboard screen shows held versus released funds, but it needs real transaction data to display correctly. Data Science's simulation needs real completed job data to test the reputation mechanic. I created a complete test transaction today — a full loop from job post through payment hold through Mark Complete through commission release — with realistic values (₦20,000 job value, ₦500 match fee, ₦2,000 commission retained, ₦17,500 released to artisan). Both Frontend and Data Science get the test transaction reference so they can build and test against real data.

Step 10: Update the API contract and share with all consuming tracks

Today's additions — rating submission, reputation score, locked job value, environment-variable admin UID — all change or extend the API contract Frontend, Data Science, and Cybersecurity are working against. I updated the contract document today with exact request/response formats for each new endpoint, flagged which fields changed, and shared it with all three tracks before the end of the day so nobody is building against a stale version tomorrow.

End of Day 4, I hand off: all Cybersecurity-flagged items from today closed (authorization gaps, commission lock, admin UID in environment, reveal gate confirmed payment-gated), a rating submission endpoint with duplicate-rating protection, reputation score calculation live and field-name confirmed with Data Science, a complete realistic test transaction seeded for Frontend and Data Science, and an updated API contract shared with all consuming tracks — everything hardened and extended before Week 2 introduces the next layer of complexity.