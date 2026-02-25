package controller

import (
	"encoding/json"
	"net/http"
	"petismyfamily-backend/service"

	"github.com/gorilla/mux"
)

type IAnimalController interface {
	GetAnimals(w http.ResponseWriter, r *http.Request)
	GetSymptoms(w http.ResponseWriter, r *http.Request)
	GetActionable(w http.ResponseWriter, r *http.Request)
}

type AnimalController struct {
	service service.IAnimalService
}

func (c *AnimalController) GetAnimals(w http.ResponseWriter, r *http.Request) {
	response, err := c.service.Animals()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	data, err := json.Marshal(response)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	w.Header().Add("content-type", "application/json; charset=UTF-8")
	w.Write(data)
}

func (c *AnimalController) GetSymptoms(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	animalId := vars["animal_id"]
	response, err := c.service.Symptoms(animalId)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	data, err := json.Marshal(response)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	w.Header().Add("content-type", "application/json; charset=UTF-8")
	w.Write(data)
}

func (c *AnimalController) GetActionable(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	response, err := c.service.GetActionable(id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	data, err := json.Marshal(response)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
		return
	}
	w.Header().Add("content-type", "application/json; charset=UTF-8")
	w.Write(data)
}

func NewAnimalController(service service.IAnimalService) IAnimalController {
	return &AnimalController{service: service}
}
