/**
 * Test document processing functionality
 * Run with: node test-document-processing.js
 */

const fs = require('fs');
const path = require('path');

// Test document processing
async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing...\n');
  
  try {
    // Check if uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads directory does not exist');
      return;
    }
    
    // List files in uploads directory
    const files = fs.readdirSync(uploadsDir);
    console.log('📁 Files in uploads directory:', files);
    
    if (files.length === 0) {
      console.log('⚠️  No files found in uploads directory');
      console.log('💡 Upload a document first to test processing');
      return;
    }
    
    // Test with the first file
    const testFile = files[0];
    console.log(`\n🔍 Testing with file: ${testFile}`);
    
    // Test document processor
    const { documentProcessor } = require('./src/lib/enhanced-document-processor.ts');
    
    try {
      const result = await documentProcessor.processDocument(testFile);
      console.log('\n✅ Document processed successfully!');
      console.log('📄 File name:', result.metadata.fileName);
      console.log('📊 Word count:', result.metadata.wordCount);
      console.log('🔑 Keywords:', result.analysis.keywords.join(', '));
      console.log('📝 Summary:', result.analysis.summary);
      console.log('\n📖 Content preview:');
      console.log(result.content.substring(0, 200) + '...');
      
    } catch (error) {
      console.log('❌ Document processing failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test AI response generation
async function testAIResponse() {
  console.log('\n🤖 Testing AI Response Generation...\n');
  
  try {
    const { simpleAI } = require('./src/lib/simple-ai.ts');
    
    const testMessage = "What is the name of the person in the resume?";
    const testContext = `Document: Nafees khan-resume.docx
File Size: 45 KB
Word Count: 250
Uploaded: 2024-01-15 10:30:00

Content:
Nafees Khan
Software Engineer
Email: nafees@example.com
Phone: +1-234-567-8900

Experience:
- 3 years of experience in web development
- Proficient in JavaScript, React, Node.js
- Worked on multiple projects including e-commerce platforms

Education:
- Bachelor's degree in Computer Science
- University of Technology

Skills:
- JavaScript, React, Node.js, Python, SQL
- AWS, Docker, Git
- Agile methodologies`;

    console.log('📝 Test message:', testMessage);
    console.log('📄 Test context length:', testContext.length);
    
    const response = await simpleAI.generateResponse(testMessage, testContext);
    console.log('\n🤖 AI Response:');
    console.log(response);
    
  } catch (error) {
    console.error('❌ AI test failed:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Document Processing Tests\n');
  
  await testDocumentProcessing();
  await testAIResponse();
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(console.error);
