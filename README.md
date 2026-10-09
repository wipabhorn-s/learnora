# Learnora

An online course marketplace — browse and buy courses, watch lessons with progress tracking,
publish your own courses as an instructor, and manage the whole platform as an admin.

Built as a full-stack monorepo: a **NestJS** REST API and a **Next.js (App Router)** web client.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Authentication flow](#authentication-flow)
- [Scripts](#scripts)
- [Deploy (free)](#deploy-free)

---

## Features

### Student
- Browse and search courses with filters (category, level, price, keyword) and pagination
- Course page with learning outcomes, requirements, curriculum and instructor bio
- Public instructor profiles listing their published courses
- Wishlist and shopping cart
- Checkout through **Opn Payments** (formerly Omise): credit/debit card,
  PromptPay QR, TrueMoney Wallet and mobile banking (KBank, SCB, KTB, BBL, BAY)
- Free courses are enrolled in one click without going through the payment provider
- Payment-pending page that tracks QR / bank-app / 3-D Secure payments until they settle
- Purchase history, with refund requests **per course** (within 14 days, reviewed
  by an admin; only that course's price is refunded)
- Lesson videos are streamed through signed links that expire after 6 hours, so
  shared links stop working
- Course player with per-lesson progress (last position, max watched, completion)
- Dashboard with enrolled courses and learning progress
- Profile: edit personal info, upload/remove avatar

### Instructor
- Create, edit, publish and delete courses (thumbnail upload via Cloudinary)
- Manage lessons: add, edit, reorder, delete (video upload via Cloudinary)
- Instructor dashboard: revenue, students and course performance
- Preview own course in the player

### Admin / Super admin
- Admin dashboard with platform-wide statistics
- Manage users (suspend / re-activate accounts)
- Moderate courses (publish, suspend, delete)
- Revenue chart and recent payments on the dashboard
- Review payments (filter by status, date range, "refund needed")
- **Refund Requests** queue (one course per request): approve (partial refund
  through Opn, or recorded manually with a transfer reference for PromptPay) or
  decline with a reason; the student is emailed either way. Revenue figures
  subtract partial refunds. Direct refunds from the Payments page are limited to
  duplicate payments the system flagged
- Super admin: create and manage admin accounts

### Auth and account security
- Email + password registration with **mandatory email verification** — the
  account cannot log in until the link in the inbox is clicked
- Sign in with Google (OAuth via NextAuth, ID token verified server-side)
- Forgot password / reset password with single-use, hashed tokens
- **Strong password policy** shared by API and web: 8–72 printable ASCII characters
  with lowercase, uppercase, number and symbol, plus a live checklist in the forms
- **Two-factor authentication** by email: a 6-digit code is required after the
  password (Google sign-in skips it because Google already verified the user)
- **Login & security** settings: change password, connect or disconnect Google,
  set a first password, change the email address (password + confirmation link
  required), turn two-factor authentication on or off, and **delete the account**
  (personal data is erased; anonymised receipts are kept for accounting)
- **Login lockout**: 5 wrong passwords within 15 minutes lock that email for 15
  minutes (counted per email, because the web server calls the API from one IP)
- Roles: `STUDENT`, `ADMIN`, `SUPER ADMIN`. Teaching is a **capability**
  (`isInstructor`), not a role, so one account can buy, learn and teach

---

## Tech stack

| Layer | Tech |
| --- | --- |
| API | NestJS 11, TypeScript, Prisma 7, PostgreSQL |
| Auth (API) | `@nestjs/jwt`, bcrypt, `google-auth-library` |
| Mail | Brevo transactional email HTTP API |
| Web | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Auth (web) | NextAuth v5 (Credentials + Google provider, JWT session) |
| UI | Tailwind CSS 4, shadcn/ui, Base UI, lucide-react |
| Forms | react-hook-form + Zod |
| Payments | Opn Payments / Omise (REST API + Omise.js card tokenization) |
| Media | Cloudinary (avatars, thumbnails, lesson videos) |
| Package manager | pnpm |

---

## Project structure

```
learnora/
├── api/                        # NestJS REST API
│   ├── prisma/schema.prisma    # database schema
│   ├── prisma/migrations/      # versioned schema changes (prisma migrate)
│   ├── scripts/                # one-off / dev scripts (del, videos:protect)
│   └── src/
│       ├── auth/               # login, 2FA codes, register, Google, password reset, guards
│       ├── user/               # profile, avatar, login & security settings
│       ├── course/             # course CRUD + catalog
│       ├── lesson/             # lesson CRUD + reordering
│       ├── cart/  wishlist/    # cart and wishlist
│       ├── purchase/           # Opn checkout, webhook, reconcile job, orders
│       ├── learning/           # enrolled courses, player, progress
│       ├── dashboard/          # student & instructor dashboards
│       ├── admin/              # admin console endpoints
│       ├── payout/             # instructor earnings (revenue share) and payouts
│       ├── infrastructure/     # bcrypt, jwt, Cloudinary, Brevo mail, Opn payments
│       ├── common/             # decorators (@Public, @Roles, @CurrentUser, @StrongPassword), utils (pagination, dates)
│       └── config/             # env validation (Zod)
└── web/                        # Next.js client
    └── src/
        ├── app/
        │   ├── (auth)/         # login (+ 2FA code step), signup, verify email, forgot/reset password
        │   ├── (public)/       # landing page, course catalog & detail
        │   ├── (student)/      # dashboard, my courses, cart, wishlist, purchase history, teach
        │   ├── (account)/      # profile and login & security settings
        │   ├── (checkout)/     # Opn checkout, payment pending and result pages
        │   ├── (player)/       # course player
        │   ├── instructor/     # instructor console
        │   ├── admin/          # admin console
        │   └── session-expired/ # signs out and redirects when the API rejects the token
        ├── components/         # features/, layout/, shared/ (reused building blocks), ui/, home/, magic/ (night-sky decoration)
        └── lib/
            ├── actions/        # server actions (the only thing pages call)
            ├── api/            # typed fetch wrappers for the NestJS API
            ├── schemas/        # Zod schemas shared by forms and actions
            └── auth.ts         # NextAuth configuration
```

The web app never calls the API from the browser: pages and client components call
**server actions** (`src/lib/actions`), which call the typed API client
(`src/lib/api`), which attaches the JWT access token from the NextAuth session.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 14+ (with the `citext` extension available)
- Accounts for: Google Cloud (OAuth client), Cloudinary, Brevo, Opn Payments (test keys are enough)

### 1. Clone and install

```bash
git clone https://github.com/wipabhorn-s/learnora.git
cd learnora

cd api && pnpm install
cd ../web && pnpm install
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

Fill in the values — see [Environment variables](#environment-variables).

### 3. Set up the database

```bash
cd api
pnpm exec prisma migrate deploy  # create/upgrade tables from prisma/migrations
pnpm exec prisma generate        # generate the Prisma client
```

The schema is versioned in `api/prisma/migrations` (the first one, `0_init`, also
enables the `citext` extension used for case-insensitive emails).

**Changing the schema** — edit `schema.prisma`, then
`pnpm exec prisma migrate dev --name <what-changed>` creates a migration and
applies it locally. Commit the new folder; production runs `migrate deploy`.
Don't use `prisma db push` any more — it changes the database without a
migration, so production would drift.

**Existing database that was created with `db push`** (before migrations
existed) — mark the baseline as already applied instead of re-creating tables:

```bash
pnpm exec prisma migrate resolve --applied 0_init
pnpm exec prisma migrate deploy
```

On a database that already holds users from before the teaching/role split, run
the backfill once so existing instructors keep their teaching rights and nobody
is locked out by email verification:

```bash
psql "$DATABASE_URL" -f prisma/backfill-instructor-capability.sql
```

### 4. Run both apps

```bash
# terminal 1
cd api && pnpm start:dev        # http://localhost:8000

# terminal 2
cd web && pnpm dev              # http://localhost:3000
```

---

## Environment variables

### `api/.env`

| Variable | Description |
| --- | --- |
| `PORT` | API port (e.g. `8000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ACCESS_TOKEN_SECRET` | JWT signing secret, at least 32 characters |
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime in seconds — keep it short, e.g. `900` (15 min); the web app renews it with the refresh token |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime in seconds (default `2592000` = 30 days) — how long someone can stay away before logging in again |
| `FRONTEND_URL` | Base URL used to build the links sent by email |
| `RESET_TOKEN_EXPIRES_IN` | Password-reset link lifetime in seconds (e.g. `600`) |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | Verification link lifetime in seconds (e.g. `86400`) |
| `BREVO_API_KEY` | Brevo API key (required) |
| `MAIL_FROM` / `MAIL_FROM_NAME` | Sender address (must be verified in Brevo) and display name |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID — must match the one used by the web app |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `OMISE_SECRET_KEY` | Opn Payments secret key (`skey_test_...` / `skey_...`) |
| `OMISE_WEBHOOK_SECRET` | Webhook signing secret from Opn Dashboard → Webhooks (base64). Optional in development; without it signatures are not checked and a warning is logged in production |
| `INTERNAL_API_SECRET` | Shared secret with the web app (same value on both). With it, the API trusts the visitor IP the web server sends in `X-Client-IP` for rate limiting; without it (local dev) the API uses the connecting IP + `TRUST_PROXY` |
| `INSTRUCTOR_REVENUE_SHARE_PERCENT` | Instructors' share of each sale, 0–100 (default `70`); the rest is the platform's |
| `PAYOUT_ENCRYPTION_KEY` | 32 random bytes, base64 — encrypts instructors' bank account numbers (AES-256-GCM). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Use a different key per environment and **never lose or change it** once accounts are saved |
| `TRUST_PROXY` | Who may set `X-Forwarded-For` (Express "trust proxy"). Default `loopback` (web and API on one machine). In production set the web server's IP/subnet so rate limits count real users, and outsiders can't spoof their IP |

Env vars are validated with Zod at boot (`src/config/env.validation.ts`) — the API
refuses to start if anything is missing or malformed.

### `web/.env.local`

| Variable | Description |
| --- | --- |
| `API_URL` | Base URL of the NestJS API (e.g. `http://localhost:8000`) |
| `AUTH_SECRET` | NextAuth session encryption secret |
| `INTERNAL_API_SECRET` | Same value as the API's — lets the API trust the visitor IP this server forwards. Leave empty in local dev |
| `AUTH_URL` | The site's public URL (e.g. `https://learnora.example.com`). **Required in production** — without it (or `AUTH_TRUST_HOST=true` behind a trusted proxy) NextAuth rejects every session with `UntrustedHost` and nobody can log in |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client credentials |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same client ID, exposed to the browser for the connect-account button |
| `NEXT_PUBLIC_OMISE_PUBLIC_KEY` | Opn Payments public key (`pkey_test_...`), used by Omise.js to tokenize cards in the browser |

The web app validates these with Zod as well (`src/lib/env.ts`).

> Both apps must use the **same** `GOOGLE_CLIENT_ID`: the web app obtains the Google
> ID token and the API verifies its audience against that client ID.

---

## Data model

```
User ──< Course (as instructor)
User ──< Wishlist >── Course
User ──< CartItem >── Course
User ──< OneTimeCode
User ──< Purchase ──< PurchaseItem >── Course
Course ──< Lesson ──< LessonProgress >── PurchaseItem
```

- **User** — `role` (regular user vs. admin), `isInstructor` (teaching
  capability), `status` (suspended flag), `emailVerifiedAt`, optional `password`
  (null for Google-only accounts), optional `googleId`, `twoFactorEnabled`
  and an optional instructor `bio` (edited on the profile page, shown on course pages).
- **EmailVerificationToken / PasswordResetToken** — single-use links. Only a
  sha256 hash of each token is stored, and `pendingEmail` holds the address
  waiting to be confirmed during an email change.
- **OneTimeCode** — 6-digit email codes for 2FA (`LOGIN`, `ENABLE_TWO_FACTOR`).
  Stored as an HMAC keyed by the server secret, valid for 10 minutes, single-use,
  and locked after 5 wrong attempts.
- **Course** — category, level, price, access type (`LIFETIME` / `LIMITED` with a
  duration), publishing status, an optional `subtitle`, and the `learningOutcomes`
  / `requirements` lists shown on the course page.
- **Purchase / PurchaseItem** — an order and its lines; a `PurchaseItem` is the
  enrollment record, carrying `expiresAt` and `enrollmentStatus`. A purchase stores
  its `paymentMethod` (`FREE`, `CARD`, `PROMPTPAY`, `TRUEMONEY`, `MOBILE_BANKING`),
  the Opn `chargeId`, `cancelledAt` (superseded by a newer checkout),
  `manualRefundNeeded` and `refundReference`.
- **RefundRequest** — one per purchased course (`PurchaseItem`): the student's
  reason, status (`PENDING` / `APPROVED` / `REJECTED`), the admin's note, the
  manual transfer reference and who reviewed it. `Purchase.refundedAmount`
  tracks partial refunds; when it reaches the total the order becomes `REFUNDED`.
- **LessonProgress** — per enrollment and lesson: last position, furthest watched
  second and completion flag.

Full definitions: [`api/prisma/schema.prisma`](api/prisma/schema.prisma).

---

## API reference

All routes are protected by a global `AuthGuard` + `RolesGuard` unless marked
`@Public()`. Send the token as `Authorization: Bearer <access_token>`.

### Auth — `/auth`
| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/register` | Register with email and password |
| POST | `/auth/login` | Log in, returns `access_token` + user, or `{ codeRequired, challengeId }` when 2FA is on |
| POST | `/auth/login/code` | Finish a 2FA login with the 6-digit code |
| POST | `/auth/login/code/resend` | Send a new login code (30-second cooldown) |
| POST | `/auth/google` | Exchange a Google ID token for an access token |
| GET | `/auth/profile` | Current user (requires auth) |
| POST | `/auth/verify-email` | Confirm a signup or an email change |
| POST | `/auth/resend-verification` | Send the verification link again |
| POST | `/auth/refresh` | Swap a refresh token for a new access token + refresh token (rotation) |
| POST | `/auth/logout` | Revoke this device's refresh token |
| POST | `/auth/forgot-password` | Request a password-reset link |
| POST | `/auth/reset-password` | Set a new password with a reset token |

### Users — `/users`
| Method | Path | Description |
| --- | --- | --- |
| PATCH | `/users/me` | Update first/last name and instructor bio |
| PATCH | `/users/me/avatar` | Upload an avatar (multipart) |
| DELETE | `/users/me/avatar` | Remove the avatar |
| PATCH | `/users/me/password` | Change password (requires the current one); logs out other devices and returns a fresh session |
| POST | `/users/me/sessions/revoke-all` | Log out of all devices |
| GET | `/users/me/security` | Login methods overview for the settings page |
| POST | `/users/me/password` | Set a first password (Google-only accounts) |
| POST | `/users/me/google` | Connect a Google account (verified ID token) |
| DELETE | `/users/me/google` | Disconnect Google (blocked without a password) |
| POST | `/users/me/email-change` | Request an email change (password required) |
| POST | `/users/me/two-factor/request` | Email a code to start enabling 2FA |
| POST | `/users/me/two-factor/confirm` | Confirm the code and turn 2FA on |
| POST | `/users/me/two-factor/disable` | Turn 2FA off |
| POST | `/users/me/instructor` | Enable teaching; returns a refreshed access token |
| POST | `/users/me/delete/request-code` | Accounts without a password: confirm the account email and get a 6-digit code |
| POST | `/users/me/delete` | Delete own account with `{ password }`, or `{ challengeId, code }` for accounts without a password |

### Courses — `/courses`
| Method | Path | Description |
| --- | --- | --- |
| GET | `/courses` | Public catalog with filters and pagination |
| GET | `/courses/:courseId` | Public course detail |
| GET | `/instructors/:instructorId` | Public instructor profile: bio, stats and published courses |
| GET | `/courses/mine` | Instructor's own courses |
| GET | `/courses/mine/:courseId` | Instructor's course detail (for editing) |
| POST | `/courses` | Create a course |
| PATCH | `/courses/:courseId` | Update a course |
| PATCH | `/courses/:courseId/status` | Publish / unpublish |
| DELETE | `/courses/:courseId` | Delete a course |

### Lessons — `/lessons`
| Method | Path | Description |
| --- | --- | --- |
| POST | `/lessons` | Add a lesson (video upload) |
| PATCH | `/lessons/:lessonId` | Update a lesson |
| PATCH | `/lessons/:lessonId/move` | Reorder a lesson |
| DELETE | `/lessons/:lessonId` | Delete a lesson |

### Cart, wishlist and checkout
| Method | Path | Description |
| --- | --- | --- |
| GET / POST | `/cart` | List / add cart items |
| DELETE | `/cart/:courseId` | Remove a cart item |
| GET | `/wishlist`, `/wishlist/course-ids` | Wishlist contents |
| POST / DELETE | `/wishlist`, `/wishlist/:courseId` | Add / remove |
| POST | `/purchases/checkout` | Pay for the cart through Opn (card token, PromptPay, TrueMoney or mobile banking) |
| POST | `/purchases/enroll-free/:courseId` | Enroll in a free course directly |
| GET | `/purchases/:purchaseId/progress` | Payment status, QR code / authorize URL while pending |
| GET | `/purchases`, `/purchases/:purchaseId` | Purchase history and detail (includes refund request status and deadline) |
| POST | `/purchases/items/:purchaseItemId/refund-request` | Ask for a refund of one course (reason required, once per course, within 14 days) |
| POST | `/payments/opn/webhook` | Opn webhook (`charge.complete`), public, signature-checked |

### Learning — `/my-courses`
| Method | Path | Description |
| --- | --- | --- |
| GET | `/my-courses` | Enrolled courses |
| GET | `/my-courses/:courseId/player` | Course + lessons + progress |
| PATCH | `/my-courses/lessons/:lessonId/progress` | Report playback progress |

### Dashboards and admin
| Method | Path | Description |
| --- | --- | --- |
| GET | `/dashboard/student`, `/dashboard/instructor` | Role dashboards |
| GET | `/admin/dashboard` | Platform statistics |
| GET / PATCH | `/admin/users`, `/admin/users/:userId/status` | User management |
| GET / PATCH | `/admin/courses`, `/admin/courses/:courseId/status` | Course moderation |
| GET | `/admin/payments` | Payment list (status, date range, refund-needed filters) |
| POST | `/admin/payments/:purchaseId/refund` | Refund through Opn, or `{ manual: true, reference }` to record a manual transfer |
| GET | `/admin/refund-requests` | Refund requests with the student's progress in that course |
| POST | `/admin/refund-requests/:requestId/approve` | Approve and refund that course only (same body as the refund endpoint) |
| POST | `/admin/refund-requests/:requestId/reject` | Decline with `{ note }` shown to the student |
| GET | `/admin/payouts` | Each instructor's pending / available / paid-out earnings and payout account, plus recent payouts |
| POST | `/admin/payouts` | Record a bank transfer to an instructor `{ instructorId, amount, reference }` (can't exceed the available balance) |
| GET | `/instructor/earnings` | The instructor's earnings summary, payout account and payout history |
| PUT | `/instructor/earnings/account` | Save the bank account used for payouts |
| GET / POST / PATCH | `/admins`, `/admins/:adminId/status` | Admin accounts (super admin) |

---

## Authentication flow

**Email + password**

1. `LoginForm` calls the `loginAction` server action.
2. NextAuth's Credentials provider posts to `POST /auth/login`.
3. The API verifies the password with bcrypt and returns a short-lived JWT
   access token (15 min) and a refresh token (30 days).
4. Both are stored in the encrypted, httpOnly NextAuth session cookie. The access
   token is attached to every API call; the refresh token never leaves the server.

**Refresh tokens** — `src/proxy.ts` (Next.js proxy) runs before each page request:
when the access token has less than a minute left, it calls `POST /auth/refresh`
and writes the new tokens into both the request (so the page being rendered
already uses them) and the response cookie. This can't happen in the NextAuth
`jwt` callback, because Server Components can't write cookies — the new
refresh token would be lost and the next request would replay a used one.

- Refresh tokens are random, stored only as sha256 hashes, and **rotated** on
  every use. All tokens from one login form a *family*.
- Reusing a token that was already swapped (after a 30-second grace window for
  parallel requests) is treated as theft: the whole family is revoked and that
  device has to log in again.
- Every access token carries the user's `sessionVersion`. Changing or resetting
  the password, deleting the account, or **Log out of all devices** (Profile →
  Login & security) bumps it, so older access tokens stop working immediately,
  not just when they expire. Changing the password keeps the current device
  logged in with a fresh session.
- Log out revokes this device's refresh token at the API, not only the cookie.

**Two-factor authentication** — when `twoFactorEnabled` is on, step 3 returns
`{ codeRequired: true, challengeId }` instead of a token and emails a 6-digit
code. The web app keeps `challengeId` in an httpOnly cookie
(`src/lib/login-challenge.ts`) and shows `LoginCodeStep`; `POST /auth/login/code`
checks the code and only then issues the access token.

**Expired session** — when the refresh token is no longer valid, the proxy
clears the session and protected pages redirect to the login page. If the API
answers 401 for a stored token anyway, the web app sends the user to
`/session-expired`, which revokes the refresh token, clears the session and
redirects to the login page.

**Google**

1. `GoogleButton` triggers `signIn("google")`; NextAuth runs the OAuth flow.
2. In the `jwt` callback the Google **ID token** is forwarded to `POST /auth/google`.
3. The API verifies the ID token with `google-auth-library`, then finds the user by
   `googleId`, links Google to an existing account with the same email, or creates a
   new `STUDENT` account.
4. The API returns its own access token, which is stored in the session as above.

**Email verification** — registration stores the account with `emailVerifiedAt`
null and emails a link. Logging in with a password is refused until it is
clicked. Accounts created through Google are verified on the spot, because
Google already proved ownership of the address.

**Password reset** — `POST /auth/forgot-password` issues a random token, stores
only its sha256 hash, and emails the link; `POST /auth/reset-password` checks the
hash, writes the new bcrypt hash and marks the token used so the link cannot be
replayed. The endpoint always answers with the same message so that registered
emails cannot be enumerated.

**Payments (Opn)**

1. Card numbers never touch our servers: `CheckoutForm` loads Omise.js from Opn's
   CDN and turns the card into a one-time `tokn_...` token in the browser.
2. `POST /purchases/checkout` creates a `PENDING` purchase and an Opn charge. Cards
   may need 3-D Secure; PromptPay returns a QR code (valid 10 minutes); TrueMoney and
   mobile banking return an authorize URL. The web app then shows `/checkout/pending`.
   Opn's minimum charge is ฿20.
3. The purchase is settled from three places — the pending page polling
   `/purchases/:id/progress`, the `charge.complete` webhook, and a reconcile job that
   runs every 2 minutes. Each one **asks Opn for the charge status itself** instead
   of trusting the caller, and every step is idempotent, so courses are never
   unlocked or refunded twice.
4. Starting a new checkout cancels the previous pending one. If that old charge is
   paid later anyway (e.g. an old QR was scanned), the courses are unlocked, or the
   payment is refunded if the student already owns them. Methods Opn cannot refund
   (PromptPay) are flagged `manualRefundNeeded` for an admin to transfer back by hand.

**Webhook in production** — in Opn Dashboard (live mode) → Webhooks, set the URL
to `https://<your-api-host>/payments/opn/webhook`, copy the signing secret into
`OMISE_WEBHOOK_SECRET`, and switch `OMISE_SECRET_KEY` (API) and
`NEXT_PUBLIC_OMISE_PUBLIC_KEY` (web) to the live `skey_...` / `pkey_...` keys.
Test mode and live mode have separate webhooks and keys. For local testing,
expose the API (e.g. with ngrok) and point a test-mode webhook at it. Without a
webhook the reconcile job still settles payments, just a little later.

**Instructor payouts** — instructors get `INSTRUCTOR_REVENUE_SHARE_PERCENT` of
every paid sale. A sale becomes *available* once its 14-day refund window has
closed and it has no refund request under review; until then it is *pending*.
Instructors add their bank account on **Teach → Earnings**. Admins see who is
owed on **Admin → Payouts**, transfer the money from the bank themselves, then
record the amount and transfer reference — the instructor gets an email. The
API locks the instructor row while recording, so two admins can't pay out the
same balance twice. If an admin refunds a sale after it was paid out, the
instructor's balance goes negative and is taken from the next payout.

**Security hardening**

- **Rate limiting** (`@nestjs/throttler`, per client IP): 120 requests/min by
  default; endpoints that send email (register, forgot password, resend codes)
  5/min; password and code checks 10/min; token refresh 30/min. The Opn webhook
  is exempt. Because the API is only called by the Next.js server, the web app
  forwards the visitor's IP in `X-Forwarded-For` and the API trusts it only from
  `TRUST_PROXY`.
- **Login lockout** (stored in `login_attempts`, hashed keys): 5 wrong passwords
  from the same email + IP lock that device for 15 minutes, so someone else can't
  lock you out from their machine; 30 failures across all IPs lock the account.
- **Uploads**: images (JPG/PNG/WebP/GIF, no SVG) up to 15 MB, lesson videos up to
  100 MB, checked before the file is read into memory; Cloudinary re-checks image
  formats.
- **Bank account numbers** are encrypted at rest (`PAYOUT_ENCRYPTION_KEY`).
- **Headers**: the web app sends a Content-Security-Policy (only Opn, Google
  Identity Services and Cloudinary are allowed as external sources — add new
  services in `src/lib/security-headers.ts`), `X-Frame-Options: DENY`, nosniff,
  and HSTS in production; the API uses `helmet`.
- **Tokens in the browser**: `/api/auth/session` strips the API access token, so
  injected scripts can't read it; server code still gets it through `auth()`.

**Roles vs. capabilities** — `role` only separates regular users from admins.
Teaching lives in `isInstructor`, checked by `InstructorGuard` and carried in the
access token, so a single account can buy courses, study them and publish its
own. Enabling it returns a fresh access token, since the old one still claims
`isInstructor: false`.

---

## Scripts

### `api/`
| Command | Description |
| --- | --- |
| `pnpm start:dev` | Start in watch mode |
| `pnpm build` / `pnpm start:prod` | Build and run the compiled app |
| `pnpm lint` / `pnpm format` | ESLint (with `--fix`) / Prettier |
| `pnpm test` | Unit tests (payment settlement, refunds, webhook signatures) — no database needed |
| `pnpm test:e2e` | HTTP tests against the whole app — needs `api/.env` and a running database (read-only) |
| `pnpm test:cov` | Unit tests with coverage |
| `pnpm exec prisma migrate dev --name <change>` | Create and apply a migration after editing `schema.prisma` |
| `pnpm exec prisma migrate deploy` | Apply pending migrations (production / fresh databases) |
| `pnpm exec prisma studio` | Browse the database |
| `pnpm del` | Development only: wipe everything except users, courses and lessons (orders, refunds, payouts, carts, tokens…) |
| `pnpm videos:protect` | One-off: move lesson videos uploaded before signed delivery to Cloudinary's authenticated type (`--dry-run` to preview) |

### `web/`
| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:watch` | Vitest + Testing Library: card checks, formatting, form schemas, refund rules and key components (no API needed) |

---

## Deploy (free)

Free stack: **Neon** (PostgreSQL) + **Render** (API and web, free web services,
Singapore region) + the existing Cloudinary, Brevo and Opn (test mode)
accounts. `render.yaml` at the repo root creates both services in one go.

> Free Render services sleep after 15 minutes without traffic; the first
> visitor after that waits about a minute. Fine for a demo or portfolio — for
> real sales use a paid instance. While the API sleeps, the 2-minute payment
> reconcile job pauses too (the Opn webhook and the pending page still settle
> payments).

**1. Database (Neon)**
1. Sign up at neon.tech → create a project in **AWS Asia Pacific (Singapore)**.
2. Copy the **direct** connection string (not the `-pooler` one) and make sure it
   ends with `?sslmode=require`. Migrations run automatically on every API start.

**2. Render**
1. Sign up at render.com with GitHub → **New → Blueprint** → pick this repo.
2. Render reads `render.yaml` and asks for the values marked `sync: false`.
   Services are named `learnora-api` and `learnora-web`, so the URLs are usually
   `https://learnora-api.onrender.com` and `https://learnora-web.onrender.com`
   (Render adds a suffix if the name is taken — check the dashboard):
   - API: `DATABASE_URL`, `FRONTEND_URL` (web URL), `GOOGLE_CLIENT_ID`,
     Cloudinary keys, `BREVO_API_KEY`, `MAIL_FROM`, `OMISE_SECRET_KEY`,
     `OMISE_WEBHOOK_SECRET` (fill in after step 4; leave a placeholder first)
   - Web: `API_URL` (API URL), `AUTH_URL` (web URL), Google client ID/secret,
     `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_OMISE_PUBLIC_KEY`
   - Secrets (`ACCESS_TOKEN_SECRET`, `PAYOUT_ENCRYPTION_KEY`,
     `INTERNAL_API_SECRET`, `AUTH_SECRET`) are generated by Render.
     **Copy `PAYOUT_ENCRYPTION_KEY` somewhere safe** — losing it makes saved
     bank account numbers unreadable.
3. If a URL turns out different, update `FRONTEND_URL` / `API_URL` / `AUTH_URL`
   and redeploy (the web app reads `NEXT_PUBLIC_*` at build time).

**3. Google sign-in** — Google Cloud Console → Credentials → your OAuth client:
- Authorized JavaScript origins: the web URL
- Authorized redirect URIs: `<web URL>/api/auth/callback/google`

**4. Opn webhook (test mode)** — Opn Dashboard → Webhooks → add
`<API URL>/payments/opn/webhook`, then put the signing secret into
`OMISE_WEBHOOK_SECRET` on the API service.

**5. Check** — open `<API URL>/health` (should say `{"status":"ok"}`), then
sign up on the web app, verify the email, and buy a course with a test card.

To turn on real payments later: complete Opn's business verification, switch to
`skey_` / `pkey_` live keys, and add a live-mode webhook.
