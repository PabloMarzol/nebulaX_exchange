@echo off
REM Database setup script for NebulaX Exchange (Windows)

echo Setting up NebulaX Exchange Database...
echo.

REM Database configuration from .env
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=1q2w3e4r5t@!
set DB_NAME=nebulax_exchange_db

REM Set PGPASSWORD environment variable for psql
set PGPASSWORD=%DB_PASSWORD%

REM Check if database exists
echo Checking if database exists...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%'" > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Database '%DB_NAME%' already exists
    set /p CONFIRM="Do you want to drop and recreate it? (y/N): "
    if /i "%CONFIRM%"=="y" (
        echo Dropping existing database...
        psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"
        echo Database dropped
    ) else (
        echo Keeping existing database
        goto :end
    )
)

REM Create database
echo Creating database '%DB_NAME%'...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"

if %ERRORLEVEL% equ 0 (
    echo Database created successfully!
    echo.
) else (
    echo Failed to create database
    goto :error
)

REM Run migrations
echo Running database migrations...
cd /d "%~dp0.."
call pnpm --filter backend migrate

echo.
echo Database setup complete!
echo You can now run 'pnpm run dev' to start the application
goto :end

:error
echo.
echo Error occurred during setup
exit /b 1

:end
exit /b 0
