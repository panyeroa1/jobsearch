-- Create a table for applicants
create table applicants (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text,
  email text,
  role text,
  experience text,
  resume_data jsonb,
  photo_url text,
  status text default 'applied',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table applicants enable row level security;

create policy "Applicants can view their own data"
  on applicants for select
  using (auth.uid() = user_id);

create policy "Applicants can insert their own data"
  on applicants for insert
  with check (auth.uid() = user_id);

create policy "Applicants can update their own data"
  on applicants for update
  using (auth.uid() = user_id);

-- Create a storage bucket for resumes/photos
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true);

-- Set up storage policies
create policy "Applicants can upload photos"
  on storage.objects for insert
  with check ( bucket_id = 'resumes' and auth.role() = 'authenticated' );

create policy "Anyone can view photos"
  on storage.objects for select
  using ( bucket_id = 'resumes' );
