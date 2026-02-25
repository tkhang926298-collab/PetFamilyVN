package repository

import (
	"database/sql"
	"petismyfamily-backend/database"
	"petismyfamily-backend/model"

	"gopkg.in/guregu/null.v3"
)

type FeedbackRepo struct {
	DB *sql.DB
}

type IFeedback interface {
	CreateFeedback(diagnoseId int, content string) (*model.Feedback, error)
	GetFeedbacks() ([]*model.Feedback, error)
}

func (r *FeedbackRepo) CreateFeedback(diagnoseId int, content string) (*model.Feedback, error) {
	var id int
	var createdAt null.String
	err := r.DB.QueryRow(
		"INSERT INTO feedback (diagnose_id, content) VALUES ($1, $2) RETURNING id, created_at",
		diagnoseId, content,
	).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}
	return &model.Feedback{
		Id:          id,
		Diagnose_id: null.IntFrom(int64(diagnoseId)),
		Content:     null.StringFrom(content),
		Created_at:  createdAt,
	}, nil
}

func (r *FeedbackRepo) GetFeedbacks() ([]*model.Feedback, error) {
	rows, err := r.DB.Query("SELECT id, diagnose_id, content, created_at FROM feedback ORDER BY created_at DESC LIMIT 100")
	if err != nil {
		return nil, err
	}
	var feedbacks []*model.Feedback
	for rows.Next() {
		var id int
		var diagnoseId null.Int
		var content null.String
		var createdAt null.String
		err = rows.Scan(&id, &diagnoseId, &content, &createdAt)
		database.CheckErr(err)
		feedbacks = append(feedbacks, &model.Feedback{Id: id, Diagnose_id: diagnoseId, Content: content, Created_at: createdAt})
	}
	return feedbacks, nil
}

func NewFeedbackRepository() IFeedback {
	db := database.SetupDB()
	return &FeedbackRepo{DB: db}
}
