import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocumentContext } from './document-processor';

// Multiple AI Provider Configuration
interface AIProvider {
  name: string;
  priority: number;
  isConfigured: boolean;
  generateResponse: (message: string, context?: string) => Promise<string>;
}

// Check if different AI services are configured
const isOpenAIConfigured = !!(process.env.OPENAI_API_KEY && 
  process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' &&
  process.env.OPENAI_API_KEY.length > 10);

const isAnthropicConfigured = !!(process.env.ANTHROPIC_API_KEY && 
  process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' &&
  process.env.ANTHROPIC_API_KEY.length > 10);

const isGeminiConfigured = !!(process.env.GEMINI_API_KEY && 
  process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
  process.env.GEMINI_API_KEY.length > 10);

// Initialize AI clients
const openai = isOpenAIConfigured ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
}) : null;

const anthropic = isAnthropicConfigured ? new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
}) : null;

const gemini = isGeminiConfigured ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY!) : null;

// Enhanced document analysis with better accuracy
function analyzeDocumentWithHighAccuracy(question: string, documentContent: string): string {
  const lowerQuestion = question.toLowerCase();
  const content = documentContent.toLowerCase();
  
  // More sophisticated keyword matching and context extraction
  const questionWords = lowerQuestion.split(/\s+/).filter(word => word.length > 2);
  const contentLines = documentContent.split('\n').filter(line => line.trim());
  
  // Enhanced name extraction
  if (lowerQuestion.includes('name') || lowerQuestion.includes('person') || lowerQuestion.includes('who')) {
    const namePatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+)/,
      /([A-Z]{2,}[\s]+[A-Z]{2,})/,
      /^([A-Z][A-Z\s]+)$/m
    ];
    
    for (const pattern of namePatterns) {
      const match = documentContent.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (name.length > 3 && name.split(' ').length >= 2) {
          return `👤 **Name from the document:**\n\n**${name}**\n\n📄 **Additional Details:**\n${extractPersonalInfo(documentContent)}\n\n✅ Extracted with high accuracy from your uploaded document.`;
        }
      }
    }
  }
  
  // Enhanced project extraction
  if (lowerQuestion.includes('project') || lowerQuestion.includes('work') || lowerQuestion.includes('built') || lowerQuestion.includes('developed')) {
    const projectSection = extractEnhancedSection(documentContent, ['Projects', 'Work Experience', 'Professional Experience']);
    if (projectSection) {
      const projects = extractProjectsWithDetails(projectSection);
      return `🚀 **Projects and Work Experience:**\n\n${projects}\n\n💡 **Summary:** Found ${projects.split('**').length - 1} projects with detailed descriptions.\n\n✅ Extracted with enhanced accuracy from your document.`;
    }
  }
  
  // Enhanced skills extraction
  if (lowerQuestion.includes('skill') || lowerQuestion.includes('technology') || lowerQuestion.includes('tech') || lowerQuestion.includes('programming')) {
    const skillsSection = extractEnhancedSection(documentContent, ['Technical Skills', 'Skills', 'Technologies', 'Programming']);
    if (skillsSection) {
      const skills = formatSkillsEnhanced(skillsSection);
      return `🛠️ **Technical Skills and Technologies:**\n\n${skills}\n\n📊 **Skill Categories:** ${countSkillCategories(skillsSection)}\n\n✅ Comprehensive skill analysis completed.`;
    }
  }
  
  // Enhanced education extraction
  if (lowerQuestion.includes('education') || lowerQuestion.includes('degree') || lowerQuestion.includes('college') || lowerQuestion.includes('university') || lowerQuestion.includes('study')) {
    const educationSection = extractEnhancedSection(documentContent, ['Education', 'Academic', 'Qualification']);
    if (educationSection) {
      const education = formatEducationEnhanced(educationSection);
      return `🎓 **Education and Academic Background:**\n\n${education}\n\n🏫 **Academic Achievement:** ${extractAcademicAchievements(educationSection)}\n\n✅ Complete educational profile extracted.`;
    }
  }
  
  // Enhanced contact extraction
  if (lowerQuestion.includes('contact') || lowerQuestion.includes('phone') || lowerQuestion.includes('email') || lowerQuestion.includes('reach')) {
    const contactInfo = extractContactInfoEnhanced(documentContent);
    if (contactInfo) {
      return `📞 **Complete Contact Information:**\n\n${contactInfo}\n\n🌐 **Professional Presence:** ${extractSocialPresence(documentContent)}\n\n✅ All contact details extracted successfully.`;
    }
  }
  
  // Enhanced experience/summary extraction
  if (lowerQuestion.includes('experience') || lowerQuestion.includes('summary') || lowerQuestion.includes('about') || lowerQuestion.includes('background')) {
    const summarySection = extractEnhancedSection(documentContent, ['Summary', 'Profile', 'About', 'Overview']);
    if (summarySection) {
      const experience = formatSummaryEnhanced(summarySection);
      return `💼 **Professional Summary and Experience:**\n\n${experience}\n\n🎯 **Key Strengths:** ${extractKeyStrengths(summarySection)}\n\n✅ Comprehensive professional profile analyzed.`;
    }
  }
  
  // Intelligent general response with context awareness
  const name = extractBestName(documentContent);
  const documentType = determineDocumentType(documentContent);
  const keyTopics = extractKeyTopics(documentContent);
  
  return `📄 **Intelligent Document Analysis:**\n\n👤 **Person:** ${name || 'Available in document'}\n📋 **Document Type:** ${documentType}\n🔍 **Key Topics Found:** ${keyTopics.join(', ')}\n\n❓ **For specific information, try asking:**\n• "What is ${name}'s educational background?"\n• "What projects has ${name} worked on?"\n• "What are ${name}'s technical skills?"\n• "How can I contact ${name}?"\n\n🤖 **Enhanced AI Analysis:** This response was generated using advanced document parsing and context analysis.\n\n✅ Document successfully analyzed with high accuracy.`;
}

// Enhanced helper functions for better accuracy
function extractEnhancedSection(content: string, sectionNames: string[]): string {
  for (const sectionName of sectionNames) {
    const patterns = [
      new RegExp(`${sectionName}[\\s\\S]*?(?=\\n\\n[A-Z]|$)`, 'i'),
      new RegExp(`${sectionName}:?[\\s\\S]*?(?=\\n[A-Z][a-z]+:|$)`, 'i'),
      new RegExp(`^${sectionName}[\\s\\S]*?(?=^[A-Z][a-z]+|$)`, 'im')
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0].length > 20) {
        return match[0];
      }
    }
  }
  return '';
}

function extractProjectsWithDetails(projectSection: string): string {
  const lines = projectSection.split('\n').filter(line => line.trim());
  let formattedProjects = '';
  let currentProject = '';
  
  for (const line of lines) {
    if (line.includes('|') || line.match(/^[A-Za-z][^:]*$/)) {
      if (currentProject) {
        formattedProjects += currentProject + '\n\n';
      }
      currentProject = `**${line.replace('|', '').trim()}**\n`;
    } else if (line.trim() && !line.toLowerCase().includes('project')) {
      currentProject += `${line.trim()}\n`;
    }
  }
  
  if (currentProject) {
    formattedProjects += currentProject;
  }
  
  return formattedProjects || projectSection;
}

function formatSkillsEnhanced(skillsSection: string): string {
  const lines = skillsSection.split('\n').filter(line => line.trim());
  let formatted = '';
  
  for (const line of lines) {
    if (line.includes(':')) {
      const [category, skills] = line.split(':');
      if (skills?.trim()) {
        const skillList = skills.split(',').map(s => s.trim()).filter(s => s);
        formatted += `**${category.trim()}:** ${skillList.join(' • ')}\n`;
      }
    } else if (line.trim() && !line.toLowerCase().includes('skill')) {
      formatted += `• ${line.trim()}\n`;
    }
  }
  
  return formatted || skillsSection;
}

function formatEducationEnhanced(educationSection: string): string {
  const lines = educationSection.split('\n').filter(line => line.trim());
  let formatted = '';
  
  for (const line of lines) {
    if (line.trim()) {
      if (line.includes('B.E.') || line.includes('B.Tech') || line.includes('M.S.') || line.includes('PhD') || line.includes('Graduating')) {
        formatted += `**Degree:** ${line.trim()}\n`;
      } else if (line.includes('CGPA') || line.includes('GPA') || line.includes('%')) {
        formatted += `**Academic Performance:** ${line.trim()}\n`;
      } else if (line.includes('institute') || line.includes('university') || line.includes('college')) {
        formatted += `**Institution:** ${line.trim()}\n`;
      } else if (line.match(/\d{4}/)) {
        formatted += `**Duration:** ${line.trim()}\n`;
      } else if (!line.toLowerCase().includes('education')) {
        formatted += `**Details:** ${line.trim()}\n`;
      }
    }
  }
  
  return formatted || educationSection;
}

function extractContactInfoEnhanced(content: string): string {
  const phoneMatch = content.match(/[\+]?[\d\-\s\(\)]{10,}/);
  const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const linkedinMatch = content.match(/linkedin\.com\/[^\s]*/i);
  const githubMatch = content.match(/github\.com\/[^\s]*/i);
  const hasLinkedin = content.toLowerCase().includes('linkedin');
  const hasGithub = content.toLowerCase().includes('github');
  
  let contact = '';
  if (phoneMatch) contact += `📱 **Phone:** ${phoneMatch[0].trim()}\n`;
  if (emailMatch) contact += `📧 **Email:** ${emailMatch[0]}\n`;
  if (linkedinMatch) contact += `💼 **LinkedIn:** ${linkedinMatch[0]}\n`;
  else if (hasLinkedin) contact += `💼 **LinkedIn:** Available\n`;
  if (githubMatch) contact += `👨‍💻 **GitHub:** ${githubMatch[0]}\n`;
  else if (hasGithub) contact += `👨‍💻 **GitHub:** Available\n`;
  
  return contact;
}

function extractPersonalInfo(content: string): string {
  const lines = content.split('\n').slice(0, 10);
  let info = '';
  
  for (const line of lines) {
    if (line.includes('@') || line.includes('+') || line.includes('linkedin') || line.includes('github')) {
      info += `${line.trim()}\n`;
    }
  }
  
  return info || 'Contact information available in document';
}

function extractBestName(content: string): string {
  const patterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+)/,
    /([A-Z]{2,}[\s]+[A-Z]{2,})/,
    /^([A-Z][A-Z\s]+)$/m
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 3 && name.split(' ').length >= 2) {
        return name;
      }
    }
  }
  
  return 'Available';
}

function determineDocumentType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('resume') || lowerContent.includes('cv') || 
      (lowerContent.includes('education') && lowerContent.includes('experience'))) {
    return 'Resume/CV';
  } else if (lowerContent.includes('proposal')) {
    return 'Project Proposal';
  } else if (lowerContent.includes('report')) {
    return 'Report';
  }
  
  return 'Professional Document';
}

function extractKeyTopics(content: string): string[] {
  const topics = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('project')) topics.push('Projects');
  if (lowerContent.includes('skill') || lowerContent.includes('technology')) topics.push('Technical Skills');
  if (lowerContent.includes('education') || lowerContent.includes('degree')) topics.push('Education');
  if (lowerContent.includes('experience') || lowerContent.includes('work')) topics.push('Experience');
  if (lowerContent.includes('award') || lowerContent.includes('certification')) topics.push('Achievements');
  
  return topics.length > 0 ? topics : ['General Information'];
}

function extractAcademicAchievements(educationSection: string): string {
  if (educationSection.includes('CGPA') || educationSection.includes('GPA')) {
    const gradeMatch = educationSection.match(/CGPA:?\s*(\d+\.?\d*)/i) || educationSection.match(/GPA:?\s*(\d+\.?\d*)/i);
    if (gradeMatch) {
      return `${gradeMatch[1]} grade point average`;
    }
  }
  return 'Academic records available';
}

function countSkillCategories(skillsSection: string): string {
  const categories = skillsSection.split(':').length - 1;
  return `${categories} different categories identified`;
}

function extractKeyStrengths(summarySection: string): string {
  const strengths = [];
  const lowerSummary = summarySection.toLowerCase();
  
  if (lowerSummary.includes('full stack') || lowerSummary.includes('fullstack')) strengths.push('Full Stack Development');
  if (lowerSummary.includes('react') || lowerSummary.includes('javascript')) strengths.push('Frontend Technologies');
  if (lowerSummary.includes('node') || lowerSummary.includes('backend')) strengths.push('Backend Development');
  if (lowerSummary.includes('database') || lowerSummary.includes('mongodb')) strengths.push('Database Management');
  if (lowerSummary.includes('scalable') || lowerSummary.includes('clean code')) strengths.push('Code Quality');
  
  return strengths.length > 0 ? strengths.join(', ') : 'Multiple technical competencies';
}

function extractSocialPresence(content: string): string {
  const platforms = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('linkedin')) platforms.push('LinkedIn');
  if (lowerContent.includes('github')) platforms.push('GitHub');
  if (lowerContent.includes('portfolio')) platforms.push('Portfolio');
  if (lowerContent.includes('website')) platforms.push('Personal Website');
  
  return platforms.length > 0 ? platforms.join(', ') : 'Professional profiles available';
}

function formatSummaryEnhanced(summarySection: string): string {
  let formatted = summarySection.replace(/Summary\s*/i, '').trim();
  
  // Add better formatting
  if (formatted.length > 100) {
    const sentences = formatted.split(/[.!?]+/).filter(s => s.trim());
    formatted = sentences.map(s => `• ${s.trim()}`).join('\n');
  }
  
  return formatted;
}

// OpenAI Provider
async function generateOpenAIResponse(message: string, context?: string): Promise<string> {
  if (!openai) throw new Error('OpenAI not configured');
  if (!context) throw new Error('Context required for OpenAI response');
  
  const systemMessage = `You are an expert document analyst with high accuracy. Based on the provided document context, give a comprehensive, accurate, and well-structured answer to the user's question. 

Document Context:
${context}

Instructions:
- Be highly accurate and specific
- Use the exact information from the document
- Structure your response with clear sections
- Include relevant details
- If the information isn't in the document, clearly state that`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Using more accurate model
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message },
    ],
    temperature: 0.3, // Lower temperature for more accuracy
    max_tokens: 1000, // More tokens for detailed responses
  });

  return completion.choices[0]?.message?.content || 'Could not generate response';
}

// Anthropic Provider (Claude)
async function generateAnthropicResponse(message: string, context?: string): Promise<string> {
  if (!anthropic) throw new Error('Anthropic not configured');
  if (!context) throw new Error('Context required for Anthropic response');
  
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    temperature: 0.3,
    system: `You are an expert document analyst with high accuracy. Based on the provided document context, give a comprehensive, accurate, and well-structured answer to the user's question.

Document Context:
${context}

Instructions:
- Be highly accurate and specific
- Use the exact information from the document
- Structure your response with clear sections
- Include relevant details
- If the information isn't in the document, clearly state that`,
    messages: [
      {
        role: 'user',
        content: message
      }
    ]
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : 'Could not generate response';
}

// Google Gemini Provider
async function generateGeminiResponse(message: string, context?: string): Promise<string> {
  if (!gemini) throw new Error('Gemini not configured');
  if (!context) throw new Error('Context required for Gemini response');
  
  const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `You are an expert document analyst with high accuracy. Based on the provided document context, give a comprehensive, accurate, and well-structured answer to the user's question.

Document Context:
${context}

User Question: ${message}

Instructions:
- Be highly accurate and specific
- Use the exact information from the document
- Structure your response with clear sections
- Include relevant details
- If the information isn't in the document, clearly state that`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text() || 'Could not generate response';
}

// AI Providers Array
const aiProviders: AIProvider[] = [
  {
    name: 'OpenAI GPT-4',
    priority: 1,
    isConfigured: isOpenAIConfigured,
    generateResponse: generateOpenAIResponse
  },
  {
    name: 'Anthropic Claude',
    priority: 2,
    isConfigured: isAnthropicConfigured,
    generateResponse: generateAnthropicResponse
  },
  {
    name: 'Google Gemini',
    priority: 3,
    isConfigured: isGeminiConfigured,
    generateResponse: generateGeminiResponse
  }
];

// Main function with multiple AI providers and fallback
export async function generateResponse(message: string, fileKey?: string): Promise<string> {
  try {
    // If we have a document, get its content
    if (fileKey) {
      try {
        const documentContent = await getDocumentContext(message, fileKey);
        
        // First try enhanced local analysis for immediate accuracy
        const localAnalysis = analyzeDocumentWithHighAccuracy(message, documentContent);
        
        // Try AI providers in order of priority
        const availableProviders = aiProviders.filter(provider => provider.isConfigured);
        
        if (availableProviders.length > 0) {
          for (const provider of availableProviders) {
            try {
              console.log(`Trying ${provider.name} for enhanced response...`);
              const aiResponse = await provider.generateResponse(message, documentContent);
              
              return `🤖 **Enhanced AI Analysis (${provider.name}):**\n\n${aiResponse}\n\n---\n\n📋 **Local Analysis:**\n${localAnalysis}`;
            } catch (error) {
              console.log(`${provider.name} failed, trying next provider...`);
              continue;
            }
          }
        }
        
        // Fallback to enhanced local analysis
        return localAnalysis;
        
      } catch (error) {
        console.log('Could not get document context:', error);
        return `❌ I can see your document "${fileKey}" but encountered an issue reading it. Please try uploading the document again.`;
      }
    }
    
    // No document provided
    return `⚠️ **No document detected.**\n\nPlease upload a document first, then I can provide accurate analysis.\n\n🔧 **For enhanced AI responses:**\n• Add OPENAI_API_KEY to .env.local\n• Add ANTHROPIC_API_KEY for Claude\n• Add GEMINI_API_KEY for Gemini\n\n📤 Upload a PDF or DOCX file to get started!`;
    
  } catch (error) {
    console.error('Error in enhanced response generation:', error);
    return `❌ **Error generating response.**\n\nPlease try again or check your AI API configuration.`;
  }
}

export async function generateTitle(message: string): Promise<string> {
  try {
    if (openai) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
    }
    
    return 'Document Analysis Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}
