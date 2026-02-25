-- ========================================================================
-- Migration: إضافة أدوية الأطفال (Pediatric Medicines)
-- ========================================================================
-- Timestamp: 2026-02-25
-- Description: إضافة بيانات شاملة عن أدوية الأطفال للخراجات والعدوى

INSERT INTO public.clinical_embeddings (
  source,
  content,
  embedding,
  metadata
) VALUES 

-- 1. أموكسيسيلين للأطفال
(
  'Pediatric Medicines',
  'Amoxicilline pour enfant - Dose: 25-45 mg/kg/jour divisée en 3 prises. Pour enfant de 20 kg: 500-900 mg par jour (167-300 mg par prise toutes les 8 heures). Utilisation: abcès dentaire, infection de l''oreille, infection de la gorge. Durée: 5-7 jours. Contre-indications: allergie à la pénicilline. Avertissements: peut causer diarrhée, nausées.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Amoxicilline', 'category', 'Antibiotic', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '25-45 mg/kg/jour', 'dose_20kg', '500-900 mg/jour')
),

-- 2. métronidazole للأطفال
(
  'Pediatric Medicines',
  'Métronidazole pour enfant - Dose: 15-20 mg/kg/jour divisée en 3 prises. Pour enfant de 20 kg: 300-400 mg par jour (100-133 mg par prise toutes les 8 heures). Utilisation: abcès dentaire, infection anaérobie, infection bactérienne buccale. Durée: 5-7 jours. Contre-indications: allergie au métronidazole. Avertissements: goût métallique, nausées, diarrhée. Éviter l''alcool.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Métronidazole', 'category', 'Antibiotic', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '15-20 mg/kg/jour', 'dose_20kg', '300-400 mg/jour')
),

-- 3. Ibuprofène pour enfants
(
  'Pediatric Medicines',
  'Ibuprofène pour enfant - Dose: 5-10 mg/kg/dose toutes les 6-8 heures. Pour enfant de 20 kg: 100-200 mg par dose (maximum 1200 mg/jour). Utilisation: douleur dentaire, inflammation, fièvre, abcès dentaire. Durée: selon les besoins (max 5 jours). Contre-indications: allergie, asthme, troubles gastriques. Avertissements: à prendre avec de la nourriture.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Ibuprofène', 'category', 'Pain reliever', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '5-10 mg/kg/dose', 'dose_20kg', '100-200 mg/dose')
),

-- 4. Paracétamol pour enfants
(
  'Pediatric Medicines',
  'Paracétamol pour enfant - Dose: 10-15 mg/kg/dose toutes les 4-6 heures. Pour enfant de 20 kg: 200-300 mg par dose (maximum 1000 mg/jour ou 5 doses/jour). Utilisation: douleur, fièvre, mal de dents. Durée: selon les besoins. Contre-indications: allergie au paracétamol, maladie du foie. Avertissements: ne pas dépasser la dose maximale quotidienne.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Paracétamol', 'category', 'Pain reliever', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '10-15 mg/kg/dose', 'dose_20kg', '200-300 mg/dose')
),

-- 5. Clindamycine للأطفال (خراجات الأسنان الشديدة)
(
  'Pediatric Medicines',
  'Clindamycine pour enfant (abcès sévère) - Dose: 10-15 mg/kg/jour divisée en 3-4 prises. Pour enfant de 20 kg: 200-300 mg par jour (50-75 mg par prise toutes les 6-8 heures). Utilisation: abcès dentaire sévère, infections anaérobies. Durée: 5-7 jours. Contre-indications: allergie à la clindamycine. Avertissements: diarrhée sévère (pseudomembranous colitis), surveillance nécessaire.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Clindamycine', 'category', 'Antibiotic', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '10-15 mg/kg/jour', 'dose_20kg', '200-300 mg/jour')
),

-- 6. Augmentin (Amoxicilline/Acide clavulanique) للأطفال
(
  'Pediatric Medicines',
  'Augmentin (Amoxicilline/Acide clavulanique) pour enfant - Dose: 25-45 mg/kg/jour d''amoxicilline divisée en 3 prises. Pour enfant de 20 kg: 500-900 mg amoxicilline par jour. Utilisation: abcès dentaire avec résistance bactérienne, infection compliquée. Durée: 5-7 jours. Contre-indications: allergie aux pénicillines. Avertissements: diarrhée plus fréquente que amoxicilline seule.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Augmentin', 'category', 'Antibiotic', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '25-45 mg/kg/jour', 'dose_20kg', '500-900 mg/jour')
),

-- 7. Céphalexine للأطفال (بديل في حالة الحساسية)
(
  'Pediatric Medicines',
  'Céphalexine pour enfant (alternative) - Dose: 25-50 mg/kg/jour divisée en 4 prises. Pour enfant de 20 kg: 500-1000 mg par jour (125-250 mg par prise toutes les 6 heures). Utilisation: abcès dentaire, infection bactérienne (allergie pénicilline possible). Durée: 5-7 jours. Contre-indications: allergie sévère aux céphalosporines. Avertissements: risque réaction croisée avec pénicilline (1%).',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Céphalexine', 'category', 'Antibiotic', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '25-50 mg/kg/jour', 'dose_20kg', '500-1000 mg/jour')
),

-- 8. Azithromycine للأطفال (بديل في حالة الحساسية)
(
  'Pediatric Medicines',
  'Azithromycine pour enfant (allergie pénicilline) - Dose: 10 mg/kg/jour première jour, puis 5 mg/kg/jour. Pour enfant de 20 kg: 200 mg première jour, puis 100 mg/jour. Utilisation: abcès dentaire, infection bactérienne chez patient allergique. Durée: 3-5 jours. Contre-indications: allergie aux macrolides. Avertissements: troubles gastriques, nausées. Ne pas mélanger avec certains aliments.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Azithromycine', 'category', 'Antibiotic', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '10 mg/kg (J1) puis 5 mg/kg', 'dose_20kg', '200 mg (J1) puis 100 mg/jour')
),

-- 9. Dexaméthasone pour l'oedème (adjuvant)
(
  'Pediatric Medicines',
  'Dexaméthasone pour enfant (oédème assocé) - Dose: 0.1 mg/kg/dose toutes les 6-8 heures. Pour enfant de 20 kg: 2 mg par dose (maximum 8 mg/jour). Utilisation: oédème associé à abcès dentaire, inflammation grave. Durée: 2-3 jours maximum. Contre-indications: infection non contrôlée sans antibiotiques. Avertissements: effets secondaires possibles, utilisation courte terme seulement.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Dexaméthasone', 'category', 'Corticosteroid', 'age_group', 'Enfants', 'weight', '20 kg', 'dose_pediatric', '0.1 mg/kg/dose', 'dose_20kg', '2 mg/dose')
),

-- 10. Chlorhexidine rinse pour enfants
(
  'Pediatric Medicines',
  'Chlorhexidine rinse pour enfant - Solution: 0.12% pour rinçage buccal. Posologie: rincer 2-3 fois par jour après brossage (15-30 secondes). Pour enfant de 20 kg: 10-15 ml par rinçage. Ne pas avaler. Utilisation: hygiène buccale, prévention infection après extraction/drainage abcès. Durée: 5-7 jours. Contre-indications: allergie à la chlorhexidine. Avertissements: taches brunes sur dents, goût amer.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Chlorhexidine', 'category', 'Oral Rinse', 'age_group', 'Enfants', 'weight', '20 kg', 'concentration', '0.12%', 'volume_per_rinse', '10-15 ml')
);
