const { PrismaClient } = require('@prisma/client');

async function checkLatestMessage() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./dev.db'
      }
    }
  });
  
  try {
    const latestMessage = await prisma.message.findFirst({
      where: { role: 'ASSISTANT' },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Latest AI message content:');
    console.log('===========================');
    console.log(latestMessage?.content || 'No messages found');
    console.log('===========================');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestMessage();