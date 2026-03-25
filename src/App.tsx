import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Search, ShoppingCart, TrendingDown, Star, ExternalLink, AlertCircle, Loader2, CheckCircle2, Tag, Award, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface PlatformData {
  name: string;
  price: string;
  numericPrice: number;
  discount: string;
  rating: string;
  availability: string;
  link: string;
}

interface ComparisonResult {
  productName: string;
  platforms: PlatformData[];
  lowestPricePlatform: string;
  bestDealPlatform: string;
  bestDealReason: string;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);
    setSources([]);

    try {
      const prompt = `
You are a price comparison assistant.
Compare the price of "${query}" across multiple e-commerce platforms such as Amazon India, Flipkart, Croma, Reliance Digital, and other major online stores in India.

Follow these steps:
1. Identify the exact product model.
2. Search for the product on multiple e-commerce platforms in India.
3. Collect the following information for each platform: Platform name, Product title, Current price, Discount (if available), Availability, Product rating, Direct product link.

Return the result strictly as a JSON object with the following structure. Do not include any markdown formatting like \`\`\`json, just return the raw JSON object.
{
  "productName": "Exact Product Name",
  "platforms": [
    {
      "name": "Platform Name",
      "price": "₹XX,XXX",
      "numericPrice": 10000,
      "discount": "XX%",
      "rating": "4.4",
      "availability": "In Stock",
      "link": "URL"
    }
  ],
  "lowestPricePlatform": "Platform Name",
  "bestDealPlatform": "Platform Name",
  "bestDealReason": "Reason for best deal"
}

Rules:
- Only show reliable e-commerce stores in India.
- Always prioritize the exact product model.
- Avoid duplicate listings.
- Ensure the output is valid JSON.
- If a link is not found, provide a search URL for that platform.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      });

      const text = response.text || '';
      
      let parsedResult: ComparisonResult;
      try {
        const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("Failed to parse JSON:", text);
        throw new Error("Failed to parse the comparison data. The product might not be found or the response was malformed.");
      }

      // Sort platforms by numeric price
      if (parsedResult.platforms && Array.isArray(parsedResult.platforms)) {
        parsedResult.platforms.sort((a, b) => a.numericPrice - b.numericPrice);
      }

      setResult(parsedResult);

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const extractedSources = chunks.map((chunk: any) => chunk.web).filter(Boolean);
        // Deduplicate sources by URI
        const uniqueSources = Array.from(new Map(extractedSources.map(item => [item.uri, item])).values());
        setSources(uniqueSources);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching prices.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">PriceMatch India</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
            Find the best price across stores.
          </h2>
          <p className="text-gray-500 text-lg">
            Compare prices from Amazon, Flipkart, Croma, and more in real-time.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter product name (e.g., iPhone 15 Pro 256GB)"
              className="block w-full pl-11 pr-32 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all text-lg"
              disabled={loading}
            />
            <div className="absolute inset-y-2 right-2">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="h-full px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching</span>
                  </>
                ) : (
                  <span>Compare</span>
                )}
              </button>
            </div>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-800"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <TrendingDown className="w-24 h-24" />
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <TrendingDown className="w-5 h-5" />
                    <h3 className="font-semibold">Lowest Price</h3>
                  </div>
                  <p className="text-3xl font-light tracking-tight mb-1">
                    {result.platforms.find(p => p.name === result.lowestPricePlatform)?.price || 'N/A'}
                  </p>
                  <p className="text-gray-500 text-sm">at {result.lowestPricePlatform}</p>
                </div>

                <div className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Award className="w-24 h-24" />
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <Award className="w-5 h-5" />
                    <h3 className="font-semibold">Best Deal</h3>
                  </div>
                  <p className="text-xl font-medium mb-1 truncate" title={result.bestDealPlatform}>
                    {result.bestDealPlatform}
                  </p>
                  <p className="text-gray-500 text-sm line-clamp-2" title={result.bestDealReason}>
                    {result.bestDealReason}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-lg">Comparison Results</h3>
                  <p className="text-sm text-gray-500 mt-1">For "{result.productName}"</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-sm text-gray-500">
                        <th className="py-4 px-6 font-medium">Platform</th>
                        <th className="py-4 px-6 font-medium">Price</th>
                        <th className="py-4 px-6 font-medium">Discount</th>
                        <th className="py-4 px-6 font-medium">Rating</th>
                        <th className="py-4 px-6 font-medium">Availability</th>
                        <th className="py-4 px-6 font-medium text-right">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.platforms.map((platform, idx) => (
                        <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <ShoppingCart className="w-4 h-4 text-gray-500" />
                              </div>
                              <span className="font-medium">{platform.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono font-medium">{platform.price}</td>
                          <td className="py-4 px-6 text-emerald-600 text-sm font-medium">{platform.discount || '-'}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1 text-amber-500 text-sm">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="font-medium text-gray-700">{platform.rating.replace('⭐', '')}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              platform.availability.toLowerCase().includes('in stock') || platform.availability.toLowerCase().includes('available')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            }`}>
                              {platform.availability.toLowerCase().includes('in stock') || platform.availability.toLowerCase().includes('available') ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {platform.availability}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <a 
                              href={platform.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title="View on store"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {sources.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-700 mb-4">
                    <Info className="w-4 h-4" />
                    <h3 className="font-medium">Sources</h3>
                  </div>
                  <ul className="space-y-2">
                    {sources.map((source, idx) => (
                      <li key={idx} className="text-sm">
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1.5"
                        >
                          <span className="truncate max-w-[300px] sm:max-w-md">{source.title || source.uri}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
