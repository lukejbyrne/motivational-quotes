const database = require('../config/database');
const Quote = require('../models/Quote');
const Source = require('../models/Source');
const verifiedQuotes = require('./verified-quotes');

const sources = [
  {
    title: "First Inaugural Address",
    author: "Franklin D. Roosevelt",
    publication_year: 1933,
    source_type: "speech",
    credibility_rating: 10,
    description: "Presidential inaugural address during the Great Depression"
  },
  {
    title: "I Have a Dream Speech",
    author: "Martin Luther King Jr.",
    publication_year: 1963,
    source_type: "speech",
    credibility_rating: 10,
    description: "Historic civil rights speech at March on Washington"
  },
  {
    title: "We Shall Fight on the Beaches",
    author: "Winston Churchill",
    publication_year: 1940,
    source_type: "speech",
    credibility_rating: 10,
    description: "Wartime speech to House of Commons"
  },
  {
    title: "Stanford Commencement Address",
    author: "Steve Jobs",
    publication_year: 2005,
    source_type: "speech",
    credibility_rating: 9,
    description: "Inspirational commencement speech at Stanford University"
  },
  {
    title: "Plato's Apology",
    author: "Plato",
    publication_year: -399,
    source_type: "book",
    credibility_rating: 10,
    description: "Account of Socrates' trial and defense"
  },
  {
    title: "Discourse on the Method",
    author: "René Descartes",
    publication_year: 1637,
    source_type: "book",
    credibility_rating: 10,
    description: "Philosophical work introducing Cartesian doubt"
  },
  {
    title: "Twilight of the Idols",
    author: "Friedrich Nietzsche",
    publication_year: 1889,
    source_type: "book",
    credibility_rating: 9,
    description: "Philosophical critique of contemporary culture"
  },
  {
    title: "Nicomachean Ethics",
    author: "Aristotle",
    publication_year: -350,
    source_type: "book",
    credibility_rating: 10,
    description: "Ancient Greek work on ethics and virtue"
  },
  {
    title: "Self-Reliance",
    author: "Ralph Waldo Emerson",
    publication_year: 1841,
    source_type: "essay",
    credibility_rating: 9,
    description: "Transcendentalist essay on individualism"
  },
  {
    title: "Long Walk to Freedom",
    author: "Nelson Mandela",
    publication_year: 1994,
    source_type: "autobiography",
    credibility_rating: 10,
    description: "Autobiography of South African leader"
  },
  {
    title: "Strength to Love",
    author: "Martin Luther King Jr.",
    publication_year: 1963,
    source_type: "book",
    credibility_rating: 10,
    description: "Collection of sermons on love and nonviolence"
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    publication_year: 1988,
    source_type: "book",
    credibility_rating: 9,
    description: "Popular science book on cosmology"
  },
  {
    title: "Tao Te Ching",
    author: "Lao Tzu",
    publication_year: -600,
    source_type: "book",
    credibility_rating: 10,
    description: "Ancient Chinese philosophical text"
  },
  {
    title: "Plutarch's Lives",
    author: "Plutarch",
    publication_year: 100,
    source_type: "biography",
    credibility_rating: 9,
    description: "Biographical work on Greek and Roman leaders"
  },
  {
    title: "Business @ the Speed of Thought",
    author: "Bill Gates",
    publication_year: 1999,
    source_type: "book",
    credibility_rating: 8,
    description: "Business strategy and technology book"
  },
  {
    title: "Various Interviews",
    author: "Multiple",
    source_type: "interview",
    credibility_rating: 7,
    description: "Collection of verified interview quotes"
  },
  {
    title: "Chinese Proverbs Collection",
    author: "Traditional",
    source_type: "proverb",
    credibility_rating: 8,
    description: "Traditional Chinese wisdom sayings"
  },
  {
    title: "Nike Advertisement",
    author: "Nike Inc.",
    publication_year: 1997,
    source_type: "advertisement",
    credibility_rating: 7,
    description: "Motivational sports advertisement"
  },
  {
    title: "Beautiful Boy (Darling Boy)",
    author: "John Lennon",
    publication_year: 1980,
    source_type: "song",
    credibility_rating: 8,
    description: "Song from Double Fantasy album"
  },
  {
    title: "Awaken the Giant Within",
    author: "Tony Robbins",
    publication_year: 1991,
    source_type: "book",
    credibility_rating: 7,
    description: "Self-help and personal development book"
  }
];

async function enhancedSeed() {
  try {
    await database.connect();
    console.log('Starting enhanced database seeding...');
    
    // Check if database already has enhanced quotes
    const existingCount = await Quote.getCount();
    if (existingCount > 50) {
      console.log(`Database already contains ${existingCount} quotes. Skipping enhanced seed.`);
      return;
    }

    // Clear existing data for fresh start
    const db = database.getDb();
    await new Promise((resolve) => {
      db.run('DELETE FROM quotes', resolve);
    });
    await new Promise((resolve) => {
      db.run('DELETE FROM sources', resolve);
    });

    console.log('Cleared existing data for fresh enhanced seed...');

    // Create source records first
    console.log('Creating source records...');
    const sourceMap = new Map();
    
    for (const source of sources) {
      try {
        const createdSource = await Source.create(source);
        sourceMap.set(source.title, createdSource.id);
        console.log(`Created source: ${source.title}`);
      } catch (error) {
        console.error(`Error creating source ${source.title}:`, error.message);
      }
    }

    // Create quote records with source references
    console.log('Creating verified quotes...');
    let successCount = 0;
    let errorCount = 0;

    for (const quote of verifiedQuotes) {
      try {
        // Validate quote before creating
        const validationErrors = await Quote.validateQuote(quote);
        if (validationErrors.length > 0) {
          console.warn(`Validation errors for quote by ${quote.author}:`, validationErrors);
          errorCount++;
          continue;
        }

        const createdQuote = await Quote.create(quote);
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`Created ${successCount} quotes so far...`);
        }
      } catch (error) {
        console.error(`Error creating quote by ${quote.author}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n=== Enhanced Seeding Complete ===`);
    console.log(`Successfully created ${successCount} quotes`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log(`Total sources created: ${sourceMap.size}`);
    
    // Display statistics
    const stats = await Quote.getVerificationStats();
    console.log('\nVerification Status Statistics:');
    stats.forEach(stat => {
      console.log(`  ${stat.verification_status}: ${stat.count} quotes (avg quality: ${stat.avg_quality?.toFixed(1)})`);
    });

    const sourceStats = await Quote.getSourceTypeStats();
    console.log('\nSource Type Statistics:');
    sourceStats.forEach(stat => {
      console.log(`  ${stat.source_type}: ${stat.count} quotes (avg quality: ${stat.avg_quality?.toFixed(1)})`);
    });

  } catch (error) {
    console.error('Error during enhanced seeding:', error);
  }
}

if (require.main === module) {
  enhancedSeed().then(() => {
    process.exit(0);
  });
}

module.exports = { enhancedSeed, verifiedQuotes, sources };