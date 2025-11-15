const database = require('../config/database');

class Source {
  static async getAll(limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM sources 
        ORDER BY credibility_rating DESC, created_at DESC 
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
      const query = 'SELECT * FROM sources WHERE id = ?';
      
      db.get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async getByType(sourceType, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM sources 
        WHERE source_type = ? 
        ORDER BY credibility_rating DESC, created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [sourceType, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getByCredibilityRating(minRating, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM sources 
        WHERE credibility_rating >= ? 
        ORDER BY credibility_rating DESC, created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [minRating, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async search(searchTerm, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM sources 
        WHERE title LIKE ? OR author LIKE ? OR publisher LIKE ? OR description LIKE ?
        ORDER BY credibility_rating DESC, created_at DESC 
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

  static async create(sourceData) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const { 
        title, 
        author, 
        publication_year, 
        publisher, 
        isbn, 
        url, 
        source_type, 
        credibility_rating = 5, 
        description 
      } = sourceData;
      
      const query = `
        INSERT INTO sources (
          title, author, publication_year, publisher, isbn, url, 
          source_type, credibility_rating, description
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [
        title, author, publication_year, publisher, isbn, url, 
        source_type, credibility_rating, description
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, ...sourceData });
        }
      });
    });
  }

  static async update(id, sourceData) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const { 
        title, 
        author, 
        publication_year, 
        publisher, 
        isbn, 
        url, 
        source_type, 
        credibility_rating, 
        description 
      } = sourceData;
      
      const query = `
        UPDATE sources 
        SET title = ?, author = ?, publication_year = ?, publisher = ?, 
            isbn = ?, url = ?, source_type = ?, credibility_rating = ?, 
            description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(query, [
        title, author, publication_year, publisher, isbn, url, 
        source_type, credibility_rating, description, id
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, ...sourceData });
        }
      });
    });
  }

  static async delete(id) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'DELETE FROM sources WHERE id = ?';
      
      db.run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deletedId: id, changes: this.changes });
        }
      });
    });
  }

  static async getSourceTypes() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT DISTINCT source_type FROM sources ORDER BY source_type';
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => row.source_type));
        }
      });
    });
  }

  static async getQuotesBySource(sourceId, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT q.*, s.title as source_title_ref, s.credibility_rating 
        FROM quotes q
        LEFT JOIN sources s ON q.source_title = s.title
        WHERE s.id = ?
        ORDER BY q.created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [sourceId, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getCount() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT COUNT(*) as count FROM sources';
      
      db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  static async getHighCredibilitySources(minRating = 7) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM sources 
        WHERE credibility_rating >= ? 
        ORDER BY credibility_rating DESC, title ASC
      `;
      
      db.all(query, [minRating], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async validateSource(sourceData) {
    const errors = [];
    
    if (!sourceData.title || sourceData.title.trim().length < 2) {
      errors.push('Source title must be at least 2 characters long');
    }
    
    if (!sourceData.source_type || sourceData.source_type.trim().length < 2) {
      errors.push('Source type is required');
    }
    
    if (sourceData.credibility_rating && (sourceData.credibility_rating < 1 || sourceData.credibility_rating > 10)) {
      errors.push('Credibility rating must be between 1 and 10');
    }
    
    if (sourceData.publication_year && (sourceData.publication_year < 1000 || sourceData.publication_year > new Date().getFullYear())) {
      errors.push('Publication year must be valid');
    }
    
    if (sourceData.url && !this.isValidUrl(sourceData.url)) {
      errors.push('URL must be valid');
    }
    
    return errors;
  }

  static isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
}

module.exports = Source;