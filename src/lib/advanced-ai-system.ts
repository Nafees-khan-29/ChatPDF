import { OpenAI } from 'openai';
import { EnhancedDocumentProcessor } from './enhanced-document-processor';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Enhanced AI Response System with Multi-Model Support + LocalAI + Gemini
export class AdvancedAISystem {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  private static anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Google Gemini integration
  private static gemini = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || ''
  );

  // LocalAI integration
  private static localAI = new OpenAI({
    apiKey: 'not-needed', // LocalAI doesn't require API key
    baseURL: process.env.LOCALAI_BASE_URL || 'http://localhost:8080/v1',
  });

  private static deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  private static anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  // Validate API keys on startup
  private static hasValidOpenAI = !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  private static hasValidAnthropic = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here');
  private static hasValidGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  private static hasValidDeepSeek = !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here');
  private static hasValidLocalAI = true; // LocalAI is always available if running

  // Simple in-memory cache for faster responses
  private static responseCache = new Map<string, { response: any; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get the best available AI model based on API key availability
   */
  private static getBestAvailableModel(): 'gpt-4' | 'gpt-3.5-turbo' | 'gemini' | 'deepseek' | 'claude' | 'localai' {
    if (this.hasValidAnthropic) return 'claude';
    if (this.hasValidOpenAI) return 'gpt-4';
    if (this.hasValidGemini) return 'gemini';
    if (this.hasValidDeepSeek) return 'deepseek';
    if (this.hasValidLocalAI) return 'localai'; // LocalAI as fallback
    return 'gpt-4'; // Final fallback to OpenAI even if key validation fails
  }

  /**
   * Get system health status and available models
   */
  static getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    availableModels: string[];
    primaryModel: string;
    cacheSize: number;
  } {
    const availableModels: string[] = [];
    
    if (this.hasValidOpenAI) {
      availableModels.push('gpt-4', 'gpt-3.5-turbo');
    }
    if (this.hasValidAnthropic) {
      availableModels.push('claude');
    }
    if (this.hasValidGemini) {
      availableModels.push('gemini');
    }
    if (this.hasValidDeepSeek) {
      availableModels.push('deepseek');
    }
    
    let status: 'healthy' | 'degraded' | 'critical';
    if (availableModels.length >= 2) {
      status = 'healthy';
    } else if (availableModels.length === 1) {
      status = 'degraded';
    } else {
      status = 'critical';
    }
    
    return {
      status,
      availableModels,
      primaryModel: this.getBestAvailableModel(),
      cacheSize: this.responseCache.size
    };
  }

  /**
   * Question Classification using ML
   */
  static async classifyQuestion(question: string): Promise<{
    type: 'factual' | 'analytical' | 'summarization' | 'comparison' | 'explanation' | 'extraction';
    confidence: number;
    complexity: 'simple' | 'medium' | 'complex';
    suggestedModel: 'gpt-4' | 'gpt-3.5-turbo' | 'gemini' | 'deepseek' | 'claude' | 'localai';
  }> {
    const questionLower = question.toLowerCase();
    
    // Enhanced: Project and work experience extraction (our key use case!)
    if (/\b(project|work|experience|portfolio|developed|built|created|worked on|employment|job|position|role)\b/.test(questionLower)) {
      return {
        type: 'extraction',
        confidence: 0.95,
        complexity: 'complex',
        suggestedModel: this.getBestAvailableModel() // Use best available model
      };
    }
    
    // Factual questions (who, what, when, where, which, how many)
    if (/\b(who|what|when|where|which|how many|list|name)\b/.test(questionLower)) {
      return {
        type: 'factual',
        confidence: 0.8,
        complexity: 'simple',
        suggestedModel: this.getBestAvailableModel() // Use best available model
      };
    }
    
    // Analytical questions (why, how, analyze, compare, evaluate)
    if (/\b(why|how|analyze|compare|evaluate|assess|examine|relationship|impact|effect)\b/.test(questionLower)) {
      return {
        type: 'analytical',
        confidence: 0.85,
        complexity: 'complex',
        suggestedModel: this.getBestAvailableModel() // Use best available model
      };
    }
    
    // Summarization requests
    if (/\b(summarize|summary|overview|brief|main points|key|outline)\b/.test(questionLower)) {
      return {
        type: 'summarization',
        confidence: 0.9,
        complexity: 'medium',
        suggestedModel: this.getBestAvailableModel()
      };
    }
    
    // Comparison questions
    if (/\b(compare|contrast|difference|similar|versus|vs|between)\b/.test(questionLower)) {
      return {
        type: 'comparison',
        confidence: 0.85,
        complexity: 'medium',
        suggestedModel: this.getBestAvailableModel()
      };
    }
    
    // Explanation requests
    if (/\b(explain|clarify|describe|elaborate|detail|mean|definition)\b/.test(questionLower)) {
      return {
        type: 'explanation',
        confidence: 0.8,
        complexity: 'medium',
        suggestedModel: 'claude'
      };
    }
    
    // Data extraction (extract, find, get, show)
    if (/\b(extract|find|get|show|provide|give me|identify)\b/.test(questionLower)) {
      return {
        type: 'extraction',
        confidence: 0.75,
        complexity: 'simple',
        suggestedModel: 'claude'
      };
    }
    
    // Default to Claude for all queries
    return {
      type: 'analytical',
      confidence: 0.6,
      complexity: 'medium',
      suggestedModel: 'claude'
    };
  }

  /**
   * Enhanced AI Response Generation with Multi-Model Support and Caching
   */
  static async generateEnhancedResponse(
    question: string,
    documentContext: string,
    options: {
      documentId?: number;
      userId?: string;
      preferredModel?: string;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<{
    answer: string;
    confidence: number;
    sources: any[];
    model: string;
    processingTime: number;
    questionType: string;
  }> {
    const startTime = Date.now();
    
    // Check cache first for faster responses
    const cacheKey = `${question}_${options.documentId || 'no-doc'}_${options.preferredModel || 'default'}`;
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('⚡ Returning cached response');
      return {
        ...cached.response,
        processingTime: Date.now() - startTime
      };
    }
    
    // Initialize variables outside try block for catch block access
    let enhancedContext = documentContext;
    
    try {
      // Step 1: Classify the question
      const classification = await this.classifyQuestion(question);
      console.log(`🔍 Question classified as: ${classification.type} (${classification.complexity}) - suggested: ${classification.suggestedModel}`);
      
      // Step 2: Get enhanced document context if documentId provided
      let sources: any[] = [];
      let contextConfidence = 0.5;
      
      if (options.documentId) {
        try {
          // Enhanced retrieval parameters based on question type
          let maxResults = 8;
          let semanticWeight = 0.8;
          let keywordWeight = 0.2;
          let similarityThreshold = 0.25;
          
          // Detect if this is a project/portfolio/experience query
          const isProjectQuery = /\b(project|projects|work|experience|built|developed|created|portfolio|list.*project|all.*project)\b/i.test(question);
          
          // For extraction and listing questions, get more comprehensive context
          if (classification.type === 'extraction' || classification.type === 'factual' || isProjectQuery) {
            maxResults = 15; // Get even more chunks for complete extraction
            semanticWeight = 0.6; // More balanced semantic and keyword matching
            keywordWeight = 0.4;
            similarityThreshold = 0.15; // Much lower threshold for broader context
          }
          
          // For complex analytical questions, get extensive context
          if (classification.complexity === 'complex') {
            maxResults = 18;
            similarityThreshold = 0.15;
          }
          
          console.log(`🔍 Query detected as ${isProjectQuery ? 'PROJECT QUERY' : 'REGULAR QUERY'} - using ${maxResults} chunks with threshold ${similarityThreshold}`);
          
          const searchResult = await EnhancedDocumentProcessor.hybridSimilaritySearch(
            question, 
            options.documentId,
            {
              maxResults,
              semanticWeight,
              keywordWeight,
              similarityThreshold
            }
          );
          
          if (searchResult.chunks.length > 0) {
            enhancedContext = searchResult.chunks.map(chunk => chunk.content).join('\n\n');
            sources = searchResult.chunks.map(chunk => ({
              chunkIndex: chunk.chunkIndex,
              similarity: chunk.similarity,
              preview: chunk.content.substring(0, 150) + '...'
            }));
            contextConfidence = searchResult.confidence;
            console.log(`📄 Enhanced context retrieved: ${searchResult.chunks.length} chunks (confidence: ${contextConfidence.toFixed(3)}) for ${classification.type} question`);
          }
        } catch (error) {
          console.warn('Failed to get enhanced context, using provided context:', error);
        }
      }
      
      // Step 3: Choose the best model
      const selectedModel = options.preferredModel || classification.suggestedModel;
      
      // Step 4: Generate specialized prompt based on question type
      const prompt = this.generateSpecializedPrompt(question, enhancedContext, classification);
      
      // Step 5: Generate response using selected model with enhanced parameters
      let maxTokens = options.maxTokens;
      if (!maxTokens) {
        // Dynamic token allocation based on question type and complexity
        if (classification.type === 'extraction' || classification.type === 'factual') {
          maxTokens = 4000; // Even higher for complete lists and extractions
        } else if (classification.complexity === 'complex') {
          maxTokens = 3000;
        } else {
          maxTokens = 2000;
        }
      }
      
      const response = await this.callAIModel(selectedModel, prompt, {
        maxTokens,
        temperature: options.temperature || (classification.type === 'factual' ? 0.05 : 0.15) // Lower temperature for more accurate extraction
      }, enhancedContext);
      
      // Step 6: Quality assessment and enhancement
      // Quality assessment temporarily disabled
      const qualityScore = 0.8; // Default quality score
      // const qualityScore = this.assessResponseQuality(response.text, question, classification);
      
      // Step 7: Calculate overall confidence with quality weighting
      const overallConfidence = Math.min(0.95, 
        (classification.confidence * 0.25 + contextConfidence * 0.35 + response.confidence * 0.25 + qualityScore * 0.15)
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Generated ${classification.type} response using ${selectedModel} (${processingTime}ms, confidence: ${overallConfidence.toFixed(3)})`);
      
      const result = {
        answer: response.text,
        confidence: overallConfidence,
        sources,
        model: selectedModel,
        processingTime,
        questionType: classification.type
      };
      
      // Cache successful responses for faster future access
      this.responseCache.set(cacheKey, {
        response: result,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      console.error('Error generating enhanced response:', error);
      
      // Fallback to basic response
      const fallbackResponse = this.getFallbackResponse(question, enhancedContext);
      
      return {
        answer: fallbackResponse.text,
        confidence: fallbackResponse.confidence,
        sources: [],
        model: 'fallback',
        processingTime: Date.now() - startTime,
        questionType: 'unknown'
      };
    }
  }

  /**
   * Generate specialized prompts based on question type
   */
  private static generateSpecializedPrompt(
    question: string,
    context: string,
    classification: any
  ): string {
    const baseContext = context ? `Document Context:\n${context}\n\n` : '';
    
    switch (classification.type) {
      case 'factual':
        return `${baseContext}Answer this factual question accurately and completely. You are an expert document analyst with perfect recall.

Question: ${question}

🚨 ABSOLUTE CRITICAL INSTRUCTIONS FOR MAXIMUM COMPLETENESS 🚨:
- Provide COMPLETE and DETAILED answers, not partial information
- Extract ALL relevant facts from the document with 100% accuracy
- If asking for a name, provide the full name with any titles or credentials
- If asking for multiple items (projects, skills, experiences), list ALL items found in the document - NEVER provide just examples or partial lists
- If asking for details about a person, include ALL available information (full name, title, experience, skills, achievements, education, projects, etc.)
- When listing projects or work experience, include ALL projects mentioned with their details, technologies used, and outcomes
- Quote exact phrases or reference specific sections when relevant
- If information is incomplete in the document, clearly state what's available and what's missing
- Never give truncated or partial responses - completeness is critical
- Be thorough, comprehensive, and precise in your answer
- Double-check your response for completeness before providing it
- If asked about technical details, include all specifications, numbers, dates, and technical information available
- 🔥 MANDATORY: When the question asks for projects, experience, or any list - provide the COMPLETE list, not just one or two examples
- 🔥 MANDATORY: Search through ALL provided document chunks to find EVERY instance of the requested information
- 🔥 MANDATORY: If you find 4 projects, list ALL 4. If you find 10 skills, list ALL 10. Never summarize with "and others"

VERIFICATION CHECKLIST:
✓ Have I extracted ALL instances from ALL document chunks?
✓ Have I provided a complete list without omissions?
✓ Have I avoided phrases like "main project" or "for example"?
✓ Have I included ALL relevant details for each item?`;

      case 'extraction':
        return `${baseContext}Extract ALL relevant information systematically and completely. You are an expert data extraction specialist.

Question: ${question}

🚨 ABSOLUTE CRITICAL INSTRUCTIONS FOR COMPLETE EXTRACTION 🚨:
- Extract ALL instances of the requested information - never provide partial lists
- Organize extracted information clearly and systematically
- Include all details, specifications, and context for each extracted item
- If extracting projects, include ALL projects with their technologies, descriptions, and outcomes
- If extracting skills, include ALL skills mentioned in any context
- If extracting experience, include ALL work experiences, roles, and achievements
- Maintain the original context and relationships between extracted elements
- Verify completeness by reviewing the entire document systematically
- Present extracted information in a clear, organized format
- 🔥 MANDATORY: NEVER abbreviate lists with phrases like "and others" or "for example" - provide the complete extraction
- 🔥 MANDATORY: Process EVERY document chunk provided to ensure no information is missed
- 🔥 MANDATORY: Count your extracted items and ensure the count matches what's actually in the document

EXTRACTION VERIFICATION:
✓ Have I processed every chunk of text provided?
✓ Have I extracted every single instance of the requested information?
✓ Have I provided complete details for each extracted item?
✓ Have I avoided any summarization or truncation?`;

      case 'analytical':
        return `${baseContext}Provide a thorough and comprehensive analytical response. You are an expert analyst with deep understanding and predictive capabilities.

Question: ${question}

CRITICAL INSTRUCTIONS FOR DEEP ANALYSIS:
- Analyze the information COMPLETELY and thoroughly with expert-level depth
- Explain ALL reasoning, patterns, connections, and implications you find
- Consider multiple perspectives, angles, and potential interpretations
- Support your analysis with DETAILED evidence and specific references from the document
- Draw meaningful, well-supported conclusions and make informed predictions where appropriate
- Address all aspects and layers of the question comprehensively
- Provide insights that demonstrate deep understanding of the subject matter
- If the question has multiple parts, address each part fully with expert analysis
- Include predictive insights based on the analysis when relevant
- Ensure your analysis is both comprehensive and actionable`;

      case 'summarization':
        return `${baseContext}Create a comprehensive and complete summary with predictive insights. You are an expert at extracting, organizing, and synthesizing information.

Question: ${question}

CRITICAL INSTRUCTIONS FOR COMPLETE SUMMARIZATION:
- Include ALL key points and important information without omission
- Structure the summary logically and completely with clear organization
- Don't omit important details, context, or supporting information
- If summarizing about a person, include their complete background, experience, skills, achievements, education, and projects
- If summarizing a document, cover all major sections and topics
- Provide a thorough summary, not just highlights
- Use clear, well-organized formatting with bullet points or sections when appropriate
- Ensure completeness over brevity`;

      case 'comparison':
        return `${baseContext}Compare and contrast ALL relevant elements systematically and completely.

Question: ${question}

CRITICAL INSTRUCTIONS:
- Identify ALL points of comparison from the document
- Highlight ALL similarities and differences found
- Be comprehensive and thorough in your comparison
- Organize comparisons clearly with detailed explanations
- Support ALL points with specific evidence from the document
- Don't leave out any relevant comparative information
- Provide complete analysis of similarities and differences`;

      case 'explanation':
        return `${baseContext}Provide a complete and thorough explanation. You are an expert educator making complex topics clear.

Question: ${question}

CRITICAL INSTRUCTIONS:
- Break down ALL aspects of the concept or topic
- Use ALL relevant examples from the document
- Explain step-by-step processes completely when appropriate
- Define ALL important terms mentioned
- Cover all relevant details and nuances
- Make explanations comprehensive and complete
- Don't oversimplify or omit important information
- Ensure the explanation is thorough and detailed`;

      case 'extraction':
        return `${baseContext}Extract and present ALL requested information from the document. You are a meticulous information extractor.

Question: ${question}

CRITICAL INSTRUCTIONS:
- Find and present ALL relevant information, not just some
- Present information in a complete and organized way
- Include ALL specific details available
- Don't truncate or summarize extracted information
- If extracting about a person, include name, contact info, experience, skills, education, achievements, etc.
- If extracting project details, include all project information available
- Maintain complete accuracy and include everything relevant
- If some information is missing, state exactly what's available and what's not found`;

      default:
        return `${baseContext}Provide a comprehensive, complete, and accurate response based on the document. You are an expert assistant focused on thoroughness.

Question: ${question}

CRITICAL INSTRUCTIONS:
- Give a COMPLETE and THOROUGH response, not a partial one
- Address ALL aspects of the question
- Include ALL relevant details from the document
- Don't provide abbreviated or incomplete answers
- If the question is about a person, include all available information about them
- If the question is about a topic, cover it comprehensively
- Ensure your response is detailed and complete
- Quality and completeness are more important than brevity`;
    }
  }

  /**
   * Call different AI models based on selection with intelligent fallback
   */
  private static async callAIModel(
    model: string,
    prompt: string,
    options: { maxTokens: number; temperature: number },
    documentContext?: string
  ): Promise<{ text: string; confidence: number }> {
    
    // Try the requested model first, then fallback to available models
    const modelsToTry = [model];
    
    // Add fallback models based on availability
    if (model !== 'gpt-4' && this.hasValidOpenAI) modelsToTry.push('gpt-4');
    if (model !== 'gpt-3.5-turbo' && this.hasValidOpenAI) modelsToTry.push('gpt-3.5-turbo');
    if (model !== 'gemini' && this.hasValidGemini) modelsToTry.push('gemini');
    if (model !== 'claude' && this.hasValidAnthropic) modelsToTry.push('claude');
    
    for (const currentModel of modelsToTry) {
      try {
        console.log(`🤖 Trying ${currentModel} for AI response...`);
        
        // Set a timeout for AI requests (30 seconds max)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI request timeout')), 30000);
        });

        const aiPromise = this.executeAIRequest(currentModel, prompt, options);
        
        const result = await Promise.race([aiPromise, timeoutPromise]);
        console.log(`✅ Successfully got response from ${currentModel}`);
        return result;
        
      } catch (error) {
        console.error(`❌ Error calling ${currentModel}:`, error);
        
        // Check if it's a quota error
        if (error instanceof Error && error.message.includes('quota')) {
          console.log(`💸 Quota exceeded for ${currentModel}`);
        }
        
        // Continue to next model
      }
    }
    
    // If all models fail, use fallback
    console.log('🔄 All AI models failed, using fallback response');
    return this.getFallbackResponse(prompt, documentContext);
  }

  /**
   * Execute the actual AI request without fallback loops
   */
  private static async executeAIRequest(
    model: string,
    prompt: string,
    options: { maxTokens: number; temperature: number }
  ): Promise<{ text: string; confidence: number }> {
      switch (model) {
        case 'gpt-4':
        case 'gpt-4-turbo':
          if (!this.hasValidOpenAI) {
            throw new Error('OpenAI API key not available');
          }
          const gpt4Response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens,
            temperature: options.temperature,
          });
          return {
            text: gpt4Response.choices[0]?.message?.content || 'No response generated.',
            confidence: 0.9
          };

        case 'gpt-3.5-turbo':
          if (!this.hasValidOpenAI) {
            throw new Error('OpenAI API key not available');
          }
          const gpt35Response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options.maxTokens,
            temperature: options.temperature,
          });
          return {
            text: gpt35Response.choices[0]?.message?.content || 'No response generated.',
            confidence: 0.8
          };

        case 'gemini':
          if (!this.hasValidGemini) {
            throw new Error('Gemini API key not available');
          }
          const genModel = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const geminiResponse = await genModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: options.maxTokens,
              temperature: options.temperature,
            },
          });
          return {
            text: geminiResponse.response.text() || 'No response generated.',
            confidence: 0.85
          };

        case 'deepseek':
          if (!this.hasValidDeepSeek) {
            throw new Error('DeepSeek API key not available or invalid');
          }
          // DeepSeek method temporarily disabled
          throw new Error('DeepSeek API temporarily unavailable');
          // return await this.callDeepSeekAPI(prompt, options);

        case 'claude':
        case 'claude-3-5-sonnet':
        case 'claude-3-5-sonnet-20241022':
          if (!this.hasValidAnthropic) {
            throw new Error('Anthropic API key not available or invalid');
          }
          const claudeResponse = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: options.maxTokens,
            temperature: options.temperature,
            messages: [{ role: 'user', content: prompt }],
          });
          
          const content = claudeResponse.content[0];
          return {
            text: content.type === 'text' ? content.text : 'No response generated.',
            confidence: 0.95
          };

        default:
          throw new Error(`Unsupported model: ${model}`);
      }
  }

  /**
   * Generate intelligent fallback response when all AI models fail
   */
  private static getFallbackResponse(prompt: string, documentContext?: string): { text: string; confidence: number } {
    const isProjectQuery = /\b(project|work|experience|portfolio|developed|built|created|worked on)\b/i.test(prompt);
    const isNameQuery = /\b(name|who|person)\b/i.test(prompt);
    
    // If we have document context, try to extract basic information
    if (documentContext) {
      if (isNameQuery) {
        // Try to extract name from document with improved patterns
        const namePatterns = [
          // Try to match name at the beginning of document (common in resumes)
          /^([A-Z][A-Z\s]{2,30})\s*\n/m,
          // Traditional name patterns
          /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
          /Name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
          // All caps names (but filter out common headers)
          /^([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\s*$/m
        ];
        
        // Common resume headers to exclude
        const excludePatterns = [
          /SUMMARY|EXPERIENCE|SKILLS|EDUCATION|PROJECTS|CONTACT|TECHNICAL|PROGRAMMING|WEB DEVELOPER|SOFTWARE|ENGINEER|DEVELOPER/i
        ];
        
        for (const pattern of namePatterns) {
          const matches = documentContext.match(pattern);
          if (matches) {
            for (const match of matches) {
              const name = match.replace(/^\s+|\s+$/g, '').replace(/\n/g, '').trim();
              
              // Check if it's not a common header
              const isExcluded = excludePatterns.some(exclude => exclude.test(name));
              
              if (!isExcluded && name.length > 3 && name.length < 50 && name.split(' ').length >= 2) {
                return {
                  text: `Based on the document content, the person's name appears to be: **${name}**

*Note: AI services are currently experiencing quota issues, but I was able to extract this information directly from the document text.*`,
                  confidence: 0.8
                };
              }
            }
          }
        }
      }
      
      if (isProjectQuery) {
        // Enhanced project extraction
        const projectPatterns = [
          /project[s]?[:\-\s]*([^\.!?]+)/gi,
          /built[:\-\s]*([^\.!?]+)/gi,
          /developed[:\-\s]*([^\.!?]+)/gi,
          /created[:\-\s]*([^\.!?]+)/gi,
          /work(?:ed)?\s+on[:\-\s]*([^\.!?]+)/gi
        ];
        
        const foundProjects = new Set();
        
        for (const pattern of projectPatterns) {
          const matches = documentContext.matchAll(pattern);
          for (const match of matches) {
            if (match[1] && match[1].trim().length > 10) {
              foundProjects.add(match[1].trim());
            }
          }
        }
        
        if (foundProjects.size > 0) {
          const projectList = Array.from(foundProjects).slice(0, 5);
          return {
            text: `I found project information in the document:

${projectList.map((project, i) => `${i + 1}. ${project}`).join('\n')}

*Note: AI services are currently experiencing quota limitations, but I was able to extract this basic information from the document. For more detailed analysis, please check your OpenAI billing status or add a valid Anthropic API key.*`,
            confidence: 0.6
          };
        }
      }
      
      // Try to extract any relevant information based on keywords in the question
      const questionWords = prompt.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      const relevantSentences = [];
      
      const sentences = documentContext.split(/[.!?]+/);
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        let matchCount = 0;
        for (const word of questionWords) {
          if (sentenceLower.includes(word)) {
            matchCount++;
          }
        }
        if (matchCount > 0) {
          relevantSentences.push(sentence.trim());
        }
      }
      
      if (relevantSentences.length > 0) {
        return {
          text: `Based on the document content, here's what I found related to your question:

${relevantSentences.slice(0, 3).join('. ')}.

*Note: AI services are currently experiencing quota issues. For enhanced analysis, please check your OpenAI account billing or add alternative API keys (Anthropic Claude, etc.).*`,
          confidence: 0.5
        };
      }
      
      // Generic document-based response
      return {
        text: `I can see the document content (${Math.round(documentContext.length / 5)} words), but AI analysis services are temporarily unavailable due to quota limitations.

Your question: "${prompt}"

**To resolve this issue:**
1. **Check OpenAI Billing**: Add payment method to your OpenAI account
2. **Add Alternative APIs**: Configure Anthropic Claude or other providers
3. **Contact Support**: If you believe this is an error

The document appears to contain valuable information that could answer your question once AI services are restored.`,
        confidence: 0.4
      };
    }
    
    // Original fallback responses for when no document context is available
    if (isProjectQuery) {
      return {
        text: `I apologize for the AI service difficulties. However, I can see you're asking about projects and work experience. While I work to restore full AI capabilities, let me provide a direct analysis based on the document content available.

Based on the resume data, I can help extract project information from the document. The system is designed to identify:

- Project names and descriptions
- Technologies and tools used
- Duration and timeline information
- Key achievements and outcomes
- Technical skills demonstrated

Please try asking your question again, as the AI services may have been restored. If you continue experiencing issues, I can attempt to provide a basic text-based analysis of the document content.`,
        confidence: 0.6
      };
    }
    
    return {
      text: `I'm experiencing temporary difficulties with the AI analysis services, but I'm working to provide you with helpful information.

Your question: "${prompt}"

What I can tell you:
- The document has been successfully uploaded and processed
- Text extraction and chunking is working properly
- The search and retrieval system is operational
- Only the AI response generation is temporarily affected

Please try asking your question again in a moment. The AI services should be restored shortly. If you're asking about specific information in the document, I may be able to provide basic text-based responses.

Thank you for your patience as I work to restore full functionality.`,
      confidence: 0.4
    };
  }
}

export default AdvancedAISystem;