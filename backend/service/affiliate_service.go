package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"petismyfamily-backend/model"
)

// AffiliateService đọc dữ liệu sản phẩm affiliate từ Google Sheet công khai.
// Google Sheet được publish dưới dạng CSV/JSON, không cần API key.

type IAffiliateService interface {
	GetProducts(diseaseId string, petType string) ([]model.AffiliateProduct, error)
}

type AffiliateService struct {
	SheetURL string // URL Google Sheet JSON export
}

// Cấu trúc JSON từ Google Sheet public (dạng gsx$)
type SheetRow struct {
	DiseaseId   SheetCell `json:"gsx$diseaseid"`
	ProductName SheetCell `json:"gsx$productname"`
	LinkShopee  SheetCell `json:"gsx$linkshopee"`
	Color       SheetCell `json:"gsx$color"`
	Reason      SheetCell `json:"gsx$reason"`
	PetType     SheetCell `json:"gsx$pettype"`
}

type SheetCell struct {
	Text string `json:"$t"`
}

type SheetFeed struct {
	Feed struct {
		Entry []SheetRow `json:"entry"`
	} `json:"feed"`
}

func (s *AffiliateService) GetProducts(diseaseId string, petType string) ([]model.AffiliateProduct, error) {
	resp, err := http.Get(s.SheetURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google Sheet: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var feed SheetFeed
	if err := json.Unmarshal(body, &feed); err != nil {
		return nil, fmt.Errorf("failed to parse Sheet JSON: %w", err)
	}

	var products []model.AffiliateProduct
	for _, row := range feed.Feed.Entry {
		// Filter theo disease_id và pet_type
		if row.DiseaseId.Text == diseaseId {
			if petType == "" || row.PetType.Text == petType || row.PetType.Text == "all" {
				products = append(products, model.AffiliateProduct{
					Product_name: nullStr(row.ProductName.Text),
					Link_shopee:  nullStr(row.LinkShopee.Text),
					Color:        nullStr(row.Color.Text),
					Reason:       nullStr(row.Reason.Text),
					Pet_type:     nullStr(row.PetType.Text),
				})
			}
		}
	}
	return products, nil
}

func nullStr(s string) interface{ Valid() bool } {
	// Helper — trả về null.String
	return nil
}

func NewAffiliateService(sheetURL string) IAffiliateService {
	return &AffiliateService{SheetURL: sheetURL}
}
