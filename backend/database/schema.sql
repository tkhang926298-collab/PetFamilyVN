-- ============================================================
-- Pet Is My Family — PostgreSQL Schema
-- Clone từ VetHeal + mở rộng với dữ liệu Blackwell
-- ============================================================

-- 1. Bảng animal — Loại thú cưng
CREATE TABLE IF NOT EXISTS animal (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100),
    type          VARCHAR(50),
    image         TEXT,
    animal_order  INTEGER DEFAULT 0
);

-- 2. Bảng symptom — Nhóm triệu chứng theo animal
CREATE TABLE IF NOT EXISTS symptom (
    id                SERIAL PRIMARY KEY,
    animal_id         INTEGER REFERENCES animal(id),
    description       TEXT,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW(),
    initial_action_id INTEGER
);

-- 3. Bảng actionable — Node trung gian (Question hoặc Result)
CREATE TABLE IF NOT EXISTS actionable (
    id         SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    type       VARCHAR(20) NOT NULL CHECK (type IN ('Question', 'Result'))
);

-- 4. Bảng question — Câu hỏi chẩn đoán
CREATE TABLE IF NOT EXISTS question (
    actionable_id INTEGER PRIMARY KEY REFERENCES actionable(id),
    text          TEXT NOT NULL
);

-- 5. Bảng response — Liên kết giữa action → options
CREATE TABLE IF NOT EXISTS response (
    id        SERIAL PRIMARY KEY,
    action_id INTEGER REFERENCES actionable(id)
);

-- 6. Bảng option — Lựa chọn trả lời
CREATE TABLE IF NOT EXISTS option (
    id             SERIAL PRIMARY KEY,
    response_id    INTEGER REFERENCES response(id),
    text           TEXT,
    next_action_id INTEGER REFERENCES actionable(id)
);

-- 7. Bảng risk_category — Mức độ khẩn cấp
CREATE TABLE IF NOT EXISTS risk_category (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50),   -- Urgent / Non-urgent / Low risk
    description TEXT,
    text_1      TEXT,
    iframe_desc   TEXT,
    iframe_text_1 TEXT,
    rating      VARCHAR(20),   -- urgent / non_urgent / low_risk
    country_id  VARCHAR(10),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- 8. Bảng result — Kết luận bệnh (MỞ RỘNG với Blackwell)
CREATE TABLE IF NOT EXISTS result (
    id                    SERIAL PRIMARY KEY,
    response_id           INTEGER REFERENCES response(id),
    risk_category_id      INTEGER REFERENCES risk_category(id),
    additional_advice     TEXT,
    first_aid_text        TEXT,
    problem_text          TEXT,
    travel_advice_text    TEXT,
    iframe_first_aid_text TEXT,
    iframe_problem_text   TEXT,
    -- ── MỚI: Fields từ dữ liệu Blackwell ──
    disease_name          VARCHAR(500),   -- Tên tiếng Anh gốc
    name_vi               VARCHAR(500),   -- Tên tiếng Việt
    medications_text      TEXT,           -- Thuốc thường dùng
    nutrition_text        TEXT,           -- Chế độ ăn
    nutrition_advice      JSONB,          -- {should_eat, avoid, suggestion}
    images_json           JSONB           -- Mảng URL ảnh minh họa
);

-- 9. Bảng feedback — Góp ý ẩn danh (MỚI)
CREATE TABLE IF NOT EXISTS feedback (
    id          SERIAL PRIMARY KEY,
    diagnose_id INTEGER,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 10. Bảng affiliate_products — Sản phẩm Shopee (MỚI, cache từ Google Sheet)
CREATE TABLE IF NOT EXISTS affiliate_products (
    id           SERIAL PRIMARY KEY,
    disease_id   INTEGER,
    product_name VARCHAR(500),
    link_shopee  TEXT,
    color        VARCHAR(10),    -- green / red
    reason       TEXT,
    pet_type     VARCHAR(20)
);

-- ============================================================
-- SEED: Risk Categories chuẩn
-- ============================================================
INSERT INTO risk_category (name, description, text_1, rating, country_id)
VALUES
    ('Khẩn cấp', 'Cần liên hệ bác sĩ thú y ngay lập tức', 'Hãy gọi điện cho phòng khám thú y trước khi đến. Bác sĩ có thể cần cho bạn hướng dẫn đặc biệt.', 'urgent', '1'),
    ('Cần thăm khám', 'Nên đưa thú cưng đến bác sĩ trong vòng 24h', 'Theo dõi tình trạng thú cưng. Nếu xấu đi, hãy liên hệ bác sĩ thú y ngay.', 'non_urgent', '1'),
    ('Nhẹ', 'Có thể theo dõi tại nhà', 'Tiếp tục theo dõi. Nếu triệu chứng không cải thiện sau 2-3 ngày, hãy đưa thú cưng đến khám.', 'low_risk', '1')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Animals (Chó, Mèo + giữ nguyên các loại khác)
-- ============================================================
INSERT INTO animal (name, type, animal_order) VALUES
    ('Chó', 'dog', 1),
    ('Mèo', 'cat', 2),
    ('Thỏ', 'rabbit', 3),
    ('Chim', 'bird', 4),
    ('Ngựa', 'horse', 5)
ON CONFLICT DO NOTHING;
