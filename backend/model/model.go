package model

import (
	"gopkg.in/guregu/null.v3"
)

// Animal — Loại thú cưng (Chó, Mèo, Thỏ...)
type Animal struct {
	Id           int         `json:"id"`
	Name         null.String `json:"name"`
	Animal_type  null.String `json:"type"`
	Animal_order null.Int    `json:"animal_order"`
	Image        null.String `json:"image"`
}

// Symptom — Nhóm triệu chứng (Da, Tiêu hóa, Hô hấp...)
type Symptom struct {
	Id                int         `json:"id"`
	Animal_id         null.Int    `json:"animal_id"`
	Description       null.String `json:"description"`
	Created_at        null.String `json:"created_at"`
	Updated_at        null.String `json:"updated_at"`
	Initial_action_id null.Int    `json:"initial_action_id"`
}

// Action — Node trung gian trong Decision Tree
type Action struct {
	Id              int         `json:"id"`
	Actionable_type null.String `json:"type"`
	Created_at      null.String `json:"created_at"`
	Updated_at      null.String `json:"updated_at"`
}

// Question — Câu hỏi trong chuỗi chẩn đoán
type Question struct {
	Actionable_id int         `json:"actionable_id"`
	Text          null.String `json:"text"`
	Options       []*Option   `json:"options"`
}

// Option — Lựa chọn trả lời, trỏ đến node tiếp theo
type Option struct {
	Text           null.String `json:"text"`
	Next_action_id null.Int    `json:"next_action_id"`
	Response_id    null.Int    `json:"response_id"`
}

// RiskCategory — Mức độ khẩn cấp (urgent / non_urgent / low_risk)
type RiskCategory struct {
	Name          null.String `json:"name"`
	Description   null.String `json:"description"`
	Text_1        null.String `json:"text_1"`
	Iframe_desc   null.String `json:"iframe_desc"`
	Iframe_text_1 null.String `json:"iframe_text_1"`
	Country_id    null.String `json:"country_id"`
	Created_at    null.String `json:"created_at"`
	Updated_at    null.String `json:"updated_at"`
	Rating        null.String `json:"rating"`
}

// Result — Kết luận bệnh (mở rộng với dữ liệu Blackwell)
type Result struct {
	Risk_category         RiskCategory `json:"risk_category"`
	Additional_advice     null.String  `json:"additional_advice"`
	First_aid_text        null.String  `json:"first_aid_text"`
	Problem_text          null.String  `json:"problem_text"`
	Travel_advice_text    null.String  `json:"travel_advice_text"`
	Iframe_first_aid_text null.String  `json:"iframe_first_aid_text"`
	Iframe_problem_text   null.String  `json:"iframe_problem_text"`
	// ── MỚI: Fields bổ sung từ dữ liệu Blackwell ──
	Disease_name     null.String `json:"disease_name"`      // Tên tiếng Anh gốc
	Name_vi          null.String `json:"name_vi"`           // Tên tiếng Việt
	Medications_text null.String `json:"medications_text"`  // Thuốc thường dùng
	Nutrition_text   null.String `json:"nutrition_text"`    // Chế độ ăn
	Nutrition_advice null.String `json:"nutrition_advice"`  // JSON: should_eat, avoid, suggestion
	Images_json      null.String `json:"images_json"`       // JSON array ảnh minh họa
}

// QuestionActionable — Wrapper cho Question node
type QuestionActionable struct {
	Id              int         `json:"id"`
	Actionable_type null.String `json:"type"`
	Created_at      null.String `json:"created_at"`
	Updated_at      null.String `json:"updated_at"`
	Question        Question    `json:"question"`
}

// ResultActionable — Wrapper cho Result node
type ResultActionable struct {
	Id              int         `json:"id"`
	Actionable_type null.String `json:"type"`
	Created_at      null.String `json:"created_at"`
	Updated_at      null.String `json:"updated_at"`
	Result          Result      `json:"result"`
}

// ── Types mới cho spec v1.3 ──

// Feedback — Góp ý ẩn danh
type Feedback struct {
	Id          int         `json:"id"`
	Diagnose_id null.Int    `json:"diagnose_id"`
	Content     null.String `json:"content"`
	Created_at  null.String `json:"created_at"`
}

// AffiliateProduct — Sản phẩm affiliate từ Google Sheet
type AffiliateProduct struct {
	Disease_id   int         `json:"disease_id"`
	Product_name null.String `json:"product_name"`
	Link_shopee  null.String `json:"link_shopee"`
	Color        null.String `json:"color"`   // "green" hoặc "red"
	Reason       null.String `json:"reason"`  // Lý do hợp/không hợp
	Pet_type     null.String `json:"pet_type"`
}

type AnimalsResponse []Animal
type SymptomsResponse []Symptom
type FeedbacksResponse []Feedback
type AffiliateResponse []AffiliateProduct
