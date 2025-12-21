CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: subscription_plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan AS ENUM (
    'monthly',
    'annual',
    'pay_as_you_go'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'pending',
    'active',
    'cancelled',
    'expired'
);


--
-- Name: check_ticket_availability(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_ticket_availability(event_id_input uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    CASE 
      WHEN e.capacity IS NULL THEN true
      ELSE e.tickets_issued < e.capacity
    END
  FROM public.events e
  WHERE e.id = event_id_input;
$$;


--
-- Name: check_tier_availability(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_tier_availability(tier_id_input uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    CASE 
      WHEN t.capacity IS NULL THEN true
      ELSE t.tickets_sold < t.capacity
    END
  FROM public.ticket_tiers t
  WHERE t.id = tier_id_input AND t.is_active = true;
$$;


--
-- Name: cleanup_expired_otps(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_otps() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.otp_verifications WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;


--
-- Name: get_ticket_by_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ticket_by_code(ticket_code_input text) RETURNS TABLE(id uuid, ticket_code text, attendee_name text, attendee_email text, attendee_phone text, is_validated boolean, validated_at timestamp with time zone, created_at timestamp with time zone, event_id uuid, event_title text, event_venue text, event_date timestamp with time zone, event_promotion_text text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    t.id,
    t.ticket_code,
    t.attendee_name,
    t.attendee_email,
    t.attendee_phone,
    t.is_validated,
    t.validated_at,
    t.created_at,
    e.id as event_id,
    e.title as event_title,
    e.venue as event_venue,
    e.event_date,
    e.promotion_text as event_promotion_text
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.ticket_code = ticket_code_input
  LIMIT 1;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, account_type, company_name, plan_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual'),
    NEW.raw_user_meta_data->>'company_name',
    COALESCE(NEW.raw_user_meta_data->>'plan_type', 'free')
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_ticket_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_ticket_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.events
  SET tickets_issued = tickets_issued + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;


--
-- Name: increment_tier_ticket_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_tier_ticket_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.tier_id IS NOT NULL THEN
    UPDATE public.ticket_tiers
    SET tickets_sold = tickets_sold + 1
    WHERE id = NEW.tier_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: business_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    company_email text NOT NULL,
    company_phone text,
    plan public.subscription_plan NOT NULL,
    status public.subscription_status DEFAULT 'pending'::public.subscription_status NOT NULL,
    price_per_month numeric(10,2),
    events_limit integer,
    events_used integer DEFAULT 0,
    started_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: data_exports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_exports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_id uuid NOT NULL,
    export_type text NOT NULL,
    record_count integer NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    event_date timestamp with time zone NOT NULL,
    venue text NOT NULL,
    promotion_text text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_free boolean DEFAULT true NOT NULL,
    ticket_price numeric(10,2) DEFAULT 0.00,
    currency text DEFAULT 'USD'::text,
    tickets_issued integer DEFAULT 0 NOT NULL,
    gallery_images text[] DEFAULT '{}'::text[],
    faq jsonb DEFAULT '[]'::jsonb,
    schedule jsonb DEFAULT '[]'::jsonb,
    sponsors jsonb DEFAULT '[]'::jsonb,
    additional_info text,
    category text DEFAULT 'general'::text,
    capacity integer,
    tags text[] DEFAULT '{}'::text[],
    videos text[] DEFAULT '{}'::text[],
    social_links jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT check_capacity_positive CHECK (((capacity IS NULL) OR (capacity > 0)))
);


--
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otp_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    otp_code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_type text NOT NULL,
    company_name text,
    plan_type text DEFAULT 'free'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_account_type_check CHECK ((account_type = ANY (ARRAY['individual'::text, 'company'::text]))),
    CONSTRAINT profiles_plan_type_check CHECK ((plan_type = ANY (ARRAY['free'::text, 'paid'::text])))
);


--
-- Name: ticket_claim_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_claim_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    email text NOT NULL,
    ip_address text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ticket_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0.00 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    capacity integer,
    tickets_sold integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    ticket_code text NOT NULL,
    attendee_name text NOT NULL,
    attendee_email text NOT NULL,
    is_validated boolean DEFAULT false NOT NULL,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attendee_phone text,
    tier_id uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_subscriptions business_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: data_exports data_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: ticket_claim_logs ticket_claim_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claim_logs
    ADD CONSTRAINT ticket_claim_logs_pkey PRIMARY KEY (id);


--
-- Name: ticket_tiers ticket_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_tiers
    ADD CONSTRAINT ticket_tiers_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_code_key UNIQUE (ticket_code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_data_exports_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_exports_created_at ON public.data_exports USING btree (created_at);


--
-- Name: idx_data_exports_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_exports_event_id ON public.data_exports USING btree (event_id);


--
-- Name: idx_data_exports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_data_exports_user_id ON public.data_exports USING btree (user_id);


--
-- Name: idx_events_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_category ON public.events USING btree (category);


--
-- Name: idx_events_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_date ON public.events USING btree (event_date);


--
-- Name: idx_events_is_free; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_is_free ON public.events USING btree (is_free);


--
-- Name: idx_events_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_search ON public.events USING gin (to_tsvector('english'::regconfig, ((((title || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || venue)));


--
-- Name: idx_otp_verifications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_verifications_email ON public.otp_verifications USING btree (email);


--
-- Name: idx_otp_verifications_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_otp_verifications_expires ON public.otp_verifications USING btree (expires_at);


--
-- Name: idx_ticket_claim_logs_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_claim_logs_email ON public.ticket_claim_logs USING btree (email, event_id);


--
-- Name: idx_ticket_claim_logs_ip_event_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ticket_claim_logs_ip_event_time ON public.ticket_claim_logs USING btree (ip_address, event_id, created_at DESC);


--
-- Name: idx_tickets_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_phone ON public.tickets USING btree (attendee_phone);


--
-- Name: tickets increment_tier_count_on_ticket; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER increment_tier_count_on_ticket AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.increment_tier_ticket_count();


--
-- Name: tickets on_ticket_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_ticket_created AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.increment_ticket_count();


--
-- Name: business_subscriptions update_business_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_subscriptions_updated_at BEFORE UPDATE ON public.business_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ticket_tiers update_ticket_tiers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ticket_tiers_updated_at BEFORE UPDATE ON public.ticket_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_subscriptions business_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_subscriptions
    ADD CONSTRAINT business_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: data_exports data_exports_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: data_exports data_exports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_exports
    ADD CONSTRAINT data_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: events events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ticket_claim_logs ticket_claim_logs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_claim_logs
    ADD CONSTRAINT ticket_claim_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: ticket_tiers ticket_tiers_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_tiers
    ADD CONSTRAINT ticket_tiers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.ticket_tiers(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: events Admins can delete all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all events" ON public.events FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tickets Admins can delete all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all tickets" ON public.tickets FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))));


--
-- Name: business_subscriptions Admins can delete subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete subscriptions" ON public.business_subscriptions FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))));


--
-- Name: ticket_tiers Admins can manage all tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tiers" ON public.ticket_tiers USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can update all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all events" ON public.events FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: business_subscriptions Admins can update all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all subscriptions" ON public.business_subscriptions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tickets Admins can update all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all tickets" ON public.tickets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ticket_claim_logs Admins can view all claim logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all claim logs" ON public.ticket_claim_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: events Admins can view all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all events" ON public.events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: data_exports Admins can view all exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all exports" ON public.data_exports FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::public.app_role)))));


--
-- Name: business_subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.business_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tickets Admins can view all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: otp_verifications Allow service role full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow service role full access" ON public.otp_verifications USING (true) WITH CHECK (true);


--
-- Name: tickets Anyone can claim free event tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can claim free event tickets" ON public.tickets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = tickets.event_id) AND (events.is_free = true)))));


--
-- Name: ticket_tiers Anyone can view active tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active tiers" ON public.ticket_tiers FOR SELECT USING ((is_active = true));


--
-- Name: events Anyone can view events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);


--
-- Name: ticket_tiers Event owners can create tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event owners can create tiers" ON public.ticket_tiers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = ticket_tiers.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: ticket_tiers Event owners can delete their tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event owners can delete their tiers" ON public.ticket_tiers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = ticket_tiers.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: ticket_tiers Event owners can update their tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event owners can update their tiers" ON public.ticket_tiers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = ticket_tiers.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: ticket_tiers Event owners can view all their tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event owners can view all their tiers" ON public.ticket_tiers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = ticket_tiers.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: ticket_claim_logs Event owners can view their event claim logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event owners can view their event claim logs" ON public.ticket_claim_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = ticket_claim_logs.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: tickets Event owners can view their event tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Event owners can view their event tickets" ON public.tickets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = tickets.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: events Users can create their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own events" ON public.events FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: business_subscriptions Users can create their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own subscription" ON public.business_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tickets Users can create tickets for their events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tickets for their events" ON public.tickets FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = tickets.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: events Users can delete their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: data_exports Users can log their own exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can log their own exports" ON public.data_exports FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: events Users can update their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: business_subscriptions Users can update their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscription" ON public.business_subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tickets Users can update tickets for their events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update tickets for their events" ON public.tickets FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.events
  WHERE ((events.id = tickets.event_id) AND (events.user_id = auth.uid())))));


--
-- Name: events Users can view all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all events" ON public.events FOR SELECT USING (true);


--
-- Name: data_exports Users can view their own exports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own exports" ON public.data_exports FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: business_subscriptions Users can view their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscription" ON public.business_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: business_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: data_exports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: otp_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_claim_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_claim_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;