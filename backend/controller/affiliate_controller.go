package controller

import (
	"encoding/json"
	"net/http"
	"petismyfamily-backend/service"

	"github.com/gorilla/mux"
)

type IAffiliateController interface {
	GetProducts(w http.ResponseWriter, r *http.Request)
}

type AffiliateController struct {
	service service.IAffiliateService
}

func (c *AffiliateController) GetProducts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	diseaseId := vars["disease_id"]
	petType := r.URL.Query().Get("pet_type")

	products, err := c.service.GetProducts(diseaseId, petType)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"` + err.Error() + `"}`))
		return
	}

	data, _ := json.Marshal(products)
	w.Header().Add("content-type", "application/json; charset=UTF-8")
	w.Write(data)
}

func NewAffiliateController(service service.IAffiliateService) IAffiliateController {
	return &AffiliateController{service: service}
}
