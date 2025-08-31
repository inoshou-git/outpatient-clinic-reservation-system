-- appointments table policies
-- Allow update for general and admin users
CREATE POLICY "Allow update for general and admin users on appointments"
ON public.appointments
FOR UPDATE
USING ( (select auth.jwt() ->> 'role') = 'general' OR (select auth.jwt() ->> 'role') = 'admin' )
WITH CHECK ( (select auth.jwt() ->> 'role') = 'general' OR (select auth.jwt() ->> 'role') = 'admin' );

-- Allow delete for general and admin users
CREATE POLICY "Allow delete for general and admin users on appointments"
ON public.appointments
FOR DELETE
USING ( (select auth.jwt() ->> 'role') = 'general' OR (select auth.jwt() ->> 'role') = 'admin' );

-- blocked_slots table policies
-- Allow update for general and admin users
CREATE POLICY "Allow update for general and admin users on blocked_slots"
ON public.blocked_slots
FOR UPDATE
USING ( (select auth.jwt() ->> 'role') = 'general' OR (select auth.jwt() ->> 'role') = 'admin' )
WITH CHECK ( (select auth.jwt() ->> 'role') = 'general' OR (select auth.jwt() ->> 'role') = 'admin' );

-- Allow delete for general and admin users
CREATE POLICY "Allow delete for general and admin users on blocked_slots"
ON public.blocked_slots
FOR DELETE
USING ( (select auth.jwt() ->> 'role') = 'general' OR (select auth.jwt() ->> 'role') = 'admin' );
