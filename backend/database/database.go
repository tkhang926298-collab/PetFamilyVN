package database

import (
	"database/sql"
	"os"

	_ "github.com/lib/pq"
)

// SetupDB kết nối PostgreSQL qua DATABASE_URL từ .env
func SetupDB() *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", dbURL)
	CheckErr(err)
	return db
}

func CheckErr(err error) {
	if err != nil {
		panic(err)
	}
}
