import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRepo } from '../contexts/RepoContext';
import { AvatarDropdown } from '../components/AvatarDropdown';
import { loadImageAnnotations, saveImageAnnotations } from '../lib/repoData';

export const ImageDetailPage = ({ imageFile, repo, onBack }) => {
  const { currentUser } = useAuth();
  const { collections } = useRepo();
  const [annotations, setAnnotations] = useState({ markers: [] });
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const imageContainerRef = useRef(null);

  // Build image URL from GitHub
  const getImageUrl = () => {
    if (!repo || !imageFile) return null;
    const [owner, repoName] = repo.fullName.split('/');
    const branch = repo.defaultBranch || 'main';
    return `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${imageFile.path}`;
  };

  // Load annotations on mount
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!currentUser || !repo || !imageFile) return;
      try {
        const loaded = await loadImageAnnotations(currentUser.uid, repo.fullName, imageFile.path);
        setAnnotations(loaded);
      } catch (error) {
        console.error('Error loading annotations:', error);
      }
    };
    loadAnnotations();
  }, [currentUser, repo, imageFile]);

  // Save annotations when they change
  const saveAnnotations = useCallback(async (newAnnotations) => {
    if (!currentUser || !repo || !imageFile) return;
    try {
      await saveImageAnnotations(currentUser.uid, repo.fullName, imageFile.path, newAnnotations);
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations. Please try again.');
    }
  }, [currentUser, repo, imageFile]);

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e) => {
    if (!imageRef.current) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
    setZoom(newZoom);
  }, [zoom]);

  // Handle mouse down for panning or marker placement
  const handleMouseDown = useCallback((e) => {
    if (isPlacingMarker && selectedItem && selectedCollection) {
      // Place marker on mouse down
      if (!imageRef.current || !imageContainerRef.current) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      
      // Get the image element
      const img = imageRef.current;
      const imgRect = img.getBoundingClientRect();
      
      // Calculate mouse position relative to the image (accounting for zoom and pan)
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // Account for pan offset
      const imageX = mouseX - pan.x;
      const imageY = mouseY - pan.y;
      
      // Account for zoom to get position on actual image
      const actualX = imageX / zoom;
      const actualY = imageY / zoom;
      
      // Get the image's displayed dimensions (before zoom)
      const displayedWidth = img.width;
      const displayedHeight = img.height;
      
      if (displayedWidth === 0 || displayedHeight === 0) return;
      
      // Convert to percentage of image dimensions
      const x = (actualX / displayedWidth) * 100;
      const y = (actualY / displayedHeight) * 100;
      
      const newMarker = {
        id: Date.now().toString(),
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        collectionName: selectedCollection,
        itemName: typeof selectedItem === 'string' ? selectedItem : (selectedItem.word || String(selectedItem)),
      };

      const newAnnotations = {
        ...annotations,
        markers: [...annotations.markers, newMarker],
      };

      setAnnotations(newAnnotations);
      saveAnnotations(newAnnotations);
      setIsPlacingMarker(false);
      setSelectedItem(null);
    } else if (!isPlacingMarker) {
      // Start panning
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [isPlacingMarker, selectedItem, selectedCollection, pan, zoom, annotations, saveAnnotations]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e) => {
    if (isDragging && !isPlacingMarker) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, isPlacingMarker, dragStart]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsDraggingMarker(false);
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(5, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.1, prev - 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle marker click to remove
  const handleMarkerClick = (e, markerId) => {
    e.stopPropagation();
    if (confirm('Remove this marker?')) {
      const newAnnotations = {
        ...annotations,
        markers: annotations.markers.filter(m => m.id !== markerId),
      };
      setAnnotations(newAnnotations);
      saveAnnotations(newAnnotations);
    }
  };

  // Start placing marker
  const startPlacingMarker = () => {
    if (!selectedCollection || !selectedItem) {
      alert('Please select a collection and item first');
      return;
    }
    setIsPlacingMarker(true);
  };

  // Cancel placing marker
  const cancelPlacingMarker = () => {
    setIsPlacingMarker(false);
    setSelectedItem(null);
  };

  // Add event listeners for mouse move and up
  useEffect(() => {
    if (isDragging || isDraggingMarker) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isDraggingMarker, handleMouseMove, handleMouseUp]);

  const imageUrl = getImageUrl();
  const repoOwner = repo?.fullName ? repo.fullName.split('/')[0] : null;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-8 py-4">
        <div className="max-w-7xl mx-auto relative flex items-center">
          {/* Left - Breadcrumbs */}
          <div className="flex items-center gap-1">
            {repoOwner && (
              <>
                <button
                  onClick={onBack}
                  className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {repoOwner}
                </button>
                <span className="text-slate-500 text-sm">/</span>
              </>
            )}
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              {repo?.fullName.split('/')[1] || repo?.fullName}
            </button>
            <span className="text-slate-500 text-sm">/</span>
            <span className="text-white text-sm font-semibold">
              {imageFile?.path.split('/').pop()}
            </span>
          </div>
          
          {/* Center - StoryForge */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-xl font-bold text-white">StoryForge</h1>
          </div>
          
          {/* Right - Avatar */}
          <div className="ml-auto flex items-center gap-4">
            {currentUser && <AvatarDropdown />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="h-[calc(100vh-73px)] flex">
        <div className="flex w-full max-w-7xl mx-auto px-8 py-8 gap-6">
          {/* Left Sidebar - Collection Selector */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 h-full overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Add Markers</h2>
              
              {/* Collection Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">Collection</label>
                <select
                  value={selectedCollection || ''}
                  onChange={(e) => {
                    setSelectedCollection(e.target.value || null);
                    setSelectedItem(null);
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a collection...</option>
                  {Object.entries(collections).map(([collectionName, collection]) => (
                    <option key={collectionName} value={collectionName}>
                      {collection.config?.name || collectionName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Selector */}
              {selectedCollection && collections[selectedCollection] && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Item</label>
                  <select
                    value={selectedItem ? (typeof selectedItem === 'string' ? selectedItem : (selectedItem.word || String(selectedItem))) : ''}
                    onChange={(e) => {
                      const itemValue = e.target.value;
                      const collection = collections[selectedCollection];
                      const item = collection.items.find(i => {
                        const displayText = typeof i === 'string' ? i : (i.word || String(i));
                        return displayText === itemValue;
                      });
                      setSelectedItem(item || itemValue);
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select an item...</option>
                    {collections[selectedCollection].items.map((item, idx) => {
                      const displayText = typeof item === 'string' ? item : (item.word || String(item));
                      return (
                        <option key={idx} value={displayText}>
                          {displayText}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Place Marker Button */}
              {selectedCollection && selectedItem && (
                <div className="space-y-2">
                  {!isPlacingMarker ? (
                    <button
                      onClick={startPlacingMarker}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      title="Place marker on image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Place Marker</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400 text-center">
                        Click on image to place
                      </p>
                      <button
                        onClick={cancelPlacingMarker}
                        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Zoom Controls */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Zoom & Pan</h3>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={handleZoomOut}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
                    title="Reset Zoom"
                  >
                    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-400 text-center">
                  {Math.round(zoom * 100)}% • Use mouse wheel to zoom • Drag to pan
                </p>
              </div>

              {/* Existing Markers */}
              {annotations.markers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Markers ({annotations.markers.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {annotations.markers.map((marker) => {
                      const collection = collections[marker.collectionName];
                      const collectionName = collection?.config?.name || marker.collectionName;
                      return (
                        <div
                          key={marker.id}
                          className="bg-slate-700 rounded-lg p-2 text-sm"
                        >
                          <div className="font-medium text-white">{marker.itemName}</div>
                          <div className="text-xs text-slate-400">{collectionName}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Image Display */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="bg-slate-800 rounded-lg border border-slate-700 flex-1 flex flex-col overflow-hidden">
              {imageError ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-red-400 mb-4">Failed to load image</p>
                    <button
                      onClick={() => {
                        setImageError(false);
                        setImageLoaded(false);
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  ref={containerRef}
                  className="flex-1 relative overflow-hidden"
                >
                  {imageUrl && (
                    <div
                      ref={imageContainerRef}
                      className="absolute inset-0 overflow-auto"
                      onWheel={handleWheel}
                      onMouseDown={handleMouseDown}
                      style={{ cursor: isPlacingMarker ? 'crosshair' : (isDragging ? 'grabbing' : 'grab') }}
                    >
                      <div
                        className="relative inline-block"
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px)`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <div className="relative inline-block" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                          <img
                            ref={imageRef}
                            src={imageUrl}
                            alt={imageFile?.path.split('/').pop()}
                            className="block"
                            onLoad={() => {
                              setImageLoaded(true);
                              // Auto-fit and center image on load to fill container
                              setTimeout(() => {
                                if (imageRef.current && imageContainerRef.current) {
                                  const container = imageContainerRef.current;
                                  const img = imageRef.current;
                                  const containerWidth = container.clientWidth;
                                  const containerHeight = container.clientHeight;
                                  
                                  if (containerWidth === 0 || containerHeight === 0) return;
                                  
                                  const imgAspect = img.naturalWidth / img.naturalHeight;
                                  const containerAspect = containerWidth / containerHeight;
                                  
                                  // Calculate zoom to fill container (cover behavior)
                                  let initialZoom;
                                  if (imgAspect > containerAspect) {
                                    // Image is wider - fit to height
                                    initialZoom = containerHeight / img.naturalHeight;
                                  } else {
                                    // Image is taller - fit to width
                                    initialZoom = containerWidth / img.naturalWidth;
                                  }
                                  
                                  setZoom(initialZoom);
                                  
                                  // Center the image
                                  const scaledWidth = img.naturalWidth * initialZoom;
                                  const scaledHeight = img.naturalHeight * initialZoom;
                                  const centerX = (containerWidth - scaledWidth) / 2;
                                  const centerY = (containerHeight - scaledHeight) / 2;
                                  setPan({ x: centerX, y: centerY });
                                }
                              }, 0);
                            }}
                            onError={() => setImageError(true)}
                            style={{
                              display: imageLoaded ? 'block' : 'none',
                              maxWidth: 'none',
                              width: 'auto',
                              height: 'auto',
                            }}
                            draggable={false}
                          />
                          
                          {/* Render markers */}
                          {imageLoaded && imageRef.current && annotations.markers.map((marker) => {
                            const collection = collections[marker.collectionName];
                            const colorHex = collection?.config?.color?.hex || 
                                            collection?.config?.color?.bg?.replace('bg-', '#') || 
                                            '#8b5cf6';
                            
                            return (
                              <div
                                key={marker.id}
                                onClick={(e) => handleMarkerClick(e, marker.id)}
                                className="absolute cursor-pointer group z-10"
                                style={{
                                  left: `${marker.x}%`,
                                  top: `${marker.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              >
                                <div
                                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-125"
                                  style={{ backgroundColor: colorHex }}
                                />
                                <div className="absolute left-1/2 top-6 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs whitespace-nowrap pointer-events-none z-10" style={{ transform: `translate(-50%, 0) scale(${1 / zoom})` }}>
                                  {marker.itemName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {!imageLoaded && !imageError && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

