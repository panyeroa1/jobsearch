-- Create a table for employers
create table employers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  company_name text,
  industry text,
  website text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for employers
alter table employers enable row level security;

create policy "Employers can view their own data"
  on employers for select
  using (auth.uid() = user_id);

create policy "Employers can insert their own data"
  on employers for insert
  with check (auth.uid() = user_id);

create policy "Employers can update their own data"
  on employers for update
  using (auth.uid() = user_id);
