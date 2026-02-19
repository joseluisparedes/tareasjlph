-- Create table for notes/updates
create table if not exists public.solicitud_apuntes (
    id uuid default gen_random_uuid() primary key,
    solicitud_id varchar not null references public.solicitudes(id) on delete cascade,
    nota text not null,
    creado_por text, -- Can be UUID or name depending on auth system
    fecha_creacion timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index if not exists solicitud_apuntes_solicitud_id_idx on public.solicitud_apuntes(solicitud_id);
create index if not exists solicitud_apuntes_fecha_creacion_idx on public.solicitud_apuntes(fecha_creacion desc);

-- Add RLS policies (optional, adjust based on requirements)
alter table public.solicitud_apuntes enable row level security;

create policy "Enable read access for all users"
on public.solicitud_apuntes for select
using (true);

create policy "Enable insert access for all users"
on public.solicitud_apuntes for insert
with check (true);

create policy "Enable update access for all users"
on public.solicitud_apuntes for update
using (true)
with check (true);

create policy "Enable delete access for all users"
on public.solicitud_apuntes for delete
using (true);
