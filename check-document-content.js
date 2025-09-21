const { PrismaClient } = require('@prisma/client');

async function checkDocumentContent() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./dev.db'
      }
    }
  });
  
  try {
    const latestDoc = await prisma.document.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        chunks: true
      }
    });
    
    console.log('Latest document info:');
    console.log('Filename:', latestDoc?.fileName);
    console.log('Extracted text length:', latestDoc?.extractedText?.length || 0);
    
    console.log('\nDocument chunks:');
    latestDoc?.chunks?.forEach((chunk, i) => {
      console.log(`\nChunk ${i + 1}:`);
      console.log(chunk.content.substring(0, 500) + '...');
    });
    
    console.log('\nFull extracted text (first 1000 chars):');
    console.log(latestDoc?.extractedText?.substring(0, 1000) || 'No text');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentContent();