-- KK Point, "Juniori": dodana fotografija igraču koji je nije imao.
update public.licenses
  set photo_path = '436f8af2-7691-4a1b-8666-71057277d861/point-juniori-2026-27-popic-1794580456093-153617cc.jpg'
  where id = '8e90abbe-aa25-472f-bf78-ec00eddf8ac7' and photo_path is null; -- Andrej Popić (150)
