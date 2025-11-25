import React, { useState, useEffect, useMemo } from 'react';

export const SynonymFinder = ({ synonymSearchWord }) => {
  const [searchWord, setSearchWord] = useState(synonymSearchWord);
  const [synonyms, setSynonyms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchType, setSearchType] = useState('synonym');
  const [minScore] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState('relevance');
  const [sortDirection, setSortDirection] = useState('desc');
  
  const searchTypes = [
    { value: 'synonym', label: 'Synonyms', icon: '🔄' },
    { value: 'antonym', label: 'Antonyms', icon: '↔️' },
    { value: 'rhyme', label: 'Rhymes', icon: '🎵' },
    { value: 'sounds', label: 'Sounds Like', icon: '🔊' },
    { value: 'spelled', label: 'Spelled Like', icon: '✍️' },
    { value: 'related', label: 'Related', icon: '🔗' },
    { value: 'nuances', label: 'Nuances', icon: '✨' },
  ];
  
  useEffect(() => {
    if (synonymSearchWord) {
      setSearchWord(synonymSearchWord);
      setHasSearched(false);
      setSynonyms([]);
      setError(null);
      setCurrentPage(1);
    }
  }, [synonymSearchWord]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchType]);
  
  const sortedSynonyms = useMemo(() => {
    const sorted = [...synonyms].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'word':
          comparison = a.word.localeCompare(b.word);
          break;
        case 'type':
          comparison = a.source.localeCompare(b.source);
          break;
        case 'relevance':
          comparison = a.rawScore - b.rawScore;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [synonyms, sortColumn, sortDirection]);
  
  const totalPages = Math.ceil(sortedSynonyms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSynonyms = sortedSynonyms.slice(startIndex, endIndex);
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'relevance' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };
  
  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-3 h-3 ml-1 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  useEffect(() => {
    if (hasSearched && searchWord.trim()) {
      const performSearch = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const wordLower = searchWord.trim().toLowerCase();
          let apiUrl = '';
          let sourceLabel = '';
          
          switch (searchType) {
            case 'synonym':
              apiUrl = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'synonym';
              break;
            case 'antonym':
              apiUrl = `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'antonym';
              break;
            case 'rhyme':
              apiUrl = `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'rhyme';
              break;
            case 'sounds':
              apiUrl = `https://api.datamuse.com/words?sl=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'sounds';
              break;
            case 'spelled':
              apiUrl = `https://api.datamuse.com/words?sp=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'spelled';
              break;
            case 'related':
              apiUrl = `https://api.datamuse.com/words?ml=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'related';
              break;
            case 'nuances':
              sourceLabel = 'nuance';
              break;
            default:
              apiUrl = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(wordLower)}&max=30`;
              sourceLabel = 'synonym';
          }
          
          let allWords = [];
          
          if (searchType === 'nuances') {
            const nuanceQueries = [
              `https://api.datamuse.com/words?rel_jjb=${encodeURIComponent(wordLower)}&max=15`,
              `https://api.datamuse.com/words?rel_jja=${encodeURIComponent(wordLower)}&max=15`,
              `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(wordLower)}&max=15`,
              `https://api.datamuse.com/words?rel_spc=${encodeURIComponent(wordLower)}&max=15`,
              `https://api.datamuse.com/words?rel_gen=${encodeURIComponent(wordLower)}&max=15`,
              `https://api.datamuse.com/words?rel_com=${encodeURIComponent(wordLower)}&max=15`,
            ];
            
            const responses = await Promise.all(nuanceQueries.map(url => fetch(url)));
            const allResults = await Promise.all(responses.map(r => r.json()));
            
            const wordsMap = new Map();
            const nuanceLabels = ['adjective', 'noun', 'triggered', 'specific', 'general', 'common'];
            
            allResults.forEach((resultSet, index) => {
              resultSet.forEach(item => {
                if (item.word && item.word.toLowerCase() !== wordLower) {
                  const itemWordLower = item.word.toLowerCase();
                  if (!wordsMap.has(itemWordLower)) {
                    wordsMap.set(itemWordLower, {
                      word: item.word,
                      rawScore: item.score || 0,
                      source: nuanceLabels[index] || 'nuance'
                    });
                  } else {
                    const existing = wordsMap.get(itemWordLower);
                    if (item.score > existing.rawScore) {
                      wordsMap.set(itemWordLower, { ...existing, rawScore: item.score });
                    }
                  }
                }
              });
            });
            
            allWords = Array.from(wordsMap.values());
          } else {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch results');
            
            const data = await response.json();
            allWords = data.map(item => ({
              word: item.word,
              rawScore: item.score || 0,
              source: sourceLabel
            }));
          }
          
          const processedWords = allWords
            .filter(item => item.word && item.word.toLowerCase() !== wordLower)
            .filter(item => item.rawScore >= minScore)
            .sort((a, b) => b.rawScore - a.rawScore)
            .map(item => ({
              ...item,
              normalizedScore: Math.min(100, Math.round((item.rawScore / 100000) * 100))
            }));
          
          setSynonyms(processedWords);
          if (processedWords.length === 0) {
            const typeLabels = {
              synonym: 'synonyms',
              antonym: 'antonyms',
              rhyme: 'rhymes',
              sounds: 'words that sound similar',
              spelled: 'words spelled similarly',
              related: 'related words',
              nuances: 'nuanced relationships'
            };
            setError(`No ${typeLabels[searchType] || 'results'} found.`);
          }
        } catch (err) {
          setError(err.message);
          setSynonyms([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      performSearch();
    }
  }, [searchType, hasSearched, searchWord, minScore]);
  
  const fetchSynonyms = async (word) => {
    if (!word.trim()) {
      setSynonyms([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const wordLower = word.trim().toLowerCase();
      let results = [];
      
      if (searchType === 'nuances') {
        const nuanceQueries = [
          `/api/datamuse/words?rel_jjb=${encodeURIComponent(wordLower)}&max=15`,
          `/api/datamuse/words?rel_jja=${encodeURIComponent(wordLower)}&max=15`,
          `/api/datamuse/words?rel_trg=${encodeURIComponent(wordLower)}&max=15`,
          `/api/datamuse/words?rel_spc=${encodeURIComponent(wordLower)}&max=15`,
          `/api/datamuse/words?rel_gen=${encodeURIComponent(wordLower)}&max=15`,
          `/api/datamuse/words?rel_com=${encodeURIComponent(wordLower)}&max=15`,
        ];
        
        const responses = await Promise.all(nuanceQueries.map(url => fetch(url)));
        const allResults = await Promise.all(responses.map(r => r.json()));
        
        const allWords = new Map();
        const nuanceLabels = ['adjective', 'noun', 'triggered', 'specific', 'general', 'common'];
        
        allResults.forEach((resultSet, index) => {
          resultSet.forEach(item => {
            if (item.word && item.word.toLowerCase() !== wordLower) {
              const itemWordLower = item.word.toLowerCase();
              if (!allWords.has(itemWordLower)) {
                allWords.set(itemWordLower, {
                  word: item.word,
                  rawScore: item.score || 0,
                  source: nuanceLabels[index] || 'nuance'
                });
              } else {
                const existing = allWords.get(itemWordLower);
                if (item.score > existing.rawScore) {
                  allWords.set(itemWordLower, {
                    ...existing,
                    rawScore: item.score
                  });
                }
              }
            }
          });
        });
        
        results = Array.from(allWords.values());
      } else {
        let apiUrl = '';
        switch (searchType) {
          case 'synonym':
            apiUrl = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(wordLower)}&max=30`;
            break;
          case 'antonym':
            apiUrl = `https://api.datamuse.com/words?rel_ant=${encodeURIComponent(wordLower)}&max=30`;
            break;
          case 'rhyme':
            apiUrl = `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(wordLower)}&max=30`;
            break;
          case 'sounds':
            apiUrl = `https://api.datamuse.com/words?sl=${encodeURIComponent(wordLower)}&max=30`;
            break;
          case 'spelled':
            apiUrl = `https://api.datamuse.com/words?sp=${encodeURIComponent(wordLower)}&max=30`;
            break;
          case 'related':
            apiUrl = `https://api.datamuse.com/words?ml=${encodeURIComponent(wordLower)}&max=30`;
            break;
          default:
            apiUrl = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(wordLower)}&max=30`;
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }
        
        const data = await response.json();
        const sourceLabels = {
          synonym: 'synonym',
          antonym: 'antonym',
          rhyme: 'rhyme',
          sounds: 'sounds',
          spelled: 'spelled',
          related: 'related'
        };
        
        results = data.map(item => ({
          word: item.word,
          rawScore: item.score || 0,
          source: sourceLabels[searchType] || 'related'
        }));
      }
      
      const sortedSynonyms = results
        .filter(item => item.word && item.word.toLowerCase() !== wordLower)
        .filter(item => item.rawScore >= minScore)
        .sort((a, b) => b.rawScore - a.rawScore)
        .map(item => ({
          ...item,
          normalizedScore: Math.min(100, Math.round((item.rawScore / 100000) * 100))
        }));
      
      setSynonyms(sortedSynonyms);
      
      if (sortedSynonyms.length === 0) {
        const typeLabels = {
          synonym: 'synonyms',
          antonym: 'antonyms',
          rhyme: 'rhymes',
          sounds: 'words that sound similar',
          spelled: 'words spelled similarly',
          related: 'related words',
          nuances: 'nuanced relationships'
        };
        setError(`No ${typeLabels[searchType] || 'results'} found.`);
      }
    } catch (err) {
      setError(err.message);
      setSynonyms([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    fetchSynonyms(searchWord);
  };
  
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {searchTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setSearchType(type.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              searchType === type.value
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="mr-1.5">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>
      
      <form onSubmit={handleSearch} className="mb-4 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder={`Enter a word to find ${searchTypes.find(t => t.value === searchType)?.label.toLowerCase()}...`}
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isLoading || !searchWord.trim()}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm shrink-0">
          Error: {error}
        </div>
      )}
      
      {synonyms.length > 0 && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-700 z-10">
                <tr className="border-b border-slate-600">
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide cursor-pointer hover:bg-slate-600 transition-colors select-none"
                    onClick={() => handleSort('word')}
                  >
                    <div className="flex items-center">
                      Word
                      {getSortIcon('word')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide cursor-pointer hover:bg-slate-600 transition-colors select-none"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {getSortIcon('type')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide cursor-pointer hover:bg-slate-600 transition-colors select-none"
                    onClick={() => handleSort('relevance')}
                  >
                    <div className="flex items-center">
                      Relevance
                      {getSortIcon('relevance')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedSynonyms.map((synonym, index) => (
                <tr 
                  key={index} 
                  className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    navigator.clipboard.writeText(synonym.word);
                  }}
                  title="Click to copy"
                >
                  <td className="px-4 py-3 text-slate-200 font-medium group-hover:text-purple-300 transition-colors">
                    {synonym.word}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded capitalize ${
                      synonym.source === 'synonym' 
                        ? 'bg-green-900/50 text-green-300 border border-green-700' 
                        : synonym.source === 'antonym'
                        ? 'bg-red-900/50 text-red-300 border border-red-700'
                        : synonym.source === 'rhyme'
                        ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                        : synonym.source === 'nuance' || synonym.source === 'adjective' || synonym.source === 'noun' || 
                          synonym.source === 'triggered' || synonym.source === 'specific' || 
                          synonym.source === 'general' || synonym.source === 'common'
                        ? 'bg-purple-900/50 text-purple-300 border border-purple-700'
                        : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                    }`}>
                      {synonym.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2 min-w-[60px]">
                        <div 
                          className={`h-2 rounded-full ${
                            synonym.rawScore > 80000 ? 'bg-green-500' : 
                            synonym.rawScore > 50000 ? 'bg-yellow-500' : 
                            'bg-purple-500'
                          }`}
                          style={{ width: `${synonym.normalizedScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs w-20 text-right" title="Raw API score">{synonym.rawScore.toLocaleString()}</span>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700 shrink-0">
              <div className="text-sm text-slate-400">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedSynonyms.length)} of {sortedSynonyms.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {hasSearched && searchWord && !isLoading && synonyms.length === 0 && !error && (
        <div className="text-center py-8 text-slate-400">
          No synonyms found for "{searchWord}"
        </div>
      )}
    </div>
  );
};

