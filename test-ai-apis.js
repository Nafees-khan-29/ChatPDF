const { simpleAI } = require('./src/lib/simple-ai.ts');

async function testAPIIntegrations() {
  console.log('Testing AI API integrations...\n');
  
  const testDocument = `
Document Title: Company Annual Report 2024
Company: TechCorp Inc.
CEO: John Smith
Revenue: $50 million
Employees: 250
Headquarters: San Francisco, CA
Founded: 2010
`;

  const testQuestions = [
    "What is the company name?",
    "Who is the CEO?",
    "What is the annual revenue?",
    "When was the company founded?"
  ];

  // Test with OpenAI (default)
  console.log('=== Testing OpenAI Integration ===');
  try {
    const ai = new simpleAI();
    for (const question of testQuestions) {
      console.log(`Q: ${question}`);
      const response = await ai.generateResponse(question, testDocument, { model: 'gpt-4' });
      console.log(`A: ${response}\n`);
    }
  } catch (error) {
    console.error('OpenAI test failed:', error.message);
  }

  // Test with DeepSeek
  console.log('\n=== Testing DeepSeek Integration ===');
  try {
    const ai = new simpleAI();
    for (const question of testQuestions) {
      console.log(`Q: ${question}`);
      const response = await ai.generateResponse(question, testDocument, { model: 'deepseek-chat' });
      console.log(`A: ${response}\n`);
    }
  } catch (error) {
    console.error('DeepSeek test failed:', error.message);
  }
}

if (require.main === module) {
  testAPIIntegrations().catch(console.error);
}

module.exports = { testAPIIntegrations };