// Test the enhanced fallback system directly
const documentContent = `NAFEES KHAN

                                                                          +91-7899795527 | EMail   | linkedIn |GitHub                                                   


Summary

    Full stack Web Developer skilled in building responsive full-stack applications using MongoDB, Express.js, React.js TypeScript,                                     
    and Node.js. Passionate about creating clean, scalable code and delivering real-world solutions in dynamic environments.                                            
   Technical Skills

Programming languages: C ,Java,Python

Frontend: javaScript, React.js,TypeScript,HTML5,CSS3

Backend: Node.js, Express.js, Python, Django, RESTful APIs

Databases: MongoDB, PostgreSQL, MySQL

Version Control: Git, GitHub

Other Tools: VS Code, Postman, Docker, AWS basics`;

// Simulate the improved name extraction logic
function getFallbackResponse(prompt, documentContext) {
  const isNameQuery = /\b(name|who|person)\b/i.test(prompt);
  
  if (documentContext && isNameQuery) {
    // Improved name extraction patterns
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
  
  return {
    text: "I'm experiencing temporary difficulties with the AI analysis services...",
    confidence: 0.4
  };
}

// Test the function
console.log('🧪 Testing enhanced fallback name extraction...');
console.log('Document content preview:', documentContent.substring(0, 100) + '...');

const result = getFallbackResponse("What is the name of the person in this resume?", documentContent);

console.log('\n📝 Fallback Response:');
console.log('Text:', result.text);
console.log('Confidence:', result.confidence);

if (result.text.includes('NAFEES KHAN')) {
  console.log('✅ SUCCESS: Enhanced fallback correctly extracted the name!');
} else {
  console.log('❌ FAILED: Name extraction needs more improvement');
}