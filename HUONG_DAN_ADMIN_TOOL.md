# 📖 HƯỚNG DẪN SỬ DỤNG ADMIN TOOL - PET IS MY FAMILY

Tài liệu này hướng dẫn toàn bộ quy trình xử lý dữ liệu bệnh thú y từ file PDF sách cho đến Google Sheets.

---

## ⚙️ YÊU CẦU TRƯỚC KHI SỬ DỤNG

| Phần mềm | Yêu cầu |
|---------|---------|
| **Python** | 3.10+ |
| **Ollama** | Đã cài, đang chạy tại `http://localhost:11434` |
| **Model AI** | `qwen2.5:7b` (hoặc model khác, cấu hình trong `.env`) |
| **Google Sheets** | Đã share quyền Editor cho email Service Account |

> 💡 **Khởi động Tool:** Mở terminal tại thư mục dự án, chạy lệnh:
> ```
> .venv\Scripts\python admin_tool\main_gui.py
> ```

---

## 🗺️ SƠ ĐỒ QUY TRÌNH TỔNG QUÁT

```
[File PDF sách thú y]
        ↓  Bước 1: Extract PDF
[extracted_diseases.json]  ←  (~859 bệnh)
        ↓  Bước 2: AI Enrich
[enriched_diseases.json]   ←  (+ Tiếng Việt, Triệu chứng, Sơ cứu...)
        ↓  Bước 3: Gợi ý Dinh dưỡng (Script)
[enriched_diseases.json]   ←  (+ nutrition_advice: nên ăn gì, tránh gì...)
        ↓  Bước 4: Build Final JSON (Script)
[final_diseases.json]      ←  (Chuẩn format web app - 18 trường)
        ↓  Bước 5: Export to Google Sheets (Script)
[Google Sheets]            ←  (18 cột, Admin điền affiliate link)
```

---

## 📌 BƯỚC 1 — EXTRACT PDF (Tab 1 trên Tool)

**Mục đích:** Bóc tách nội dung từng bệnh trong file PDF sách thú y ra JSON.

### Cách làm:
1. Mở **Admin Tool** → chọn tab **"Extract PDF"** (Tab 1)
2. Chọn file PDF sách (ví dụ: `Blackwell's Five-Minute Veterinary Consult.pdf`)
3. Bấm **"Start Extract"**
4. Chờ tiến trình hoàn tất (có thể vài phút tùy kích thước sách)

### Kết quả:
- File `extracted_diseases.json` được tạo ở thư mục gốc dự án
- Mỗi bệnh có: `disease_name`, `species`, `source_page`, `sections` (DEFINITION, SIGNS, TREATMENT...)

> ⚠️ **Lưu ý:** Tool tự động lọc bỏ các mục chỉ mục (Table of Contents) không phải bệnh thật.

---

## 📌 BƯỚC 2 — AI ENRICH DATA (Tab 2 trên Tool)

**Mục đích:** Dùng Ollama (AI chạy local) để dịch và tổng hợp thông tin từng bệnh sang tiếng Việt chuyên ngành.

### Cách làm:
1. Mở **Admin Tool** → chọn tab **"Enrich AI"** (Tab 2)
2. Đảm bảo **Ollama đang chạy** (kiểm tra tại `http://localhost:11434`)
3. Bấm **"Start Enrich"**
4. Chờ tiến trình — mỗi bệnh mất khoảng 30-60 giây (với GPU)

### AI sẽ tự động sinh ra:
| Trường | Nội dung |
|--------|---------|
| `disease_name_vi` | Tên bệnh tiếng Việt (kèm tiếng Anh gốc) |
| `severity_score` | Điểm nguy hiểm 1-10 |
| `severity_vi` | Mức độ nguy hiểm bằng chữ |
| `summary_vi` | Tóm tắt về bệnh |
| `symptoms_structured` | Danh sách triệu chứng cụ thể |
| `causes_vi` | Nguyên nhân gây bệnh |
| `prevention_vi` | Cách phòng ngừa |
| `visual_confirmation_required` | Có cần hình ảnh không (True/False) |
| `first_aid_text_vi` | Hướng dẫn sơ cứu tại nhà (3-5 bước) |
| `medications_text_vi` | Các loại thuốc thường dùng |

### Kết quả:
- File `enriched_diseases.json` được tạo ở thư mục gốc dự án
- **Tự động save sau mỗi 10 bệnh** → không mất dữ liệu nếu dừng giữa chừng
- Chạy lại sẽ **bỏ qua bệnh đã xử lý**, tiếp tục từ chỗ còn lại

> ⚠️ **Nếu bị lỗi Attempt 1/3 Failed:** Kiểm tra Ollama đang chạy chưa. Mở Powershell, gõ: `ollama list` để kiểm tra model.

---

## 📌 BƯỚC 3 — XEM XÉT & CHỈNH SỬA (Tab 4 trên Tool — Tùy chọn)

**Mục đích:** Export ra CSV để admin review và chỉnh sửa thủ công nếu AI dịch sai.

### Cách làm:
1. Mở **Admin Tool** → chọn tab **"Review & Edit"** (Tab 4)
2. Bấm **"Export to CSV"** → mở file `review_dir/review_diseases.csv` trong Excel
3. Xem lại và chỉnh sửa nội dung tiếng Việt cho đúng
4. Save file CSV
5. Quay lại Tool → bấm **"Import from CSV"** để cập nhật lại JSON

---

## 📌 BƯỚC 4 — GỢI Ý DINH DƯỠNG AI (Script terminal)

**Mục đích:** Dùng AI phân tích từng bệnh và gợi ý loại hạt/thức ăn phù hợp — dùng để tìm affiliate sản phẩm.

### Cách làm — Chạy lệnh trong terminal:
```bash
.venv\Scripts\python admin_tool\pdf_processor\nutrition_advisor.py
```

### AI sẽ tự động sinh ra:
| Trường | Nội dung |
|--------|---------|
| `summary_vi` | Tóm tắt chế độ ăn phù hợp với bệnh |
| `should_eat` | Danh sách các loại thức ăn / chất nên có |
| `avoid` | Danh sách thức ăn / chất cần tránh và lý do |
| `key_nutrients` | Các dưỡng chất quan trọng cần bổ sung |
| `product_suggestion_vi` | Gợi ý tên thương hiệu/sản phẩm cụ thể |

---

## 📌 BƯỚC 5 — BUILD FINAL JSON (Script terminal)

**Mục đích:** Chuyển đổi dữ liệu AI thành định dạng chuẩn cho web app + tạo thư mục ảnh rỗng.

### Cách làm:
```bash
.venv\Scripts\python admin_tool\utils\build_final_json.py
```

### Kết quả:
- File `admin_tool/final_diseases.json` — cấu trúc chuẩn `{id, type: "Result", result: {...}}`
- Thư mục `admin_tool/local_images/diseases/1/`, `/2/`... được tạo tự động để chứa hình ảnh minh họa

---

## 📌 BƯỚC 6 — EXPORT GOOGLE SHEETS (Script terminal)

**Mục đích:** Ghi dữ liệu lên Google Sheets để admin điền link affiliate sản phẩm.

### Yêu cầu một lần duy nhất:
1. Tạo 1 Google Sheets mới
2. Bấm **Share** → thêm email Service Account với quyền **Editor**:
   ```
   pet-is-my-family@pet-is-my-family-451811.iam.gserviceaccount.com
   ```
3. Copy ID trên URL của Sheet (đoạn giữa `/d/` và `/edit`)
4. Mở file `admin_tool/utils/export_to_sheets.py` → dán ID vào `SHEET_ID = "..."`

### Cách chạy:
```bash
.venv\Scripts\python admin_tool\utils\export_to_sheets.py
```

### Cấu trúc các cột Google Sheets:

| Cột | Tên | Ghi chú |
|-----|-----|---------|
| A | `id` | ID bệnh |
| B | `pet_type` | dog / cat / both |
| C | `disease_name` | Tên tiếng Anh |
| D | `name_vi` | Tên tiếng Việt |
| E | `problem_text` | Tóm tắt bệnh |
| F | `first_aid_text` | Sơ cứu tại nhà |
| G | `risk_category_rating` | low / medium / urgent |
| H | `nutrition_text` | Chế độ ăn |
| I | `medications_text` | Thuốc điều trị |
| J | `nutrition_id` | Mã dinh dưỡng (NUT-00001) |
| K | `needs_image` | True/False |
| L | `image_folder` | Thư mục ảnh |
| **M** | **`affiliate_link`** | **⭐ ADMIN TỰ ĐIỀN link sản phẩm** |
| N | `reference_images` | Admin điền link ảnh tham khảo |
| O | `nutrition_advice_summary` | AI gợi ý tóm tắt chế độ ăn |
| P | `nutrition_should_eat` | Nên ăn gì |
| Q | `nutrition_avoid` | Tránh ăn gì |
| R | `nutrition_product_suggestion` | AI gợi ý tên sản phẩm |

---

## 🔄 KHI CÓ DỮ LIỆU MỚI (Chạy lại toàn bộ)

```bash
# 1. Chạy lại Extract PDF (bấm trong Tool GUI)
# 2. Chạy lại Enrich AI (bấm trong Tool GUI)
# 3. Chạy lại 3 script bên dưới:
.venv\Scripts\python admin_tool\pdf_processor\nutrition_advisor.py
.venv\Scripts\python admin_tool\utils\build_final_json.py
.venv\Scripts\python admin_tool\utils\export_to_sheets.py
```

---

## 🆘 XỬ LÝ SỰ CỐ THƯỜNG GẶP

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-------------|---------|
| `Ollama Attempt 1/3 Failed` | Ollama chưa chạy | Mở Ollama app hoặc chạy `ollama serve` |
| `extracted_diseases.json not found` | Chưa Extract PDF | Chạy Bước 1 trước |
| `enriched_diseases.json not found` | Chưa Enrich AI | Chạy Bước 2 trước |
| `Error: Missing 'gspread'` | Thiếu thư viện | Chạy `.venv\Scripts\pip install gspread` |
| `PERMISSION_DENIED` từ Google Sheets | Chưa share Sheet | Share cho email Service Account (Bước 6) |
| AI chỉ xử lý ít bệnh | `extracted_diseases.json` cũ | Re-extract PDF |

---

*Cập nhật lần cuối: 2026-02-22*
