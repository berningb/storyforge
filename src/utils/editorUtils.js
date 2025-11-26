/**
 * Highlights words with different colors
 */
export function highlightWordsMultiColor(html, wordColorMap) {
  if (!html || !wordColorMap || wordColorMap.length === 0) {
    return html;
  }

  let result = html;
  
  // Sort by word length (longest first) to handle overlapping
  const sorted = [...wordColorMap].sort((a, b) => b.word.length - a.word.length);
  
  sorted.forEach(({ word, color }) => {
    // Check if this is a phrase (contains spaces) or a single word
    const isPhrase = word.includes(' ');
    
    let regex;
    if (isPhrase) {
      // For phrases, match the exact text as it appears
      // Escape special regex characters but preserve spaces and punctuation
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match the phrase, avoiding HTML tags, allowing for flexible whitespace
      // Replace multiple spaces/newlines with flexible whitespace matcher
      const flexiblePhrase = escapedWord.replace(/\s+/g, '\\s+');
      // For phrases, don't use word boundaries - match the phrase as-is
      // But ensure we're not matching inside HTML tags
      regex = new RegExp(`(?![^<]*>)(${flexiblePhrase})`, 'gi');
    } else {
      // For single words, use word boundaries
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(`(?![^<]*>)(\\b${escapedWord}\\b)`, 'gi');
    }
    
    // Support both hex colors (inline styles) and Tailwind classes
    if (color.hex) {
      // Use inline styles for hex colors
      const textColor = color.text || '#000000';
      result = result.replace(regex, `<span style="background-color: ${color.hex}; color: ${textColor};" class="px-0.5 rounded font-medium">$1</span>`);
    } else {
      // Use Tailwind classes for backward compatibility
      result = result.replace(regex, `<span class="${color.class} ${color.text} px-0.5 rounded font-medium">$1</span>`);
    }
  });
  
  return result;
}

// Pastel color palette for keywords
export const PASTEL_COLORS = [
  { name: 'Lavender', class: 'bg-purple-200', text: 'text-purple-800' },
  { name: 'Mint', class: 'bg-green-200', text: 'text-green-800' },
  { name: 'Peach', class: 'bg-orange-200', text: 'text-orange-800' },
  { name: 'Sky', class: 'bg-blue-200', text: 'text-blue-800' },
  { name: 'Rose', class: 'bg-pink-200', text: 'text-pink-800' },
  { name: 'Butter', class: 'bg-yellow-200', text: 'text-yellow-800' },
  { name: 'Aqua', class: 'bg-cyan-200', text: 'text-cyan-800' },
  { name: 'Lilac', class: 'bg-indigo-200', text: 'text-indigo-800' },
];

// Mock text content
export const MOCK_TEXT = `
<h1>The Art of Digital Storytelling</h1>

<p>In the modern era of content creation, <strong>storytelling</strong> has evolved beyond traditional narratives. Digital platforms have transformed how we communicate, share ideas, and connect with audiences. The power of <em>compelling content</em> lies not just in the words themselves, but in how they are presented and experienced.</p>

<h2>The Evolution of Content</h2>

<p>Content creation has become an art form that combines <strong>creativity</strong>, <strong>technology</strong>, and <strong>strategy</strong>. Writers and creators must understand their audience, craft messages that resonate, and leverage the right tools to bring their visions to life. The digital landscape offers unprecedented opportunities for expression and engagement.</p>

<p>Whether you're writing a blog post, creating marketing materials, or developing educational content, the principles of effective <em>communication</em> remain constant. Clarity, authenticity, and relevance are the cornerstones of impactful writing. These elements work together to create experiences that inform, inspire, and influence.</p>

<h2>Key Principles</h2>

<ul>
  <li><strong>Clarity</strong> - Your message must be clear and understandable</li>
  <li><strong>Engagement</strong> - Content should capture and hold attention</li>
  <li><strong>Value</strong> - Every piece should provide value to the reader</li>
  <li><strong>Authenticity</strong> - Genuine voice builds trust and connection</li>
</ul>

<p>The future of content creation is bright, with new <strong>technologies</strong> and platforms emerging constantly. As creators, we must stay adaptable, continuously learning and evolving our craft. The tools we use today may change, but the fundamental need for meaningful <em>communication</em> will always remain.</p>
`;

