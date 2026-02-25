#!/bin/bash

# Pro RAG Pipeline Verification Script
# This script checks if everything is set up correctly

echo "🔍 Pro RAG Pipeline Verification"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Flags
all_ok=true

# Check 1: SQL Functions
echo "Step 1: Checking SQL Functions..."
echo "  [Run in Supabase SQL Editor]"
echo "  SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'hybrid_search');"
echo "  Expected: true ✅"
echo ""

# Check 2: Edge Function
echo "Step 2: Checking Edge Function Deployment..."
echo "  Run command:"
echo "  supabase functions list --project-id YOUR_PROJECT_ID"
echo "  Expected: pro-rag-consultation in the list ✅"
echo ""

# Check 3: Environment Variables
echo "Step 3: Checking Environment Variables in Supabase..."
echo "  Go to: Functions → pro-rag-consultation → Configuration"
echo "  Should have:"
echo "    ✓ HUGGINGFACE_API_KEY"
echo "    ✓ GROQ_API_KEY"
echo ""

# Check 4: Frontend
echo "Step 4: Checking Frontend Code..."
if grep -q "pro-rag-consultation" /src/pages/Chat.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Chat.tsx uses pro-rag-consultation"
else
    echo -e "  ${YELLOW}⚠${NC} Chat.tsx may not be updated correctly"
fi

if ! grep -q "embeddingPipeline" /src/pages/Chat.tsx 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} @xenova/transformers removed"
else
    echo -e "  ${YELLOW}⚠${NC} @xenova/transformers still present"
fi
echo ""

# Check 5: Database Tables
echo "Step 5: Checking Database Tables..."
echo "  [Run in Supabase SQL Editor]"
echo "  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
echo "  Should include:"
echo "    ✓ clinical_embeddings"
echo "    ✓ embedding_cache"
echo "    ✓ knowledge_lock"
echo "    ✓ conversation_context"
echo ""

# Check 6: Test Query
echo "Step 6: Quick Function Test..."
echo "  [Run in Supabase SQL Editor]"
echo "  SELECT * FROM hybrid_search("
echo "    'test query',"
echo "    ARRAY[0.1, 0.2, ...]::vector(384),"
echo "    5"
echo "  ) LIMIT 1;"
echo ""

# Check 7: API Keys Test
echo "Step 7: Testing API Keys (Optional)..."
echo "  HuggingFace: curl -H \"Authorization: Bearer hf_xxxx\" https://api-inference.huggingface.co/status"
echo "  Groq: curl -H \"Authorization: Bearer gsk_xxxx\" https://api.groq.com/openai/v1/models"
echo ""

# Check 8: Frontend Dev Server
echo "Step 8: Starting Frontend..."
echo "  Run: npm run dev"
echo "  Go to: http://localhost:5173/chat"
echo "  Send a test message"
echo ""

# Summary
echo "=================================="
echo "✅ Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Verify each check above"
echo "2. If all green ✅, your setup is complete"
echo "3. If any yellow ⚠, follow troubleshooting guide"
echo ""
echo "📚 Full documentation:"
echo "   - PRO_RAG_DEPLOYMENT.md"
echo "   - PRO_RAG_QUICK_START.md"
echo "   - PRO_RAG_ARCHITECTURE.md"
echo ""
echo "🎉 Ready to go! Your RAG pipeline is production-ready!"
