@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo  PET IS MY FAMILY — Khoi dong Web App
echo ========================================================

:: ── Mat khau lay tu ID key.txt ──
set PGPASSWORD=Anhtuan2808!
set PG_USER=postgres
set DB_NAME=petismyfamily
set DB_HOST=localhost
set DB_PORT=5432

set DATABASE_URL=postgres://%PG_USER%:%PGPASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%?sslmode=disable

echo.
echo [1/4] Tao Database (neu chua co)...
psql -U %PG_USER% -h %DB_HOST% -p %DB_PORT% -c "CREATE DATABASE %DB_NAME%" 2>nul

echo [2/4] Chay Schema (10 bang)...
psql -U %PG_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f backend\database\schema.sql

echo [3/4] Sinh Seed Data tu enriched_diseases.json...
.venv\Scripts\python backend\database\seed_blackwell.py
psql -U %PG_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f backend\database\seed_data.sql

echo.
echo [4/4] Khoi dong Backend (Go API port 8080) va Frontend (React port 5173)...
start "Go Backend" cmd /k "cd /d %~dp0backend && set DATABASE_URL=%DATABASE_URL% && go mod tidy && go run main.go"
timeout /t 2 /nobreak >nul
start "React Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev -- --open"

echo.
echo HOAN TAT! Web se tu mo tren trinh duyet.
echo Neu hien loi 'psql is not recognized', ban can cai PostgreSQL truoc.
echo ========================================================
pause
