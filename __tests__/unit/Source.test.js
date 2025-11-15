const Source = require('../../server/models/Source');
const database = require('../../server/config/database');

describe('Source Model', () => {
  beforeAll(async () => {
    await database.connect();
  });

  afterAll(async () => {
    await database.close();
  });

  beforeEach(async () => {
    const db = database.getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM sources', resolve);
    });
  });

  describe('Validation', () => {
    test('should validate source with all required fields', async () => {
      const validSource = {
        title: 'Test Book Title',
        author: 'Test Author',
        source_type: 'book',
        credibility_rating: 8,
        publication_year: 2020,
        url: 'https://example.com/test-book'
      };

      const errors = await Source.validateSource(validSource);
      expect(errors).toHaveLength(0);
    });

    test('should reject source with title too short', async () => {
      const invalidSource = {
        title: 'A',
        source_type: 'book'
      };

      const errors = await Source.validateSource(invalidSource);
      expect(errors).toContain('Source title must be at least 2 characters long');
    });

    test('should reject source without source type', async () => {
      const invalidSource = {
        title: 'Valid Title'
      };

      const errors = await Source.validateSource(invalidSource);
      expect(errors).toContain('Source type is required');
    });

    test('should reject source with invalid credibility rating', async () => {
      const invalidSource = {
        title: 'Valid Title',
        source_type: 'book',
        credibility_rating: 11
      };

      const errors = await Source.validateSource(invalidSource);
      expect(errors).toContain('Credibility rating must be between 1 and 10');
    });

    test('should reject source with invalid publication year', async () => {
      const invalidSource = {
        title: 'Valid Title',
        source_type: 'book',
        publication_year: 2050
      };

      const errors = await Source.validateSource(invalidSource);
      expect(errors).toContain('Publication year must be valid');
    });

    test('should reject source with invalid URL', async () => {
      const invalidSource = {
        title: 'Valid Title',
        source_type: 'book',
        url: 'not-a-valid-url'
      };

      const errors = await Source.validateSource(invalidSource);
      expect(errors).toContain('URL must be valid');
    });
  });

  describe('CRUD Operations', () => {
    test('should create source with all fields', async () => {
      const sourceData = {
        title: 'The Art of War',
        author: 'Sun Tzu',
        publication_year: -500,
        publisher: 'Ancient Publisher',
        isbn: '978-0123456789',
        url: 'https://example.com/art-of-war',
        source_type: 'book',
        credibility_rating: 9,
        description: 'Ancient Chinese military treatise'
      };

      const result = await Source.create(sourceData);
      expect(result.id).toBeDefined();
      expect(result.title).toBe(sourceData.title);
      expect(result.credibility_rating).toBe(sourceData.credibility_rating);
    });

    test('should update source', async () => {
      const sourceData = {
        title: 'Original Title',
        source_type: 'book',
        credibility_rating: 5
      };

      const created = await Source.create(sourceData);
      
      const updateData = {
        title: 'Updated Title',
        source_type: 'book',
        credibility_rating: 8,
        author: 'Updated Author'
      };

      const updated = await Source.update(created.id, updateData);
      expect(updated.title).toBe(updateData.title);
      expect(updated.credibility_rating).toBe(updateData.credibility_rating);
    });

    test('should retrieve source by ID', async () => {
      const sourceData = {
        title: 'Test Source',
        source_type: 'book',
        credibility_rating: 7
      };

      const created = await Source.create(sourceData);
      const retrieved = await Source.getById(created.id);
      
      expect(retrieved.title).toBe(sourceData.title);
      expect(retrieved.id).toBe(created.id);
    });

    test('should delete source', async () => {
      const sourceData = {
        title: 'Source to Delete',
        source_type: 'book'
      };

      const created = await Source.create(sourceData);
      const result = await Source.delete(created.id);
      
      expect(result.deletedId).toBe(created.id);
      expect(result.changes).toBe(1);

      const retrieved = await Source.getById(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      const sources = [
        {
          title: 'High Credibility Book',
          author: 'Credible Author',
          source_type: 'book',
          credibility_rating: 9
        },
        {
          title: 'Medium Credibility Speech',
          author: 'Speaker',
          source_type: 'speech',
          credibility_rating: 6
        },
        {
          title: 'Low Credibility Article',
          author: 'Blogger',
          source_type: 'article',
          credibility_rating: 3
        }
      ];

      for (const source of sources) {
        await Source.create(source);
      }
    });

    test('should get sources by type', async () => {
      const bookSources = await Source.getByType('book');
      expect(bookSources).toHaveLength(1);
      expect(bookSources[0].title).toBe('High Credibility Book');
    });

    test('should get sources by credibility rating', async () => {
      const highCredibilitySources = await Source.getByCredibilityRating(7);
      expect(highCredibilitySources).toHaveLength(1);
      expect(highCredibilitySources[0].title).toBe('High Credibility Book');
    });

    test('should search sources', async () => {
      const searchResults = await Source.search('Credible');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('High Credibility Book');
    });

    test('should get all sources ordered by credibility', async () => {
      const allSources = await Source.getAll();
      expect(allSources).toHaveLength(3);
      expect(allSources[0].credibility_rating).toBeGreaterThanOrEqual(allSources[1].credibility_rating);
      expect(allSources[1].credibility_rating).toBeGreaterThanOrEqual(allSources[2].credibility_rating);
    });

    test('should get high credibility sources', async () => {
      const highCredSources = await Source.getHighCredibilitySources(7);
      expect(highCredSources).toHaveLength(1);
      expect(highCredSources[0].title).toBe('High Credibility Book');
    });

    test('should get source types', async () => {
      const sourceTypes = await Source.getSourceTypes();
      expect(sourceTypes).toHaveLength(3);
      expect(sourceTypes).toContain('book');
      expect(sourceTypes).toContain('speech');
      expect(sourceTypes).toContain('article');
    });

    test('should get source count', async () => {
      const count = await Source.getCount();
      expect(count).toBe(3);
    });
  });

  describe('URL Validation', () => {
    test('should validate correct URLs', () => {
      expect(Source.isValidUrl('https://example.com')).toBe(true);
      expect(Source.isValidUrl('http://test.org/path')).toBe(true);
      expect(Source.isValidUrl('https://subdomain.example.com/path?query=value')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(Source.isValidUrl('not-a-url')).toBe(false);
      expect(Source.isValidUrl('ftp://invalid')).toBe(false);
      expect(Source.isValidUrl('')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty search results', async () => {
      const searchResults = await Source.search('nonexistent');
      expect(searchResults).toHaveLength(0);
    });

    test('should handle non-existent source type', async () => {
      const results = await Source.getByType('nonexistent');
      expect(results).toHaveLength(0);
    });

    test('should handle very high credibility rating filter', async () => {
      const results = await Source.getByCredibilityRating(10);
      expect(results).toHaveLength(0);
    });
  });
});