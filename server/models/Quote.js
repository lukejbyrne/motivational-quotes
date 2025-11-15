const database = require('../config/database');

class Quote {
  static async getAll(limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getById(id) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT * FROM quotes WHERE id = ?';
      
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async getRandom(category = null, excludeIds = []) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      let query = 'SELECT * FROM quotes';
      let params = [];
      
      const conditions = [];
      
      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }
      
      if (excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(',');
        conditions.push(`id NOT IN (${placeholders})`);
        params.push(...excludeIds);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY RANDOM() LIMIT 1';
      
      db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async getMultipleRandom(count = 5, category = null, excludeIds = []) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      let query = 'SELECT * FROM quotes';
      let params = [];
      
      const conditions = [];
      
      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }
      
      if (excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(',');
        conditions.push(`id NOT IN (${placeholders})`);
        params.push(...excludeIds);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY RANDOM() LIMIT ?';
      params.push(count);
      
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getDailyQuote() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const today = new Date().toISOString().split('T')[0];
      
      let query = 'SELECT * FROM quotes WHERE featured_date = ?';
      
      db.get(query, [today], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(row);
        } else {
          query = `
            SELECT * FROM quotes 
            WHERE featured_date IS NULL OR featured_date != ?
            ORDER BY RANDOM() 
            LIMIT 1
          `;
          
          db.get(query, [today], (err, randomRow) => {
            if (err) {
              reject(err);
            } else if (randomRow) {
              this.setFeaturedDate(randomRow.id, today)
                .then(() => resolve(randomRow))
                .catch(reject);
            } else {
              resolve(null);
            }
          });
        }
      });
    });
  }

  static async search(searchTerm, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE text LIKE ? OR author LIKE ? OR category LIKE ? OR tags LIKE ?
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      const searchPattern = `%${searchTerm}%`;
      
      db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async advancedSearch(filters, limit = 20, offset = 0) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      let query = 'SELECT * FROM quotes WHERE 1=1';
      const params = [];
      
      if (filters.searchTerm) {
        query += ' AND (text LIKE ? OR author LIKE ? OR category LIKE ? OR tags LIKE ?)';
        const searchPattern = `%${filters.searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }
      
      if (filters.author) {
        query += ' AND author LIKE ?';
        params.push(`%${filters.author}%`);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' AND ');
        query += ` AND (${tagConditions})`;
        filters.tags.forEach(tag => params.push(`%${tag}%`));
      }
      
      if (filters.dateFrom) {
        query += ' AND date_added >= ?';
        params.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query += ' AND date_added <= ?';
        params.push(filters.dateTo);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getSearchSuggestions(searchTerm, limit = 10) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      
      const authorQuery = `
        SELECT DISTINCT author as suggestion, 'author' as type 
        FROM quotes 
        WHERE author LIKE ? 
        LIMIT ?
      `;
      
      const categoryQuery = `
        SELECT DISTINCT category as suggestion, 'category' as type 
        FROM quotes 
        WHERE category LIKE ? AND category IS NOT NULL 
        LIMIT ?
      `;
      
      const searchPattern = `%${searchTerm}%`;
      
      Promise.all([
        new Promise((resolve, reject) => {
          db.all(authorQuery, [searchPattern, Math.floor(limit / 2)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          db.all(categoryQuery, [searchPattern, Math.floor(limit / 2)], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        })
      ]).then(([authors, categories]) => {
        const suggestions = [...authors, ...categories].slice(0, limit);
        resolve(suggestions);
      }).catch(reject);
    });
  }

  static async getPopularSearchTerms(limit = 10) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT author as term, COUNT(*) as count, 'author' as type
        FROM quotes 
        GROUP BY author 
        ORDER BY count DESC 
        LIMIT ?
      `;
      
      db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getByCategory(category, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE category = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [category, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getByAuthor(author, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE author LIKE ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [`%${author}%`, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async create(quoteData) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const { text, author, category, tags } = quoteData;
      
      const query = `
        INSERT INTO quotes (text, author, category, tags)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(query, [text, author, category, tags], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...quoteData });
        }
      });
    });
  }

  static async update(id, quoteData) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const { text, author, category, tags } = quoteData;
      
      const query = `
        UPDATE quotes 
        SET text = ?, author = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(query, [text, author, category, tags, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, ...quoteData });
        }
      });
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'DELETE FROM quotes WHERE id = ?';
      
      db.run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deletedId: id, changes: this.changes });
        }
      });
    });
  }

  static async setFeaturedDate(id, date) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'UPDATE quotes SET featured_date = ? WHERE id = ?';
      
      db.run(query, [date, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, featured_date: date });
        }
      });
    });
  }

  static async getCategories() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT DISTINCT category FROM quotes WHERE category IS NOT NULL ORDER BY category';
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => row.category));
        }
      });
    });
  }

  static async getAuthors() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT DISTINCT author FROM quotes ORDER BY author';
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => row.author));
        }
      });
    });
  }

  static async getCount() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT COUNT(*) as count FROM quotes';
      
      db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}

module.exports = Quote;