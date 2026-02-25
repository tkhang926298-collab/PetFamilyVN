package server

import (
	"net/http"
	"os"
	"petismyfamily-backend/controller"
	"petismyfamily-backend/repository"
	"petismyfamily-backend/service"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type Server struct{}

func NewServer() *Server {
	return &Server{}
}

func (s *Server) StartServer() error {
	// ── Animal (Decision Tree — giữ nguyên VetHeal) ──
	animalRepo := repository.NewAnimalRepository()
	animalSvc := service.NewAnimalService(animalRepo)
	animalCtrl := controller.NewAnimalController(animalSvc)

	// ── Feedback (MỚI) ──
	feedbackRepo := repository.NewFeedbackRepository()
	feedbackSvc := service.NewFeedbackService(feedbackRepo)
	feedbackCtrl := controller.NewFeedbackController(feedbackSvc)

	// ── Affiliate (MỚI — Google Sheet public) ──
	sheetURL := os.Getenv("AFFILIATE_SHEET_URL")
	if sheetURL == "" {
		sheetURL = "https://spreadsheets.google.com/feeds/list/YOUR_SHEET_ID/1/public/values?alt=json"
	}
	affiliateSvc := service.NewAffiliateService(sheetURL)
	affiliateCtrl := controller.NewAffiliateController(affiliateSvc)

	router := mux.NewRouter()

	// ── API Routes: Decision Tree (VetHeal) ──
	router.HandleFunc("/animals", animalCtrl.GetAnimals).Methods("GET")
	router.HandleFunc("/animal/{animal_id}/symptoms", animalCtrl.GetSymptoms).Methods("GET")
	router.HandleFunc("/action/{id}", animalCtrl.GetActionable).Methods("GET")

	// ── API Routes: Feedback (MỚI) ──
	router.HandleFunc("/feedback", feedbackCtrl.PostFeedback).Methods("POST")

	// ── API Routes: Affiliate (MỚI) ──
	router.HandleFunc("/affiliate/{disease_id}", affiliateCtrl.GetProducts).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	c := cors.New(cors.Options{
		AllowedOrigins: []string{
			"https://petismyfamily.web.app",
			"http://localhost:3000",
			"http://localhost:5173",
			"http://localhost:5174",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)
	err := http.ListenAndServe(":"+port, handler)
	return err
}
