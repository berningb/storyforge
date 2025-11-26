import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RichTextEditor } from '@react-quill/lib';
import { htmlToMarkdown } from '@react-quill/lib';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { getFileSha } from '../lib/github';
import { MOCK_TEXT, PASTEL_COLORS, highlightWordsMultiColor } from '../utils/editorUtils';
import { useEditorState } from '../hooks/useEditorState';
import { useSaveHandlers } from '../hooks/useSaveHandlers';
import { useEntitySearch } from '../hooks/useEntitySearch';
import { useHighlighting } from '../hooks/useHighlighting';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { SynonymFinder } from '../components/Editor/SynonymFinder';
import { EntityLegend } from '../components/Editor/EntityLegend';
import { StatsPanel } from '../components/Editor/StatsPanel';
import { SaveModal } from '../components/Editor/SaveModal';
import { AddEntityModal } from '../components/Editor/AddEntityModal';
import { TokenInputModal } from '../components/Editor/TokenInputModal';
import { PageHeader } from '../components/Shared/PageHeader';
import { EditorToolbar } from '../components/Editor/EditorToolbar';
import { CollectionTabs } from '../components/Editor/CollectionTabs';
import { ItemOverview } from '../components/Editor/ItemOverview';
import { CollectionManagerModal } from '../components/Shared/CollectionManagerModal';
import { WordCollectionModal } from '../components/Editor/WordCollectionModal';

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
  const [hoveredText, setHoveredText] = useState(null); // Track hovered dialogue/mention text

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

  const { highlightWords, highlightWordColors } = useHighlighting({
    collections,
    highlightedCollections,
    hoveredText,
  });

  // Function to scroll to highlighted text in the editor
  const scrollToText = useCallback((textToFind) => {
    if (!textToFind) return;
    
    // Wait a bit for the highlight to render, then find and scroll to it
    setTimeout(() => {
      const searchText = textToFind.trim();
      if (!searchText) return;
      
      // Find the editor container (could be Quill editor or preview div)
      const editorContainer = document.querySelector('.ql-editor, [contenteditable="true"], .ql-container, [class*="preview"]');
      if (!editorContainer) return;
      
      // Try to find highlighted spans containing the text
      // The highlightWordsMultiColor function wraps text in spans with background colors
      const allSpans = editorContainer.querySelectorAll('span[style*="background"], span.bg-\\[\\#fbbf24\\]');
      
      for (const span of allSpans) {
        const spanText = span.textContent || span.innerText || '';
        // Check if this span contains our search text (case-insensitive)
        if (spanText.toLowerCase().includes(searchText.toLowerCase())) {
          // Scroll to this element
          span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          return;
        }
      }
      
      // Fallback: search in plain text and try to create a range
      const walker = document.createTreeWalker(
        editorContainer,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let node;
      while (node = walker.nextNode()) {
        const nodeText = node.textContent || '';
        const index = nodeText.toLowerCase().indexOf(searchText.toLowerCase());
        if (index !== -1) {
          try {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + searchText.length);
            range.getBoundingClientRect();
            node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          } catch (e) {
            // Continue searching if range creation fails
          }
        }
      }
    }, 100); // Small delay to allow highlight rendering
  }, []);

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


  const breadcrumbs = useBreadcrumbs({ blogInfo, onBack });

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      <PageHeader breadcrumbs={breadcrumbs} currentUser={currentUser} />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden min-h-0 p-4 gap-4">
        {/* Left Side - Editor */}
        <div className="w-1/2 flex flex-col overflow-hidden border border-slate-700 rounded-lg bg-slate-800 min-h-0 shadow-lg">
          {blogInfo && !isPreviewMode && (
            <EditorToolbar
              hasChanges={hasChanges}
              onUndo={handleUndo}
              onSaveLocal={handleSaveLocal}
            />
          )}

          {blogInfo && isPreviewMode && (
            <CollectionTabs
              collections={collections}
              highlightedCollections={highlightedCollections}
              onToggleCollection={(collectionName) => {
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
              onNewCollection={() => setShowCollectionManager(true)}
            />
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
            <ItemOverview
              selectedItem={selectedItem}
              onBack={() => setSelectedItem(null)}
              onHoverText={(text) => {
                setHoveredText(text);
                setTimeout(() => scrollToText(text), 100);
              }}
              onLeaveHover={() => setHoveredText(null)}
            />
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

      <CollectionManagerModal
        show={showCollectionManager}
        onClose={() => {
          setShowCollectionManager(false);
          setNewCollectionName('');
        }}
        collections={collections}
        newCollectionName={newCollectionName}
        setNewCollectionName={setNewCollectionName}
        onCreateCollection={handleCreateCollection}
        onDeleteCollection={handleDeleteCollection}
      />

      <TokenInputModal
        showTokenInput={showTokenInput}
        setShowTokenInput={setShowTokenInput}
        tokenInput={tokenInput}
        setTokenInput={setTokenInput}
        setGitHubToken={setGitHubToken}
      />

      {/* Word Collection Modal - for moving words between collections */}
      <WordCollectionModal
        show={showWordCollectionModal}
        onClose={() => {
          setShowWordCollectionModal(false);
          setClickedWord('');
        }}
        clickedWord={clickedWord}
        wordTargetCollection={wordTargetCollection}
        setWordTargetCollection={setWordTargetCollection}
        collections={collections}
        onAddToCollection={addToCollection}
        onRemoveFromCollection={removeFromCollection}
      />
    </div>
  );
};
