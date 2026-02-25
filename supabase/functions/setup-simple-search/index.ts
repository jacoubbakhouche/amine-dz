import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const db = createClient(supabaseUrl, supabaseServiceKey);

    // Create simple_search function
    const sqlCreate = `
      DROP FUNCTION IF EXISTS simple_search(text, int) CASCADE;

      CREATE OR REPLACE FUNCTION simple_search(
        query_text text,
        match_count int DEFAULT 10
      )
      RETURNS TABLE (
        id uuid,
        source text,
        content text,
        metadata jsonb,
        text_relevance float,
        combined_score float
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS \$\$
      BEGIN
        RETURN QUERY
        WITH search_results AS (
          SELECT
            ce.id,
            ce.source,
            ce.content,
            ce.metadata,
            CASE 
              WHEN LOWER(ce.content) LIKE '%' || LOWER(query_text) || '%' THEN 0.8
              ELSE 0
            END as substring_score,
            CASE 
              WHEN LOWER(ce.metadata::text) LIKE '%' || LOWER(query_text) || '%' THEN 0.7
              ELSE 0
            END as metadata_score,
            COALESCE(ts_rank(to_tsvector('simple', ce.content), plainto_tsquery('simple', query_text)), 0)::float as fts_score
          FROM clinical_embeddings ce
        )
        SELECT
          sr.id,
          sr.source,
          sr.content,
          sr.metadata,
          GREATEST(sr.substring_score, sr.metadata_score, sr.fts_score)::float as text_relevance,
          GREATEST(sr.substring_score, sr.metadata_score, sr.fts_score)::float as combined_score
        FROM search_results sr
        WHERE (sr.substring_score > 0 OR sr.metadata_score > 0 OR sr.fts_score > 0)
        ORDER BY combined_score DESC, sr.substring_score DESC
        LIMIT match_count;
      END;
      \$\$;

      GRANT EXECUTE ON FUNCTION simple_search(text, int) TO anon;
      GRANT EXECUTE ON FUNCTION simple_search(text, int) TO authenticated;
    `;

    console.log('[Setup] Creating simple_search function...');
    
    // Execute raw SQL via RPC
    const { error } = await (db as any).rpc('exec', { sql_query: sqlCreate });
    
    if (error) {
      console.error('[Setup] Error via exec RPC:', error);
      
      // Try alternative: Test if function already exists
      const { data: testData, error: testError } = await db.rpc('simple_search', {
        query_text: 'test',
        match_count: 1
      });
      
      if (!testError) {
        console.log('[Setup] ✓ simple_search function already exists!');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'simple_search function already exists and is working!',
            status: 'ready'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } else {
        throw new Error(`Function not ready: ${testError.message}`);
      }
    }

    // Test the function
    const { data, error: testError } = await db.rpc('simple_search', {
      query_text: 'Aspirin',
      match_count: 5
    });

    if (testError) {
      throw new Error(`Test failed: ${testError.message}`);
    }

    console.log('[Setup] ✓ simple_search function created and tested!');
    console.log('[Setup] Test result count:', data?.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'simple_search function created successfully!',
        testResults: {
          query: 'Aspirin',
          resultCount: data?.length || 0
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('[Setup] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
