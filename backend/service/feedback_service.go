package service

import (
	"petismyfamily-backend/model"
	"petismyfamily-backend/repository"
)

type IFeedbackService interface {
	CreateFeedback(diagnoseId int, content string) (*model.Feedback, error)
}

type FeedbackService struct {
	Repository repository.IFeedback
}

func (s *FeedbackService) CreateFeedback(diagnoseId int, content string) (*model.Feedback, error) {
	return s.Repository.CreateFeedback(diagnoseId, content)
}

func NewFeedbackService(repo repository.IFeedback) IFeedbackService {
	return &FeedbackService{Repository: repo}
}
