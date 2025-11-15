class MotivationalQuotesApp {
  constructor() {
    this.currentQuote = null;
    this.currentSection = 'home';
    this.categories = [];
    this.randomQuotes = [];
    this.currentRandomIndex = 0;
    this.quoteHistory = [];
    this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    this.searchDebounceTimer = null;
    this.currentSuggestionIndex = -1;
    this.suggestions = [];
    this.recognition = null;
    this.isListening = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadDailyQuote();
    this.loadCategories();
    this.setupNavigation();
    this.handleTouchSearch();
  }

  bindEvents() {
    document.getElementById('randomQuoteBtn').addEventListener('click', () => this.showRandomQuote());
    document.getElementById('searchToggleBtn').addEventListener('click', () => this.toggleSection('search'));
    document.getElementById('categoriesToggleBtn').addEventListener('click', () => this.toggleSection('categories'));
    
    document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
    searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    searchInput.addEventListener('focus', () => this.showSearchHistory());
    searchInput.addEventListener('blur', () => {
      setTimeout(() => this.hideSuggestions(), 150);
    });
    
    document.getElementById('advancedSearchToggle').addEventListener('click', () => this.toggleAdvancedSearch());
    document.getElementById('performAdvancedSearch').addEventListener('click', () => this.performAdvancedSearch());
    document.getElementById('clearAdvancedSearch').addEventListener('click', () => this.clearAdvancedSearch());
    document.getElementById('voiceSearchBtn').addEventListener('click', () => this.toggleVoiceSearch());
    
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.focusSearch();
      }
    });
    
    this.initVoiceSearch();
    
    document.getElementById('getNewDailyQuote').addEventListener('click', () => this.loadRandomQuote('daily'));
    document.getElementById('getRandomQuotes').addEventListener('click', () => this.loadRandomQuotes());
    
    document.getElementById('prevQuote').addEventListener('click', () => this.navigateQuote(-1));
    document.getElementById('nextQuote').addEventListener('click', () => this.navigateQuote(1));
    
    document.getElementById('shareDailyQuote').addEventListener('click', () => this.openShareModal('daily'));
    document.getElementById('shareWebsite').addEventListener('click', () => this.shareWebsite());
    
    document.getElementById('closeShareModal').addEventListener('click', () => this.closeShareModal());
    document.getElementById('shareModal').addEventListener('click', (e) => {
      if (e.target.id === 'shareModal') this.closeShareModal();
    });
    
    document.getElementById('shareTwitter').addEventListener('click', () => this.shareOnPlatform('twitter'));
    document.getElementById('shareFacebook').addEventListener('click', () => this.shareOnPlatform('facebook'));
    document.getElementById('shareLinkedIn').addEventListener('click', () => this.shareOnPlatform('linkedin'));
    document.getElementById('copyQuote').addEventListener('click', () => this.copyQuoteToClipboard());
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeShareModal();
      } else if (this.currentSection === 'home' && document.getElementById('randomQuoteSection').style.display !== 'none') {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          this.loadRandomQuotes();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.navigateQuote(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.navigateQuote(1);
        }
      }
    });
  }

  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('href');
        
        if (target.startsWith('#')) {
          const section = target.substring(1);
          this.navigateToSection(section);
        } else if (target === '/admin') {
          window.location.href = '/admin';
        }
      });
    });
  }

  navigateToSection(section) {
    navLinks.forEach(link => link.classList.remove('active'));
    document.querySelector(`[href="#${section}"]`).classList.add('active');
    
    this.hideAllSections();
    
    if (section === 'home') {
      document.getElementById('home').style.display = 'block';
      document.querySelector('.daily-quote-section').style.display = 'block';
      document.querySelector('.quick-actions-section').style.display = 'block';
    } else {
      document.getElementById(section).style.display = 'block';
    }
    
    this.currentSection = section;
    
    if (section !== 'home') {
      document.getElementById(section).scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  hideAllSections() {
    document.getElementById('search').style.display = 'none';
    document.getElementById('categories').style.display = 'none';
    document.getElementById('randomQuoteSection').style.display = 'none';
  }

  toggleSection(section) {
    if (this.currentSection === section) {
      this.navigateToSection('home');
    } else {
      this.navigateToSection(section);
    }
  }

  async loadDailyQuote() {
    try {
      this.showLoading('dailyQuoteLoading');
      const response = await fetch('/api/quotes/daily');
      const data = await response.json();
      
      if (data.success && data.data.quote) {
        this.displayQuote(data.data.quote, 'daily');
      } else {
        this.showError('Failed to load daily quote');
      }
    } catch (error) {
      console.error('Error loading daily quote:', error);
      this.showError('Failed to load daily quote');
    } finally {
      this.hideLoading('dailyQuoteLoading');
    }
  }

  async loadRandomQuote(type = 'random') {
    try {
      this.showLoading(`${type}QuoteLoading`);
      const response = await fetch('/api/quotes/random');
      const data = await response.json();
      
      if (data.success && data.data.quote) {
        this.displayQuote(data.data.quote, type);
      } else {
        this.showError('Failed to load random quote');
      }
    } catch (error) {
      console.error('Error loading random quote:', error);
      this.showError('Failed to load random quote');
    } finally {
      this.hideLoading(`${type}QuoteLoading`);
    }
  }

  displayQuote(quote, type) {
    const textElement = document.getElementById(`${type}QuoteText`);
    const authorElement = document.getElementById(`${type}QuoteAuthor`);
    const categoryElement = document.getElementById(`${type}QuoteCategory`);
    const contentElement = document.getElementById(`${type}QuoteContent`);
    
    textElement.textContent = quote.text;
    authorElement.textContent = quote.author;
    categoryElement.textContent = quote.category || 'General';
    
    contentElement.style.display = 'block';
    
    if (type === 'daily') {
      this.currentQuote = { ...quote, type: 'daily' };
    } else {
      this.currentQuote = { ...quote, type: 'random' };
    }
  }

  showRandomQuote() {
    this.navigateToSection('home');
    document.getElementById('randomQuoteSection').style.display = 'block';
    this.loadRandomQuotes();
    
    setTimeout(() => {
      document.getElementById('randomQuoteSection').scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async loadRandomQuotes() {
    try {
      this.showLoading('randomQuoteLoading');
      
      const category = document.getElementById('categoryFilter').value;
      const count = parseInt(document.getElementById('quoteCount').value);
      
      let url = '/api/quotes/random';
      const params = new URLSearchParams();
      
      if (category) {
        params.append('category', category);
      }
      
      if (count > 1) {
        params.append('count', count);
      }
      
      if (this.quoteHistory.length > 0) {
        params.append('exclude', this.quoteHistory.join(','));
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        if (data.data.quotes) {
          this.randomQuotes = data.data.quotes;
          this.addToHistory(this.randomQuotes.map(q => q.id));
        } else if (data.data.quote) {
          this.randomQuotes = [data.data.quote];
          this.addToHistory([data.data.quote.id]);
        }
        
        this.currentRandomIndex = 0;
        this.displayRandomQuotes();
      } else {
        this.showError('Failed to load random quotes');
      }
    } catch (error) {
      console.error('Error loading random quotes:', error);
      this.showError('Failed to load random quotes');
    } finally {
      this.hideLoading('randomQuoteLoading');
    }
  }

  displayRandomQuotes() {
    const grid = document.getElementById('randomQuotesGrid');
    const navigation = document.getElementById('quoteNavigation');
    
    if (this.randomQuotes.length === 0) {
      grid.innerHTML = '<p>No quotes found</p>';
      navigation.style.display = 'none';
      return;
    }
    
    if (this.randomQuotes.length === 1) {
      grid.innerHTML = this.createSingleQuoteDisplay(this.randomQuotes[0]);
      navigation.style.display = 'none';
    } else {
      grid.innerHTML = this.createMultipleQuotesDisplay();
      navigation.style.display = 'flex';
      this.updateQuoteCounter();
    }
    
    grid.style.display = 'block';
  }

  createSingleQuoteDisplay(quote) {
    return `
      <div class="single-quote-display">
        <blockquote class="quote-text">${quote.text}</blockquote>
        <cite class="quote-author">${quote.author}</cite>
        <div class="quote-category">${quote.category || 'General'}</div>
        <div class="quote-actions">
          <button class="btn btn-secondary" onclick="app.shareQuote(${quote.id}, '${quote.text}', '${quote.author}', '${quote.category || 'General'}')">
            📤 Share
          </button>
        </div>
      </div>
    `;
  }

  createMultipleQuotesDisplay() {
    return `
      <div class="multiple-quotes-display">
        ${this.randomQuotes.map((quote, index) => `
          <div class="quote-item ${index === this.currentRandomIndex ? 'active' : ''}" data-index="${index}">
            <blockquote class="quote-text">${quote.text}</blockquote>
            <cite class="quote-author">${quote.author}</cite>
            <div class="quote-category">${quote.category || 'General'}</div>
            <div class="quote-actions">
              <button class="btn btn-secondary" onclick="app.shareQuote(${quote.id}, '${quote.text}', '${quote.author}', '${quote.category || 'General'}')">
                📤 Share
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  navigateQuote(direction) {
    if (this.randomQuotes.length <= 1) return;
    
    this.currentRandomIndex += direction;
    
    if (this.currentRandomIndex < 0) {
      this.currentRandomIndex = this.randomQuotes.length - 1;
    } else if (this.currentRandomIndex >= this.randomQuotes.length) {
      this.currentRandomIndex = 0;
    }
    
    this.updateActiveQuote();
    this.updateQuoteCounter();
  }

  updateActiveQuote() {
    const quoteItems = document.querySelectorAll('.quote-item');
    quoteItems.forEach((item, index) => {
      item.classList.toggle('active', index === this.currentRandomIndex);
    });
  }

  updateQuoteCounter() {
    const counter = document.getElementById('quoteCounter');
    counter.textContent = `${this.currentRandomIndex + 1} of ${this.randomQuotes.length}`;
  }

  addToHistory(quoteIds) {
    this.quoteHistory.push(...quoteIds);
    if (this.quoteHistory.length > 50) {
      this.quoteHistory = this.quoteHistory.slice(-25);
    }
  }

  async performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (!searchTerm) {
      this.showToast('Please enter a search term', 'error');
      return;
    }

    this.addToSearchHistory(searchTerm);
    this.hideSuggestions();

    try {
      const response = await fetch(`/api/quotes/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.success) {
        this.displaySearchResults(data.data.quotes, searchTerm);
      } else {
        this.showError('Search failed');
      }
    } catch (error) {
      console.error('Error performing search:', error);
      this.showError('Search failed');
    }
  }

  handleSearchInput(e) {
    const searchTerm = e.target.value.trim();
    
    clearTimeout(this.searchDebounceTimer);
    
    if (searchTerm.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    if (searchTerm.length < 2) {
      return;
    }
    
    this.searchDebounceTimer = setTimeout(() => {
      this.fetchSuggestions(searchTerm);
    }, 300);
  }

  handleSearchKeydown(e) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, suggestions.length - 1);
        this.highlightSuggestion();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, -1);
        this.highlightSuggestion();
        break;
      case 'Enter':
        if (this.currentSuggestionIndex >= 0 && suggestions[this.currentSuggestionIndex]) {
          e.preventDefault();
          this.selectSuggestion(suggestions[this.currentSuggestionIndex]);
        } else {
          this.performSearch();
        }
        break;
      case 'Escape':
        this.hideSuggestions();
        e.target.blur();
        break;
    }
  }

  async fetchSuggestions(searchTerm) {
    try {
      const response = await fetch(`/api/quotes/suggestions?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      
      if (data.success) {
        this.suggestions = data.data.suggestions;
        this.displaySuggestions(this.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }

  displaySuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
      <div class="suggestion-item" data-index="${index}" onclick="app.selectSuggestion(this)">
        <span class="suggestion-text">${suggestion.suggestion}</span>
        <span class="suggestion-type">${suggestion.type}</span>
      </div>
    `).join('');
    
    suggestionsContainer.style.display = 'block';
    this.currentSuggestionIndex = -1;
  }

  selectSuggestion(suggestionElement) {
    const suggestionText = suggestionElement.querySelector('.suggestion-text').textContent;
    document.getElementById('searchInput').value = suggestionText;
    this.hideSuggestions();
    this.performSearch();
  }

  highlightSuggestion() {
    const suggestions = document.querySelectorAll('.suggestion-item');
    suggestions.forEach((item, index) => {
      item.classList.toggle('highlighted', index === this.currentSuggestionIndex);
    });
  }

  hideSuggestions() {
    document.getElementById('searchSuggestions').style.display = 'none';
    this.currentSuggestionIndex = -1;
  }

  showSearchHistory() {
    if (this.searchHistory.length === 0) return;
    
    const historyItems = this.searchHistory.slice(-5).map((term, index) => ({
      suggestion: term,
      type: 'history'
    }));
    
    this.displaySuggestions(historyItems);
  }

  addToSearchHistory(searchTerm) {
    if (!this.searchHistory.includes(searchTerm)) {
      this.searchHistory.push(searchTerm);
      if (this.searchHistory.length > 20) {
        this.searchHistory.shift();
      }
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    }
  }

  toggleAdvancedSearch() {
    const panel = document.getElementById('advancedSearchPanel');
    const toggle = document.getElementById('advancedSearchToggle');
    
    if (panel.style.display === 'none' || !panel.style.display) {
      panel.style.display = 'block';
      toggle.classList.add('active');
      this.populateAdvancedSearchCategories();
    } else {
      panel.style.display = 'none';
      toggle.classList.remove('active');
    }
  }

  async populateAdvancedSearchCategories() {
    const categorySelect = document.getElementById('advancedCategory');
    
    if (this.categories.length === 0) {
      await this.loadCategories();
    }
    
    categorySelect.innerHTML = '<option value="">All Categories</option>';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
  }

  async performAdvancedSearch() {
    const filters = {
      searchTerm: document.getElementById('searchInput').value.trim(),
      category: document.getElementById('advancedCategory').value,
      author: document.getElementById('advancedAuthor').value.trim(),
      tags: document.getElementById('advancedTags').value.trim(),
      dateFrom: document.getElementById('advancedDateFrom').value,
      dateTo: document.getElementById('advancedDateTo').value
    };
    
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });
    
    if (Object.keys(filters).length === 0) {
      this.showToast('Please enter at least one search criteria', 'error');
      return;
    }
    
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/quotes/advanced-search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        this.displaySearchResults(data.data.quotes, 'Advanced Search');
        this.toggleAdvancedSearch();
      } else {
        this.showError('Advanced search failed');
      }
    } catch (error) {
      console.error('Error performing advanced search:', error);
      this.showError('Advanced search failed');
    }
  }

  clearAdvancedSearch() {
    document.getElementById('advancedCategory').value = '';
    document.getElementById('advancedAuthor').value = '';
    document.getElementById('advancedTags').value = '';
    document.getElementById('advancedDateFrom').value = '';
    document.getElementById('advancedDateTo').value = '';
  }

  focusSearch() {
    this.navigateToSection('search');
    setTimeout(() => {
      document.getElementById('searchInput').focus();
    }, 100);
  }

  displaySearchResults(quotes, searchTerm) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (quotes.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <h3>No quotes found for "${searchTerm}"</h3>
          <p>Try searching with different keywords or browse our categories.</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = `
      <h3>Found ${quotes.length} quote${quotes.length !== 1 ? 's' : ''} for "${searchTerm}"</h3>
      <div class="search-results-grid">
        ${quotes.map(quote => this.createQuoteCard(quote, searchTerm)).join('')}
      </div>
    `;
  }

  createQuoteCard(quote, searchTerm = '') {
    const highlightedText = searchTerm ? this.highlightSearchTerm(quote.text, searchTerm) : quote.text;
    const highlightedAuthor = searchTerm ? this.highlightSearchTerm(quote.author, searchTerm) : quote.author;
    
    return `
      <div class="quote-result" data-quote-id="${quote.id}">
        <blockquote class="quote-text">${highlightedText}</blockquote>
        <cite class="quote-author">${highlightedAuthor}</cite>
        <div class="quote-category">${quote.category || 'General'}</div>
        <div class="quote-actions">
          <button class="btn btn-secondary" onclick="app.shareQuote(${quote.id}, '${this.escapeHtml(quote.text)}', '${this.escapeHtml(quote.author)}', '${this.escapeHtml(quote.category || 'General')}')">
            📤 Share
          </button>
        </div>
      </div>
    `;
  }

  highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || searchTerm === 'Advanced Search') return text;
    
    const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
  }

  async loadCategories() {
    try {
      const response = await fetch('/api/quotes/categories');
      const data = await response.json();
      
      if (data.success) {
        this.categories = data.data.categories;
        this.displayCategories();
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  displayCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    
    if (this.categories.length === 0) {
      categoriesGrid.innerHTML = '<p>No categories available</p>';
      return;
    }

    categoriesGrid.innerHTML = this.categories.map(category => `
      <div class="category-card" onclick="app.loadCategoryQuotes('${category}')">
        <h3>${category}</h3>
        <p>Explore ${category.toLowerCase()} quotes</p>
      </div>
    `).join('');

    this.populateCategoryFilter();
  }

  populateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }

  async loadCategoryQuotes(category) {
    try {
      document.querySelectorAll('.category-card').forEach(card => card.classList.remove('active'));
      event.target.closest('.category-card').classList.add('active');
      
      const response = await fetch(`/api/quotes?category=${encodeURIComponent(category)}`);
      const data = await response.json();
      
      if (data.success) {
        this.displayCategoryQuotes(data.data.quotes, category);
      }
    } catch (error) {
      console.error('Error loading category quotes:', error);
      this.showError('Failed to load category quotes');
    }
  }

  displayCategoryQuotes(quotes, category) {
    const categoryQuotes = document.getElementById('categoryQuotes');
    
    if (quotes.length === 0) {
      categoryQuotes.innerHTML = `<p>No quotes found in ${category} category</p>`;
      return;
    }

    categoryQuotes.innerHTML = `
      <h3>${category} Quotes (${quotes.length})</h3>
      <div class="category-quotes-grid">
        ${quotes.map(quote => this.createQuoteCard(quote)).join('')}
      </div>
    `;
  }

  shareQuote(id, text, author, category) {
    this.currentQuote = { id, text, author, category, type: 'shared' };
    this.openShareModal('shared');
  }

  openShareModal(type) {
    const modal = document.getElementById('shareModal');
    const preview = document.getElementById('shareQuotePreview');
    
    if (this.currentQuote) {
      preview.innerHTML = `
        <blockquote class="quote-text">${this.currentQuote.text}</blockquote>
        <cite class="quote-author">${this.currentQuote.author}</cite>
        <div class="quote-category">${this.currentQuote.category || 'General'}</div>
      `;
    }
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  closeShareModal() {
    const modal = document.getElementById('shareModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  shareOnPlatform(platform) {
    if (!this.currentQuote) return;
    
    const quote = this.currentQuote;
    const text = `"${quote.text}" - ${quote.author}`;
    const url = window.location.href;
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      this.closeShareModal();
      this.showToast('Opening share dialog...', 'success');
    }
  }

  async copyQuoteToClipboard() {
    if (!this.currentQuote) return;
    
    const text = `"${this.currentQuote.text}" - ${this.currentQuote.author}`;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Quote copied to clipboard!', 'success');
      this.closeShareModal();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showToast('Failed to copy quote', 'error');
    }
  }

  shareWebsite() {
    const url = window.location.href;
    const text = 'Check out this amazing motivational quotes website!';
    
    if (navigator.share) {
      navigator.share({
        title: 'Motivational Quotes',
        text: text,
        url: url
      }).catch(console.error);
    } else {
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }

  showLoading(elementId) {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
      loadingElement.style.display = 'flex';
    }
  }

  hideLoading(elementId) {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  initVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onstart = () => {
        this.isListening = true;
        const voiceBtn = document.getElementById('voiceSearchBtn');
        voiceBtn.classList.add('listening');
        voiceBtn.title = 'Listening... Click to stop';
        this.showToast('Listening for your search...', 'info');
      };
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('searchInput').value = transcript;
        this.performSearch();
        this.showToast(`Searching for: "${transcript}"`, 'success');
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.stopVoiceSearch();
        
        let errorMessage = 'Voice search failed';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone not available.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage = 'Network error during voice search.';
            break;
        }
        
        this.showToast(errorMessage, 'error');
      };
      
      this.recognition.onend = () => {
        this.stopVoiceSearch();
      };
    } else {
      document.getElementById('voiceSearchBtn').style.display = 'none';
    }
  }

  toggleVoiceSearch() {
    if (!this.recognition) {
      this.showToast('Voice search not supported in this browser', 'error');
      return;
    }
    
    if (this.isListening) {
      this.stopVoiceSearch();
    } else {
      this.startVoiceSearch();
    }
  }

  startVoiceSearch() {
    if (!this.recognition) return;
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      this.showToast('Failed to start voice search', 'error');
    }
  }

  stopVoiceSearch() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    this.isListening = false;
    const voiceBtn = document.getElementById('voiceSearchBtn');
    voiceBtn.classList.remove('listening');
    voiceBtn.title = 'Voice Search';
  }

  handleTouchSearch() {
    if ('ontouchstart' in window) {
      const searchInput = document.getElementById('searchInput');
      
      searchInput.addEventListener('touchstart', () => {
        searchInput.style.fontSize = '16px';
      });
      
      let touchStartY = 0;
      let touchEndY = 0;
      
      searchInput.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
      });
      
      searchInput.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        const swipeDistance = touchStartY - touchEndY;
        
        if (Math.abs(swipeDistance) > 50) {
          if (swipeDistance > 0) {
            this.showSearchHistory();
          } else {
            this.hideSuggestions();
          }
        }
      });
    }
  }
}

const app = new MotivationalQuotesApp();

document.addEventListener('DOMContentLoaded', () => {
  console.log('Motivational Quotes App loaded successfully!');
});