## Seat Booking System (Next.js + Supabase)

Modern seat booking system built with **Next.js (App Router)**, **Tailwind CSS**, and **Supabase** for auth and persistence.

### Features

- Week‑wise batch schedules (Batch 1 / Batch 2)
- Auto seat allocation (default seats 1–40 per batch)
- Floater seats 41–50
- Temporary floater seats when employees release their assigned seat
- Booking allowed only after 3 PM and not on holidays
- Week view with regular / floater / temp‑floater statistics
- Supabase Auth (email + password) with employee profiles

---

### 1. Install dependencies

```bash
npm install
npm install @supabase/supabase-js
```

### 2. Supabase configuration

Create a Supabase project at `https://supabase.com` and grab:

- Project URL
- anon public key

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Restart the dev server after changing env vars.

### 3. Database schema

Run the following SQL in Supabase (SQL editor) to create the necessary tables:

```sql
-- Employees table
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id text not null unique,
  name text not null,
  batch text not null check (batch in ('Batch 1', 'Batch 2')),
  default_seat int not null check (default_seat between 1 and 40),
  created_at timestamptz not null default now()
);

-- Allocations table
create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  week text not null,        -- e.g. 'Week 1', 'Week 2'
  day text not null,         -- e.g. 'Mon', 'Tue'
  seat int not null,         -- 1-50
  allocated_to_employee_id text, -- employees.employee_id
  batch text,                -- owning/booking batch
  type text not null check (type in ('regular', 'floater', 'temp_floater')),
  status text not null check (status in ('allocated', 'released', 'booked')),
  created_at timestamptz not null default now()
);

-- Helpful unique constraint for upserts (one row per week/day/seat/batch)
create unique index if not exists allocations_unique_idx
on public.allocations (week, day, seat, coalesce(batch, ''));
```

> **Note:** For production, you should enable Row Level Security (RLS) on these tables and add policies so that:
> - Users can only read/write their own `employees` row.
> - Users can read all `allocations`, but can only update rows related to their own employee or book available temp floaters.
>
> For this demo, RLS can be left disabled or configured later. The app will still work without RLS.

### 4. Run the app

```bash
npm run dev
```

Then open `http://localhost:3000`.

---

### Auth & Profiles

- Go to `/login` to **sign up** or **log in**.
- During **sign up**, each employee provides:
  - Email & password (Supabase Auth)
  - Employee ID (unique)
  - Name
  - Batch (`Batch 1` or `Batch 2`)
- On sign up, the system auto‑assigns a **default seat (1–40)** within their batch.
  - Seats are assigned sequentially per batch (first employee gets 1, etc.).

After login, the main app at `/` shows:

- Logged‑in employee (name, employee ID, batch)
- Default seat
- Logout button

---

### Auto Seat Allocation

- `employees.default_seat` — permanent seat per employee within their batch (1–40).
- `allocations` — per week/day/seat status.

Logic:

- When a user logs in or changes week, the app calls
  `ensureAutoAllocationsForWeek(week, batch)` to ensure that for every
  scheduled working day for that batch and every employee in that batch,
  an `allocations` row exists:

  - `type = 'regular'`
  - `status = 'allocated'`
  - `seat = default_seat`

- On a batch’s working day, each employee automatically has their regular seat
  allocated — no need to manually book it.

---

### Release & Temporary Floaters

- When an employee **releases** their regular seat for a specific week/day:
  - The corresponding `allocations` row is updated to:
    - `type = 'temp_floater'`
    - `status = 'released'`
  - That seat becomes a **temporary floater** for that day.
- Opposite‑batch employees working cross‑batch can then:
  - Book:
    - Regular floaters `41–50`, and
    - Any **released temp floater** seats for that day.
  - Bookings still respect:
    - After‑3PM rule
    - Holiday rule
    - Batch schedule rule

Week view displays:

- Regular allocations
- Floaters booked
- Temp floaters (available / booked)
- Released count

---

### Key Files

- `src/lib/supabaseClient.js` — Supabase client setup.
- `src/lib/auth.js` — auth helpers (sign in/out, sign up, profile fetch).
- `src/lib/allocations.js` — allocation utilities (auto‑alloc, release, book, week data).
- `src/lib/rules.js` — business rules: batches, holidays, 3PM rule, etc.
- `src/app/login/page.js` — polished login/signup UI.
- `src/app/page.js` — protected main booking UI.
- `src/components/SeatGrid.jsx` — seat map with auto‑assigned, floater, and temp‑floater states.
- `src/components/WeekView.jsx` — weekly allocation overview.

- ---

## 🔑 Demo Credentials

> ⚠️ This project uses Supabase for authentication.  
> Demo accounts are provided below for evaluation.
> New accounts can be created using the create account feature.

### 👩‍💼 Admin
Email: admin@wissen.com  
Password: 12345678  

### 👨‍💼 Employee – Batch 1
Email: anushka@wissen.com  
Password: 12345678  

### 👨‍💼 Employee – Batch 2
Email: asmi@wissen.com  
Password: 12345678
