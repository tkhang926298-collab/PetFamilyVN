-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  xu_balance int default 10,
  created_at timestamp with time zone default now()
);

-- DISEASES
create table if not exists diseases (
  disease_id text primary key, -- e.g. "care_dog"
  disease_name text not null,
  symptoms_vi text,
  treatment_vi text,
  visual_desc text,
  prescription_otc text,
  prescription_rx text,
  questions jsonb default '[]'::jsonb,
  cloudinary_links jsonb default '[]'::jsonb,
  keywords text[],
  status text default 'active',
  created_at timestamp with time zone default now()
);

-- TRANSACTIONS
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  amount int,
  money_amount int,
  type text, -- 'DEPOSIT', 'USAGE', 'BONUS'
  description text,
  status text, -- 'PENDING', 'COMPLETED', 'FAILED'
  created_at timestamp with time zone default now()
);

-- FOOD ITEMS
create table if not exists food_items (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  risk_level text, -- 'safe', 'warning', 'danger'
  description text,
  created_at timestamp with time zone default now()
);

-- DANGER ZONES (Pins)
create table if not exists danger_pins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id), -- Nullable for anonymous reports?
  lat float not null,
  lon float not null,
  type text, -- 'bả', 'trộm'
  description text,
  image_url text,
  created_at timestamp with time zone default now()
);

-- FUNCTION: use_credits
create or replace function use_credits(u_id uuid, cost int)
returns boolean as $$
declare
  current_bal int;
begin
  select xu_balance into current_bal from profiles where id = u_id;
  
  if current_bal >= cost then
    update profiles set xu_balance = xu_balance - cost where id = u_id;
    insert into transactions (user_id, amount, type, description, status)
    values (u_id, -cost, 'USAGE', 'Chẩn đoán AI', 'COMPLETED');
    return true;
  else
    return false;
  end if;
end;
$$ language plpgsql security definer;

-- RLS POLICIES (Basic)
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

alter table diseases enable row level security;
-- Allow public read access to diseases
create policy "Public can view diseases" on diseases for select using (true);

alter table transactions enable row level security;
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);

alter table food_items enable row level security;
create policy "Public can view food items" on food_items for select using (true);

alter table danger_pins enable row level security;
create policy "Public can view pins" on danger_pins for select using (true);
-- Allow authenticated (or anon if configured) users to insert pins
create policy "Public can insert pins" on danger_pins for insert with check (true);
