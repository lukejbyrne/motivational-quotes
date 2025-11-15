const database = require('./database');
const Quote = require('../models/Quote');

const sampleQuotes = [
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: "Success",
    tags: "work,passion,greatness"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs",
    category: "Leadership",
    tags: "innovation,leadership,creativity"
  },
  {
    text: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    category: "Dreams",
    tags: "future,dreams,belief"
  },
  {
    text: "It is during our darkest moments that we must focus to see the light.",
    author: "Aristotle",
    category: "Perseverance",
    tags: "hope,perseverance,strength"
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "Success",
    tags: "success,failure,courage,persistence"
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
    category: "Action",
    tags: "journey,action,possibility"
  },
  {
    text: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein",
    category: "Opportunity",
    tags: "difficulty,opportunity,perspective"
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
    category: "Belief",
    tags: "belief,confidence,achievement"
  },
  {
    text: "The only person you are destined to become is the person you decide to be.",
    author: "Ralph Waldo Emerson",
    category: "Self-Development",
    tags: "destiny,choice,self-improvement"
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
    category: "Persistence",
    tags: "persistence,time,action"
  },
  {
    text: "Whether you think you can or you think you can't, you're right.",
    author: "Henry Ford",
    category: "Mindset",
    tags: "mindset,belief,attitude"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney",
    category: "Action",
    tags: "action,start,execution"
  },
  {
    text: "Life is what happens to you while you're busy making other plans.",
    author: "John Lennon",
    category: "Life",
    tags: "life,present,planning"
  },
  {
    text: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    author: "Nelson Mandela",
    category: "Resilience",
    tags: "resilience,failure,recovery"
  },
  {
    text: "Your time is limited, don't waste it living someone else's life.",
    author: "Steve Jobs",
    category: "Authenticity",
    tags: "time,authenticity,individuality"
  },
  {
    text: "If you want to live a happy life, tie it to a goal, not to people or things.",
    author: "Albert Einstein",
    category: "Happiness",
    tags: "happiness,goals,purpose"
  },
  {
    text: "The only way to achieve the impossible is to believe it is possible.",
    author: "Charles Kingsleigh",
    category: "Possibility",
    tags: "impossible,belief,achievement"
  },
  {
    text: "Success is not how high you have climbed, but how you make a positive difference to the world.",
    author: "Roy T. Bennett",
    category: "Success",
    tags: "success,impact,difference"
  },
  {
    text: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller",
    category: "Excellence",
    tags: "excellence,sacrifice,greatness"
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
    category: "Action",
    tags: "action,timing,opportunity"
  }
];

async function seedDatabase() {
  try {
    await database.connect();
    console.log('Starting database seeding...');
    
    const existingCount = await Quote.getCount();
    if (existingCount > 0) {
      console.log(`Database already contains ${existingCount} quotes. Skipping seed.`);
      return;
    }
    
    for (const quote of sampleQuotes) {
      await Quote.create(quote);
      console.log(`Added quote by ${quote.author}`);
    }
    
    console.log(`Successfully seeded database with ${sampleQuotes.length} quotes!`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

if (require.main === module) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = { seedDatabase, sampleQuotes };