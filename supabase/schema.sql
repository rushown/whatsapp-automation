-- WhatsApp Automation Bot — Supabase schema
-- Run in Supabase SQL Editor (enable pgvector extension first)

create extension if not exists vector;

-- Admin profiles (sync with auth.users or standalone JWT users)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  name text not null,
  email text unique not null,
  password_hash text,
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar text,
  blocked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- WhatsApp end-users
create table if not exists whatsapp_users (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  display_name text,
  blocked boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bot global configuration (single row or keyed)
create table if not exists bot_config (
  id uuid primary key default gen_random_uuid(),
  key text unique not null default 'default',
  default_intent_threshold float default 0.78,
  global_silence boolean default true,
  ai_provider text default 'groq' check (ai_provider in ('groq', 'deepseek', 'openai')),
  ai_system_prompt text,
  openai_api_key_encrypted text,
  groq_api_key_encrypted text,
  deepseek_api_key_encrypted text,
  meta_access_token_encrypted text,
  meta_phone_number_id text,
  meta_business_account_id text,
  webhook_verify_token text,
  elevenlabs_api_key_encrypted text,
  elevenlabs_voice_id text default '21m00Tcm4TlvDq8ikWAM',
  elevenlabs_stability float default 0.5,
  elevenlabs_similarity_boost float default 0.75,
  embedding_model text default 'text-embedding-3-small',
  whatsapp_api_version text default 'v21.0',
  updated_at timestamptz default now()
);

-- Intents with workflow configuration
create table if not exists intents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  workflow_type text not null default 'text'
    check (workflow_type in ('text', 'voice', 'collect_data', 'http', 'document')),
  response_text text,
  response_voice_script text,
  threshold float default 0.78,
  is_active boolean default true,
  http_url text,
  http_method text default 'POST',
  http_headers jsonb default '{}',
  collection_fields jsonb default '[]',
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Example utterances per intent (for embedding refresh)
create table if not exists intent_examples (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references intents(id) on delete cascade,
  utterance text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);

create index if not exists intent_examples_intent_id on intent_examples(intent_id);

-- Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  whatsapp_user_id uuid references whatsapp_users(id) on delete set null,
  phone text not null,
  status text default 'open' check (status in ('open', 'closed', 'collecting')),
  matched_intent_id uuid references intents(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists conversations_phone on conversations(phone);

-- Messages log
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  phone text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message_type text default 'text',
  content text,
  meta_message_id text,
  intent_id uuid references intents(id) on delete set null,
  intent_score float,
  status text default 'received',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists messages_conversation_id on messages(conversation_id);
create index if not exists messages_phone on messages(phone);
create index if not exists messages_created_at on messages(created_at desc);
create unique index if not exists messages_meta_message_id_unique on messages(meta_message_id) where meta_message_id is not null;

-- Data collection sessions
create table if not exists collection_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  intent_id uuid not null references intents(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  current_field_index int default 0,
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists collection_sessions_phone_active
  on collection_sessions(phone) where status = 'active';

-- Collected field values (persist BEFORE any downstream API)
create table if not exists collected_data (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references collection_sessions(id) on delete cascade,
  phone text not null,
  intent_id uuid not null references intents(id) on delete cascade,
  field_key text not null,
  field_label text,
  value text not null,
  validated boolean default false,
  created_at timestamptz default now()
);

create index if not exists collected_data_session on collected_data(session_id);

-- Analytics events
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  phone text,
  intent_id uuid references intents(id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists analytics_events_type on analytics_events(event_type);
create index if not exists analytics_events_created on analytics_events(created_at desc);

-- User portal OTP
create table if not exists user_otp (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Legacy tables (admin panel compatibility)
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  whatsapp_token text,
  phone_number_id text,
  business_account_id text,
  groq_api_key text,
  deepseek_api_key text,
  openai_api_key text,
  webhook_verify_token text,
  updated_at timestamptz default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  tags jsonb default '[]',
  notes text,
  created_at timestamptz default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  content text not null,
  category text,
  variables jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_value text,
  action_type text not null,
  action_value text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed default bot config
insert into bot_config (key, ai_system_prompt)
values (
  'default',
  'You are a warm, professional WhatsApp assistant. Speak naturally like a helpful human — concise, friendly, and clear. Never invent facts. Only assist within the scope of the matched intent.'
)
on conflict (key) do nothing;

-- Seed admin with: node scripts/seed-admin.js (from repo root)

-- RLS
alter table profiles enable row level security;
alter table whatsapp_users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table intents enable row level security;
alter table intent_examples enable row level security;
alter table collected_data enable row level security;
alter table collection_sessions enable row level security;
alter table bot_config enable row level security;

-- Service role bypasses RLS; authenticated admins via policies
create policy "Admins read profiles" on profiles for select
  using (auth.jwt() ->> 'role' = 'admin' or auth.uid()::text = auth_user_id::text);

create policy "Users read own profile" on profiles for select
  using (auth.uid()::text = auth_user_id::text);

create policy "Public read intents" on intents for select using (is_active = true);
create policy "Admin all intents" on intents for all using (auth.jwt() ->> 'role' = 'admin');

create policy "WhatsApp user reads own messages" on messages for select
  using (phone = auth.jwt() ->> 'phone');

create policy "Admin all messages" on messages for all using (auth.jwt() ->> 'role' = 'admin');
