import { OpenAI } from 'openai';
import * as natural from 'natural';

// Advanced NLP Pipeline for Document Understanding
export class DocumentUnderstandingPipeline {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  });

  private static tokenizer = new (natural as any).WordTokenizer();
  private static stemmer = (natural as any).PorterStemmer;

  /**
   * Extract entities from text using GPT-4 + rule-based approach
   */
  static async extractEntities(text: string): Promise<{
    persons: string[];
    organizations: string[];
    locations: string[];
    dates: string[];
    technologies: string[];
    concepts: string[];
    confidence: number;
  }> {
    try {
      // Step 1: Use GPT-4 for advanced entity extraction
      const gptEntities = await this.extractEntitiesWithGPT(text);
      
      // Step 2: Use rule-based extraction as backup/enhancement
      const ruleBasedEntities = this.extractEntitiesWithRules(text);
      
      // Step 3: Merge and deduplicate
      const mergedEntities = this.mergeEntityResults(gptEntities, ruleBasedEntities);
      
      return mergedEntities;
      
    } catch (error) {
      console.error('Error extracting entities:', error);
      // Fallback to rule-based only
      return this.extractEntitiesWithRules(text);
    }
  }

  /**
   * GPT-4 based entity extraction
   */
  private static async extractEntitiesWithGPT(text: string) {
    const prompt = `Extract the following types of entities from the text below. Return as JSON:

{
  "persons": ["person1", "person2"],
  "organizations": ["org1", "org2"],
  "locations": ["location1", "location2"],
  "dates": ["date1", "date2"],
  "technologies": ["tech1", "tech2"],
  "concepts": ["concept1", "concept2"]
}

Text: ${text.substring(0, 3000)}

Instructions:
- Extract only clearly mentioned entities
- For persons: full names, first/last names
- For organizations: companies, institutions, groups
- For locations: cities, countries, addresses
- For dates: specific dates, periods, years
- For technologies: programming languages, tools, frameworks, software
- For concepts: key topics, methodologies, important terms
- Return valid JSON only`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const entities = JSON.parse(content);
      
      return {
        ...entities,
        confidence: 0.9
      };
    } catch (error) {
      console.error('GPT entity extraction failed:', error);
      return {
        persons: [],
        organizations: [],
        locations: [],
        dates: [],
        technologies: [],
        concepts: [],
        confidence: 0
      };
    }
  }

  /**
   * Rule-based entity extraction
   */
  private static extractEntitiesWithRules(text: string) {
    const entities = {
      persons: this.extractPersons(text),
      organizations: this.extractOrganizations(text),
      locations: this.extractLocations(text),
      dates: this.extractDates(text),
      technologies: this.extractTechnologies(text),
      concepts: this.extractConcepts(text),
      confidence: 0.6
    };

    return entities;
  }

  /**
   * Extract person names using patterns
   */
  private static extractPersons(text: string): string[] {
    const patterns = [
      // Mr./Ms./Dr. Title patterns
      /(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      // Capitalized names (2-3 words)
      /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
    ];

    const persons = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const name = match.replace(/^(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Prof\.?)\s+/, '').trim();
        if (name.length > 3 && name.length < 50) {
          persons.add(name);
        }
      });
    });

    return Array.from(persons);
  }

  /**
   * Extract organizations using patterns
   */
  private static extractOrganizations(text: string): string[] {
    const patterns = [
      // Companies with suffixes
      /\b([A-Z][a-zA-Z\s&]+(?:Inc\.?|Corp\.?|LLC|Ltd\.?|Company|Corporation|Group|Solutions|Systems|Technologies))\b/g,
      // Universities and institutions
      /\b([A-Z][a-zA-Z\s]+(?:University|College|Institute|Academy|School))\b/g,
      // Government organizations
      /\b([A-Z][a-zA-Z\s]+(?:Department|Agency|Bureau|Office|Administration|Commission))\b/g,
    ];

    const organizations = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const org = match.trim();
        if (org.length > 5 && org.length < 100) {
          organizations.add(org);
        }
      });
    });

    return Array.from(organizations);
  }

  /**
   * Extract locations using patterns
   */
  private static extractLocations(text: string): string[] {
    const patterns = [
      // Cities and states
      /\b([A-Z][a-z]+,\s*[A-Z]{2})\b/g,
      // Cities with country
      /\b([A-Z][a-z]+,\s*[A-Z][a-z]+)\b/g,
      // Common location indicators
      /\b(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    ];

    const locations = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const location = match.replace(/^(?:in|at|from|to)\s+/, '').trim();
        if (location.length > 2 && location.length < 50) {
          locations.add(location);
        }
      });
    });

    return Array.from(locations);
  }

  /**
   * Extract dates using patterns
   */
  private static extractDates(text: string): string[] {
    const patterns = [
      // MM/DD/YYYY, MM-DD-YYYY
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      // Month Day, Year
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{2,4}\b/g,
      // Years
      /\b(?:19|20)\d{2}\b/g,
    ];

    const dates = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        dates.add(match.trim());
      });
    });

    return Array.from(dates);
  }

  /**
   * Extract technologies using keyword matching
   */
  private static extractTechnologies(text: string): string[] {
    const techKeywords = [
      // Programming languages
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'TypeScript', 'PHP', 'Ruby', 'Go', 'Rust',
      'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'SQL', 'HTML', 'CSS',
      
      // Frameworks and libraries
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
      'TensorFlow', 'PyTorch', 'Keras', 'Pandas', 'NumPy', 'Scikit-learn',
      
      // Databases
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Elasticsearch',
      
      // Cloud platforms
      'AWS', 'Azure', 'Google Cloud', 'GCP', 'Heroku', 'Vercel', 'Netlify',
      
      // Tools
      'Docker', 'Kubernetes', 'Git', 'Jenkins', 'Webpack', 'Babel', 'ESLint',
      'VS Code', 'IntelliJ', 'Eclipse', 'Sublime Text',
      
      // AI/ML
      'Machine Learning', 'Deep Learning', 'Neural Networks', 'NLP', 'Computer Vision',
      'GPT', 'BERT', 'Transformer', 'CNN', 'RNN', 'LSTM'
    ];

    const technologies = new Set<string>();
    
    techKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(text)) {
        technologies.add(keyword);
      }
    });

    return Array.from(technologies);
  }

  /**
   * Extract key concepts using TF-IDF and patterns
   */
  private static extractConcepts(text: string): string[] {
    const words = this.tokenizer.tokenize(text.toLowerCase()) || [];
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    // Filter meaningful words
    const meaningfulWords = words.filter((word: any) => 
      word.length > 3 && 
      !stopWords.has(word) && 
      /^[a-zA-Z]+$/.test(word)
    );

    // Calculate word frequencies
    const wordCounts = meaningfulWords.reduce((acc: any, word: any) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Extract high-frequency meaningful terms
    const concepts = Object.entries(wordCounts)
      .filter(([_, count]: [string, unknown]) => (count as number) >= 2)
      .sort(([_, a]: [string, unknown], [__, b]: [string, unknown]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([word, _]) => word);

    // Also look for multi-word concepts
    const phrases = this.extractPhrases(text);
    concepts.push(...phrases.slice(0, 5));

    return concepts;
  }

  /**
   * Extract meaningful phrases
   */
  private static extractPhrases(text: string): string[] {
    const patterns = [
      // Noun phrases (adjective + noun, noun + noun)
      /\b[A-Z][a-z]+\s+[a-z]+(?:ing|tion|ment|ness|ity|ism)\b/g,
      // Technical terms
      /\b(?:data|machine|artificial|deep|neural|quantum|cloud|digital|cyber|smart)\s+[a-z]+\b/gi,
    ];

    const phrases = new Set<string>();
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        if (match.length > 5 && match.length < 30) {
          phrases.add(match.toLowerCase());
        }
      });
    });

    return Array.from(phrases);
  }

  /**
   * Merge entity results from different extraction methods
   */
  private static mergeEntityResults(gptEntities: any, ruleEntities: any) {
    const merged = {
      persons: [...new Set([...gptEntities.persons, ...ruleEntities.persons])],
      organizations: [...new Set([...gptEntities.organizations, ...ruleEntities.organizations])],
      locations: [...new Set([...gptEntities.locations, ...ruleEntities.locations])],
      dates: [...new Set([...gptEntities.dates, ...ruleEntities.dates])],
      technologies: [...new Set([...gptEntities.technologies, ...ruleEntities.technologies])],
      concepts: [...new Set([...gptEntities.concepts, ...ruleEntities.concepts])],
      confidence: Math.max(gptEntities.confidence, ruleEntities.confidence)
    };

    return merged;
  }

  /**
   * Analyze document structure and relationships
   */
  static async analyzeDocumentStructure(text: string): Promise<{
    sections: string[];
    keyRelationships: Array<{ entity1: string; relation: string; entity2: string }>;
    documentType: 'resume' | 'research' | 'business' | 'technical' | 'legal' | 'other';
    complexity: number;
    readabilityScore: number;
  }> {
    try {
      // Extract sections
      const sections = this.extractSections(text);
      
      // Identify document type
      const documentType = this.classifyDocumentType(text);
      
      // Calculate complexity and readability
      const complexity = this.calculateComplexity(text);
      const readabilityScore = this.calculateReadability(text);
      
      // Extract relationships (simplified)
      const keyRelationships = await this.extractRelationships(text);
      
      return {
        sections,
        keyRelationships,
        documentType,
        complexity,
        readabilityScore
      };
      
    } catch (error) {
      console.error('Error analyzing document structure:', error);
      return {
        sections: [],
        keyRelationships: [],
        documentType: 'other',
        complexity: 0.5,
        readabilityScore: 50
      };
    }
  }

  /**
   * Extract document sections
   */
  private static extractSections(text: string): string[] {
    const sectionPatterns = [
      /^[A-Z\s]{3,}$/gm, // ALL CAPS headers
      /^\d+\.?\s+[A-Z][^.!?]*$/gm, // Numbered sections
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:$/gm, // Title Case with colon
    ];

    const sections = new Set<string>();
    
    sectionPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const section = match.replace(/^\d+\.?\s*/, '').replace(/:$/, '').trim();
        if (section.length > 2 && section.length < 50) {
          sections.add(section);
        }
      });
    });

    return Array.from(sections);
  }

  /**
   * Classify document type
   */
  private static classifyDocumentType(text: string): 'resume' | 'research' | 'business' | 'technical' | 'legal' | 'other' {
    const textLower = text.toLowerCase();
    
    // Resume indicators
    if (/\b(experience|education|skills|employment|resume|cv|curriculum vitae)\b/.test(textLower)) {
      return 'resume';
    }
    
    // Research paper indicators
    if (/\b(abstract|methodology|results|conclusion|references|bibliography|study|research)\b/.test(textLower)) {
      return 'research';
    }
    
    // Business document indicators
    if (/\b(revenue|profit|business|market|strategy|proposal|contract|agreement)\b/.test(textLower)) {
      return 'business';
    }
    
    // Technical document indicators
    if (/\b(api|function|algorithm|implementation|technical|specification|documentation)\b/.test(textLower)) {
      return 'technical';
    }
    
    // Legal document indicators
    if (/\b(whereas|hereby|shall|pursuant|agreement|contract|legal|law|clause)\b/.test(textLower)) {
      return 'legal';
    }
    
    return 'other';
  }

  /**
   * Calculate document complexity
   */
  private static calculateComplexity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgSentenceLength = words.length / sentences.length;
    const avgWordLength = words.reduce((acc, word) => acc + word.length, 0) / words.length;
    
    // Normalize to 0-1 scale
    const complexityScore = Math.min(1, (avgSentenceLength / 20) * 0.6 + (avgWordLength / 10) * 0.4);
    
    return complexityScore;
  }

  /**
   * Calculate readability score (Flesch Reading Ease approximation)
   */
  private static calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 50;
    
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = words.reduce((acc, word) => acc + this.countSyllables(word), 0) / words.length;
    
    // Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in a word
   */
  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Extract simple relationships between entities
   */
  private static async extractRelationships(text: string): Promise<Array<{ entity1: string; relation: string; entity2: string }>> {
    // This is a simplified relationship extraction
    // In production, you'd use more sophisticated NLP models
    
    const relationships: Array<{ entity1: string; relation: string; entity2: string }> = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Look for simple patterns like "X works at Y", "X graduated from Y"
    const relationPatterns = [
      { pattern: /(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:works at|employed by|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, relation: 'works_at' },
      { pattern: /(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:graduated from|studied at|attended)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, relation: 'educated_at' },
      { pattern: /(\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|was)\s+(?:a|an|the)\s+([a-z]+(?:\s+[a-z]+)*)/g, relation: 'is_a' },
    ];

    sentences.slice(0, 20).forEach(sentence => { // Limit to avoid performance issues
      relationPatterns.forEach(({ pattern, relation }) => {
        const matches = sentence.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[2]) {
            relationships.push({
              entity1: match[1].trim(),
              relation,
              entity2: match[2].trim()
            });
          }
        }
      });
    });

    return relationships.slice(0, 10); // Limit results
  }
}

export default DocumentUnderstandingPipeline;