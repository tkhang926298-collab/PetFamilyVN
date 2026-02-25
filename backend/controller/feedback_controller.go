package controller

import (
	"encoding/json"
	"net/http"
	"petismyfamily-backend/service"
)

type IFeedbackController interface {
	PostFeedback(w http.ResponseWriter, r *http.Request)
}

type FeedbackController struct {
	service service.IFeedbackService
}

type FeedbackRequest struct {
	DiagnoseId int    `json:"diagnose_id"`
	Content    string `json:"content"`
}

func (c *FeedbackController) PostFeedback(w http.ResponseWriter, r *http.Request) {
	var req FeedbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"Invalid request body"}`))
		return
	}
	if req.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"Content is required"}`))
		return
	}

	feedback, err := c.service.CreateFeedback(req.DiagnoseId, req.Content)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}

	data, _ := json.Marshal(feedback)
	w.Header().Add("content-type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusCreated)
	w.Write(data)
}

func NewFeedbackController(service service.IFeedbackService) IFeedbackController {
	return &FeedbackController{service: service}
}
