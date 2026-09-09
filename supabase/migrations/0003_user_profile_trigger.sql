-- =============================================================
-- FUTAPP - Migración 0003: perfil automático por signup + RLS
--
-- 1) Trigger que crea el user_profiles automáticamente al registrarse
--    (necesario: el INSERT desde el cliente no pasa RLS).
-- 2) Policy de SELECT en user_profiles (faltaba: sin ella, auth.ts no
--    puede leer el rol del usuario autenticado).
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, role)
  values (new.id, new.email, 'spectator')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Un usuario lee únicamente SU propio perfil.
-- NOTA: no se usa subconsulta sobre user_profiles (causaba "infinite
-- recursion detected in policy", ya que una policy no puede leerse a sí misma).
drop policy if exists "read own profile" on public.user_profiles;
create policy "read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);