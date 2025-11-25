import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RichTextEditor } from '@react-quill/lib';
import { htmlToMarkdown } from '@react-quill/lib';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { getFileSha } from '../lib/github';
import { MOCK_TEXT, PASTEL_COLORS, highlightWordsMultiColor } from '../utils/editorUtils';
import { useEditorState } from '../hooks/useEditorState';
import { useSaveHandlers } from '../hooks/useSaveHandlers';
import { useEntitySearch } from '../hooks/useEntitySearch';
import { SynonymFinder } from '../components/Editor/SynonymFinder';
import { EntityLegend } from '../components/Editor/EntityLegend';
import { StatsPanel } from '../components/Editor/StatsPanel';
import { SaveModal } from '../components/Editor/SaveModal';
import { AddEntityModal } from '../components/Editor/AddEntityModal';
import { TokenInputModal } from '../components/Editor/TokenInputModal';

export const IndexPage = ({ initialContent, blogInfo, onBack, onFileEdited }) => {
  const { currentUser, githubToken, setGitHubToken } = useAuth();
  const { 
    collections, 
    addToCollection, 
    removeFromCollection,
    createCollection,
    deleteCollection,
    updateCollectionConfig,
  } = useRepo();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [fileSha, setFileSha] = useState(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  // Initialize highlightedCollections with all collections that have items
  const [highlightedCollections, setHighlightedCollections] = useState(() => {
    return new Set();
  });

  // Auto-highlight all collections with items when collections change (only if none are currently highlighted)
  useEffect(() => {
    const collectionsWithItems = Object.keys(collections).filter(
      name => collections[name].items && collections[name].items.length > 0
    );
    if (collectionsWithItems.length > 0) {
      setHighlightedCollections(prev => {
        // Only auto-highlight if no collections are currently highlighted
        if (prev.size === 0) {
          return new Set(collectionsWithItems);
        }
        return prev;
      });
    }
  }, [collections]);
  const [showAddEntityModal, setShowAddEntityModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedCollectionName, setSelectedCollectionName] = useState('');
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [forcePreview, setForcePreview] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [userManuallyToggled, setUserManuallyToggled] = useState(false);
  const [synonymSearchWord, setSynonymSearchWord] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const contentToUse = useMemo(() => initialContent || MOCK_TEXT, [initialContent]);

  const {
    editorText,
    editorHtml,
    editorMarkdown,
    editorInitialContent,
    contentVersion,
    hasChanges,
    handleChange,
    handleUndo,
    handleSaveLocal,
    updateContent,
    setContentVersion,
  } = useEditorState({
    initialContent: contentToUse,
    blogInfo,
    onFileEdited,
  });

  // Create a file-like structure from editor text for useEntitySearch
  const editorFiles = useMemo(() => {
    if (!editorText) return [];
    return [{
      content: editorText,
      path: blogInfo?.path || 'current-file',
    }];
  }, [editorText, blogInfo?.path]);

  // Get character names from collections for useEntitySearch
  const characterNames = useMemo(() => {
    const chars = [];
    Object.values(collections).forEach(collection => {
      collection.items.forEach(item => {
        const display = typeof item === 'string' ? item : (item.word || String(item));
        chars.push(display);
      });
    });
    return chars;
  }, [collections]);

  // Use entity search hook
  const { searchItemDialogue, searchItemMentions } = useEntitySearch(editorFiles, characterNames);

  const {
    isSaving,
    isFetching,
    saveError,
    fetchError,
    isShaMismatchError,
    handleSave,
    handleFetchLatest,
    handleFetchLatestAndRetry,
    setSaveError,
    setFetchError,
  } = useSaveHandlers({
    blogInfo,
    githubToken,
    editorHtml,
    editorMarkdown,
    contentToUse,
    onFileEdited,
    updateContent,
    setFileSha,
    fileSha,
  });

  useEffect(() => {
    if (blogInfo?.sha && !fileSha) {
      setFileSha(blogInfo.sha);
    }
  }, [blogInfo?.sha, fileSha]);


  const getWordAtCursor = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const text = range.toString();
    
    if (text.trim()) {
      return text.trim().split(/\s+/)[0];
    }
    
    const container = range.commonAncestorContainer;
    let textNode = container;
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
      textNode = textNode.childNodes[range.startOffset] || textNode.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        return null;
      }
    }
    
    const textContent = textNode.textContent || '';
    const getTextOffset = (node) => {
      let offset = 0;
      let sibling = node.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.TEXT_NODE) {
          offset += sibling.textContent.length;
        } else if (sibling.nodeType === Node.ELEMENT_NODE) {
          offset += sibling.textContent.length;
        }
        sibling = sibling.previousSibling;
      }
      return offset;
    };
    
    const offset = range.startOffset - (textNode === container ? 0 : getTextOffset(textNode));
    const beforeCursor = textContent.substring(0, offset);
    const afterCursor = textContent.substring(offset);
    const beforeMatch = beforeCursor.match(/(\w+)$/);
    const afterMatch = afterCursor.match(/^(\w+)/);
    const wordBefore = beforeMatch ? beforeMatch[1] : '';
    const wordAfter = afterMatch ? afterMatch[1] : '';
    const word = wordBefore + wordAfter;
    return word || null;
  }, []);

  useEffect(() => {
    const handleEditorClick = (e) => {
      if (isPreviewMode) return;
      const editorArea = e.target.closest('.ql-editor, [contenteditable="true"]');
      if (!editorArea) return;
      
      setTimeout(() => {
        const word = getWordAtCursor();
        if (word && word.length > 1) {
          setSynonymSearchWord(word);
        }
      }, 100);
    };
    
    document.addEventListener('click', handleEditorClick);
    return () => {
      document.removeEventListener('click', handleEditorClick);
    };
  }, [getWordAtCursor, isPreviewMode]);

  useEffect(() => {
    if (!userManuallyToggled) {
      if (highlightedCollections.size > 0) {
        setForcePreview(true);
      } else {
        setForcePreview(null);
      }
    }
  }, [highlightedCollections, userManuallyToggled]);

  const handlePreviewChange = useCallback((preview) => {
    setIsPreviewMode(preview);
    setUserManuallyToggled(true);
    setForcePreview(null);
  }, []);

  const handleAddToCollection = useCallback(async (collectionName, item) => {
    await addToCollection(collectionName, item);
  }, [addToCollection]);

  const handleRemoveFromCollection = useCallback(async (collectionName, item) => {
    await removeFromCollection(collectionName, item);
  }, [removeFromCollection]);

  const handleDragFromOtherCollection = useCallback(async (sourceCollectionName, item) => {
    await removeFromCollection(sourceCollectionName, item);
  }, [removeFromCollection]);

  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) return;
    
    const collectionName = newCollectionName.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (collections[collectionName]) {
      alert(`Collection "${collectionName}" already exists`);
      return;
    }

    try {
      // Use first available color or default
      const usedColors = Object.values(collections).map(c => c.config?.color?.bg).filter(Boolean);
      const defaultColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || PASTEL_COLORS[0];
      
      await createCollection(collectionName, {
        name: newCollectionName.trim(),
        color: { 
          bg: defaultColor.class, 
          text: defaultColor.text, 
          border: 'border-gray-300', 
          bgDark: 'bg-gray-900/20', 
          borderDark: 'border-gray-700/50' 
        },
        icon: 'default',
      });
      // Automatically highlight the new collection
      setHighlightedCollections(prev => new Set([...prev, collectionName]));
      setNewCollectionName('');
      setShowCollectionManager(false);
    } catch (error) {
      alert(`Failed to create collection: ${error.message}`);
    }
  }, [newCollectionName, collections, createCollection]);

  const handleDeleteCollection = useCallback(async (collectionName) => {
    if (!confirm(`Are you sure you want to delete the "${collectionName}" collection?`)) {
      return;
    }

    try {
      await deleteCollection(collectionName);
    } catch (error) {
      alert(`Failed to delete collection: ${error.message}`);
    }
  }, [deleteCollection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          const selectedText = selection.toString().trim();
          if (selectedText.length > 0 && selectedText.length < 100) {
            setSelectedText(selectedText);
            // Default to first collection
            const firstCollection = Object.keys(collections)[0] || '';
            setSelectedCollectionName(firstCollection);
            setShowAddEntityModal(true);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [collections]);

  const [showWordCollectionModal, setShowWordCollectionModal] = useState(false);
  const [clickedWord, setClickedWord] = useState('');
  const [wordTargetCollection, setWordTargetCollection] = useState('');

  const handleWordClick = useCallback(async (word) => {
    if (!word || word.length < 2) return;
    
    const normalizedWord = word.toLowerCase().trim();
    
    // Check if word exists in any collection
    let foundInCollection = null;
    let foundItem = null;
    
    for (const [collectionName, collection] of Object.entries(collections)) {
      const item = collection.items.find(item => {
        if (typeof item === 'string') {
          return item.toLowerCase() === normalizedWord;
        }
        if (typeof item === 'object' && item.word) {
          return item.word.toLowerCase() === normalizedWord;
        }
        return false;
      });
      
      if (item) {
        foundInCollection = collectionName;
        foundItem = item;
        break;
      }
    }
    
    if (foundInCollection) {
      // Word exists - show modal to remove or move to another collection
      setClickedWord(word);
      setWordTargetCollection(foundInCollection);
      setShowWordCollectionModal(true);
    } else {
      // Word doesn't exist - show modal to add to a collection
      setClickedWord(word);
      const firstCollection = Object.keys(collections)[0] || '';
      setWordTargetCollection(firstCollection);
      setShowWordCollectionModal(true);
    }
  }, [collections]);

  const highlightWords = useMemo(() => {
    const words = [];
    Object.entries(collections).forEach(([collectionName, collection]) => {
      if (highlightedCollections.has(collectionName)) {
        collection.items.forEach(item => {
          if (typeof item === 'string') {
            words.push(item);
          } else if (typeof item === 'object' && item.word) {
            words.push(item.word);
          }
        });
      }
    });
    return words;
  }, [collections, highlightedCollections]);
  
  const highlightWordColors = useMemo(() => {
    const colors = [];
    Object.entries(collections).forEach(([collectionName, collection]) => {
      if (highlightedCollections.has(collectionName)) {
        const config = collection.config || {};
        // Use the collection's color for all items in this collection
        const collectionColor = config.color || { bg: 'bg-gray-200', text: 'text-gray-800' };
        const bgColor = collectionColor.hex || collectionColor.bg || 'bg-gray-200';
        const textColor = collectionColor.text || 'text-gray-800';
        
        // Check if it's a hex color
        const isHexColor = typeof bgColor === 'string' && bgColor.startsWith('#');
        
        collection.items.forEach(item => {
          const word = typeof item === 'string' ? item : (item.word || String(item));
          if (!word) return;
          
          // Check if we already have this word
          const existingIndex = colors.findIndex(c => c.word.toLowerCase() === word.toLowerCase());
          
          if (existingIndex === -1) {
            // New word - add it with collection color
            if (isHexColor) {
              // For hex colors, use inline styles
              colors.push({ 
                word: word, 
                color: { 
                  hex: bgColor,
                  text: textColor,
                  class: '', // Empty class for hex colors
                  style: { backgroundColor: bgColor, color: textColor }
                } 
              });
            } else {
              // For Tailwind classes
              colors.push({ 
                word: word, 
                color: { 
                  class: bgColor, 
                  text: textColor,
                  hex: null
                } 
              });
            }
          }
        });
      }
    });
    return colors;
  }, [collections, highlightedCollections]);

  const stats = useMemo(() => {
    const text = editorText || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;
    const totalChars = text.length;
    const totalCharsNoSpaces = text.replace(/\s/g, '').length;

    return {
      totalWords,
      totalChars,
      totalCharsNoSpaces,
    };
  }, [editorText]);

  // Group dialogue and mentions by file for selected item
  const dialogueByFile = useMemo(() => {
    if (!selectedItem?.dialogue) return {};
    const fileMap = {};
    selectedItem.dialogue.forEach(d => {
      if (!fileMap[d.file]) {
        fileMap[d.file] = [];
      }
      fileMap[d.file].push(d);
    });
    return fileMap;
  }, [selectedItem]);

  const mentionsByFile = useMemo(() => {
    if (!selectedItem?.mentions) return {};
    const fileMap = {};
    selectedItem.mentions.forEach(m => {
      if (!fileMap[m.file]) {
        fileMap[m.file] = [];
      }
      fileMap[m.file].push(m);
    });
    return fileMap;
  }, [selectedItem]);

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!blogInfo || !onBack) return [];
    
    const crumbs = [];
    
    // Split repo owner/name into separate breadcrumbs
    if (blogInfo.repo) {
      const repoParts = blogInfo.repo.split('/').filter(Boolean);
      repoParts.forEach((part, index) => {
        crumbs.push({
          label: part,
          // First part (username) goes to repo selection, second part (repo) goes to repo analysis
          onClick: index === 0 
            ? () => {
                window.location.hash = '#repos';
                window.location.reload();
              }
            : onBack,
          isCurrent: false,
        });
      });
    }
    
    // Third crumb: File path segments
    if (blogInfo.path) {
      const pathSegments = blogInfo.path.split('/').filter(Boolean);
      pathSegments.forEach((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        crumbs.push({
          label: segment,
          onClick: isLast ? undefined : onBack, // Only last segment is current
          isCurrent: isLast,
        });
      });
    }
    
    return crumbs;
  }, [blogInfo, onBack]);

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4 shadow-lg shrink-0">
        <div className="max-w-7xl mx-auto relative flex items-center">
          {/* Left - StoryForge */}
          <h1 className="text-xl font-bold text-white">StoryForge</h1>
          
          {/* Center - Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className={`text-slate-400 mx-0.5 ${crumb.isCurrent ? 'text-base' : 'text-sm'}`}>/</span>
                  )}
                  {crumb.onClick ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        crumb.onClick(e);
                      }}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="text-white text-xl font-semibold">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* Right - Avatar */}
          <div className="ml-auto flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden min-h-0 p-4 gap-4">
        {/* Left Side - Editor */}
        <div className="w-1/2 flex flex-col overflow-hidden border border-slate-700 rounded-lg bg-slate-800 min-h-0 shadow-lg">
          {blogInfo && !isPreviewMode && (
            <div className="px-6 py-3 shrink-0 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={!hasChanges}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo changes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo
                </button>
                {hasChanges && (
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Unsaved changes
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveLocal}
                disabled={!hasChanges}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save changes locally (does not commit to GitHub)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
            </div>
          )}

          {blogInfo && isPreviewMode && (
            <div className="px-6 py-3 shrink-0 flex items-center gap-2 border-b border-slate-700 overflow-x-auto">
              {Object.entries(collections).map(([collectionName, collection]) => {
                const isHighlighted = highlightedCollections.has(collectionName);
                const config = collection.config || {};
                
                // Get the collection's color - support both hex and Tailwind classes
                const collectionColor = config.color || { bg: 'bg-gray-200', text: 'text-gray-800' };
                const bgColor = collectionColor.hex || collectionColor.bg || 'bg-gray-200';
                const textColor = collectionColor.text || 'text-gray-800';
                
                // Check if it's a hex color (starts with #)
                const isHexColor = typeof bgColor === 'string' && bgColor.startsWith('#');
                const buttonStyle = isHighlighted && isHexColor 
                  ? { backgroundColor: bgColor, color: textColor }
                  : {};
                const buttonClassName = isHighlighted && !isHexColor
                  ? `${bgColor} ${textColor}`
                  : isHighlighted
                  ? ''
                  : 'bg-slate-700 text-slate-300';
                
                return (
                  <button
                    key={collectionName}
                    onClick={() => {
                      setHighlightedCollections(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(collectionName)) {
                          newSet.delete(collectionName);
                        } else {
                          newSet.add(collectionName);
                        }
                        return newSet;
                      });
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${buttonClassName} ${!isHighlighted ? 'hover:bg-slate-600' : ''}`}
                    style={buttonStyle}
                    title={`Toggle ${config.name || collectionName} highlighting`}
                  >
                    {config.name || collectionName}
                  </button>
                );
              })}
              <button
                onClick={() => setShowCollectionManager(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
                title="Manage collections"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Collection
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden p-6 min-h-0">
            <div className="h-full flex flex-col min-h-0 overflow-auto">
              <RichTextEditor
                key={`${blogInfo?.path || 'editor'}-${contentVersion}`}
                placeholder="Start typing..."
                initialContent={editorInitialContent}
                highlightWords={highlightWords}
                highlightWordColors={highlightWordColors}
                onChange={handleChange}
                onWordClick={handleWordClick}
                hideModeSwitcher={false}
                forcePreview={forcePreview}
                onPreviewChange={handlePreviewChange}
              />
            </div>
          </div>
        </div>

        {/* Right Side - Legend and Stats or Item Overview */}
        <div className="w-1/2 bg-slate-800 flex flex-col overflow-hidden border border-slate-700 rounded-lg min-h-0 shadow-lg">
          {selectedItem ? (
            /* Item Overview - Side by Side Dialogue and Mentions */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-700 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Back to collections"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h2 className="text-xl font-bold text-white">{selectedItem.name}</h2>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-purple-400">
                    {selectedItem.dialogueCount || 0} dialogue
                  </div>
                  <div className="text-blue-400">
                    {selectedItem.mentionCount || 0} mentions
                  </div>
                </div>
              </div>

              {/* Side by Side Content */}
              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Left Column - Dialogue */}
                <div className="w-1/2 flex flex-col overflow-hidden border-r border-slate-700">
                  <div className="px-6 py-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-lg font-semibold text-purple-400">Dialogue</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {selectedItem.dialogue && selectedItem.dialogue.length > 0 ? (
                      <div className="space-y-6">
                        {Object.entries(dialogueByFile).map(([fileName, dialogues]) => (
                          <div key={fileName} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                            <h4 className="text-sm font-semibold text-purple-300 mb-3">{fileName}</h4>
                            <div className="space-y-3">
                              {dialogues.map((d, idx) => (
                                <div key={idx} className="bg-slate-800 rounded-lg p-3 border-l-4 border-purple-500">
                                  <p className="text-white italic mb-1 text-sm">"{d.dialogue}"</p>
                                  <p className="text-xs text-slate-400">— {d.speaker || selectedItem.name}</p>
                                  {d.context && d.context !== d.dialogue && (
                                    <p className="text-xs text-slate-400 mt-2">{d.context}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-700 rounded-lg border border-slate-600">
                        <p className="text-slate-400 text-sm">No dialogue found for this item.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Mentions */}
                <div className="w-1/2 flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700 shrink-0">
                    <h3 className="text-lg font-semibold text-blue-400">Mentions</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {selectedItem.mentions && selectedItem.mentions.length > 0 ? (
                      <div className="space-y-6">
                        {Object.entries(mentionsByFile).map(([fileName, mentions]) => (
                          <div key={fileName} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                            <h4 className="text-sm font-semibold text-blue-300 mb-3">{fileName}</h4>
                            <div className="space-y-2">
                              {mentions.map((mention, idx) => (
                                <div key={idx} className="bg-slate-800 rounded-lg p-3 border-l-4 border-blue-500">
                                  <p className="text-slate-300 text-sm">{mention.context}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-700 rounded-lg border border-slate-600">
                        <p className="text-slate-400 text-sm">No mentions found for this item.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Default View - Collections and Stats */
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto min-h-0">
                {isPreviewMode && Object.entries(collections).map(([collectionName, collection]) => {
                  if (!highlightedCollections.has(collectionName)) return null;
                  
                  return (
                    <EntityLegend
                      key={collectionName}
                      collectionName={collectionName}
                      collection={collection}
                      onAddItem={(item) => handleAddToCollection(collectionName, item)}
                      onRemoveItem={(item) => handleRemoveFromCollection(collectionName, item)}
                      onDragFromOtherCollection={handleDragFromOtherCollection}
                      stats={null}
                      handleWordClick={null}
                      allCollections={collections}
                      searchItemDialogue={searchItemDialogue}
                      searchItemMentions={searchItemMentions}
                      onItemClick={(itemName) => {
                        console.log('Item clicked:', itemName);
                        const dialogue = searchItemDialogue(itemName);
                        const mentions = searchItemMentions(itemName);
                        console.log('Dialogue:', dialogue);
                        console.log('Mentions:', mentions);
                        setSelectedItem({
                          name: itemName,
                          dialogue: dialogue,
                          mentions: mentions,
                          dialogueCount: dialogue.length,
                          mentionCount: mentions.length,
                          collectionName: collectionName,
                        });
                      }}
                    />
                  );
                })}

                {isPreviewMode && <StatsPanel stats={stats} />}

                {!isPreviewMode && (
                  <div className="p-6 bg-gradient-to-b from-slate-800 to-slate-900">
                    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 flex flex-col shadow-lg">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Synonym Finder
                      </h3>
                      <div className="flex flex-col">
                        <SynonymFinder synonymSearchWord={synonymSearchWord} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <SaveModal
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        saveError={saveError}
        isSaving={isSaving}
        isFetching={isFetching}
        isShaMismatchError={isShaMismatchError}
        githubToken={githubToken}
        setShowTokenInput={setShowTokenInput}
        handleSave={(msg, onSuccess) => handleSave(msg, () => {
          setShowSaveModal(false);
          setCommitMessage('');
          onSuccess?.();
        })}
        handleFetchLatestAndRetry={(msg, onSuccess) => handleFetchLatestAndRetry(msg, () => {
          setShowSaveModal(false);
          setCommitMessage('');
          onSuccess?.();
        })}
      />

      <AddEntityModal
        showAddEntityModal={showAddEntityModal}
        setShowAddEntityModal={setShowAddEntityModal}
        selectedText={selectedText}
        setSelectedText={setSelectedText}
        selectedCollectionName={selectedCollectionName}
        setSelectedCollectionName={setSelectedCollectionName}
        collections={collections}
        handleAddToCollection={handleAddToCollection}
      />

      {/* Collection Manager Modal */}
      {showCollectionManager && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCollectionManager(false);
            setNewCollectionName('');
          }}
        >
          <div 
            className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Manage Collections</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Create New Collection</label>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., items, houses, phrases"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newCollectionName.trim()) {
                    handleCreateCollection();
                  }
                }}
              />
              <button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Collection
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Existing Collections</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(collections).map(([collectionName, collection]) => {
                  return (
                    <div key={collectionName} className="bg-slate-700 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{collection.config?.name || collectionName}</div>
                          <div className="text-xs text-slate-400">{collection.items.length} items</div>
                        </div>
                        <button
                          onClick={() => handleDeleteCollection(collectionName)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete collection"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCollectionManager(false);
                  setNewCollectionName('');
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <TokenInputModal
        showTokenInput={showTokenInput}
        setShowTokenInput={setShowTokenInput}
        tokenInput={tokenInput}
        setTokenInput={setTokenInput}
        setGitHubToken={setGitHubToken}
      />

      {/* Word Collection Modal - for moving words between collections */}
      {showWordCollectionModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowWordCollectionModal(false);
            setClickedWord('');
          }}
        >
          <div 
            className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Manage Word: "{clickedWord}"</h2>
            
            {/* Check if word exists in any collection */}
            {(() => {
              const normalizedWord = clickedWord.toLowerCase().trim();
              let foundInCollection = null;
              
              for (const [collectionName, collection] of Object.entries(collections)) {
                const exists = collection.items.some(item => {
                  if (typeof item === 'string') {
                    return item.toLowerCase() === normalizedWord;
                  }
                  if (typeof item === 'object' && item.word) {
                    return item.word.toLowerCase() === normalizedWord;
                  }
                  return false;
                });
                
                if (exists) {
                  foundInCollection = collectionName;
                  break;
                }
              }
              
              return foundInCollection ? (
                <div className="mb-4">
                  <p className="text-slate-300 mb-2">
                    This word is currently in: <span className="font-semibold text-white">
                      {collections[foundInCollection]?.config?.name || foundInCollection}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await removeFromCollection(foundInCollection, clickedWord);
                        setShowWordCollectionModal(false);
                        setClickedWord('');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => {
                        setWordTargetCollection(foundInCollection);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Move to Another Collection
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-300 mb-4">Add this word to a collection:</p>
              );
            })()}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Select Collection</label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {Object.entries(collections).map(([collectionName, collection]) => {
                  const config = collection.config || {};
                  const isSelected = wordTargetCollection === collectionName;
                  const colorClass = config.color?.bg?.replace('bg-', 'bg-').replace('-200', '-600') || 'bg-gray-600';
                  
                  return (
                    <button
                      key={collectionName}
                      onClick={() => {
                        console.log('Selecting collection:', collectionName);
                        setWordTargetCollection(collectionName);
                      }}
                      className={`py-2 px-4 rounded-lg font-semibold transition-all text-sm border-2 ${
                        isSelected
                          ? `${colorClass} text-white border-white`
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
                      }`}
                    >
                      {config.name || collectionName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowWordCollectionModal(false);
                  setClickedWord('');
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    console.log('Add button clicked. wordTargetCollection:', wordTargetCollection);
                    console.log('Available collections:', Object.keys(collections));
                    
                    if (!wordTargetCollection) {
                      alert('Please select a collection');
                      return;
                    }
                    
                    const normalizedWord = clickedWord.toLowerCase().trim();
                    const targetCollection = collections[wordTargetCollection];
                    
                    if (!targetCollection) {
                      alert(`Collection "${wordTargetCollection}" does not exist. Please select a different collection.`);
                      console.error('Collection not found:', wordTargetCollection, 'Available collections:', Object.keys(collections));
                      return;
                    }
                    
                    console.log('Adding word to collection:', wordTargetCollection, 'Word:', normalizedWord);
                    
                    // Check if word exists in another collection and remove it
                    for (const [collectionName, collection] of Object.entries(collections)) {
                      if (collectionName !== wordTargetCollection) {
                        const exists = collection.items.some(item => {
                          if (typeof item === 'string') {
                            return item.toLowerCase() === normalizedWord;
                          }
                          if (typeof item === 'object' && item.word) {
                            return item.word.toLowerCase() === normalizedWord;
                          }
                          return false;
                        });
                        
                        if (exists) {
                          await removeFromCollection(collectionName, clickedWord);
                        }
                      }
                    }
                    
                    // Check if word already exists in target collection
                    const existsInTarget = targetCollection.items.some(item => {
                      if (typeof item === 'string') {
                        return item.toLowerCase() === normalizedWord;
                      }
                      if (typeof item === 'object' && item.word) {
                        return item.word.toLowerCase() === normalizedWord;
                      }
                      return false;
                    });
                    
                    if (!existsInTarget) {
                      // Add to target collection
                      const config = targetCollection.config || {};
                      if (config.supportsColors) {
                        const usedColors = targetCollection.items
                          .filter(i => typeof i === 'object' && i.color)
                          .map(i => i.color.class);
                        const availableColor = PASTEL_COLORS.find(c => !usedColors.includes(c.class)) || 
                          PASTEL_COLORS[targetCollection.items.length % PASTEL_COLORS.length];
                        await addToCollection(wordTargetCollection, { word: normalizedWord, color: availableColor });
                      } else {
                        await addToCollection(wordTargetCollection, clickedWord);
                      }
                    }
                    
                    setShowWordCollectionModal(false);
                    setClickedWord('');
                  } catch (error) {
                    console.error('Error adding word to collection:', error);
                    alert(`Failed to add word: ${error.message || error.toString()}`);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                {(() => {
                  const normalizedWord = clickedWord.toLowerCase().trim();
                  let foundInCollection = null;
                  
                  for (const [collectionName, collection] of Object.entries(collections)) {
                    const exists = collection.items.some(item => {
                      if (typeof item === 'string') {
                        return item.toLowerCase() === normalizedWord;
                      }
                      if (typeof item === 'object' && item.word) {
                        return item.word.toLowerCase() === normalizedWord;
                      }
                      return false;
                    });
                    
                    if (exists) {
                      foundInCollection = collectionName;
                      break;
                    }
                  }
                  
                  return foundInCollection ? 'Move' : 'Add';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
