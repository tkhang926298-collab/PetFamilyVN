# Multi-API Key Configuration Guide

## ✅ ĐÃ CẬP NHẬT

Dự án đã được cập nhật để hỗ trợ **multiple API keys** cho Gemini và Groq.

---

## 📋 CẤU HÌNH HIỆN TẠI

### File: `ID key.txt`
```
API gemini 1: AIzaSyAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Api gemini 2: AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
API gemini 3: AIzaSyAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Groq API key 1: gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Groq API key 2: gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Groq API key 3: gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Sau khi chạy `inject_keys.py`:
```bash
# File .env sẽ có:
GEMINI_API_KEYS=AIzaSyA...,AIzaSyB...,AIzaSyA...
GEMINI_API_KEY=AIzaSyA...

GROQ_API_KEYS=gsk_...,gsk_...,gsk_...
GROQ_API_KEY=gsk_...
```

---

## 🔧 LOGIC SỬ DỤNG

### 1. Admin Tool (Python) - RANDOM SELECTION
**File:** `gemini_handler.py`, `groq_handler.py`

**Cách hoạt động:**
```python
# Mỗi lần gọi API, random chọn 1 key
keys = os.environ.get("GEMINI_API_KEYS").split(',')
api_key = random.choice(keys)
```

**Ưu điểm:**
- ✅ Phân tải đều giữa các keys
- ✅ Tránh rate limit (mỗi key có quota riêng)
- ✅ Đơn giản, không cần quản lý state

**Khi nào dùng:**
- Admin Tool crawl nhiều URLs
- Mỗi request độc lập
- Không cần theo dõi key nào đã dùng

### 2. Zalo Mini App - ROUND ROBIN (Tuần tự)
**File:** `zalo_mini_app/src/utils/apiKeyManager.js` (cần tạo)

**Cách hoạt động:**
```javascript
let currentIndex = 0;
const keys = process.env.VITE_GEMINI_API_KEYS.split(',');

function getNextKey() {
  const key = keys[currentIndex];
  currentIndex = (currentIndex + 1) % keys.length;
  return key;
}
```

**Ưu điểm:**
- ✅ Dùng đều các keys theo thứ tự
- ✅ Dễ debug (biết key nào đang dùng)
- ✅ Tránh rate limit

**Khi nào dùng:**
- User requests liên tục
- Cần fairness giữa các keys
- Muốn track usage per key

### 3. Multi-Threading (Đa luồng) - CONCURRENT
**File:** `gemini_multi_key.py`, `groq_multi_key.py`

**Cách hoạt động:**
```python
# Xử lý 3 URLs cùng lúc với 3 keys khác nhau
manager = get_gemini_manager()
models = manager.get_all_models()  # [model1, model2, model3]

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [
        executor.submit(process_with_model, models[i], urls[i])
        for i in range(min(len(urls), len(models)))
    ]
```

**Ưu điểm:**
- ✅ Tốc độ nhanh gấp 3 lần
- ✅ Tận dụng tối đa quota của tất cả keys
- ✅ Phù hợp cho batch processing

**Khi nào dùng:**
- Admin Tool crawl nhiều URLs cùng lúc
- Batch processing
- Cần tốc độ cao

---

## 📊 SO SÁNH CHIẾN LƯỢC

| Chiến lược | Tốc độ | Phân tải | Độ phức tạp | Use Case |
|------------|--------|----------|-------------|----------|
| **Random** | Trung bình | Tốt | Thấp | Admin Tool (hiện tại) |
| **Round Robin** | Trung bình | Rất tốt | Trung bình | Zalo Mini App |
| **Concurrent** | Rất nhanh | Tốt | Cao | Batch processing |

---

## 🚀 HƯỚNG DẪN SỬ DỤNG

### Bước 1: Generate .env files
```bash
python scripts/inject_keys.py
```

### Bước 2: Kiểm tra .env
```bash
# Admin Tool
cat admin_tool/.env | grep GEMINI_API_KEYS
cat admin_tool/.env | grep GROQ_API_KEYS

# Zalo Mini App
cat zalo_mini_app/.env | grep VITE_GEMINI_API_KEYS
```

### Bước 3: Test Admin Tool
```bash
cd admin_tool
python main_gui.py
# Nhập 3 URLs và crawl
# Xem log để thấy keys được dùng
```

### Bước 4: Verify multi-key hoạt động
```python
# Test script
import os
os.environ['GEMINI_API_KEYS'] = 'key1,key2,key3'

from ai_processor.gemini_handler import setup_gemini
for i in range(5):
    model = setup_gemini()
    print(f"Request {i+1}: Using model")
```

---

## 🔍 MONITORING & DEBUG

### Kiểm tra key nào đang được dùng:
```python
# Trong gemini_handler.py, uncomment dòng:
print(f"Using Gemini Key: ...{api_key[-4:]}")

# Output:
# Using Gemini Key: ...L684
# Using Gemini Key: ...MgI
# Using Gemini Key: ...acM
```

### Kiểm tra rate limit:
```python
# Nếu gặp lỗi 429 (Too Many Requests):
# - Gemini: 60 requests/minute per key
# - Groq: 30 requests/minute per key

# Với 3 keys:
# - Gemini: 180 requests/minute
# - Groq: 90 requests/minute
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Không expose keys ở frontend
```javascript
// ❌ WRONG - Zalo Mini App
const apiKey = process.env.VITE_GEMINI_API_KEY; // Lộ key!

// ✅ CORRECT - Gọi qua backend
const response = await fetch('/api/diagnose', {
  method: 'POST',
  body: JSON.stringify({ image })
});
```

### 2. Rate Limiting
- Gemini: 60 req/min per key → 180 req/min với 3 keys
- Groq: 30 req/min per key → 90 req/min với 3 keys
- Nếu vượt quota, API sẽ trả về 429 error

### 3. Cost Management
- Gemini 1.5 Flash: $0.075/1M input tokens
- Groq Mixtral: Free tier (limited)
- Monitor usage tại console của mỗi service

---

## 📈 CẢI TIẾN THÊM (TÙY CHỌN)

### 1. Retry với key khác nếu fail
```python
def process_with_retry(text, max_retries=3):
    keys = os.environ.get("GEMINI_API_KEYS").split(',')
    for i in range(max_retries):
        try:
            api_key = keys[i % len(keys)]
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            return model.generate_content(text)
        except Exception as e:
            if i == max_retries - 1:
                raise
            continue
```

### 2. Track usage per key
```python
usage_stats = {key: 0 for key in keys}

def get_least_used_key():
    return min(usage_stats, key=usage_stats.get)
```

### 3. Concurrent processing cho admin tool
```python
from concurrent.futures import ThreadPoolExecutor

def process_urls_concurrent(urls):
    manager = get_gemini_manager()
    models = manager.get_all_models()

    with ThreadPoolExecutor(max_workers=len(models)) as executor:
        futures = []
        for i, url in enumerate(urls):
            model = models[i % len(models)]
            future = executor.submit(process_url, url, model)
            futures.append(future)

        results = [f.result() for f in futures]
    return results
```

---

## ✅ KẾT LUẬN

**Đã hoàn thành:**
- ✅ Parse multi keys từ ID key.txt
- ✅ Generate .env với GEMINI_API_KEYS, GROQ_API_KEYS
- ✅ Admin Tool dùng random selection
- ✅ Tăng giới hạn từ 15k → 30k chars
- ✅ Tạo multi-key managers (gemini_multi_key.py, groq_multi_key.py)

**Khuyến nghị:**
- Dùng random selection cho admin tool (đã implement)
- Dùng round-robin cho Zalo Mini App (nếu cần)
- Dùng concurrent processing cho batch crawl (optional)

**Lợi ích:**
- 🚀 Tăng tốc độ xử lý (có thể gấp 3 lần với concurrent)
- 💰 Tránh rate limit (180 req/min thay vì 60 req/min)
- 🔒 Backup keys (nếu 1 key fail, dùng key khác)
