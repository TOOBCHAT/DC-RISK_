-- ============================================================
-- DC-RISK: Supabase Database Schema Migration
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Users profile table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk analyses (search history)
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token_address TEXT NOT NULL,
  token_name TEXT,
  token_symbol TEXT,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  
  -- Full AI report stored as structured JSON
  report_data JSONB NOT NULL DEFAULT '{}',
  
  -- Agent reasoning log for transparency
  agent_log JSONB DEFAULT '[]',
  
  -- Raw data fetched by agents (for Phase 2 chatbot context)
  raw_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2: Chat conversations per analysis
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_token_address ON public.analyses(token_address);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_analysis_id ON public.chat_messages(analysis_id);

-- ─── Row Level Security ─────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Analyses: users can only see their own
CREATE POLICY "Users can view own analyses" ON public.analyses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON public.analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat messages: users can only see their own
CREATE POLICY "Users can view own chats" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Auto-create profile on signup (trigger) ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Service role policy for backend ────────────────────────────
-- The backend uses service_role key to insert analyses after AI processing
CREATE POLICY "Service role can insert analyses" ON public.analyses
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update analyses" ON public.analyses
  FOR UPDATE USING (true);
