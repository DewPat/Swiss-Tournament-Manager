const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log(`Creating database ${process.env.DB_NAME}...`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
  await connection.end();

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log("Creating tables...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id VARCHAR(50) PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'setup',
      current_round INT DEFAULT 0,
      total_rounds INT DEFAULT 5,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id VARCHAR(50) PRIMARY KEY,
      tournament_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      score FLOAT DEFAULT 0,
      active BOOLEAN DEFAULT true,
      colors JSON,
      opponents JSON,
      match_history JSON,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );
  `);

  // result: null, '1-0', '0.5-0.5', '0-1'
  // using string ids for players
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pairings (
      id VARCHAR(50) PRIMARY KEY,
      tournament_id VARCHAR(50) NOT NULL,
      round INT NOT NULL,
      white_player_id VARCHAR(50), 
      black_player_id VARCHAR(50), 
      result VARCHAR(10) DEFAULT NULL,
      bye BOOLEAN DEFAULT false,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    );
  `);

  console.log("Database & tables are ready.");
  process.exit(0);
}

createDatabase().catch(console.error);
