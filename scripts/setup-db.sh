#!/bin/bash
# Database setup script for NebulaX Exchange

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up NebulaX Exchange Database...${NC}\n"

# Database configuration from .env
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASSWORD="1q2w3e4r5t@!"
DB_NAME="nebulax_exchange_db"

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    echo -e "${RED}Error: PostgreSQL is not running or not accessible at $DB_HOST:$DB_PORT${NC}"
    echo "Please ensure PostgreSQL is installed and running."
    exit 1
fi

echo -e "${GREEN}PostgreSQL is running${NC}\n"

# Check if database already exists
echo "Checking if database exists..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}Database dropped${NC}"
    else
        echo -e "${YELLOW}Keeping existing database${NC}"
        exit 0
    fi
fi

# Create database
echo "Creating database '$DB_NAME'..."
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"; then
    echo -e "${GREEN}Database created successfully!${NC}\n"
else
    echo -e "${RED}Failed to create database${NC}"
    exit 1
fi

# Run migrations
echo "Running database migrations..."
cd "$(dirname "$0")/.."
pnpm --filter backend migrate

echo -e "\n${GREEN}Database setup complete!${NC}"
echo "You can now run 'pnpm run dev' to start the application"
