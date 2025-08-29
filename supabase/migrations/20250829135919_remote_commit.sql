

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'general',
    'viewer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" bigint NOT NULL,
    "patientId" "text",
    "patientName" "text",
    "date" "date" NOT NULL,
    "time" "text",
    "consultation" "text",
    "lastUpdatedBy" "text",
    "isDeleted" boolean DEFAULT false,
    "reservationType" "text" NOT NULL,
    "facilityName" "text",
    "startTimeRange" "text",
    "endTimeRange" "text",
    "reason" "text",
    "createdAt" timestamp with time zone DEFAULT "now"(),
    "lastUpdatedAt" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


ALTER TABLE "public"."appointments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."appointments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."blocked_slots" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "endDate" "date",
    "startTime" time without time zone,
    "endTime" time without time zone,
    "reason" "text" NOT NULL,
    "lastUpdatedBy" "text",
    "isDeleted" boolean DEFAULT false
);


ALTER TABLE "public"."blocked_slots" OWNER TO "postgres";


ALTER TABLE "public"."blocked_slots" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."blocked_slots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "userid" "text" NOT NULL,
    "password" "text",
    "name" "text" NOT NULL,
    "department" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'general'::"public"."user_role" NOT NULL,
    "mustChangePassword" boolean DEFAULT true,
    "isDeleted" boolean DEFAULT false,
    "lastUpdatedBy" "text",
    "email_status" "text",
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "lastUpdatedAt" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blocked_slots"
    ADD CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userid");



CREATE POLICY "Allow delete for general and admin users on appointments" ON "public"."appointments" FOR DELETE USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'general'::"text") OR (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text")));



CREATE POLICY "Allow delete for general and admin users on blocked_slots" ON "public"."blocked_slots" FOR DELETE USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'general'::"text") OR (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text")));



CREATE POLICY "Allow update for general and admin users on appointments" ON "public"."appointments" FOR UPDATE USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'general'::"text") OR (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text"))) WITH CHECK (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'general'::"text") OR (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text")));



CREATE POLICY "Allow update for general and admin users on blocked_slots" ON "public"."blocked_slots" FOR UPDATE USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'general'::"text") OR (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text"))) WITH CHECK (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'general'::"text") OR (( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text")));



CREATE POLICY "Enable delete for authenticated users only" ON "public"."users" FOR DELETE TO "authenticated" USING ((("auth"."uid"())::"text" = "userid"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("auth"."uid"())::"text" = "userid")) WITH CHECK ((("auth"."uid"())::"text" = "userid"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."appointments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."appointments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."appointments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_slots" TO "anon";
GRANT ALL ON TABLE "public"."blocked_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_slots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."blocked_slots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."blocked_slots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."blocked_slots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
