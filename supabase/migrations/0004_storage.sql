-- =============================================================
-- FUTAPP - Migración 0004: Storage para fotos (escudos y jugadores)
--
-- Crea el bucket público `avatars` y las policies RLS de storage.objects
-- para que los usuarios autenticados (organizadores) suban fotos y
-- cualquiera las pueda ver.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars authenticated insert" on storage.objects;
create policy "avatars authenticated insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars authenticated update" on storage.objects;
create policy "avatars authenticated update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated')
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars authenticated delete" on storage.objects;
create policy "avatars authenticated delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');