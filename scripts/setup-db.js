#!/usr/bin/env node
/**
 * Database Setup Script for NebulaX Exchange
 * Creates the PostgreSQL database if it doesn't exist
 */

import {spawn} from "child_process";
import path from "path";
import fs from "fs";
// const { spawn } = require('child_process');
// const path = require('path');
// const fs = require('fs');

// Load environment variables
// const dotenv = require('dotenv');
import dotenv from "dotenv";
dotenv.config({ path: '../.env' });

// Parse DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Extract database details from URL
// Format: postgres://user:password@host:port/database
const dbUrlMatch = DATABASE_URL.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!dbUrlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, encodedPassword, host, port, dbName] = dbUrlMatch;
const password = decodeURIComponent(encodedPassword);

console.log('🔧 NebulaX Exchange Database Setup\n');
console.log(`📋 Configuration:`);
console.log(`   Host:     ${host}`);
console.log(`   Port:     ${port}`);
console.log(`   User:     ${user}`);
console.log(`   Database: ${dbName}\n`);

// Function to run psql command
function runPsql(database, command) {
  return new Promise((resolve, reject) => {
    const psql = spawn('psql', [
      '-h', host,
      '-p', port,
      '-U', user,
      '-d', database,
      '-c', command
    ], {
      env: {
        ...process.env,
        PGPASSWORD: password
      }
    });

    let stdout = '';
    let stderr = '';

    psql.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    psql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    psql.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `psql exited with code ${code}`));
      }
    });

    psql.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('psql command not found. Please install PostgreSQL client tools.'));
      } else {
        reject(err);
      }
    });
  });
}

// Main setup function
async function setupDatabase() {
  try {
    // Check if database exists
    console.log('🔍 Checking if database exists...');

    try {
      const checkResult = await runPsql('postgres',
        `SELECT 1 FROM pg_database WHERE datname='${dbName}'`
      );

      if (checkResult.includes('1 row')) {
        console.log(`✅ Database '${dbName}' already exists\n`);

        // Ask if user wants to recreate
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        return new Promise((resolve) => {
          readline.question('⚠️  Do you want to drop and recreate it? (y/N): ', async (answer) => {
            readline.close();

            if (answer.toLowerCase() === 'y') {
              console.log('🗑️  Dropping existing database...');
              await runPsql('postgres', `DROP DATABASE IF EXISTS ${dbName}`);
              console.log('✅ Database dropped\n');

              console.log('🔨 Creating database...');
              await runPsql('postgres', `CREATE DATABASE ${dbName}`);
              console.log('✅ Database created successfully!\n');

              await runMigrations();
            } else {
              console.log('ℹ️  Keeping existing database');
            }
            resolve();
          });
        });
      }
    } catch (err) {
      // Database doesn't exist, create it
      console.log(`📦 Database '${dbName}' does not exist, creating...\n`);

      console.log('🔨 Creating database...');
      await runPsql('postgres', `CREATE DATABASE ${dbName}`);
      console.log('✅ Database created successfully!\n');

      await runMigrations();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);

    if (err.message.includes('psql command not found')) {
      console.error('\n💡 PostgreSQL client tools are required.');
      console.error('   Install PostgreSQL from: https://www.postgresql.org/download/');
    } else if (err.message.includes('connection refused')) {
      console.error('\n💡 PostgreSQL server is not running.');
      console.error('   Please start PostgreSQL and try again.');
    }

    process.exit(1);
  }
}

// Run migrations after database creation
async function runMigrations() {
  console.log('🔄 Running database migrations...');

  return new Promise((resolve, reject) => {
    const migrate = spawn('pnpm', ['run', 'migrate'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    migrate.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Database setup complete!');
        console.log('🚀 You can now run "pnpm run dev" to start the application\n');
        resolve();
      } else {
        reject(new Error(`Migration failed with code ${code}`));
      }
    });
  });
}

// Run setup
setupDatabase().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
