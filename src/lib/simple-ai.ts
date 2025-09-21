import { OpenAI } from 'openai';

// Simple but effective AI response generator
export class SimpleAI {
  private openai: OpenAI | null = null;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Config] OPENAI_API_KEY is not set. Falling back to heuristic responses.');
    }
    if (!process.env.CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
      console.warn('[Config] Clerk keys missing; auth may run in keyless mode. Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.');
    }
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORG,
        project: process.env.OPENAI_PROJECT,
      });
    }
  }

  // Generate AI response with document context
  async generateResponse(
    message: string,
    documentContext?: string,
    options?: { model?: string; mode?: 'chat' | 'extract' }
  ): Promise<string> {
    try {
      const requestedModel = (options?.model || 'gpt-4').toLowerCase();
      const useDeepseek = requestedModel === 'deepseek-chat' && !!process.env.DEEPSEEK_API_KEY;
      const useClaude = requestedModel === 'claude-3' && !!process.env.ANTHROPIC_API_KEY;

  const systemPrompt = `You are an expert document analysis AI assistant specializing in extracting accurate information from provided documents.

  CRITICAL INSTRUCTIONS:
  1. ALWAYS prioritize information from the "Document Context" section below
  2. If the Document Context contains relevant information, use it to provide a comprehensive answer
  3. If the Document Context doesn't contain sufficient information to answer the question, respond: "Based on the provided document, I cannot find specific information about [topic]. The document may not contain this information."
  4. Extract key details like names, dates, numbers, and specific facts directly from the context
  5. For factual questions, provide precise answers with relevant details from the document
  6. When multiple pieces of information are relevant, organize them clearly
  7. If asked about document structure or content, describe what you can see in the provided context
  8. Always maintain accuracy - never invent or assume information not present in the context

  Document Analysis Guidelines:
  - For personal information: Extract names, titles, contact details, dates
  - For technical content: Focus on specifications, procedures, key terms
  - For business documents: Highlight important decisions, dates, figures
  - For academic content: Extract main concepts, conclusions, methodology`;

  const model = this.resolveModel(options?.model);

      const mode = options?.mode || 'chat';
      const jsonFormatHint = mode === 'extract' ? `\nReturn a valid minified JSON object only, no prose.` : '';
      const userPrompt = documentContext 
        ? `DOCUMENT CONTEXT:
${documentContext}

USER QUESTION: ${message}

Please analyze the document context above and provide a comprehensive answer to the user's question. If the context contains relevant information, extract and present it clearly. If the context doesn't contain enough information to answer the question, explicitly state what information is missing.${jsonFormatHint}`
        : `USER QUESTION: ${message}

NOTE: No document content was provided for analysis. Please inform the user that they need to upload a document first to get document-specific answers.${jsonFormatHint}`;

      if (useDeepseek) {
        // DeepSeek OpenAI-compatible chat completions
        console.log('[AI] Attempting DeepSeek API call...');
        try {
          const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 1000,
              temperature: 0.1,
              stream: false,
            }),
          });
          
          if (!resp.ok) {
            const errorText = await resp.text();
            console.error('[AI] DeepSeek API error:', resp.status, errorText);
            throw new Error(`DeepSeek API error: ${resp.status}`);
          }
          
          const data = await resp.json();
          const content = data?.choices?.[0]?.message?.content;
          
          if (typeof content === 'string' && content.trim().length > 0) {
            console.log('[AI] DeepSeek response received, length:', content.length);
            return content.trim();
          } else {
            console.warn('[AI] DeepSeek returned empty or invalid content');
            throw new Error('Empty response from DeepSeek');
          }
        } catch (error) {
          console.error('[AI] DeepSeek request failed:', error);
          // Fall through to try OpenAI
        }
      }

      if (useClaude) {
        // Anthropic Claude Messages API
        try {
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY as string,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-sonnet-20240229',
              max_tokens: 700,
              temperature: 0.1,
              system: systemPrompt,
              messages: [
                { role: 'user', content: userPrompt }
              ],
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            const content = data?.content?.[0]?.text;
            if (typeof content === 'string' && content.trim().length) return content;
          } else {
            const text = await resp.text();
            console.error('Anthropic error:', text);
          }
        } catch (e) {
          console.error('Anthropic call failed:', e);
        }
      }

      if (!this.openai) {
        console.log('[AI] No OpenAI client available, using fallback response');
        return this.generateFallbackResponse(message, documentContext);
      }

      console.log('[AI] Attempting OpenAI API call with model:', model);
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.trim().length > 0) {
        console.log('[AI] OpenAI response received, length:', content.length);
        return content.trim();
      } else {
        console.warn('[AI] OpenAI returned empty content');
        return 'Sorry, I could not generate a response.';
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateFallbackResponse(message, documentContext);
    }
  }

  // Map UI model keys to OpenAI model IDs
  private resolveModel(model?: string): string {
    const map: Record<string, string> = {
      'gpt-4': 'gpt-4o-mini',
      'gpt-3.5': 'gpt-3.5-turbo',
      // Claude handled via Anthropic API directly; keep a safe default for OpenAI client fallback
      'claude-3': 'gpt-4o-mini',
      // Placeholder for DeepSeek via OpenAI-compatible proxy (if configured externally)
      'deepseek-chat': 'gpt-4o-mini',
    };
    return map[model || 'gpt-4'] || 'gpt-4o-mini';
  }

  // Fallback response when OpenAI is not available
  private generateFallbackResponse(message: string, documentContext?: string): string {
    if (!documentContext) {
      return `Not found in document.`;
    }

    // Simple keyword matching for common questions
    const lowerMessage = message.toLowerCase();
    const lowerContext = documentContext.toLowerCase();

    if (lowerMessage.includes('name') && lowerMessage.includes('person')) {
      // Look for names in the document
      // Use original context to preserve capitalization for names
      const nameMatch = documentContext.match(/\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/);
      if (nameMatch) return `The name in the document appears to be: ${nameMatch[0]}`;
    }

    if (lowerMessage.includes('skill') || lowerMessage.includes('technology')) {
      // Look for skills/technologies
      const skills = this.extractSkills(lowerContext);
      if (skills.length > 0) {
        return `Based on the document, here are the skills/technologies mentioned: ${skills.join(', ')}`;
      }
    }

    if (lowerMessage.includes('experience') || lowerMessage.includes('work')) {
      // Look for experience information
      const experience = this.extractExperience(lowerContext);
      if (experience) {
        return `Based on the document, here's the experience information: ${experience}`;
      }
    }

    if (lowerMessage.includes('education') || lowerMessage.includes('degree')) {
      // Look for education information
      const education = this.extractEducation(lowerContext);
      if (education) {
        return `Based on the document, here's the education information: ${education}`;
      }
    }

    // Generic response
    return `Not found in document.`;
  }

  // Extract skills from document content
  private extractSkills(content: string): string[] {
    const skillKeywords = [
      'javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css',
      'typescript', 'angular', 'vue', 'mongodb', 'postgresql', 'aws', 'azure',
      'docker', 'kubernetes', 'git', 'github', 'agile', 'scrum', 'api',
      'machine learning', 'ai', 'data science', 'analytics', 'excel', 'power bi'
    ];

    const foundSkills: string[] = [];
    skillKeywords.forEach(skill => {
      if (content.includes(skill)) {
        foundSkills.push(skill);
      }
    });

    return foundSkills;
  }

  // Extract experience information
  private extractExperience(content: string): string | null {
    // Look for common experience patterns
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*of\s*experience/gi,
      /experience\s*in\s*([^.]{10,100})/gi,
      /worked\s*as\s*([^.]{10,100})/gi,
      /position\s*of\s*([^.]{10,100})/gi
    ];

    for (const pattern of experiencePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  // Extract education information
  private extractEducation(content: string): string | null {
    // Look for common education patterns
    const educationPatterns = [
      /bachelor[^.]{10,100}/gi,
      /master[^.]{10,100}/gi,
      /degree\s*in\s*([^.]{10,100})/gi,
      /university\s*of\s*([^.]{10,100})/gi,
      /college\s*of\s*([^.]{10,100})/gi
    ];

    for (const pattern of educationPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }
}

// Export singleton instance
export const simpleAI = new SimpleAI();
