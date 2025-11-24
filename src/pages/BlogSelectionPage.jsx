import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMarkdownFiles, fetchFileContent } from '../lib/github';
import { markdownToHtml } from '@react-quill/lib';
import { AvatarDropdown } from '../components/AvatarDropdown';

export const BlogSelectionPage = ({ repo, onBlogSelect, onBack }) => {
  const { currentUser } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [owner, repoName] = repo.fullName.split('/');
        const markdownFiles = await fetchMarkdownFiles(owner, repoName, repo.defaultBranch);
        setBlogs(markdownFiles);
      } catch (err) {
        setError(`Failed to load markdown files: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (repo) {
      loadBlogs();
    }
  }, [repo]);

  const handleBlogClick = async (blog) => {
    try {
      setLoading(true);
      const [owner, repoName] = repo.fullName.split('/');
      const markdownContent = await fetchFileContent(owner, repoName, blog.path, repo.defaultBranch);
      // Convert markdown to HTML for the editor
      const htmlContent = markdownToHtml(markdownContent);
      onBlogSelect({
        ...blog,
        content: htmlContent,
        markdown: markdownContent,
        repo: repo.fullName,
      });
    } catch (err) {
      setError(`Failed to load file content: ${err.message}`);
      setLoading(false);
    }
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && blogs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading markdown files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">StoryForge</h1>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back to Repositories
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-2">Select a Blog File</h2>
            <p className="text-slate-400">Repository: {repo.fullName}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search markdown files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Blogs List */}
        <div className="space-y-2">
          {filteredBlogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">
                {searchTerm ? 'No markdown files found matching your search.' : 'No markdown files found in this repository.'}
              </p>
            </div>
          ) : (
            filteredBlogs.map((blog) => (
              <div
                key={blog.sha}
                onClick={() => handleBlogClick(blog)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-purple-500 hover:bg-slate-750 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{blog.path}</h3>
                    <p className="text-xs text-slate-400">
                      {(blog.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  {loading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

