import OpenAI from 'openai';
import { getContext } from './pinecone-new';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function generateResponse(message: string, fileKey?: string): Promise<string> {
  try {
    let context = '';
    
    // If we have a file key, get relevant context
    if (fileKey) {
      context = await getContext(message, fileKey);
    }

    const systemMessage = fileKey && context 
      ? `You are a helpful AI assistant that answers questions based on the provided document context. Use the following context to answer the user's question. If the context doesn't contain relevant information, politely say that you cannot find the information in the provided document.

Context from document:
${context}

Please answer the user's question based on this context.`
      : `You are a helpful AI assistant. Please answer the user's question to the best of your ability.`;

    const completion = await openai.chat.completions.create({
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
    throw error;
  }
}

export async function generateTitle(message: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
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
