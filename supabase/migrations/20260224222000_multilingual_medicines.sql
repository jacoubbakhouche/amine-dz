-- ========================================================================
-- إضافة بيانات الأدوية بأسماء إنجليزية وفرنسية (للبحث متعدد اللغات)
-- ========================================================================

INSERT INTO public.clinical_embeddings (
  source,
  content,
  embedding,
  metadata
) VALUES 
-- 1. الأسبيرين - Aspirin - English & French versions
(
  'Medicines Database',
  'Aspirin - Medication for pain relief and anti-inflammatory. Dose: 500-1000 mg every 4-6 hours. Uses: headache, dental pain, fever. Contraindications: aspirin allergy, stomach ulcer, bleeding. Warnings: may cause stomach upset. For tooth pain and dental infections.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Aspirin', 'category', 'Pain reliever', 'uses', 'headache, dental pain, fever')
),

(
  'Base de Données Médicales',
  'Aspirine - Médicament anti-inflammatoire et analgésique. Dose: 500-1000 mg toutes les 4-6 heures. Utilisation: mal de tête, mal de dents, fièvre. Contre-indications: allergie à l''aspirine, ulcère d''estomac, saignement. Avertissements: peut causer des troubles gastriques. Pour l''abcès dentaire et les infections dentaires.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Aspirine', 'category', 'Analgésique', 'uses', 'mal de dents, abcès dentaire')
),

-- 2. أموكسيسيلين - Amoxicillin - English & French
(
  'Medicines Database',
  'Amoxicillin - Antibiotic for bacterial infections. Dose: 500 mg every 8 hours or 875 mg every 12 hours. Uses: tooth abscess, ear infection, throat infection, urinary tract infection. Contraindications: penicillin allergy. Warnings: may cause diarrhea, nausea, rash. Effective for dental abscess treatment.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Amoxicillin', 'category', 'Antibiotic', 'uses', 'tooth abscess, bacterial infection')
),

(
  'Base de Données Médicales',
  'Amoxicilline - Antibiotique pour les infections bactériennes. Dose: 500 mg toutes les 8 heures ou 875 mg toutes les 12 heures. Utilisation: abcès dentaire, infection de l''oreille, infection de la gorge. Contre-indications: allergie à la pénicilline. Avertissements: peut causer la diarrhée, nausées, éruption cutanée. Efficace pour traiter l''abcès dentaire.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Amoxicilline', 'category', 'Antibiotique', 'uses', 'abcès dentaire, infection bactérienne')
),

-- 3. ميترونيدازول - Metronidazole - English & French
(
  'Medicines Database',
  'Metronidazole - Antibiotic against anaerobic bacteria. Dose: 500 mg every 8 hours. Uses: tooth abscess, gum inflammation, bacterial mouth infection. Contraindications: metronidazole allergy, alcohol interaction. Warnings: metallic taste, nausea, diarrhea. Excellent for dental abscess and anaerobic infections.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Metronidazole', 'category', 'Antibiotic', 'uses', 'tooth abscess, gum infection')
),

(
  'Base de Données Médicales',
  'Métronidazole - Antibiotique contre les bactéries anaérobies. Dose: 500 mg toutes les 8 heures. Utilisation: abcès dentaire, inflammation des gencives, infection bactérienne buccale. Contre-indications: allergie au métronidazole, interaction avec l''alcool. Avertissements: goût métallique, nausées, diarrhée. Excellent pour l''abcès dentaire et les infections anaérobies.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Métronidazole', 'category', 'Antibiotique', 'uses', 'abcès dentaire, infection des gencives')
),

-- 4. البروفين - Ibuprofen - English & French
(
  'Medicines Database',
  'Ibuprofen - Non-steroidal anti-inflammatory drug (NSAID). Dose: 200-400 mg every 6-8 hours. Uses: pain relief, inflammation, fever, dental pain. Contraindications: ibuprofen allergy, stomach ulcer, liver disease. Warnings: may cause digestive side effects. For tooth pain and dental inflammation.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Ibuprofen', 'category', 'Pain reliever', 'uses', 'pain, inflammation, fever')
),

(
  'Base de Données Médicales',
  'Ibuprofène - Anti-inflammatoire non stéroïdien (AINS). Dose: 200-400 mg toutes les 6-8 heures. Utilisation: soulagement de la douleur, inflammation, fièvre, mal de dents. Contre-indications: allergie à l''ibuprofène, ulcère d''estomac, maladie du foie. Avertissements: peut causer des effets secondaires digestifs. Pour le mal de dents et l''inflammation dentaire.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Ibuprofène', 'category', 'Analgésique', 'uses', 'mal de dents, inflammation')
),

-- 5. كليندامايسين - Clindamycin - English & French
(
  'Medicines Database',
  'Clindamycin - Antibiotic effective against anaerobic bacteria. Dose: 300-450 mg every 6-8 hours. Uses: severe tooth abscess, mouth infections, bacterial infections. Contraindications: clindamycin allergy. Warnings: may cause severe diarrhea (pseudomembranous colitis). Excellent for severe dental infections.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Clindamycin', 'category', 'Antibiotic', 'uses', 'severe tooth abscess')
),

(
  'Base de Données Médicales',
  'Clindamycine - Antibiotique efficace contre les bactéries anaérobies. Dose: 300-450 mg toutes les 6-8 heures. Utilisation: abcès dentaire sévère, infections buccales, infections bactériennes. Contre-indications: allergie à la clindamycine. Avertissements: peut causer une diarrhée sévère (colite pseudomembraneuse). Excellent pour les infections dentaires graves.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Clindamycine', 'category', 'Antibiotique', 'uses', 'abcès dentaire sévère')
),

-- 6. الديكلوفيناك - Diclofenac - English & French
(
  'Medicines Database',
  'Diclofenac - Potent non-steroidal anti-inflammatory. Dose: 50 mg every 8 hours. Uses: severe pain relief, inflammation, after dental procedures. Contraindications: allergy, stomach ulcer, heart disease. Warnings: short-term use only, may affect liver and kidneys. Effective for post-dental pain.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Diclofenac', 'category', 'Strong pain reliever', 'uses', 'severe pain, inflammation')
),

(
  'Base de Données Médicales',
  'Diclofénac - Anti-inflammatoire non stéroïdien puissant. Dose: 50 mg toutes les 8 heures. Utilisation: soulagement de la douleur intense, inflammation, après les interventions dentaires. Contre-indications: allergie, ulcère d''estomac, maladie cardiaque. Avertissements: utilisation à court terme uniquement, peut affecter le foie et les reins. Efficace pour la douleur dentaire post-intervention.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Diclofénac', 'category', 'Analgésique puissant', 'uses', 'douleur intense, inflammation')
),

-- 7. Chlorhexidine - Antiseptic mouth rinse - English & French
(
  'Medicines Database',
  'Chlorhexidine - Powerful mouth antiseptic. Usage: rinse mouth 2-3 times daily. Uses: gum inflammation, tooth abscess, bacterial mouth infection. Contraindications: chlorhexidine allergy. Warnings: may cause brown tooth staining, bad taste. Prevents bacterial growth in tooth abscess.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Chlorhexidine', 'category', 'Mouth antiseptic', 'uses', 'gum inflammation, abscess')
),

(
  'Base de Données Médicales',
  'Chlorhexidine - Puissant antiseptique buccal. Utilisation: rincer la bouche 2-3 fois par jour. Utilisation: inflammation des gencives, abcès dentaire, infection bactérienne buccale. Contre-indications: allergie à la chlorhexidine. Avertissements: peut causer une décoloration brun des dents, mauvais goût. Prévient la croissance bactérienne dans l''abcès dentaire.',
  array_fill(0::float, ARRAY[384]),
  jsonb_build_object('drug_name', 'Chlorhexidine', 'category', 'Antiseptique buccal', 'uses', 'inflammation, abcès dentaire')
);

-- التحقق
SELECT COUNT(*) as total_medicines FROM public.clinical_embeddings;
