const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/quotes.db');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  initializeTables() {
    return new Promise((resolve, reject) => {
      const createQuotesTable = `
        CREATE TABLE IF NOT EXISTS quotes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          author TEXT NOT NULL,
          category TEXT,
          tags TEXT,
          date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_featured BOOLEAN DEFAULT 0,
          featured_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          source_title TEXT,
          source_url TEXT,
          source_type TEXT DEFAULT 'unknown',
          verification_status TEXT DEFAULT 'pending',
          quality_score INTEGER DEFAULT 5,
          language TEXT DEFAULT 'en',
          context_notes TEXT
        )
      `;

      const createAdminsTable = `
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createAnalyticsTable = `
        CREATE TABLE IF NOT EXISTS analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quote_id INTEGER,
          action TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (quote_id) REFERENCES quotes (id)
        )
      `;

      const createSourcesTable = `
        CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT,
          publication_year INTEGER,
          publisher TEXT,
          isbn TEXT,
          url TEXT,
          source_type TEXT NOT NULL,
          credibility_rating INTEGER DEFAULT 5,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.serialize(() => {
        this.db.run(createQuotesTable, (err) => {
          if (err) {
            console.error('Error creating quotes table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createAdminsTable, (err) => {
          if (err) {
            console.error('Error creating admins table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createAnalyticsTable, (err) => {
          if (err) {
            console.error('Error creating analytics table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createSourcesTable, (err) => {
          if (err) {
            console.error('Error creating sources table:', err.message);
            reject(err);
            return;
          }
          console.log('Database tables initialized successfully');
          resolve();
        });
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getDb() {
    return this.db;
  }
}

module.exports = new Database();