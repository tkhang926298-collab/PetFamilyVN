package main

import "petismyfamily-backend/server"

func main() {
	s := server.NewServer()
	s.StartServer()
}
