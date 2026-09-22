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

---

## Features

### Student
- Browse and search courses with filters (category, level, price, keyword) and pagination
- Wishlist and shopping cart
- Stripe checkout with success / failure pages and purchase history
- Course player with per-lesson progress (last position, max watched, completion)
- Dashboard with enrolled courses and learning progress
- Profile: edit personal info, upload/remove avatar, change password

### Instructor
- Create, edit, publish and delete courses (thumbnail upload via Cloudinary)
- Manage lessons: add, edit, reorder, delete (video upload via Cloudinary)
- Instructor dashboard: revenue, students and course performance
- Preview own course in the player

### Admin / Super admin
- Admin dashboard with platform-wide statistics
- Manage users (suspend / re-activate accounts)
- Moderate courses (publish, suspend, delete)
- Review payments and issue refunds
- Super admin: create and manage admin accounts

### Auth and account security
- Email + password registration with **mandatory email verification** — the
  account cannot log in until the link in the inbox is clicked
- Sign in with Google (OAuth via NextAuth, ID token verified server-side)
- Forgot password / reset password with single-use, hashed tokens
- **Login & security** settings: connect or disconnect Google, set a first
  password, and change the email address (password + confirmation link required)
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
| Payments | Stripe (Payment Intents) |
| Media | Cloudinary (avatars, thumbnails, lesson videos) |
| Package manager | pnpm |

---

## Project structure

```
learnora/
├── api/                        # NestJS REST API
│   ├── prisma/schema.prisma    # database schema
│   └── src/
│       ├── auth/               # login, register, Google, password reset, guards
│       ├── user/               # profile, avatar, change password
│       ├── course/             # course CRUD + catalog
│       ├── lesson/             # lesson CRUD + reordering
│       ├── cart/  wishlist/    # cart and wishlist
│       ├── purchase/           # Stripe checkout + orders
│       ├── learning/           # enrolled courses, player, progress
│       ├── dashboard/          # student & instructor dashboards
│       ├── admin/              # admin console endpoints
│       ├── infrastructure/     # bcrypt, jwt, Cloudinary, Stripe
│       ├── common/             # decorators (@Public, @Roles, @CurrentUser)
│       └── config/             # env validation (Zod)
└── web/                        # Next.js client
    └── src/
        ├── app/
        │   ├── (auth)/         # login, signup, forgot/reset password
        │   ├── (public)/       # landing page, course catalog & detail
        │   ├── (student)/      # dashboard, my courses, cart, wishlist, profile
        │   ├── (checkout)/     # Stripe checkout and result pages
        │   ├── (player)/       # course player
        │   ├── instructor/     # instructor console
        │   └── admin/          # admin console
        ├── components/         # features/, layout/, shared/, ui/
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
- Accounts for: Google Cloud (OAuth client), Cloudinary, Stripe

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
pnpm exec prisma db push         # create tables
pnpm exec prisma generate        # generate the Prisma client
```

On a database that already holds users, run the backfill once so existing
instructors keep their teaching rights and nobody is locked out by the new
email verification gate:

```bash
psql "$DATABASE_URL" -f prisma/backfill-instructor-capability.sql
```

> The schema uses the `citext` type for emails so that `Ann@mail.com` and
> `ann@mail.com` are treated as the same address. Enable it once per database:
> `CREATE EXTENSION IF NOT EXISTS citext;`

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
| `ACCESS_TOKEN_EXPIRES_IN` | Access token lifetime in seconds (e.g. `86400`) |
| `FRONTEND_URL` | Base URL used to build the links sent by email |
| `RESET_TOKEN_EXPIRES_IN` | Password-reset link lifetime in seconds (e.g. `900`) |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | Verification link lifetime in seconds (e.g. `86400`) |
| `BREVO_API_KEY` | Brevo API key — optional, but sending email fails with 503 without it |
| `MAIL_FROM` / `MAIL_FROM_NAME` | Sender address (must be verified in Brevo) and display name |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID — must match the one used by the web app |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |
| `STRIPE_SECRET_KEY` | Stripe secret key |

Env vars are validated with Zod at boot (`src/config/env.validation.ts`) — the API
refuses to start if anything is missing or malformed.

### `web/.env.local`

| Variable | Description |
| --- | --- |
| `API_URL` | Base URL of the NestJS API (e.g. `http://localhost:8000`) |
| `AUTH_SECRET` | NextAuth session encryption secret |
| `NEXTAUTH_URL` | Public URL of the web app (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client credentials |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same client ID, exposed to the browser for the connect-account button |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

> Both apps must use the **same** `GOOGLE_CLIENT_ID`: the web app obtains the Google
> ID token and the API verifies its audience against that client ID.

---

## Data model

```
User ──< Course (as instructor)
User ──< Wishlist >── Course
User ──< CartItem >── Course
User ──< Purchase ──< PurchaseItem >── Course
Course ──< Lesson ──< LessonProgress >── PurchaseItem
```

- **User** — `role` (regular user vs. admin), `isInstructor` (teaching
  capability), `status` (suspended flag), `emailVerifiedAt`, optional `password`
  (null for Google-only accounts) and optional `googleId`.
- **EmailVerificationToken / PasswordResetToken** — single-use links. Only a
  sha256 hash of each token is stored, and `pendingEmail` holds the address
  waiting to be confirmed during an email change.
- **Course** — category, level, price, access type (`LIFETIME` / `LIMITED` with a
  duration), publishing status.
- **Purchase / PurchaseItem** — an order and its lines; a `PurchaseItem` is the
  enrollment record, carrying `expiresAt` and `enrollmentStatus`.
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
| POST | `/auth/login` | Log in, returns `access_token` + user |
| POST | `/auth/google` | Exchange a Google ID token for an access token |
| GET | `/auth/profile` | Current user (requires auth) |
| POST | `/auth/verify-email` | Confirm a signup or an email change |
| POST | `/auth/resend-verification` | Send the verification link again |
| POST | `/auth/forgot-password` | Request a password-reset link |
| POST | `/auth/reset-password` | Set a new password with a reset token |

### Users — `/users`
| Method | Path | Description |
| --- | --- | --- |
| PATCH | `/users/me` | Update first/last name |
| PATCH | `/users/me/avatar` | Upload an avatar (multipart) |
| DELETE | `/users/me/avatar` | Remove the avatar |
| PATCH | `/users/me/password` | Change password (requires the current one) |
| GET | `/users/me/security` | Login methods overview for the settings page |
| POST | `/users/me/password` | Set a first password (Google-only accounts) |
| POST | `/users/me/google` | Connect a Google account (verified ID token) |
| DELETE | `/users/me/google` | Disconnect Google (blocked without a password) |
| POST | `/users/me/email-change` | Request an email change (password required) |
| POST | `/users/me/instructor` | Enable teaching; returns a refreshed access token |

### Courses — `/courses`
| Method | Path | Description |
| --- | --- | --- |
| GET | `/courses` | Public catalog with filters and pagination |
| GET | `/courses/:courseId` | Public course detail |
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
| POST | `/purchases/checkout` | Create a Stripe payment intent |
| GET | `/purchases`, `/purchases/:purchaseId` | Purchase history and detail |

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
| GET | `/admin/payments` | Payment list |
| POST | `/admin/payments/:purchaseId/refund` | Refund a purchase |
| GET / POST / PATCH | `/admins`, `/admins/:adminId/status` | Admin accounts (super admin) |

---

## Authentication flow

**Email + password**

1. `LoginForm` calls the `loginAction` server action.
2. NextAuth's Credentials provider posts to `POST /auth/login`.
3. The API verifies the password with bcrypt and signs a JWT access token.
4. The token is stored in the NextAuth JWT session and attached to every
   subsequent API call.

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
| `pnpm test` / `pnpm test:e2e` / `pnpm test:cov` | Jest unit / e2e / coverage |
| `pnpm exec prisma migrate dev` | Apply migrations |
| `pnpm exec prisma studio` | Browse the database |

### `web/`
| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
