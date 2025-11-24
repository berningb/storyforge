import React, { useState, useEffect, useCallback } from 'react';
import { parseFiles } from '../lib/textParser';
import { useAuth } from '../contexts/AuthContext';
import { AvatarDropdown } from '../components/AvatarDropdown';

export const FanFictionDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [savedCharacters, setSavedCharacters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load characters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ficflow_characters');
      if (stored) {
        setSavedCharacters(JSON.parse(stored));
      }
    } catch (err) {
    }
  }, []);

  const loadCharacters = useCallback(() => {
    try {
      const stored = localStorage.getItem('ficflow_characters');
      setSavedCharacters(stored ? JSON.parse(stored) : []);
    } catch (err) {
      setSavedCharacters([]);
    }
  }, []);

  // Read files from uploaded folder
  const handleFolderUpload = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setError('No folder selected');
      return;
    }

    try {
      setParsing(true);
      setError(null);

      // Filter and read text files, preserving folder structure
      const textExtensions = ['.txt', '.md', '.markdown', '.html', '.htm'];
      const filePromises = [];
      const folderStructure = new Map(); // Track folder structure

      for (const file of Array.from(files)) {
        const fileName = file.name.toLowerCase();
        const isTextFile = textExtensions.some(ext => fileName.endsWith(ext));
        
        if (isTextFile) {
          const relativePath = file.webkitRelativePath || file.name;
          const pathParts = relativePath.split('/');
          const folderPath = pathParts.slice(0, -1).join('/'); // Everything except filename
          
          // Track folder structure
          if (folderPath && !folderStructure.has(folderPath)) {
            folderStructure.set(folderPath, []);
          }
          
          filePromises.push(
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const fileData = {
                  name: file.name,
                  path: relativePath,
                  folderPath: folderPath || '/',
                  content: e.target?.result || '',
                  size: file.size,
                  sha: `${relativePath}-${file.size}`, // Use full path for ID
                };
                
                // Add to folder structure
                if (folderPath) {
                  folderStructure.get(folderPath).push(fileData);
                }
                
                resolve(fileData);
              };
              reader.onerror = () => {
                const fileData = {
                  name: file.name,
                  path: relativePath,
                  folderPath: folderPath || '/',
                  content: '',
                  size: file.size,
                  sha: `${relativePath}-${file.size}`,
                };
                resolve(fileData);
              };
              reader.readAsText(file);
            })
          );
        }
      }

      const loadedFiles = await Promise.all(filePromises);
      
      if (loadedFiles.length === 0) {
        setError('No text files found in the selected folder');
        setParsing(false);
        return;
      }

      // Sort files by path to maintain folder order
      loadedFiles.sort((a, b) => a.path.localeCompare(b.path));

      // Parse files for characters, locations, relationships
      const parsed = parseFiles(loadedFiles);
      
      // Store chapters with folder structure
      setChapters(loadedFiles.map((file, index) => ({
        id: file.sha,
        name: file.name,
        path: file.path,
        folderPath: file.folderPath,
        content: file.content,
        order: index,
      })));
      
      // Get folder name from first file's path
      const firstFile = loadedFiles[0];
      const rootFolderName = firstFile.path.split('/')[0] || 'Uploaded Folder';
      
      setSelectedRepo({
        name: rootFolderName,
        files: loadedFiles,
        parsed,
        folderStructure: Array.from(folderStructure.entries()).map(([path, files]) => ({
          path,
          files: files.length,
        })),
      });
      
      setParsing(false);
    } catch (err) {
      setError(err.message || 'Failed to process files');
      setParsing(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">FicFlow</h1>
          <div className="flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Folder Upload */}
        {!selectedRepo && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Story Folder</h2>
            <p className="text-slate-300 mb-4 text-sm">
              Select a folder containing your story files. The entire folder structure will be preserved.
              <br />
              <span className="text-slate-400">Supported formats: .md, .txt, .html, .htm</span>
            </p>
            <div className="flex gap-2">
              <input
                type="file"
                id="folder-upload"
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderUpload}
                disabled={parsing}
                className="hidden"
              />
              <label
                htmlFor="folder-upload"
                className={`flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer text-center ${
                  parsing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {parsing ? 'Processing Folder...' : '📁 Select Folder'}
              </label>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              💡 Tip: Click "Select Folder" and choose the folder containing your story files. All subfolders will be included.
            </p>
          </div>
        )}

        {/* Tabs */}
        {selectedRepo && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex gap-2 border-b border-slate-700">
                  {['overview', 'wiki'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab === 'overview') {
                          setSelectedCharacter(null);
                        }
                      }}
                      className={`px-6 py-3 font-medium transition-colors capitalize ${
                        activeTab === tab
                          ? 'text-purple-400 border-b-2 border-purple-400'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <p className="text-slate-400 text-sm mt-2">
                  {selectedRepo.files?.length || 0} files loaded
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRepo(null);
                  setChapters([]);
                  setSelectedCharacter(null);
                  setActiveTab('overview');
                  // Reset file input
                  const fileInput = document.getElementById('folder-upload');
                  if (fileInput) {
                    fileInput.value = '';
                  }
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                📁 Upload New Folder
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {selectedRepo && (
          <div>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Characters */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Characters ({selectedRepo.parsed.characters.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedRepo.parsed.characters.slice(0, 20).map((char, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setSelectedCharacter(char.name);
                          setActiveTab('wiki');
                        }}
                        className="bg-slate-700 hover:bg-slate-600 p-3 rounded cursor-pointer transition-colors"
                      >
                        <div className="font-medium">{char.name}</div>
                        <div className="text-sm text-slate-400">Mentions: {char.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locations */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Locations ({selectedRepo.parsed.locations.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedRepo.parsed.locations.slice(0, 20).map((loc, idx) => (
                      <div key={idx} className="bg-slate-700 p-3 rounded">
                        <div className="font-medium">{loc.name}</div>
                        <div className="text-sm text-slate-400">Mentions: {loc.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Files */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Files ({selectedRepo.files?.length || 0})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedRepo.files?.slice(0, 20).map((file, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          // Store file data in sessionStorage to pass to text-analysis page
                          sessionStorage.setItem('ficflow_file_content', file.content);
                          sessionStorage.setItem('ficflow_file_name', file.name);
                          sessionStorage.setItem('ficflow_characters', JSON.stringify(selectedRepo.parsed.characters));
                          // Navigate to text-analysis page
                          window.location.href = '/text-analysis';
                        }}
                        className="bg-slate-700 hover:bg-slate-600 p-3 rounded cursor-pointer transition-colors"
                      >
                        <div className="font-medium truncate">{file.name}</div>
                        {file.folderPath && file.folderPath !== '/' && (
                          <div className="text-xs text-slate-500 mt-1 truncate">{file.folderPath}</div>
                        )}
                        <div className="text-sm text-slate-400 mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Wiki Tab */}
            {activeTab === 'wiki' && (
              <div className="bg-slate-800 rounded-lg p-6">
                <p className="text-slate-300">Wiki functionality would go here</p>
              </div>
            )}
          </div>
        )}

        {/* Chapter Viewer Modal */}
        {selectedChapter && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedChapter(null)}
          >
            <div 
              className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedChapter.name}</h2>
                <button
                  onClick={() => setSelectedChapter(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedChapter.content }}
              />
            </div>
          </div>
        )}

        {parsing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="text-white">Parsing repository files...</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

