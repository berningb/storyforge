import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RichTextEditor } from '@react-rte/lib';
import { htmlToMarkdown, markdownToHtml } from '@react-rte/lib';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { updateFileContent, getFileSha, fetchFileContent } from '../lib/github';

/**
 * Highlights words with different colors
 */
function highlightWordsMultiColor(html, wordColorMap) {
  if (!html || !wordColorMap || wordColorMap.length === 0) {
    return html;
  }

  let result = html;
  
  // Sort by word length (longest first) to handle overlapping
  const sorted = [...wordColorMap].sort((a, b) => b.word.length - a.word.length);
  
  sorted.forEach(({ word, color }) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?![^<]*>)(\\b${escapedWord}\\b)`, 'gi');
    result = result.replace(regex, `<span class="${color.class} ${color.text} px-0.5 rounded font-medium">$1</span>`);
  });
  
  return result;
}

// Pastel color palette for keywords
const PASTEL_COLORS = [
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
const MOCK_TEXT = `
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

export const IndexPage = ({ initialContent, blogInfo, onBack }) => {
  const { currentUser, logout, githubToken, setGitHubToken } = useAuth();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fileSha, setFileSha] = useState(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [contentVersion, setContentVersion] = useState(0);
  const [isShaMismatchError, setIsShaMismatchError] = useState(false);
  
  // Use provided initial content or default mock text - memoize to prevent re-renders
  const contentToUse = useMemo(() => initialContent || MOCK_TEXT, [initialContent]);
  
  // Keywords with their assigned colors - start empty, only add when user clicks words
  const [keywords, setKeywords] = useState([]);

  const [editorText, setEditorText] = useState('');
  const [editorHtml, setEditorHtml] = useState(contentToUse);
  const [editorMarkdown, setEditorMarkdown] = useState('');
  const [editorInitialContent, setEditorInitialContent] = useState(contentToUse); // Store initial content

  // Initialize editorText from initial HTML content and get file SHA - only once
  useEffect(() => {
    if (typeof document !== 'undefined' && !editorText) {
      const temp = document.createElement('div');
      temp.innerHTML = contentToUse;
      setEditorText(temp.textContent || temp.innerText || '');
    }
    
    // Get file SHA from blogInfo if available
    if (blogInfo?.sha && !fileSha) {
      setFileSha(blogInfo.sha);
    }
  }, [contentToUse, blogInfo, editorText, fileSha]);

  // Clear keywords when file changes
  useEffect(() => {
    if (blogInfo?.path) {
      setKeywords([]);
    }
  }, [blogInfo?.path]);

  const handleChange = useCallback((text, html, markdown) => {
    setEditorText(text);
    setEditorHtml(html);
    setEditorMarkdown(markdown);
  }, []);

  // Handle save to GitHub
  const handleSave = useCallback(async () => {
    if (!blogInfo || !fileSha) {
      setSaveError('File information missing. Cannot save.');
      return;
    }

    if (!githubToken) {
      setSaveError('GitHub access token required. Please sign out and sign back in with GitHub to get a token, or click "Add Token" to add a Personal Access Token.');
      return;
    }

    if (!commitMessage.trim()) {
      setSaveError('Please enter a commit message.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const [owner, repo] = blogInfo.repo.split('/');
      const path = blogInfo.path;
      const branch = blogInfo.branch || 'main';
      
      // Fetch latest SHA before saving (in case file was updated on GitHub)
      let currentSha = fileSha;
      try {
        currentSha = await getFileSha(owner, repo, path, branch, githubToken);
        // Update fileSha state with latest SHA
        if (currentSha !== fileSha) {
          setFileSha(currentSha);
        }
      } catch (shaError) {
        console.warn('Could not fetch latest SHA, using cached:', shaError);
        // Continue with cached SHA, updateFileContent will handle retry
      }
      
      // Convert HTML to markdown for saving
      const markdownContent = editorMarkdown || htmlToMarkdown(editorHtml || contentToUse);
      
      const result = await updateFileContent(
        owner,
        repo,
        path,
        markdownContent,
        currentSha,
        branch,
        commitMessage.trim(),
        githubToken
      );

      // Update file SHA with the new SHA from the response
      if (result?.content?.sha) {
        setFileSha(result.content.sha);
      }

      // Success - close modal and show success message
      setShowSaveModal(false);
      setCommitMessage('');
      alert('File saved successfully to GitHub!');
    } catch (error) {
      let errorMessage = error.message || 'Failed to save file. Please try again.';
      
      // Check if it's a SHA mismatch error
      const isShaMismatch = errorMessage.includes('does not match') || errorMessage.includes('sha') || errorMessage.toLowerCase().includes('modified');
      setIsShaMismatchError(isShaMismatch);
      
      // Provide helpful error message for SHA mismatches
      if (isShaMismatch) {
        errorMessage = 'File has been modified on GitHub. Click "Fetch Latest & Retry" to get the latest version and save your changes.';
      }
      
      setSaveError(errorMessage);
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  }, [blogInfo, fileSha, githubToken, commitMessage, editorMarkdown, editorHtml, contentToUse]);

  // Handle fetch latest from GitHub
  const handleFetchLatest = useCallback(async (retrySave = false) => {
    if (!blogInfo) {
      setFetchError('File information missing. Cannot fetch.');
      return;
    }

    if (!githubToken) {
      setFetchError('GitHub access token required. Please sign out and sign back in with GitHub to get a token, or click "Add Token" to add a Personal Access Token.');
      return;
    }

    setIsFetching(true);
    setFetchError('');

    try {
      const [owner, repo] = blogInfo.repo.split('/');
      const path = blogInfo.path;
      const branch = blogInfo.branch || 'main';
      
      // Fetch latest content from GitHub
      const markdownContent = await fetchFileContent(owner, repo, path, branch, githubToken);
      
      // Convert markdown to HTML
      const htmlContent = markdownToHtml(markdownContent);
      
      // Extract text content
      if (typeof document !== 'undefined') {
        const temp = document.createElement('div');
        temp.innerHTML = htmlContent;
        const textContent = temp.textContent || temp.innerText || '';
        setEditorText(textContent);
      }
      
      // Update editor state
      setEditorHtml(htmlContent);
      setEditorMarkdown(markdownContent);
      setEditorInitialContent(htmlContent);
      
      // Increment content version to force editor remount
      setContentVersion(prev => prev + 1);
      
      // Fetch and update file SHA
      try {
        const latestSha = await getFileSha(owner, repo, path, branch, githubToken);
        setFileSha(latestSha);
      } catch (shaError) {
        console.warn('Could not fetch latest SHA:', shaError);
      }
      
      if (retrySave) {
        // Clear the error and retry save
        setSaveError('');
        setIsShaMismatchError(false);
        // The save will be retried automatically via the handleSave call
      } else {
        alert('File fetched successfully from GitHub!');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch file. Please try again.';
      setFetchError(errorMessage);
      console.error('Error fetching file:', error);
    } finally {
      setIsFetching(false);
    }
  }, [blogInfo, githubToken]);

  // Handle fetch latest SHA and retry save (without replacing content)
  const handleFetchLatestAndRetry = useCallback(async () => {
    if (!blogInfo || !githubToken || !commitMessage.trim()) {
      return;
    }

    setIsFetching(true);
    setSaveError('');
    setIsShaMismatchError(false);

    try {
      const [owner, repo] = blogInfo.repo.split('/');
      const path = blogInfo.path;
      const branch = blogInfo.branch || 'main';
      
      // Fetch latest SHA only (don't replace content - user wants to save their changes)
      const latestSha = await getFileSha(owner, repo, path, branch, githubToken);
      
      // Update SHA state
      setFileSha(latestSha);
      
      // Now retry the save with the updated SHA
      setIsSaving(true);
      
      try {
        // Convert HTML to markdown for saving
        const markdownContent = editorMarkdown || htmlToMarkdown(editorHtml || contentToUse);
        
        const result = await updateFileContent(
          owner,
          repo,
          path,
          markdownContent,
          latestSha,
          branch,
          commitMessage.trim(),
          githubToken
        );

        // Update file SHA with the new SHA from the response
        if (result?.content?.sha) {
          setFileSha(result.content.sha);
        }

        // Success - close modal and show success message
        setShowSaveModal(false);
        setCommitMessage('');
        alert('File saved successfully to GitHub!');
      } catch (saveError) {
        let errorMessage = saveError.message || 'Failed to save file. Please try again.';
        const isShaMismatch = errorMessage.includes('does not match') || errorMessage.includes('sha') || errorMessage.toLowerCase().includes('modified');
        setIsShaMismatchError(isShaMismatch);
        
        if (isShaMismatch) {
          errorMessage = 'File has been modified on GitHub. Click "Fetch Latest & Retry" to get the latest version and save your changes.';
        }
        
        setSaveError(errorMessage);
        console.error('Error saving file:', saveError);
      } finally {
        setIsSaving(false);
        setIsFetching(false);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch latest version. Please try again.';
      setSaveError(errorMessage);
      console.error('Error fetching latest SHA:', error);
      setIsFetching(false);
    }
  }, [blogInfo, githubToken, commitMessage, editorMarkdown, editorHtml, contentToUse]);

  // Handle word click - toggle highlighting
  const handleWordClick = useCallback((word) => {
    if (!word || word.length < 2) return; // Ignore very short words
    
    const normalizedWord = word.toLowerCase().trim();
    const existingIndex = keywords.findIndex(k => k.word.toLowerCase() === normalizedWord);
    
    if (existingIndex >= 0) {
      // Remove from keywords (unhighlight)
      setKeywords(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add to keywords (highlight) - assign next available color
      const usedColors = keywords.map(k => k.color.class);
      const availableColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || PASTEL_COLORS[keywords.length % PASTEL_COLORS.length];
      
      setKeywords(prev => [...prev, { word: normalizedWord, color: availableColor }]);
    }
  }, [keywords]);

  // Get all words to highlight (for basic highlighting)
  const highlightWords = useMemo(() => {
    return keywords.map(k => k.word);
  }, [keywords]);

  // Calculate statistics
  const stats = useMemo(() => {
    const text = editorText || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    const totalChars = text.length;
    const totalCharsNoSpaces = text.replace(/\s/g, '').length;
    
    // Count highlighted words
    const highlightedCounts = keywords.map(keyword => {
      const regex = new RegExp(`\\b${keyword.word}\\b`, 'gi');
      const matches = text.match(regex);
      return {
        word: keyword.word,
        count: matches ? matches.length : 0,
        color: keyword.color,
      };
    });

    const totalHighlighted = highlightedCounts.reduce((sum, item) => sum + item.count, 0);
    const uniqueHighlighted = highlightedCounts.filter(item => item.count > 0).length;

    return {
      totalWords,
      totalChars,
      totalCharsNoSpaces,
      totalHighlighted,
      uniqueHighlighted,
      highlightedCounts,
    };
  }, [editorText, keywords]);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4 shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                title="Back to file list"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Back</span>
              </button>
            )}
            <h1 className="text-xl font-bold text-white">React Ink</h1>
            {blogInfo && (
              <div className="text-sm text-slate-400">
                <span className="text-slate-300">{blogInfo.repo}</span>
                <span className="mx-2">/</span>
                <span>{blogInfo.path}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content - 50/50 Split Layout */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side - Editor */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r border-slate-700 bg-slate-800 min-h-0">
          {/* Save and Fetch Latest Buttons */}
          {blogInfo && fileSha && (
            <div className="px-6 py-3 shrink-0 flex justify-end gap-3 border-b border-slate-700">
              <button
                onClick={handleFetchLatest}
                disabled={isFetching}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Fetch latest from GitHub"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm">{isFetching ? 'Fetching...' : 'Fetch Latest'}</span>
              </button>
              {fetchError && (
                <div className="text-xs text-red-400 flex items-center">
                  {fetchError}
                </div>
              )}
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                title="Save to GitHub"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Save</span>
              </button>
            </div>
          )}
          {/* Editor */}
          <div className="flex-1 overflow-hidden p-6 min-h-0">
            <div className="h-full flex flex-col min-h-0">
              <RichTextEditor
                key={`${blogInfo?.path || 'editor'}-${contentVersion}`} // Use key to remount when file changes or content is fetched
                placeholder="Start typing..."
                initialContent={editorInitialContent}
                highlightWords={highlightWords}
                highlightWordColors={keywords}
                onChange={handleChange}
                onWordClick={handleWordClick}
                hideModeSwitcher={false}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Legend and Stats */}
        <div className="w-1/2 bg-slate-800 flex flex-col overflow-hidden min-h-0">
          {/* Keyword Legend */}
          <div className="p-4 border-b border-slate-700 bg-slate-800 shrink-0">
            <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Keywords</h3>
            <div className="flex flex-wrap items-center gap-2">
              {keywords.map((keyword, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 transition-all border border-slate-600 cursor-pointer"
                  onClick={() => handleWordClick(keyword.word)}
                >
                  <div className={`w-3 h-3 rounded ${keyword.color.class} border border-slate-700`}></div>
                  <span className="text-xs font-medium text-slate-200">{keyword.word}</span>
                  {stats.highlightedCounts[index]?.count > 0 && (
                    <span className="text-xs font-bold text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded">
                      {stats.highlightedCounts[index].count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Panel - Compact */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-slate-800 to-slate-900 min-h-0">
            <div className="grid grid-cols-2 gap-3">
              {/* Word Count Stats */}
              <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-100">
                <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  Word Count
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Words</span>
                    <span className="text-lg font-bold text-blue-600">{stats.totalWords}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Chars</span>
                    <span className="text-lg font-bold text-blue-600">{stats.totalChars}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">No Spaces</span>
                    <span className="text-lg font-bold text-blue-600">{stats.totalCharsNoSpaces}</span>
                  </div>
                </div>
              </div>

              {/* Highlighting Stats */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 shadow-lg border border-purple-100">
                <h4 className="text-xs font-semibold text-purple-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-0.5 h-3 bg-purple-500 rounded"></span>
                  Highlighting
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 font-medium">Total</span>
                    <span className="text-lg font-bold text-purple-600">{stats.totalHighlighted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 font-medium">Unique</span>
                    <span className="text-lg font-bold text-purple-600">{stats.uniqueHighlighted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-700 font-medium">Density</span>
                    <span className="text-lg font-bold text-purple-600">
                      {stats.totalWords > 0 
                        ? ((stats.totalHighlighted / stats.totalWords) * 100).toFixed(1)
                        : '0'
                      }%
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Highlighted Words */}
              {stats.highlightedCounts.some(item => item.count > 0) && (
                <div className="col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-3 shadow-lg border border-indigo-100">
                  <h4 className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-0.5 h-3 bg-indigo-500 rounded"></span>
                    Top Keywords
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {stats.highlightedCounts
                      .filter(item => item.count > 0)
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 6)
                      .map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-1 px-2 rounded bg-white/60 hover:bg-white transition-colors">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded ${item.color.class} border border-white`}></div>
                            <span className="text-xs font-medium text-gray-700">{item.word}</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Token Input Modal */}
      {showTokenInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">GitHub Access Token</h2>
            
            <p className="text-sm text-slate-400 mb-4">
              To save files to GitHub, you need a Personal Access Token with <code className="bg-slate-700 px-1 rounded">repo</code> scope.
              <br /><br />
              <a 
                href="https://github.com/settings/tokens/new?scopes=repo&description=React%20Ink%20Editor" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Create a token here →
              </a>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Personal Access Token
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowTokenInput(false);
                  setTokenInput('');
                }}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (tokenInput.trim()) {
                    setGitHubToken(tokenInput.trim());
                    setShowTokenInput(false);
                    setTokenInput('');
                    setSaveError('');
                  }
                }}
                disabled={!tokenInput.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Save to GitHub</h2>
            
            {!githubToken && (
              <div className="mb-4 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded">
                <p className="mb-2">GitHub access token required.</p>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setShowTokenInput(true);
                  }}
                  className="text-yellow-300 hover:text-yellow-100 underline"
                >
                  Add GitHub Token
                </button>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Commit Message
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Enter commit message..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>

            {saveError && (
              <div className="mb-4 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
                {saveError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setCommitMessage('');
                  setSaveError('');
                  setIsShaMismatchError(false);
                }}
                disabled={isSaving || isFetching}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {isShaMismatchError && (
                <button
                  onClick={handleFetchLatestAndRetry}
                  disabled={isSaving || isFetching || !githubToken}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isFetching ? 'Fetching...' : 'Fetch Latest & Retry'}
                </button>
              )}
              {!githubToken && (
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setShowTokenInput(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Add Token
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving || isFetching || !commitMessage.trim() || !githubToken}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

