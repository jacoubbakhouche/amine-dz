#!/usr/bin/env python3
"""
اختبار Edge Function و Database مباشرة
"""
import subprocess
import json
import os

# الـ Environment variables من Supabase
SUPABASE_URL = "https://wtpodigifgbbvwqrmobo.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_KEY = os.getenv("GROQ_API_KEY", "")

print("=" * 80)
print("اختبار Database و Edge Function")
print("=" * 80)

# اختبار 1: فحص عدد الأدوية
print("\n🔍 اختبار 1: عد الأدوية في قاعدة البيانات")
print("-" * 80)

sql_query = """
SELECT COUNT(*) as total_medicines FROM clinical_embeddings;
"""

result = subprocess.run(
    ["supabase", "db", "execute", "--stdin"],
    input=sql_query.encode(),
    capture_output=True,
    text=True
)

print("SQL Output:")
print(result.stdout)
if result.stderr:
    print("Error:", result.stderr)

# اختبار 2: عرض أول أدوية
print("\n🔍 اختبار 2: عرض أول 3 أدوية")
print("-" * 80)

sql_query2 = """
SELECT id, source, LEFT(content, 100) as content_preview
FROM clinical_embeddings 
LIMIT 3;
"""

result2 = subprocess.run(
    ["supabase", "db", "execute", "--stdin"],
    input=sql_query2.encode(),
    capture_output=True,
    text=True
)

print("SQL Output:")
print(result2.stdout)

# اختبار 3: اختبار simple_search مع كلمات مختلفة
print("\n🔍 اختبار 3: اختبار simple_search function")
print("-" * 80)

test_queries = [
    ("خراج", "Arabic - خراج"),
    ("Aspirin", "English - Aspirin"),
    ("abcès", "French - abcès"),
    ("أموكسيسيلين", "Arabic - أموكسيسيلين"),
]

for query_text, label in test_queries:
    print(f"\n  ► اختبار: {label}")
    sql = f"""
    SELECT COUNT(*) as result_count
    FROM simple_search('{query_text}', 8);
    """
    
    result = subprocess.run(
        ["supabase", "db", "execute", "--stdin"],
        input=sql.encode(),
        capture_output=True,
        text=True
    )
    
    if "result_count" in result.stdout:
        print(f"    ✓ البحث عن '{query_text}' أرجع نتائج")
    else:
        print(f"    ✗ البحث عن '{query_text}' لم يرجع نتائج")
        print(f"    Output: {result.stdout[:200]}")

print("\n" + "=" * 80)
print("انتهى الاختبار")
print("=" * 80)
