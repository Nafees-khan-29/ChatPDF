import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

export type Document = {
  pageContent: string;
  metadata: {
    source: string;
    pageNumber?: number;
  };
};

let pinecone: Pinecone | null = null;

export const getPineconeClient = async () => {
  if (!pinecone) {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pinecone;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function embedAndStorePDF(docs: Document[], fileKey: string) {
  try {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    // Process documents in batches
    const batchSize = 10;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      
      // Create embeddings for the batch
      const embeddings = await Promise.all(
        batch.map(async (doc) => {
          const embedding = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: doc.pageContent,
          });
          return embedding.data[0].embedding;
        })
      );

      // Prepare vectors for upsert
      const vectors = batch.map((doc, idx) => ({
        id: `${fileKey}_${i + idx}`,
        values: embeddings[idx],
        metadata: {
          text: doc.pageContent,
          source: doc.metadata.source,
          pageNumber: doc.metadata.pageNumber || 0,
          fileKey,
        },
      }));

      // Upsert to Pinecone
      await index.upsert(vectors);
    }

    console.log(`Successfully embedded and stored ${docs.length} chunks for ${fileKey}`);
  } catch (error) {
    console.error('Error embedding and storing PDF:', error);
    throw error;
  }
}

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string,
  topK = 5
) {
  try {
    const client = await getPineconeClient();
    const index = client.index(process.env.PINECONE_INDEX_NAME!);

    const queryRequest = {
      vector: embeddings,
      topK,
      includeMetadata: true,
      filter: {
        fileKey: { $eq: fileKey },
      },
    };

    const result = await index.query(queryRequest);
    return result.matches || [];
  } catch (error) {
    console.error('Error getting matches from embeddings:', error);
    throw error;
  }
}

export async function getContext(query: string, fileKey: string) {
  try {
    // Check if Pinecone is configured
    if (!process.env.PINECONE_API_KEY || 
        process.env.PINECONE_API_KEY === 'your_pinecone_api_key_here' ||
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('Pinecone or OpenAI not configured, skipping context retrieval');
      return '';
    }

    // Get query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    // Get matches from Pinecone
    const matches = await getMatchesFromEmbeddings(
      queryEmbedding.data[0].embedding,
      fileKey
    );

    // Extract text from matches
    const qualifyingDocs = matches.filter(
      (match) => match.score && match.score > 0.7
    );

    type Metadata = {
      text: string;
      source: string;
      pageNumber?: number;
    };

    const docs = qualifyingDocs.map((match) => {
      const metadata = match.metadata as Metadata;
      return metadata.text;
    });

    return docs.join('\n').substring(0, 3000);
  } catch (error) {
    console.error('Error getting context:', error);
    return '';
  }
}
