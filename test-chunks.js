const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testChunks() {
  try {
    console.log('Testing document chunks for document ID 41...');
    
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: 41 },
      include: { chunks: true }
    });
    
    if (!document) {
      console.log('❌ Document 41 not found');
      return;
    }
    
    console.log(`✅ Document found: ${document.fileName}`);
    console.log(`📄 Chunks: ${document.chunks.length}`);
    
    if (document.chunks.length > 0) {
      console.log(`📝 First chunk preview: ${document.chunks[0].content.substring(0, 200)}...`);
    }
    
    // Test keyword search on chunks
    if (document.chunks.length > 0) {
      const projectKeywords = ['project', 'developed', 'built', 'created', 'worked'];
      let relevantChunks = [];
      
      document.chunks.forEach(chunk => {
        const content = chunk.content.toLowerCase();
        const matches = projectKeywords.filter(keyword => content.includes(keyword));
        if (matches.length > 0) {
          relevantChunks.push({
            index: chunk.chunkIndex,
            matches: matches,
            preview: chunk.content.substring(0, 150)
          });
        }
      });
      
      console.log(`🔍 Found ${relevantChunks.length} relevant chunks with project keywords`);
      relevantChunks.slice(0, 3).forEach(chunk => {
        console.log(`  Chunk ${chunk.index}: ${chunk.matches.join(', ')} - ${chunk.preview}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChunks();