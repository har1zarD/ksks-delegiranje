-- KK MVP, Minibasket: fotografije za preostala 3 igrača bez slike (Viber, poslao korisnik), izrezane bez natpisa s imenom.
-- Treća fotografija nema natpis; korisnik je potvrdio da je to Riad Hadžija.
update public.licenses set photo_path = '5c4e3a7e-71e4-483b-938d-e81d094b8b10/' || v.photo
  from (values
    ('907b51c8-94e5-4b96-b809-791d499970ea'::uuid, '1794477267267-756005cf.jpg'), -- Rian Muratović
    ('27e460a3-a380-41c7-8880-a6bc79b23de3',       '1794477266209-fef581eb.jpg'), -- Riad Hadžija
    ('0b320a8a-43c1-42eb-9d47-990d65073b55',       '1794477267652-68298506.jpg')  -- Dani Puzić
  ) as v (id, photo)
 where licenses.id = v.id;
