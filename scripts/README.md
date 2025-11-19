# Database Setup Scripts

This directory contains scripts to help you set up the NebulaX Exchange database.

## Prerequisites

1. **PostgreSQL** must be installed and running
   - Download from: https://www.postgresql.org/download/
   - Default port: 5432
   - Default user: postgres

2. **psql** command-line tool must be available
   - Usually installed with PostgreSQL
   - Test with: `psql --version`

## Quick Start

### Option 1: Automated Setup (Recommended)

Run the Node.js setup script:

```bash
# From project root
pnpm run db:setup
```

This script will:
- Check if the database exists
- Create it if needed (or offer to recreate)
- Run migrations automatically
- Handle errors gracefully

### Option 2: Manual SQL Script

If you prefer manual control:

```bash
# From project root (requires psql in PATH)
pnpm run db:create

# Then run migrations
pnpm run migrate
```

### Option 3: Using psql Directly

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nebulax_exchange_db;

# Exit psql
\q

# Run migrations
pnpm run migrate
```

### Option 4: Platform-Specific Scripts

**Linux/macOS:**
```bash
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

**Windows:**
```cmd
scripts\setup-db.bat
```

## Database Configuration

The database connection details are in `.env`:

```env
DATABASE_URL="postgres://postgres:1q2w3e4r5t%40%21@localhost:5432/nebulax_exchange_db"
```

Format: `postgres://[user]:[password]@[host]:[port]/[database]`

## Common Issues

### Issue: "psql: command not found"

**Solution**: Install PostgreSQL or add it to your PATH

**Windows**: Add PostgreSQL bin directory to PATH
- Usually: `C:\Program Files\PostgreSQL\XX\bin`

**macOS**:
```bash
brew install postgresql
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get install postgresql postgresql-contrib
```

### Issue: "connection refused"

**Solution**: Start PostgreSQL service

**Windows**:
```cmd
net start postgresql-x64-XX
```

**macOS**:
```bash
brew services start postgresql
```

**Linux**:
```bash
sudo systemctl start postgresql
```

### Issue: "password authentication failed"

**Solution**: Check your password in `.env` matches PostgreSQL user password

You can reset the postgres user password:
```sql
ALTER USER postgres WITH PASSWORD 'your-new-password';
```

## After Database Setup

Once the database is created and migrations are run, you can:

1. **Start the application**:
   ```bash
   pnpm run dev        # Frontend only
   pnpm run dev:backend # Backend only
   pnpm run dev:all    # Both
   ```

2. **View database** with Drizzle Studio:
   ```bash
   pnpm run db:studio
   ```

3. **Run additional migrations** (after schema changes):
   ```bash
   pnpm run migrate
   ```

## Files in This Directory

- `setup-db.js` - Node.js script (cross-platform, recommended)
- `setup-db.sh` - Bash script for Linux/macOS
- `setup-db.bat` - Batch script for Windows
- `create-db.sql` - Raw SQL script for manual execution
- `README.md` - This file

## Need Help?

If you encounter issues not covered here, check:
1. PostgreSQL logs for detailed error messages
2. Ensure all prerequisites are installed
3. Verify `.env` configuration is correct
4. Check that PostgreSQL is running on the expected port
