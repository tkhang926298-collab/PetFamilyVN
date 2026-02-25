package repository

import (
	"database/sql"
	"petismyfamily-backend/database"
	"petismyfamily-backend/model"

	"gopkg.in/guregu/null.v3"
)

type Animal struct {
	DB *sql.DB
}

type IAnimal interface {
	GetAnimals() ([]*model.Animal, error)
	GetSymptoms(animalId string) ([]*model.Symptom, error)
	GetActionableType(id string) string
	GetQuestionActionable(id string) (*model.QuestionActionable, error)
	GetResultActionable(id string) (*model.ResultActionable, error)
	GetActionableOptions(id string) []*model.Option
}

func (a *Animal) GetAnimals() ([]*model.Animal, error) {
	rows, err := a.DB.Query("SELECT * FROM animal ORDER BY animal_order")
	database.CheckErr(err)
	var animals []*model.Animal

	for rows.Next() {
		var id int
		var name null.String
		var animal_type null.String
		var image null.String
		var animal_order null.Int

		err = rows.Scan(&id, &name, &animal_type, &image, &animal_order)
		database.CheckErr(err)
		animals = append(animals, &model.Animal{Id: id, Name: name, Animal_type: animal_type, Animal_order: animal_order, Image: image})
	}
	return animals, err
}

func (a *Animal) GetSymptoms(animalId string) ([]*model.Symptom, error) {
	rows, err := a.DB.Query("SELECT * FROM symptom WHERE animal_id = $1", animalId)
	database.CheckErr(err)
	var symptoms []*model.Symptom

	for rows.Next() {
		var id int
		var animal_id null.Int
		var description null.String
		var created_at null.String
		var updated_at null.String
		var initial_action_id null.Int

		err = rows.Scan(&id, &animal_id, &description, &created_at, &updated_at, &initial_action_id)
		database.CheckErr(err)
		symptoms = append(symptoms, &model.Symptom{Id: id, Animal_id: animal_id, Description: description, Created_at: created_at, Updated_at: updated_at, Initial_action_id: initial_action_id})
	}
	return symptoms, err
}

func (a *Animal) GetActionableType(id string) string {
	var action_type string
	a.DB.QueryRow(`SELECT "type" FROM actionable WHERE id = $1`, id).Scan(&action_type)
	return action_type
}

func (a *Animal) GetActionableOptions(id string) []*model.Option {
	optionsQuery, err := a.DB.Query(`
		SELECT option.text AS option_text, option.next_action_id, option.response_id
		FROM response
		LEFT JOIN option ON option.response_id = response.id
		LEFT JOIN question ON question.actionable_id = response.action_id
		WHERE response.action_id = response.action_id
		  AND question.actionable_id = response.action_id
		  AND question.actionable_id = $1`, id)
	database.CheckErr(err)
	var options []*model.Option

	for optionsQuery.Next() {
		var option_text null.String
		var next_action_id null.Int
		var response_id null.Int
		err = optionsQuery.Scan(&option_text, &next_action_id, &response_id)
		database.CheckErr(err)
		options = append(options, &model.Option{Text: option_text, Next_action_id: next_action_id, Response_id: response_id})
	}
	return options
}

func (a *Animal) GetQuestionActionable(id string) (*model.QuestionActionable, error) {
	options := a.GetActionableOptions(id)
	rows, err := a.DB.Query(`
		SELECT actionable.*, question.*
		FROM response
		LEFT JOIN option ON option.response_id = response.id
		LEFT JOIN question ON question.actionable_id = response.action_id
		LEFT JOIN actionable ON question.actionable_id = actionable.id
		WHERE response.action_id = response.action_id
		  AND question.actionable_id = response.action_id
		  AND question.actionable_id = $1`, id)
	database.CheckErr(err)
	var actionableQuestion *model.QuestionActionable

	for rows.Next() {
		var id int
		var created_at null.String
		var updated_at null.String
		var action_type null.String
		var actionable_id int
		var text null.String

		err = rows.Scan(&id, &created_at, &updated_at, &action_type, &actionable_id, &text)
		database.CheckErr(err)
		question := &model.Question{Text: text, Actionable_id: actionable_id, Options: options}
		actionableQuestion = &model.QuestionActionable{Id: id, Created_at: created_at, Updated_at: updated_at,
			Actionable_type: action_type, Question: *question}
	}
	return actionableQuestion, err
}

func (a *Animal) GetResultActionable(id string) (*model.ResultActionable, error) {
	var actionableResult *model.ResultActionable

	rows, err := a.DB.Query(`
		SELECT actionable.*, result.*,
			risk_category.name, risk_category.description, risk_category.text_1,
			risk_category.iframe_desc, risk_category.iframe_text_1,
			risk_category.rating, risk_category.country_id,
			risk_category.created_at, risk_category.updated_at
		FROM response
		LEFT JOIN result ON result.response_id = response.id
		LEFT JOIN risk_category ON risk_category.id = result.risk_category_id
		LEFT JOIN actionable ON actionable.id = response.action_id
		WHERE response.action_id = action_id AND action_id = $1`, id)

	for rows.Next() {
		var id int
		var action_type null.String
		var created_at null.String
		var updated_at null.String
		var response_id null.Int
		var additional_advice null.String
		var first_aid_text null.String
		var problem_text null.String
		var travel_advice_text null.String
		var iframe_first_aid_text null.String
		var iframe_problem_text null.String
		var risk_category_id null.String
		// MỚI: fields Blackwell
		var disease_name null.String
		var name_vi null.String
		var medications_text null.String
		var nutrition_text null.String
		var nutrition_advice null.String
		var images_json null.String
		// Risk category fields
		var rc_name null.String
		var rc_description null.String
		var rc_text_1 null.String
		var rc_iframe_desc null.String
		var rc_iframe_text_1 null.String
		var rc_rating null.String
		var rc_country_id null.String
		var rc_created_at null.String
		var rc_updated_at null.String

		err = rows.Scan(&id, &created_at, &updated_at, &action_type,
			&response_id, &additional_advice, &first_aid_text, &problem_text,
			&travel_advice_text, &iframe_first_aid_text, &iframe_problem_text,
			&risk_category_id,
			// MỚI: scan thêm fields Blackwell
			&disease_name, &name_vi, &medications_text, &nutrition_text,
			&nutrition_advice, &images_json,
			// Risk category
			&rc_name, &rc_description, &rc_text_1,
			&rc_iframe_desc, &rc_iframe_text_1, &rc_rating,
			&rc_country_id, &rc_created_at, &rc_updated_at)
		database.CheckErr(err)

		riskCategory := &model.RiskCategory{
			Name: rc_name, Description: rc_description, Text_1: rc_text_1,
			Iframe_desc: rc_iframe_desc, Iframe_text_1: rc_iframe_text_1,
			Country_id: rc_country_id, Rating: rc_rating,
		}
		result := &model.Result{
			Risk_category: *riskCategory, Additional_advice: additional_advice,
			First_aid_text: first_aid_text, Problem_text: problem_text,
			Travel_advice_text: travel_advice_text,
			Iframe_first_aid_text: iframe_first_aid_text,
			Iframe_problem_text:   iframe_problem_text,
			// MỚI
			Disease_name: disease_name, Name_vi: name_vi,
			Medications_text: medications_text, Nutrition_text: nutrition_text,
			Nutrition_advice: nutrition_advice, Images_json: images_json,
		}
		actionableResult = &model.ResultActionable{
			Id: id, Actionable_type: action_type,
			Created_at: created_at, Updated_at: updated_at,
			Result: *result,
		}
	}

	return actionableResult, err
}

func NewAnimalRepository() IAnimal {
	db := database.SetupDB()
	return &Animal{DB: db}
}
