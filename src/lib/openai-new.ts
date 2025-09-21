import { OpenAI } from 'openai';
import { getContext } from './pinecone-new';
import { getDocumentContext } from './document-processor';

// Check if OpenAI is configured
const isOpenAIConfigured = process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
  process.env.OPENAI_API_KEY.length > 10;

const openai = isOpenAIConfigured ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
}) : null;

// Analyze document questions without OpenAI
function analyzeDocumentQuestion(question: string, documentContent: string): string {
  const lowerQuestion = question.toLowerCase();
  const content = documentContent.toLowerCase();
  
  // Extract specific information based on the question type
  if (lowerQuestion.includes('name')) {
    const nameMatch = documentContent.match(/(?:^|\n)([A-Z][A-Z\s]+)(?:\n|$)/);
    if (nameMatch) {
      return `📄 **Name from the resume:**\n\n**${nameMatch[1].trim()}**\n\n✅ This information was extracted directly from your uploaded document.`;
    }
  }
  
  if (lowerQuestion.includes('project') || lowerQuestion.includes('work')) {
    const projectSection = extractSection(documentContent, 'Projects');
    if (projectSection) {
      const projects = extractProjects(projectSection);
      return `🚀 **Projects from the resume:**\n\n${projects}\n\n✅ This information was extracted directly from your uploaded document.`;
    }
  }
  
  if (lowerQuestion.includes('skill') || lowerQuestion.includes('technology')) {
    const skillsSection = extractSection(documentContent, 'Technical Skills');
    if (skillsSection) {
      return `🛠️ **Technical Skills from the resume:**\n\n${formatSkills(skillsSection)}\n\n✅ This information was extracted directly from your uploaded document.`;
    }
  }
  
  if (lowerQuestion.includes('education') || lowerQuestion.includes('degree') || lowerQuestion.includes('college')) {
    const educationSection = extractSection(documentContent, 'Education');
    if (educationSection) {
      return `🎓 **Education from the resume:**\n\n${formatEducation(educationSection)}\n\n✅ This information was extracted directly from your uploaded document.`;
    }
  }
  
  if (lowerQuestion.includes('contact') || lowerQuestion.includes('phone') || lowerQuestion.includes('email')) {
    const contactInfo = extractContactInfo(documentContent);
    if (contactInfo) {
      return `📞 **Contact Information from the resume:**\n\n${contactInfo}\n\n✅ This information was extracted directly from your uploaded document.`;
    }
  }
  
  if (lowerQuestion.includes('experience') || lowerQuestion.includes('summary')) {
    const summarySection = extractSection(documentContent, 'Summary');
    if (summarySection) {
      return `💼 **Professional Summary from the resume:**\n\n${formatSummary(summarySection)}\n\n✅ This information was extracted directly from your uploaded document.`;
    }
  }
  
  // If no specific match, provide general document info
  const name = documentContent.match(/(?:^|\n)([A-Z][A-Z\s]+)(?:\n|$)/)?.[1]?.trim();
  return `📄 **I found your document and can answer questions about:**\n\n• Personal Information (Name: ${name || 'Available'})\n• Projects and Work Experience\n• Technical Skills\n• Education Background\n• Contact Information\n• Professional Summary\n\n❓ **Try asking:** "What projects has he done?" or "What are his skills?" or "What's his education?"\n\n✅ Document successfully analyzed.`;
}

// Helper functions for extracting specific sections
function extractSection(content: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}[\\s\\S]*?(?=\\n\\n[A-Z]|$)`, 'i');
  const match = content.match(regex);
  return match ? match[0] : '';
}

function extractProjects(projectSection: string): string {
  // Split by project titles (usually have | at the end)
  const projects = projectSection.split(/\n\s*([A-Za-z][^|\n]*\s*\|)/);
  let formattedProjects = '';
  
  for (let i = 1; i < projects.length; i += 2) {
    const title = projects[i]?.replace('|', '').trim();
    const description = projects[i + 1]?.trim();
    
    if (title && description) {
      formattedProjects += `**${title}**\n${description}\n\n`;
    }
  }
  
  return formattedProjects || projectSection;
}

function formatSkills(skillsSection: string): string {
  const lines = skillsSection.split('\n').filter(line => line.trim());
  let formatted = '';
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [category, skills] = line.split(':');
      if (skills?.trim()) {
        formatted += `**${category.trim()}:** ${skills.trim()}\n`;
      }
    }
  }
  
  return formatted || skillsSection;
}

function formatEducation(educationSection: string): string {
  const lines = educationSection.split('\n').filter(line => line.trim());
  let formatted = '';
  
  for (const line of lines) {
    if (line.trim()) {
      if (line.includes('B.E.') || line.includes('B.Tech') || line.includes('Graduating')) {
        formatted += `**Degree:** ${line.trim()}\n`;
      } else if (line.includes('CGPA') || line.includes('GPA')) {
        formatted += `**Performance:** ${line.trim()}\n`;
      } else if (!line.includes('Education')) {
        formatted += `**Institution:** ${line.trim()}\n`;
      }
    }
  }
  
  return formatted || educationSection;
}

function extractContactInfo(content: string): string {
  const phoneMatch = content.match(/\+?\d{2}-?\d{10}|\+?\d{10}/);
  const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  
  let contact = '';
  if (phoneMatch) contact += `**Phone:** ${phoneMatch[0]}\n`;
  if (emailMatch) contact += `**Email:** ${emailMatch[0]}\n`;
  
  // Look for LinkedIn and GitHub
  if (content.toLowerCase().includes('linkedin')) contact += `**LinkedIn:** Available in resume\n`;
  if (content.toLowerCase().includes('github')) contact += `**GitHub:** Available in resume\n`;
  
  return contact;
}

function formatSummary(summarySection: string): string {
  return summarySection.replace(/Summary\s*/i, '').trim();
}

export async function generateResponse(message: string, fileKey?: string): Promise<string> {
  try {
    // If we have a fileKey (document found), get the actual document content and analyze it
    if (fileKey) {
      try {
        // Get the actual document content
        const documentContent = await getDocumentContext(message, fileKey);
        
        // Analyze the message and provide specific answers based on document content
        return analyzeDocumentQuestion(message, documentContent);
      } catch (error) {
        console.log('Could not get document context, providing fallback response:', error);
        return `I can see your document "${fileKey}" but encountered an issue reading it. Please try uploading the document again.`;
      }
    }
    
    // If OpenAI is not configured and no document, return helpful message
    if (!isOpenAIConfigured) {
      return `I notice you're asking: "${message}"\n\n⚠️ **No document detected.** Please upload a document first, then I can analyze it for you.\n\nTo get AI-powered responses:\n1. Upload a PDF or DOCX file\n2. Add OPENAI_API_KEY to .env.local\n3. Ask questions about the document content`;
    }

    let context = '';
    
    // If we have a file key, get relevant context for OpenAI
    if (fileKey) {
      try {
        context = await getContext(message, fileKey);
      } catch (error) {
        console.log('Could not get context from Pinecone, continuing without it:', error);
      }
    }

    const systemMessage = fileKey && context 
      ? `You are a helpful AI assistant that answers questions based on the provided document context. Use the following context to answer the user's question. If the context doesn't contain relevant information, politely say that you cannot find the information in the provided document.

Context from document:
${context}

Please answer the user's question based on this context.`
      : `You are a helpful AI assistant. Please answer the user's question to the best of your ability.`;

    const completion = await openai!.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
  } catch (error) {
    console.error('Error generating response:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      return 'Please add a valid OpenAI API key to your .env.local file to enable AI responses.';
    }
    throw error;
  }
}

export async function generateTitle(message: string): Promise<string> {
  try {
    const completion = await openai!.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, descriptive title (maximum 5 words) for this conversation based on the first message. Only return the title, nothing else.',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.5,
      max_tokens: 20,
    });

    return completion.choices[0]?.message?.content || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}
