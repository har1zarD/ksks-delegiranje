-- Slike zapisnika: privatni bucket. Upload i čitanje idu samo kroz server (servisni ključ nakon provjere
-- da je korisnik admin ili prihvaćeni komesar / pomoćni sudija utakmice), pa storage politike nisu potrebne.
-- Putanja: <match_id>/<vrijeme>-<nasumično>.<ekstenzija>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scoresheets', 'scoresheets', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;
