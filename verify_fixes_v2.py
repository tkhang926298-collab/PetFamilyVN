
import sys
import os
import json
import time

sys.stdout.reconfigure(encoding='utf-8')

# Manual env loading
env_path = os.path.join(os.getcwd(), 'admin_tool', '.env')
print(f"Loading env from: {env_path}")
try:
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            if '=' in line:
                k, v = line.split('=', 1)
                os.environ[k] = v
    print("Environment variables loaded.")
except Exception as e:
    print(f"Error reading .env: {e}")

# Add root to path
sys.path.append(os.getcwd())

from admin_tool.crawler.extract_data import fetch_url, parse_content
from admin_tool.ai_processor.gemini_handler import process_content as gemini_process

def test_pipeline():
    url = "https://www.petmd.com/cat/conditions/infectious-parasitic/feline-leukemia-virus-felv"
    print(f"--- Testing URL: {url} ---")
    
    # 1. Fetch with Retry
    print("\n1. Fetching URL (Requesting)...")
    start_time = time.time()
    html = fetch_url(url)
    print(f"Fetch completed in {time.time() - start_time:.2f}s")
    
    if not html:
        print("FAILED: Could not fetch HTML.")
        return

    # 2. Parse
    print("\n2. Parsing Content...")
    data = parse_content(html, url)
    content_raw = data.get('content_raw', '')
    print(f"Content length: {len(content_raw)} chars")
    
    if len(content_raw) < 100:
        print("WARNING: Content seems too short!")

    # 3. AI Processing (Gemini -> OpenRouter Fallback)
    print("\n3. AI Processing (Gemini 2.0 Flash / OpenRouter Exp)...")
    try:
        ai_result = gemini_process(content_raw)
        
        print("\n--- AI Result ---")
        print(json.dumps(ai_result, indent=2, ensure_ascii=False))
        
        if "error" in ai_result:
            print("\nRESULT: AI returned an error structure.")
        elif "disease_id" in ai_result:
             print("\nRESULT: SUCCESS - Disease ID found.")
             if "diet_vi" in ai_result:
                 print("Dietary Advice: Found")
             else:
                 print("Dietary Advice: NOT Found")
    except Exception as e:
        print(f"\nRESULT: FAILED - Exception during AI processing: {e}")

if __name__ == "__main__":
    test_pipeline()
