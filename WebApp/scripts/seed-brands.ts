import 'dotenv/config';
import { db } from '@/lib/db';
import { brandprofile, brandAnalyses } from '@/lib/db/schema';
import { randomUUID } from 'crypto';

const DUMMY_BRANDS = [
  {
    name: 'Welzin',
    url: 'https://welzin.com',
    industry: 'AI/ML Consultancy',
    location: 'San Francisco, CA',
    email: 'info@welzin.com',
  },
  {
    name: 'TechVision',
    url: 'https://techvision.io',
    industry: 'Software Development',
    location: 'New York, NY',
    email: 'contact@techvision.io',
  },
  {
    name: 'DataFlow Analytics',
    url: 'https://dataflow-analytics.com',
    industry: 'Data Analytics',
    location: 'Austin, TX',
    email: 'hello@dataflow-analytics.com',
  },
  {
    name: 'CloudNine Systems',
    url: 'https://cloudnine-systems.com',
    industry: 'Cloud Infrastructure',
    location: 'Seattle, WA',
    email: 'support@cloudnine-systems.com',
  },
  {
    name: 'NeuralPath AI',
    url: 'https://neuralpath.ai',
    industry: 'Artificial Intelligence',
    location: 'Boston, MA',
    email: 'team@neuralpath.ai',
  },
  {
    name: 'DigitalForge',
    url: 'https://digitalforge.co',
    industry: 'Digital Marketing',
    location: 'Los Angeles, CA',
    email: 'hello@digitalforge.co',
  },
  {
    name: 'QuantumLeap',
    url: 'https://quantumleap.dev',
    industry: 'Quantum Computing',
    location: 'Cambridge, MA',
    email: 'info@quantumleap.dev',
  },
  {
    name: 'VelocityStudio',
    url: 'https://velocitystudio.com',
    industry: 'Design & Creative',
    location: 'Miami, FL',
    email: 'contact@velocitystudio.com',
  },
];

const DUMMY_ANALYSES = [
  {
    companyName: 'Welzin Visibility Report',
    competitors: ['TechVision', 'DataFlow Analytics'],
    visibility_score: 8.5,
  },
  {
    companyName: 'Welzin SEO Audit Q4',
    competitors: ['CloudNine Systems', 'NeuralPath AI'],
    visibility_score: 7.2,
  },
  {
    companyName: 'TechVision Brand Monitor',
    competitors: ['DigitalForge', 'QuantumLeap'],
    visibility_score: 9.1,
  },
  {
    companyName: 'DataFlow Market Analysis',
    competitors: ['VelocityStudio'],
    visibility_score: 6.8,
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Get a test user ID (you may need to adjust this based on your auth setup)
    // For now, we'll use a fixed UUID that represents a test user
    const testUserId = 'test-user-' + randomUUID().slice(0, 8);

    console.log(`📝 Using test user ID: ${testUserId}\n`);

    // Insert dummy brands
    console.log('Adding brands...');
    const insertedBrands = [];

    for (const brand of DUMMY_BRANDS) {
      const brandId = randomUUID();
      await db.insert(brandprofile).values({
        id: brandId,
        userId: testUserId,
        name: brand.name,
        url: brand.url,
        industry: brand.industry,
        location: brand.location,
        email: brand.email,
      });

      insertedBrands.push({
        id: brandId,
        ...brand,
      });

      console.log(`✓ Added brand: ${brand.name}`);
    }

    console.log(`\n✅ Successfully added ${DUMMY_BRANDS.length} brands\n`);

    // Insert dummy analyses
    console.log('Adding analyses...');
    for (const analysis of DUMMY_ANALYSES) {
      // Pick a random brand to associate with
      const randomBrand = insertedBrands[Math.floor(Math.random() * insertedBrands.length)];

      const analysisId = randomUUID();
      await db.insert(brandAnalyses).values({
        id: analysisId,
        userId: testUserId,
        url: randomBrand.url,
        companyName: analysis.companyName,
        industry: randomBrand.industry,
        analysisData: {
          visibility_score: analysis.visibility_score,
          timestamp: new Date().toISOString(),
          providers: {
            openai: { ranking: Math.floor(Math.random() * 5) + 1, mentioned: true },
            anthropic: { ranking: Math.floor(Math.random() * 5) + 1, mentioned: true },
            google: { ranking: Math.floor(Math.random() * 5) + 1, mentioned: false },
            perplexity: { ranking: Math.floor(Math.random() * 5) + 1, mentioned: true },
          },
        },
        competitors: analysis.competitors,
        creditsUsed: 10,
      });

      console.log(`✓ Added analysis: ${analysis.companyName}`);
    }

    console.log(`\n✅ Successfully added ${DUMMY_ANALYSES.length} analyses\n`);

    console.log('🎉 Database seeding completed!\n');
    console.log(`📌 Test User ID: ${testUserId}`);
    console.log('💡 Use this ID to query your data or create a user with this ID\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
