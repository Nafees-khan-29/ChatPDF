import { pipeline } from '@xenova/transformers';

let extractor: any;

async function getExtractor() {
  if (!extractor) {
    // Mini all-rounder embedding model; downloads on first use
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

// Compute an embedding vector for text. Returns a plain number[] array.
export async function getEmbedding(text: string): Promise<number[]> {
  const ex = await getExtractor();
  const output = await ex(text, { pooling: 'mean', normalize: true });
  // output.data is a Float32Array
  return Array.from(output.data as Float32Array);
}
