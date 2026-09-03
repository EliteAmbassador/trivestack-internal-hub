# Trivestack Internal Reports

A role-based internal reporting workspace for Trivestack, built with Next.js and
Postgres for Vercel deployment.

## Prerequisites

- Node.js `>=22.13.0`
- A Postgres database reachable through `DATABASE_URL`

## Environment

Copy `.env.example` to `.env.local` for local development and set the same
variables in Vercel:

- `DATABASE_URL`: Postgres connection string
- `INITIAL_SUPER_ADMIN_EMAIL`: email allowed to create the first super admin
- `INITIAL_SUPER_ADMIN_NAME`: display name for the first super admin
- `ALLOWED_EMAIL_DOMAINS`: comma-separated invite/signup email domains

There is no shared login access code. Users authenticate with their own
passwords.

## First Login

On an empty database, visit `/login` and sign in with the
`INITIAL_SUPER_ADMIN_EMAIL`. The password you enter there becomes the first
super-admin password and seeds the workspace with the production project list.

After that, the super admin invites team members from the Team page. Invitees
open their invite link, complete their profile, and set their own password.

## Database

The app can create its tables at runtime, and the equivalent Postgres schema is
available in `db/vercel-postgres-schema.sql` if you prefer to initialize the
database manually.

## Diagnostic Commands

- `npm run dev`: start the local Next.js development server
- `npm run build`: build the Vercel-ready Next.js app
- `npm run start`: start the built Next.js app
- `npm test`: build and verify the rendered development-preview metadata
- `npm run db:generate`: generate Drizzle migrations after schema changes
