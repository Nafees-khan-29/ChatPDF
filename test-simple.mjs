// Simple database test
import prisma from './src/lib/prisma.js';

async function test() {
  try {
    console.log('Testing database connection...');
    
    const documents = await prisma.document.findMany({
      where: { id: 41 },
      include: { 
        chunks: {
          take: 5,
          orderBy: { chunkIndex: 'asc' }
        }
      }
    });
    
    console.log('Documents found:', documents.length);
    if (documents.length > 0) {
      console.log('First document:', documents[0].fileName);
      console.log('Chunks:', documents[0].chunks.length);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();