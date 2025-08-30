
-- Ensure RLS is enabled on the tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
