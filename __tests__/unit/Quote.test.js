const Quote = require('../../server/models/Quote');
const database = require('../../server/config/database');

describe('Quote Model', () => {
  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    const db = database.getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM quotes', resolve);
    });
  });

  describe('Validation', () => {
    test('should validate quote with all required fields', async () => {
      const validQuote = {
        text: 'This is a valid test quote with sufficient length.',
        author: 'Test Author',
        category: 'Test',
        tags: 'test,validation',
        source_title: 'Test Source',
        source_type: 'book',
        verification_status: 'verified',
        quality_score: 8
      };

      const errors = await Quote.validateQuote(validQuote);
      expect(errors).toHaveLength(0);
    });

    test('should reject quote with text too short', async () => {
      const invalidQuote = {
        text: 'Short',
        author: 'Test Author'
      };

      const errors = await Quote.validateQuote(invalidQuote);
      expect(errors).toContain('Quote text must be at least 10 characters long');
    });

    test('should reject quote with text too long', async () => {
      const invalidQuote = {
        text: 'A'.repeat(1001),
        author: 'Test Author'
      };

      const errors = await Quote.validateQuote(invalidQuote);
      expect(errors).toContain('Quote text must be less than 1000 characters');
    });

    test('should reject quote with author name too short', async () => {
      const invalidQuote = {
        text: 'This is a valid test quote with sufficient length.',
        author: 'A'
      };

      const errors = await Quote.validateQuote(invalidQuote);
      expect(errors).toContain('Author name must be at least 2 characters long');
    });

    test('should reject quote with invalid quality score', async () => {
      const invalidQuote = {
        text: 'This is a valid test quote with sufficient length.',
        author: 'Test Author',
        quality_score: 11
      };

      const errors = await Quote.validateQuote(invalidQuote);
      expect(errors).toContain('Quality score must be between 1 and 10');
    });

    test('should reject quote with invalid verification status', async () => {
      const invalidQuote = {
        text: 'This is a valid test quote with sufficient length.',
        author: 'Test Author',
        verification_status: 'invalid_status'
      };

      const errors = await Quote.validateQuote(invalidQuote);
      expect(errors).toContain('Verification status must be verified, pending, or disputed');
    });

    test('should reject quote with invalid URL', async () => {
      const invalidQuote = {
        text: 'This is a valid test quote with sufficient length.',
        author: 'Test Author',
        source_url: 'not-a-valid-url'
      };

      const errors = await Quote.validateQuote(invalidQuote);
      expect(errors).toContain('Source URL must be valid');
    });
  });

  describe('Duplicate Detection', () => {
    test('should detect exact duplicates', async () => {
      const quote1 = {
        text: 'This is a test quote for duplicate detection.',
        author: 'Test Author',
        category: 'Test'
      };

      await Quote.create(quote1);
      const duplicates = await Quote.checkForDuplicates(quote1.text, quote1.author);
      expect(duplicates).toHaveLength(1);
    });

    test('should detect duplicates with different case and whitespace', async () => {
      const quote1 = {
        text: 'This is a test quote for duplicate detection.',
        author: 'Test Author',
        category: 'Test'
      };

      await Quote.create(quote1);
      const duplicates = await Quote.checkForDuplicates(
        '  THIS IS A TEST QUOTE FOR DUPLICATE DETECTION.  ',
        '  test author  '
      );
      expect(duplicates).toHaveLength(1);
    });

    test('should not find duplicates for different quotes', async () => {
      const quote1 = {
        text: 'This is a test quote for duplicate detection.',
        author: 'Test Author',
        category: 'Test'
      };

      await Quote.create(quote1);
      const duplicates = await Quote.checkForDuplicates(
        'This is a completely different quote.',
        'Different Author'
      );
      expect(duplicates).toHaveLength(0);
    });
  });

  describe('Similarity Detection', () => {
    test('should calculate similarity correctly', () => {
      const str1 = 'The quick brown fox';
      const str2 = 'The quick brown fox';
      const similarity = Quote.calculateSimilarity(str1, str2);
      expect(similarity).toBe(1.0);
    });

    test('should calculate similarity for different strings', () => {
      const str1 = 'The quick brown fox';
      const str2 = 'The quick brown dog';
      const similarity = Quote.calculateSimilarity(str1, str2);
      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThan(1.0);
    });

    test('should find similar quotes above threshold', async () => {
      const quote1 = {
        text: 'The only way to do great work is to love what you do.',
        author: 'Steve Jobs',
        category: 'Success'
      };

      await Quote.create(quote1);
      
      const similarQuotes = await Quote.findSimilarQuotes(
        'The only way to do great work is to love what you are doing.',
        0.8
      );
      
      expect(similarQuotes).toHaveLength(1);
    });
  });

  describe('CRUD Operations', () => {
    test('should create quote with new fields', async () => {
      const quoteData = {
        text: 'This is a test quote with source attribution.',
        author: 'Test Author',
        category: 'Test',
        tags: 'test,source',
        source_title: 'Test Book',
        source_url: 'https://example.com/test-book',
        source_type: 'book',
        verification_status: 'verified',
        quality_score: 9,
        language: 'en',
        context_notes: 'This is a test context note.'
      };

      const result = await Quote.create(quoteData);
      expect(result.id).toBeDefined();
      expect(result.text).toBe(quoteData.text);
      expect(result.source_title).toBe(quoteData.source_title);
    });

    test('should update quote with new fields', async () => {
      const quoteData = {
        text: 'Original test quote.',
        author: 'Test Author',
        category: 'Test'
      };

      const created = await Quote.create(quoteData);
      
      const updateData = {
        text: 'Updated test quote.',
        author: 'Test Author',
        category: 'Updated',
        source_title: 'Updated Source',
        verification_status: 'verified',
        quality_score: 8
      };

      const updated = await Quote.update(created.id, updateData);
      expect(updated.text).toBe(updateData.text);
      expect(updated.category).toBe(updateData.category);
      expect(updated.source_title).toBe(updateData.source_title);
    });

    test('should retrieve quotes by verification status', async () => {
      const quote1 = {
        text: 'Verified quote.',
        author: 'Author 1',
        verification_status: 'verified'
      };

      const quote2 = {
        text: 'Pending quote.',
        author: 'Author 2',
        verification_status: 'pending'
      };

      await Quote.create(quote1);
      await Quote.create(quote2);

      const verifiedQuotes = await Quote.getByVerificationStatus('verified');
      expect(verifiedQuotes).toHaveLength(1);
      expect(verifiedQuotes[0].text).toBe(quote1.text);
    });

    test('should retrieve quotes by quality score', async () => {
      const quote1 = {
        text: 'High quality quote.',
        author: 'Author 1',
        quality_score: 9
      };

      const quote2 = {
        text: 'Low quality quote.',
        author: 'Author 2',
        quality_score: 3
      };

      await Quote.create(quote1);
      await Quote.create(quote2);

      const highQualityQuotes = await Quote.getByQualityScore(8);
      expect(highQualityQuotes).toHaveLength(1);
      expect(highQualityQuotes[0].text).toBe(quote1.text);
    });

    test('should retrieve quotes by source type', async () => {
      const quote1 = {
        text: 'Book quote.',
        author: 'Author 1',
        source_type: 'book'
      };

      const quote2 = {
        text: 'Speech quote.',
        author: 'Author 2',
        source_type: 'speech'
      };

      await Quote.create(quote1);
      await Quote.create(quote2);

      const bookQuotes = await Quote.getBySourceType('book');
      expect(bookQuotes).toHaveLength(1);
      expect(bookQuotes[0].text).toBe(quote1.text);
    });
  });

  describe('Statistics', () => {
    test('should get verification statistics', async () => {
      const quotes = [
        { text: 'Quote 1', author: 'Author 1', verification_status: 'verified', quality_score: 8 },
        { text: 'Quote 2', author: 'Author 2', verification_status: 'verified', quality_score: 9 },
        { text: 'Quote 3', author: 'Author 3', verification_status: 'pending', quality_score: 6 }
      ];

      for (const quote of quotes) {
        await Quote.create(quote);
      }

      const stats = await Quote.getVerificationStats();
      expect(stats).toHaveLength(2);
      
      const verifiedStats = stats.find(s => s.verification_status === 'verified');
      expect(verifiedStats.count).toBe(2);
      expect(verifiedStats.avg_quality).toBe(8.5);
    });

    test('should get source type statistics', async () => {
      const quotes = [
        { text: 'Quote 1', author: 'Author 1', source_type: 'book', quality_score: 8 },
        { text: 'Quote 2', author: 'Author 2', source_type: 'book', quality_score: 9 },
        { text: 'Quote 3', author: 'Author 3', source_type: 'speech', quality_score: 7 }
      ];

      for (const quote of quotes) {
        await Quote.create(quote);
      }

      const stats = await Quote.getSourceTypeStats();
      expect(stats).toHaveLength(2);
      
      const bookStats = stats.find(s => s.source_type === 'book');
      expect(bookStats.count).toBe(2);
      expect(bookStats.avg_quality).toBe(8.5);
    });
  });

  describe('URL Validation', () => {
    test('should validate correct URLs', () => {
      expect(Quote.isValidUrl('https://example.com')).toBe(true);
      expect(Quote.isValidUrl('http://test.org/path')).toBe(true);
      expect(Quote.isValidUrl('https://subdomain.example.com/path?query=value')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(Quote.isValidUrl('not-a-url')).toBe(false);
      expect(Quote.isValidUrl('ftp://invalid')).toBe(false);
      expect(Quote.isValidUrl('')).toBe(false);
    });
  });
});