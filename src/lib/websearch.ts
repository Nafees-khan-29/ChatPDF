type SearchResult = { title: string; snippet: string; link: string };

export async function webSearch(query: string): Promise<SearchResult[]> {
  const serpKey = process.env.SERPAPI_KEY;
  const braveKey = process.env.BRAVE_API_KEY;

  try {
    if (serpKey) {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&api_key=${serpKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('SerpAPI failed');
      const json = await res.json();
      const organic = json.organic_results || [];
      return organic.slice(0, 3).map((r: any) => ({ title: r.title, snippet: r.snippet || r.snippets?.[0] || '', link: r.link }));
    } else if (braveKey) {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { 'X-Subscription-Token': braveKey }, cache: 'no-store' });
      if (!res.ok) throw new Error('Brave search failed');
      const json = await res.json();
      const results = json.web?.results || [];
      return results.slice(0, 3).map((r: any) => ({ title: r.title, snippet: r.description || '', link: r.url }));
    }
  } catch (e) {
    console.warn('webSearch error:', e);
  }
  return [];
}
