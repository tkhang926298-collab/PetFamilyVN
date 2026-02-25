"""
seed_blackwell.py — v2
======================
Đọc enriched_diseases.json từ root project → tạo seed_data.sql cho PostgreSQL.

Mỗi bệnh sinh ra:
- 1 actionable node (Result)  
- 1 response (trỏ vào actionable)
- 1 result (full data bệnh)

Symptom groups: tự động nhóm theo species (dog/cat) và severity_score.
Sau đó tạo symptom records trỏ vào actionable đầu tiên của nhóm đó.

Chạy từ thư mục root pet_is_my_family:
  python backend/database/seed_blackwell.py

Output: backend/database/seed_data.sql
"""

import json
import os
import sys
import datetime

# Tìm enriched_diseases.json từ root project hoặc path tương đối
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
INPUT_JSON   = os.path.join(PROJECT_ROOT, 'enriched_diseases.json')
OUTPUT_SQL   = os.path.join(SCRIPT_DIR, 'seed_data.sql')

# Map severity_score → risk_category_id (phải khớp với schema.sql seed)
def score_to_risk_id(score):
    try:
        s = float(score or 5)
    except (ValueError, TypeError):
        s = 5
    if s >= 8:
        return 1   # Khẩn cấp (urgent)
    elif s >= 5:
        return 2   # Cần thăm khám (non_urgent)
    return 3       # Nhẹ (low_risk)

def esc(s):
    """Escape string cho PostgreSQL."""
    if not s:
        return ''
    return str(s).replace("'", "''").replace('\x00', '')

def short(s, maxlen=200):
    """Giới hạn độ dài chuỗi."""
    return (s or '')[:maxlen]

# ── Nhóm triệu chứng (symptom groups) theo spec ──
# Mỗi animal_id có 1 symptom = "Tất cả triệu chứng" → trỏ đến first action_id
SYMPTOM_GROUP_NAME = {
    'dog': 'Tất cả triệu chứng bệnh (Chó)',
    'cat': 'Tất cả triệu chứng bệnh (Mèo)',
}

def build_sql():
    if not os.path.exists(INPUT_JSON):
        print(f"[ERROR] Không tìm thấy: {INPUT_JSON}")
        print(f"        Chạy AI Enricher trong Admin Tool trước!")
        sys.exit(1)

    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        diseases = json.load(f)

    if not diseases:
        print("[ERROR] enriched_diseases.json rỗng!")
        sys.exit(1)

    print(f"[INFO] Đọc được {len(diseases)} bệnh từ {INPUT_JSON}")

    lines = []
    lines.append("-- ============================================================")
    lines.append(f"-- Auto-generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"-- Source: {INPUT_JSON}")
    lines.append(f"-- Total diseases: {len(diseases)}")
    lines.append("-- ============================================================")
    lines.append("")

    # Disable foreign key checks tạm thời
    lines.append("-- Tạm thời disable trigger để insert nhanh hơn")
    lines.append("SET session_replication_role = replica;")
    lines.append("")

    # IDs bắt đầu từ 10000 để tránh conflict với data VetHeal gốc
    action_id_cursor  = 10_000
    response_id_cursor = 10_000

    # Map species → animal_id (khớp với schema.sql seed: Chó=1, Mèo=2)
    ANIMAL_ID = {'dog': 1, 'cat': 2}

    # Theo dõi bệnh đầu tiên của mỗi species (để tạo symptom)
    first_action_per_species = {}   # species -> action_id của bệnh đầu tiên

    # ── Tạo actionable + response + result cho mỗi bệnh ──
    for i, d in enumerate(diseases):
        a_id = action_id_cursor + i
        r_id = response_id_cursor + i

        # Xác định species
        sp_raw = str(d.get('species', '')).lower()
        if 'dog' in sp_raw or 'canine' in sp_raw:
            species = 'dog'
        elif 'cat' in sp_raw or 'feline' in sp_raw:
            species = 'cat'
        else:
            species = 'dog'   # default fallback

        if species not in first_action_per_species:
            first_action_per_species[species] = a_id

        # Risk category
        risk_id = score_to_risk_id(d.get('severity_score'))

        # Fields
        disease_name    = esc(short(d.get('disease_name', ''), 400))
        name_vi         = esc(short(d.get('disease_name_vi', d.get('disease_name', '')), 400))
        problem_text    = esc(d.get('summary_vi', ''))
        first_aid       = esc(d.get('first_aid_text_vi', ''))
        medications     = esc(d.get('medications_text_vi', ''))
        nutrition_text  = esc(d.get('diet_vi_string', ''))
        
        # nutrition_advice là Python obj hoặc None
        na = d.get('nutrition_advice')
        if na is not None:
            na_json = esc(json.dumps(na, ensure_ascii=False))
            nutrition_advice_sql = f"'{na_json}'::jsonb"
        else:
            nutrition_advice_sql = 'NULL'

        # Images array
        imgs = d.get('images_json')
        if imgs is not None:
            imgs_sql = f"'{esc(json.dumps(imgs, ensure_ascii=False))}'::jsonb"
        else:
            imgs_sql = 'NULL'

        # actionable
        lines.append(f"INSERT INTO actionable (id, type) VALUES ({a_id}, 'Result') ON CONFLICT DO NOTHING;")
        # response
        lines.append(f"INSERT INTO response (id, action_id) VALUES ({r_id}, {a_id}) ON CONFLICT DO NOTHING;")
        # result
        lines.append(
            f"INSERT INTO result (response_id, risk_category_id, "
            f"problem_text, first_aid_text, disease_name, name_vi, "
            f"medications_text, nutrition_text, nutrition_advice, images_json) "
            f"VALUES ({r_id}, {risk_id}, "
            f"'{problem_text}', '{first_aid}', '{disease_name}', '{name_vi}', "
            f"'{medications}', '{nutrition_text}', {nutrition_advice_sql}, {imgs_sql}) "
            f"ON CONFLICT DO NOTHING;"
        )
        lines.append("")

    # ── Tạo symptom group cho mỗi species (trỏ vào bệnh đầu tiên) ──
    lines.append("-- ── Symptom groups (one per species, vào bệnh đầu tiên) ──")
    sym_id = 5000

    for species, first_action_id in first_action_per_species.items():
        animal_id = ANIMAL_ID.get(species, 1)
        sym_desc  = SYMPTOM_GROUP_NAME.get(species, 'Tất cả triệu chứng')
        lines.append(
            f"INSERT INTO symptom (id, animal_id, description, initial_action_id) "
            f"VALUES ({sym_id}, {animal_id}, '{sym_desc}', {first_action_id}) ON CONFLICT DO NOTHING;"
        )
        sym_id += 1

    lines.append("")
    lines.append("-- Re-enable triggers")
    lines.append("SET session_replication_role = DEFAULT;")
    lines.append("")
    lines.append(f"-- Hoàn tất: {len(diseases)} bệnh đã được import")

    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"[OK ] Đã tạo: {OUTPUT_SQL}")
    print(f"      - {len(diseases)} bệnh")
    print(f"      - Species tìm thấy: {list(first_action_per_species.keys())}")
    print(f"\nChạy để import vào PostgreSQL:")
    print(f"  psql -U postgres -d petismyfamily -f {OUTPUT_SQL}")

if __name__ == "__main__":
    build_sql()
