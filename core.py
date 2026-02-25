import os
import json
import csv
import time
import threading
from pathlib import Path
from datetime import datetime

import ollama
import pymupdf  # fitz
import pandas as pd

# === SET ENV CHO RX 580 AMD NGAY ĐẦU FILE ===
os.environ["OLLAMA_VULKAN"] = "1"
os.environ["HSA_OVERRIDE_GFX_VERSION"] = "8.0.3"

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
PUBLIC_IMAGES = Path("public/images/diseases")
PUBLIC_IMAGES.mkdir(parents=True, exist_ok=True)

JSON_FILE = DATA_DIR / "responses_full.json"
BACKUP_DIR = DATA_DIR / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

def backup_json():
    if JSON_FILE.exists():
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup = BACKUP_DIR / f"responses_full_{ts}.json"
        JSON_FILE.rename(backup)

def parse_pdf_to_english_csv(pdf_path: str, output_csv: str = "data/diseases_english.csv"):
    doc = pymupdf.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n---PAGE---\n"
    
    # Simple split by common disease patterns (cải tiến sau được)
    lines = text.split("\n")
    diseases = []
    current = {}
    for line in lines:
        line = line.strip()
        if line and len(line) > 10 and line[0].isupper() and not line.startswith("---PAGE---"):
            if current:
                diseases.append(current)
            current = {"disease_name": line, "problem_text": "", "first_aid_text": "", "risk_raw_text": ""}
        elif current:
            if "treatment" in line.lower() or "aid" in line.lower():
                current["first_aid_text"] += line + " "
            else:
                current["problem_text"] += line + " "
    
    if current:
        diseases.append(current)
    
    df = pd.DataFrame(diseases)
    df["id"] = range(10001, 10001 + len(df))
    df["pet_type"] = "dog"  # default, user sửa sau
    df = df[["id", "pet_type", "disease_name", "problem_text", "first_aid_text", "risk_raw_text"]]
    df.to_csv(output_csv, index=False, encoding="utf-8")
    return df

def ollama_enrich_batch(batch, model="qwen2.5:7b"):
    prompt = f"""You are a professional veterinary doctor. Process the following {len(batch)} diseases.

Return ONLY a valid JSON array of objects. Each object must have exactly this structure:

{{
  "original_disease_name": "...",
  "pet_type": "dog" or "cat",
  "disease_name": "...",
  "problem_text": "...",
  "first_aid_text": "...",
  "risk_category": {{"name": "Urgent/Medium/Low", "desc": "...", "rating": "urgent/medium/low"}},
  "name_vi": "...",
  "problem_text_vi": "...",
  "first_aid_text_vi": "...",
  "nutrition_text_vi": "... (chế độ ăn chi tiết)",
  "medications_text_vi": "... (thuốc & liều)",
  "needs_image": true/false,
  "nutrition_id": "NUT-00001"
}}

Example for one disease:
{{
  "original_disease_name": "Parvovirus",
  "pet_type": "dog",
  "disease_name": "Parvovirus",
  "problem_text": "Severe vomiting and bloody diarrhea...",
  "first_aid_text": "Keep hydrated...",
  "risk_category": {{"name": "Urgent", "desc": "Contact vet immediately", "rating": "urgent"}},
  "name_vi": "Bệnh Parvovirus",
  "problem_text_vi": "Tiêu chảy ra máu nặng...",
  "first_aid_text_vi": "Giữ nước...",
  "nutrition_text_vi": "Chỉ cho ăn cháo trắng + oresol 24h đầu...",
  "medications_text_vi": "Thuốc chống nôn + men tiêu hóa...",
  "needs_image": true,
  "nutrition_id": "NUT-00001"
}}

Now process these diseases:
{json.dumps(batch, ensure_ascii=False, indent=2)}
"""
    
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": 0.2}
    )
    
    try:
        content = response['message']['content']
        # Extract JSON
        start = content.find("[")
        end = content.rfind("]") + 1
        json_str = content[start:end]
        return json.loads(json_str)
    except:
        return None

def process_with_ollama(english_csv_path: str, progress_callback=None):
    df = pd.read_csv(english_csv_path)
    diseases = df.to_dict("records")
    
    results = []
    batch_size = 3
    total = len(diseases)
    
    for i in range(0, total, batch_size):
        batch = diseases[i:i+batch_size]
        enriched = ollama_enrich_batch(batch)
        
        if enriched:
            results.extend(enriched)
        
        if progress_callback:
            progress = min(100, int((i + batch_size) / total * 100))
            progress_callback(progress, f"Đã xử lý {min(i+batch_size, total)}/{total} bệnh")
        
        time.sleep(1)  # tránh overload GPU
    
    # Save Vietnamese CSV
    vi_df = pd.DataFrame(results)
    vi_csv = "data/diseases_vietnamese.csv"
    vi_df.to_csv(vi_csv, index=False, encoding="utf-8")
    
    return results, vi_csv

def build_full_json(enriched_list):
    backup_json()
    
    # Load old JSON or create new
    if JSON_FILE.exists():
        with open(JSON_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = []
    
    next_id = max((item["id"] for item in data if isinstance(item.get("id"), int)), default=10000) + 1
    
    for item in enriched_list:
        # Tạo Question đơn giản (3 câu)
        q1_id = next_id
        q2_id = next_id + 1
        result_id = next_id + 2
        
        questions = [
            {
                "id": q1_id,
                "type": "Question",
                "question": {
                    "text": f"Thú cưng của bạn có triệu chứng {item['disease_name'].lower()} không?",
                    "options": [{"text": "Có", "next_action_id": q2_id}, {"text": "Không", "next_action_id": 0}]
                }
            },
            {
                "id": q2_id,
                "type": "Question",
                "question": {
                    "text": "Triệu chứng có nghiêm trọng (nôn, tiêu chảy máu...)?",
                    "options": [{"text": "Có", "next_action_id": result_id}, {"text": "Không", "next_action_id": 0}]
                }
            }
        ]
        
        result_obj = {
            "id": result_id,
            "type": "Result",
            "result": {
                "pet_type": item.get("pet_type", "dog"),
                "disease_name": item.get("disease_name"),
                "problem_text": item.get("problem_text"),
                "first_aid_text": item.get("first_aid_text"),
                "risk_category": item.get("risk_category"),
                "nutrition_text": item.get("nutrition_text_vi", ""),
                "medications_text": item.get("medications_text_vi", ""),
                "reference_images": [],
                "name_vi": item.get("name_vi"),
                "problem_text_vi": item.get("problem_text_vi"),
                "first_aid_text_vi": item.get("first_aid_text_vi"),
                "nutrition_text_vi": item.get("nutrition_text_vi"),
                "medications_text_vi": item.get("medications_text_vi"),
                "nutrition_id": item.get("nutrition_id"),
                "needs_image": item.get("needs_image", False)
            }
        }
        
        data.extend(questions)
        data.append(result_obj)
        
        # Tạo folder ảnh nếu cần
        if item.get("needs_image", False):
            folder = PUBLIC_IMAGES / str(result_id)
            folder.mkdir(parents=True, exist_ok=True)
        
        next_id = result_id + 1
    
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return JSON_FILE

# Hàm hỗ trợ khác
def load_csv(path):
    return pd.read_csv(path) if Path(path).exists() else pd.DataFrame()

def save_csv(df, path):
    df.to_csv(path, index=False, encoding="utf-8")