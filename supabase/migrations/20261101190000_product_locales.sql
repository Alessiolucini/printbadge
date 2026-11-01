-- BadgeOK · nomi e descrizioni dei prodotti in spagnolo, francese e tedesco.
-- Le colonne sono facoltative: se mancano, il sito e Stripe usano i testi in inglese.

alter table public.products
  add column if not exists name_es text,
  add column if not exists name_fr text,
  add column if not exists name_de text,
  add column if not exists description_es text,
  add column if not exists description_fr text,
  add column if not exists description_de text;

update public.products set
  name_es = 'Badge de PVC · solo anverso', name_fr = 'Badge en PVC · recto seul', name_de = 'PVC-Ausweis · nur Vorderseite',
  description_es = 'Tarjeta de PVC de 0,76 mm tamaño tarjeta de crédito, impresión a color en el anverso.',
  description_fr = 'Carte en PVC 0,76 mm au format carte bancaire, impression couleur au recto.',
  description_de = 'PVC-Karte 0,76 mm im Kreditkartenformat, farbig bedruckte Vorderseite.'
where id = 'pvc-cr80';

update public.products set
  name_es = 'Badge de PVC · doble cara', name_fr = 'Badge en PVC · recto verso', name_de = 'PVC-Ausweis · beidseitig',
  description_es = 'Tarjeta de PVC de 0,76 mm, impresión a color por ambas caras.',
  description_fr = 'Carte en PVC 0,76 mm, impression couleur des deux côtés.',
  description_de = 'PVC-Karte 0,76 mm, beidseitig farbig bedruckt.'
where id = 'pvc-cr80-duplex';

update public.products set
  name_es = 'Cinta para el cuello', name_fr = 'Tour de cou', name_de = 'Umhängeband',
  description_es = 'Cinta de poliéster con mosquetón.',
  description_fr = 'Tour de cou en polyester avec mousqueton.',
  description_de = 'Umhängeband aus Polyester mit Karabiner.'
where id = 'lanyard';

update public.products set
  name_es = 'Porta badge rígido', name_fr = 'Porte-badge rigide', name_de = 'Feste Ausweishülle',
  description_es = 'Funda transparente para tarjetas CR80.',
  description_fr = 'Étui transparent pour cartes CR80.',
  description_de = 'Transparente Hülle für CR80-Karten.'
where id = 'holder';
