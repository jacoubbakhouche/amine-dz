-- ========================================================================
-- Migration: Améliorer les données des médicaments avec format complet
-- ========================================================================
-- Timestamp: 2026-02-25
-- Description: Enrichir les métadonnées pour supporter le format de fiche complet

-- 1. Ajouter une colonne pour les fiches complètes (optionnel, ou utiliser metadata)
-- Nous utilisons la colonne metadata existante pour stocker les informations complètes

-- 2. Créer une fonction pour retourner une fiche formatée complète
CREATE OR REPLACE FUNCTION get_medicine_complete_card(
  medicine_name text
)
RETURNS TABLE (
  id uuid,
  name text,
  cnk text,
  composition text,
  indications text,
  public_cible text,
  mode_emploi text,
  precautions text,
  against_indications text,
  full_card text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.metadata->>'drug_name' as name,
    ce.metadata->>'cnk' as cnk,
    ce.metadata->>'composition' as composition,
    ce.metadata->>'indications' as indications,
    ce.metadata->>'public_cible' as public_cible,
    ce.metadata->>'mode_emploi' as mode_emploi,
    ce.metadata->>'precautions' as precautions,
    ce.metadata->>'against_indications' as against_indications,
    -- Construire la fiche complète
    FORMAT(
      E'📋 **FICHE COMPLÈTE DU MÉDICAMENT**\n\n' ||
      E'1️⃣ **Nom du produit**\n' ||
      E'%s (CNK: %s)\n\n' ||
      E'2️⃣ **Composition complète**\n' ||
      E'Principes actifs et excipients:\n%s\n\n' ||
      E'3️⃣ **Indications**\n' ||
      E'%s\n\n' ||
      E'4️⃣ **Public cible**\n' ||
      E'Profil du patient: %s\n\n' ||
      E'5️⃣ **Mode d''emploi**\n' ||
      E'Posologie et fréquence:\n%s\n\n' ||
      E'6️⃣ **Situations à éviter**\n' ||
      E'Précautions et contre-indications:\n%s\n' ||
      E'%s\n\n' ||
      E'🚫 **Remarque:** Consultez toujours un professionnel de santé avant utilisation.\n\n' ||
      E'📝 **Plus d''informations:** Pour des questions spécifiques, consultez votre pharmacien ou médecin.',
      COALESCE(ce.metadata->>'drug_name', 'N/A'),
      COALESCE(ce.metadata->>'cnk', 'Non disponible'),
      COALESCE(ce.metadata->>'composition', 'Voir contenu complet'),
      COALESCE(ce.metadata->>'indications', 'Voir contenu complet'),
      COALESCE(ce.metadata->>'public_cible', 'Voir contenu complet'),
      COALESCE(ce.metadata->>'mode_emploi', 'Voir contenu complet'),
      COALESCE(ce.metadata->>'precautions', 'Voir contenu complet'),
      COALESCE(ce.metadata->>'against_indications', '')
    ) as full_card
  FROM clinical_embeddings ce
  WHERE LOWER(ce.metadata->>'drug_name') = LOWER(medicine_name)
     OR LOWER(ce.content) LIKE '%' || LOWER(medicine_name) || '%'
  LIMIT 1;
END;
$$;

-- Ajouter des permissions
GRANT EXECUTE ON FUNCTION get_medicine_complete_card(text) TO anon;
GRANT EXECUTE ON FUNCTION get_medicine_complete_card(text) TO authenticated;

-- ========================================================================
-- Créer une fonction pour détecter si c'est une question de premier contact
-- ========================================================================
CREATE OR REPLACE FUNCTION is_first_medicine_question(
  question text,
  history jsonb DEFAULT '[]'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Retourner TRUE si:
  -- 1. C'est probablement une première question (pas d'historique)
  -- 2. La question demande des informations sur un médicament spécifique
  -- 3. Mots-clés: "informations", "tell me", "donne-moi", "اعطيني", etc.
  
  RETURN (
    jsonb_array_length(history) < 2
    AND (
      question ILIKE '%information%'
      OR question ILIKE '%tell me%'
      OR question ILIKE '%donne%'
      OR question ILIKE '%اعطيني%'
      OR question ILIKE '%donnez%'
      OR question ILIKE '%فحدثني%'
      OR question ILIKE '%détail%'
      OR question ILIKE '%complete%'
      OR question ILIKE '%كامل%'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_first_medicine_question(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION is_first_medicine_question(text, jsonb) TO authenticated;
