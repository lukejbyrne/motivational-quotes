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
      const { 
        text, 
        author, 
        category, 
        tags, 
        source_title, 
        source_url, 
        source_type = 'unknown', 
        verification_status = 'pending', 
        quality_score = 5, 
        language = 'en', 
        context_notes 
      } = quoteData;
      
      const query = `
        INSERT INTO quotes (
          text, author, category, tags, source_title, source_url, 
          source_type, verification_status, quality_score, language, context_notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [
        text, author, category, tags, source_title, source_url, 
        source_type, verification_status, quality_score, language, context_notes
      ], function(err) {
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
      const { 
        text, 
        author, 
        category, 
        tags, 
        source_title, 
        source_url, 
        source_type, 
        verification_status, 
        quality_score, 
        language, 
        context_notes 
      } = quoteData;
      
      const query = `
        UPDATE quotes 
        SET text = ?, author = ?, category = ?, tags = ?, source_title = ?, 
            source_url = ?, source_type = ?, verification_status = ?, 
            quality_score = ?, language = ?, context_notes = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(query, [
        text, author, category, tags, source_title, source_url, 
        source_type, verification_status, quality_score, language, 
        context_notes, id
      ], function(err) {
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

  static async getByVerificationStatus(status, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE verification_status = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [status, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getByQualityScore(minScore, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE quality_score >= ? 
        ORDER BY quality_score DESC, created_at DESC 
        LIMIT ?
      `;
      
      db.all(query, [minScore, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getBySourceType(sourceType, limit = 20) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE source_type = ? 
        ORDER BY created_at DESC 
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

  static async checkForDuplicates(text, author) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT * FROM quotes 
        WHERE LOWER(TRIM(text)) = LOWER(TRIM(?)) 
        AND LOWER(TRIM(author)) = LOWER(TRIM(?))
      `;
      
      db.all(query, [text, author], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async findSimilarQuotes(text, threshold = 0.85) {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = 'SELECT * FROM quotes';
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const similar = rows.filter(quote => {
            const similarity = this.calculateSimilarity(text.toLowerCase(), quote.text.toLowerCase());
            return similarity >= threshold;
          });
          resolve(similar);
        }
      });
    });
  }

  static calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  static async validateQuote(quoteData) {
    const errors = [];
    
    if (!quoteData.text || quoteData.text.trim().length < 10) {
      errors.push('Quote text must be at least 10 characters long');
    }
    
    if (!quoteData.text || quoteData.text.trim().length > 1000) {
      errors.push('Quote text must be less than 1000 characters');
    }
    
    if (!quoteData.author || quoteData.author.trim().length < 2) {
      errors.push('Author name must be at least 2 characters long');
    }
    
    if (!quoteData.author || quoteData.author.trim().length > 100) {
      errors.push('Author name must be less than 100 characters');
    }
    
    if (quoteData.category && quoteData.category.length > 50) {
      errors.push('Category must be less than 50 characters');
    }
    
    if (quoteData.tags && quoteData.tags.length > 200) {
      errors.push('Tags must be less than 200 characters');
    }
    
    if (quoteData.quality_score && (quoteData.quality_score < 1 || quoteData.quality_score > 10)) {
      errors.push('Quality score must be between 1 and 10');
    }
    
    if (quoteData.verification_status && !['verified', 'pending', 'disputed'].includes(quoteData.verification_status)) {
      errors.push('Verification status must be verified, pending, or disputed');
    }
    
    if (quoteData.source_url && !this.isValidUrl(quoteData.source_url)) {
      errors.push('Source URL must be valid');
    }
    
    const duplicates = await this.checkForDuplicates(quoteData.text, quoteData.author);
    if (duplicates.length > 0) {
      errors.push('This quote already exists in the database');
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

  static async getVerificationStats() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT 
          verification_status,
          COUNT(*) as count,
          AVG(quality_score) as avg_quality
        FROM quotes 
        GROUP BY verification_status
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getSourceTypeStats() {
    return new Promise((resolve, reject) => {
      const db = database.getDb();
      const query = `
        SELECT 
          source_type,
          COUNT(*) as count,
          AVG(quality_score) as avg_quality
        FROM quotes 
        GROUP BY source_type
        ORDER BY count DESC
      `;
      
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = Quote;