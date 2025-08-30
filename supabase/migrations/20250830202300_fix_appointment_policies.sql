-- APPOINTMENTS POLICIES --

-- Drop all existing policies for appointments to ensure a clean slate
DROP POLICY IF EXISTS "Allow update for general and admin users on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow delete for general and admin users on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow insert for general and admin users on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Allow admin full access on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow viewer read access on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow general users to select their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow general users to create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow general users to update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow general users to delete their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow admin and general full access on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow authenticated users read access on appointments" ON public.appointments;


-- Create new, correct policies for appointments

-- 1. Allow admin and general users full write access to appointments
CREATE POLICY "Allow admin and general write access on appointments"
ON public.appointments
FOR ALL
USING (((( SELECT auth.jwt() ->> 'role'::text) = 'admin'::text) OR (( SELECT auth.jwt() ->> 'role'::text) = 'general'::text)))
WITH CHECK (((( SELECT auth.jwt() ->> 'role'::text) = 'admin'::text) OR (( SELECT auth.jwt() ->> 'role'::text) = 'general'::text)));

-- 2. Allow all authenticated users to read all appointments (includes viewers)
CREATE POLICY "Allow authenticated users read access on appointments"
ON public.appointments
FOR SELECT
USING ( (auth.role() = 'authenticated') );


-- BLOCKED SLOTS POLICIES --

-- Drop existing policies for blocked_slots
DROP POLICY IF EXISTS "Allow update for general and admin users on blocked_slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Allow delete for general and admin users on blocked_slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Allow admin and general full access on blocked_slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Allow admin and general write access on blocked_slots" ON public.blocked_slots;
DROP POLICY IF EXISTS "Allow authenticated users read access on blocked_slots" ON public.blocked_slots;


-- Create new policies for blocked_slots

-- 1. Allow admin and general users full write access to blocked_slots
CREATE POLICY "Allow admin and general write access on blocked_slots"
ON public.blocked_slots
FOR ALL
USING (((( SELECT auth.jwt() ->> 'role'::text) = 'admin'::text) OR (( SELECT auth.jwt() ->> 'role'::text) = 'general'::text)))
WITH CHECK (((( SELECT auth.jwt() ->> 'role'::text) = 'admin'::text) OR (( SELECT auth.jwt() ->> 'role'::text) = 'general'::text)));

-- 2. Allow all authenticated users to read blocked_slots
CREATE POLICY "Allow authenticated users read access on blocked_slots"
ON public.blocked_slots
FOR SELECT
USING ( (auth.role() = 'authenticated') );