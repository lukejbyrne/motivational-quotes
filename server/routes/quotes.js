const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Quote = require('../models/Quote');
const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

router.get('/', 
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    query('category').optional().isString().trim(),
    query('author').optional().isString().trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { limit = 20, offset = 0, category, author } = req.query;
      let quotes;

      if (category) {
        quotes = await Quote.getByCategory(category, parseInt(limit));
      } else if (author) {
        quotes = await Quote.getByAuthor(author, parseInt(limit));
      } else {
        quotes = await Quote.getAll(parseInt(limit), parseInt(offset));
      }

      const totalCount = await Quote.getCount();

      res.json({
        success: true,
        data: {
          quotes,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: totalCount,
            hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
          }
        }
      });
    } catch (error) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quotes'
      });
    }
  }
);

router.get('/random', 
  [
    query('category').optional().isString().trim().withMessage('Category must be a string'),
    query('exclude').optional().isString().withMessage('Exclude must be a comma-separated list of IDs'),
    query('count').optional().isInt({ min: 1, max: 10 }).withMessage('Count must be between 1 and 10')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { category, exclude, count } = req.query;
      
      const excludeIds = exclude ? exclude.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
      
      let result;
      
      if (count && parseInt(count) > 1) {
        const quotes = await Quote.getMultipleRandom(parseInt(count), category || null, excludeIds);
        result = { quotes };
      } else {
        const quote = await Quote.getRandom(category || null, excludeIds);
        result = { quote };
      }
      
      if ((!result.quote && !result.quotes) || (result.quotes && result.quotes.length === 0)) {
        return res.status(404).json({
          success: false,
          message: 'No quotes found'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching random quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch random quote'
      });
    }
  }
);

router.get('/daily', async (req, res) => {
  try {
    const quote = await Quote.getDailyQuote();
    
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'No daily quote available'
      });
    }

    res.json({
      success: true,
      data: { quote }
    });
  } catch (error) {
    console.error('Error fetching daily quote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily quote'
    });
  }
});

router.get('/search',
  [
    query('q').notEmpty().withMessage('Search query is required').isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q: searchTerm, limit = 20 } = req.query;
      const quotes = await Quote.search(searchTerm, parseInt(limit));

      res.json({
        success: true,
        data: {
          quotes,
          searchTerm,
          count: quotes.length
        }
      });
    } catch (error) {
      console.error('Error searching quotes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search quotes'
      });
    }
  }
);

router.get('/advanced-search',
  [
    query('searchTerm').optional().isLength({ max: 100 }).withMessage('Search term must be less than 100 characters'),
    query('category').optional().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
    query('author').optional().isLength({ max: 100 }).withMessage('Author must be less than 100 characters'),
    query('tags').optional().isLength({ max: 200 }).withMessage('Tags must be less than 200 characters'),
    query('dateFrom').optional().isISO8601().withMessage('Date from must be a valid date'),
    query('dateTo').optional().isISO8601().withMessage('Date to must be a valid date'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        searchTerm, 
        category, 
        author, 
        tags, 
        dateFrom, 
        dateTo, 
        limit = 20, 
        offset = 0 
      } = req.query;
      
      const filters = {
        searchTerm,
        category,
        author,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        dateFrom,
        dateTo
      };
      
      Object.keys(filters).forEach(key => {
        if (!filters[key] || (Array.isArray(filters[key]) && filters[key].length === 0)) {
          delete filters[key];
        }
      });
      
      const quotes = await Quote.advancedSearch(filters, parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: {
          quotes,
          filters,
          count: quotes.length,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error in advanced search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform advanced search'
      });
    }
  }
);

router.get('/suggestions',
  [
    query('q').notEmpty().withMessage('Search query is required').isLength({ min: 1, max: 50 }).withMessage('Search query must be between 1 and 50 characters'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { q: searchTerm, limit = 10 } = req.query;
      const suggestions = await Quote.getSearchSuggestions(searchTerm, parseInt(limit));
      
      res.json({
        success: true,
        data: {
          suggestions,
          searchTerm
        }
      });
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch search suggestions'
      });
    }
  }
);

router.get('/popular-terms', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const popularTerms = await Quote.getPopularSearchTerms(parseInt(limit));
    
    res.json({
      success: true,
      data: { popularTerms }
    });
  } catch (error) {
    console.error('Error fetching popular search terms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular search terms'
    });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await Quote.getCategories();
    
    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

router.get('/authors', async (req, res) => {
  try {
    const authors = await Quote.getAuthors();
    
    res.json({
      success: true,
      data: { authors }
    });
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch authors'
    });
  }
});

router.get('/:id',
  [
    query('id').isInt({ min: 1 }).withMessage('Quote ID must be a positive integer')
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const quote = await Quote.getById(parseInt(id));
      
      if (!quote) {
        return res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
      }

      res.json({
        success: true,
        data: { quote }
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quote'
      });
    }
  }
);

router.post('/',
  [
    body('text').notEmpty().withMessage('Quote text is required').isLength({ min: 10, max: 1000 }).withMessage('Quote text must be between 10 and 1000 characters'),
    body('author').notEmpty().withMessage('Author is required').isLength({ min: 2, max: 100 }).withMessage('Author name must be between 2 and 100 characters'),
    body('category').optional().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
    body('tags').optional().isLength({ max: 200 }).withMessage('Tags must be less than 200 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { text, author, category, tags } = req.body;
      
      const newQuote = await Quote.create({
        text: text.trim(),
        author: author.trim(),
        category: category ? category.trim() : null,
        tags: tags ? tags.trim() : null
      });

      res.status(201).json({
        success: true,
        message: 'Quote created successfully',
        data: { quote: newQuote }
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quote'
      });
    }
  }
);

router.put('/:id',
  [
    body('text').notEmpty().withMessage('Quote text is required').isLength({ min: 10, max: 1000 }).withMessage('Quote text must be between 10 and 1000 characters'),
    body('author').notEmpty().withMessage('Author is required').isLength({ min: 2, max: 100 }).withMessage('Author name must be between 2 and 100 characters'),
    body('category').optional().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
    body('tags').optional().isLength({ max: 200 }).withMessage('Tags must be less than 200 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { text, author, category, tags } = req.body;
      
      const existingQuote = await Quote.getById(parseInt(id));
      if (!existingQuote) {
        return res.status(404).json({
          success: false,
          message: 'Quote not found'
        });
      }

      const updatedQuote = await Quote.update(parseInt(id), {
        text: text.trim(),
        author: author.trim(),
        category: category ? category.trim() : null,
        tags: tags ? tags.trim() : null
      });

      res.json({
        success: true,
        message: 'Quote updated successfully',
        data: { quote: updatedQuote }
      });
    } catch (error) {
      console.error('Error updating quote:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update quote'
      });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingQuote = await Quote.getById(parseInt(id));
    if (!existingQuote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found'
      });
    }

    await Quote.delete(parseInt(id));

    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete quote'
    });
  }
});

module.exports = router;