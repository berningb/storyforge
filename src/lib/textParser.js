/**
 * Text parsing utilities for extracting characters, locations, and relationships
 */

/**
 * Extract dialogue/quotes with speaker attribution
 * @param {string} text - Text content to analyze (can be markdown or HTML)
 * @param {string} fileName - Name of the file
 * @returns {Array<{speaker: string, dialogue: string, context: string, file: string}>} Array of dialogue entries
 */
export function extractDialogue(text, fileName = '') {
  // Remove HTML tags but preserve text content and newlines
  // First, replace HTML tags with spaces, but keep the text structure
  let cleanText = text.replace(/<[^>]*>/g, ' ');
  // Normalize whitespace but preserve sentence structure
  cleanText = cleanText.replace(/\s+/g, ' ');
  
  const dialogue = [];
  const dialogueMarkers = ['said', 'asked', 'replied', 'answered', 'whispered', 'shouted', 'exclaimed', 'murmured', 'called', 'told', 'thought', 'responded', 'continued', 'added', 'muttered'];
  
  // Pattern 1: "dialogue," Speaker said
  // Use a more robust pattern that handles apostrophes inside quotes
  // Match: opening quote, content (including apostrophes), closing quote, comma, speaker, marker
  dialogueMarkers.forEach(marker => {
    // This pattern matches: "text" or "text's" followed by comma and speaker
    // Use non-greedy matching and ensure we match complete quotes
    const pattern1 = new RegExp(`(["'""])((?:[^"'""]|'|'')+?)\\1\\s*,\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}\\b`, 'gi');
    let match;
    pattern1.lastIndex = 0;
    while ((match = pattern1.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[3].trim(),
        dialogue: match[2].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Pattern 2: Speaker said, "dialogue"
  dialogueMarkers.forEach(marker => {
    const pattern2 = new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}\\s*,\\s*(["'""])((?:[^"'""]|'|'')+?)\\2`, 'gi');
    let match;
    pattern2.lastIndex = 0;
    while ((match = pattern2.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[1].trim(),
        dialogue: match[3].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Pattern 3: "dialogue," said Speaker
  dialogueMarkers.forEach(marker => {
    const pattern3 = new RegExp(`(["'""])((?:[^"'""]|'|'')+?)\\1\\s*,\\s*${marker}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`, 'gi');
    let match;
    pattern3.lastIndex = 0;
    while ((match = pattern3.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[3].trim(),
        dialogue: match[2].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Pattern 4: Speaker said: "dialogue" (with colon)
  dialogueMarkers.forEach(marker => {
    const pattern4 = new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}\\s*:\\s*(["'""])((?:[^"'""]|'|'')+?)\\2`, 'gi');
    let match;
    pattern4.lastIndex = 0;
    while ((match = pattern4.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[1].trim(),
        dialogue: match[3].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Pattern 5: "dialogue." Speaker said (with period before speaker)
  dialogueMarkers.forEach(marker => {
    const pattern5 = new RegExp(`(["'""])((?:[^"'""]|'|'')+?)\\1\\.\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}\\b`, 'gi');
    let match;
    pattern5.lastIndex = 0;
    while ((match = pattern5.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[3].trim(),
        dialogue: match[2].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Pattern 6: Speaker said "dialogue" (no comma, no colon)
  dialogueMarkers.forEach(marker => {
    const pattern6 = new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}\\s+(["'""])((?:[^"'""]|'|'')+?)\\2`, 'gi');
    let match;
    pattern6.lastIndex = 0;
    while ((match = pattern6.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[1].trim(),
        dialogue: match[3].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Pattern 7: "dialogue" Speaker said (quote first, then speaker)
  dialogueMarkers.forEach(marker => {
    const pattern7 = new RegExp(`(["'""])((?:[^"'""]|'|'')+?)\\1\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}\\b`, 'gi');
    let match;
    pattern7.lastIndex = 0;
    while ((match = pattern7.exec(cleanText)) !== null) {
      dialogue.push({
        speaker: match[3].trim(),
        dialogue: match[2].trim(),
        context: match[0],
        file: fileName,
      });
    }
  });
  
  // Debug: Log a sample of the text to see what we're working with
  if (dialogue.length === 0 && cleanText.length > 0) {
    console.log(`No dialogue found in ${fileName}. Sample text:`, cleanText.substring(0, 200));
  }
  
  return dialogue;
}

/**
 * Extract character names from text
 * Focuses on extracting only character names, not other capitalized words
 * @param {string} text - Text content to analyze
 * @returns {Array<{name: string, count: number, context: string[]}>} Array of character names
 */
export function extractCharacters(text) {
  // Remove HTML tags if present
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  
  // Split into sentences
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const characterCandidates = new Map();
  const dialogueMarkers = ['said', 'thought', 'asked', 'replied', 'answered', 'whispered', 'shouted', 'exclaimed', 'murmured', 'called', 'told', 'asked'];
  
  // Common words to skip (not character names)
  const skipWords = new Set([
    'The', 'A', 'An', 'And', 'But', 'Or', 'Nor', 'For', 'So', 'Yet', 'As', 'If', 'When', 'Where', 'Why', 'How',
    'I', 'He', 'She', 'They', 'We', 'You', 'It', 'This', 'That', 'These', 'Those',
    'His', 'Her', 'Him', 'Them', 'Their', 'Theirs', 'Themselves',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 
    'August', 'September', 'October', 'November', 'December',
    'North', 'South', 'East', 'West', 'Northern', 'Southern', 'Eastern', 'Western',
    'Chapter', 'Part', 'Section', 'Page', 'Expression', 'Face', 'Voice', 'Hand', 'Hands', 'Eye', 'Eyes'
  ]);
  
  // Pronouns (case-insensitive check)
  const pronouns = new Set(['they', 'their', 'them', 'theirs', 'themselves', 'he', 'she', 'it', 'we', 'you', 'i', 'his', 'her', 'him']);
  
  // Extract from dialogue markers (most reliable indicator of character names)
  sentences.forEach(sentence => {
    dialogueMarkers.forEach(marker => {
      // Pattern: "said Alex" or "Alex said" or "Alex," said
      const patterns = [
        new RegExp(`\\b${marker}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`, 'gi'),
        new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${marker}`, 'gi'),
        new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s*,\\s*${marker}`, 'gi'),
      ];
      
      patterns.forEach(regex => {
        const matches = sentence.matchAll(regex);
        for (const match of matches) {
          const name = match[1].trim();
          // Only accept names that:
          // - Start with capital letter (proper noun)
          // - Are 2-30 chars
          // - Not in skip list
          // - Not a pronoun
          // - Don't contain lowercase words (filters out phrases like "their expression")
          const isProperNoun = /^[A-Z]/.test(name);
          const hasNoLowercaseWords = !/\b[a-z]+\b/.test(name);
          const isNotPronoun = !pronouns.has(name.toLowerCase());
          
          if (isProperNoun && name.length >= 2 && name.length <= 30 && 
              !skipWords.has(name) && isNotPronoun && hasNoLowercaseWords) {
            if (!characterCandidates.has(name)) {
              characterCandidates.set(name, { name, count: 0, context: [] });
            }
            characterCandidates.get(name).count++;
            // Only add context if sentence is meaningful (at least 15 chars) and not just the dialogue marker
            const trimmedSentence = sentence.trim();
            if (characterCandidates.get(name).context.length < 5 && 
                trimmedSentence.length >= 15 && 
                !trimmedSentence.match(/^["']?\s*[A-Z][a-z]+\s+(said|asked|replied|answered|whispered|shouted|exclaimed|murmured|called|told)\s*["']?$/i)) {
              // Get a better context window - look for the full sentence including dialogue
              // Try to find the quote before the dialogue marker
              const beforeMatch = sentence.match(/(["'`][^"'`]+["'`])\s*,\s*[A-Z][a-z]+\s+\w+/i);
              if (beforeMatch) {
                // Include the quote
                const fullContext = sentence.substring(Math.max(0, sentence.indexOf(beforeMatch[0]) - 50), sentence.length).trim();
                if (fullContext.length >= 20) {
                  characterCandidates.get(name).context.push(fullContext);
                }
              } else {
                // Just use the sentence if it's complete enough
                characterCandidates.get(name).context.push(trimmedSentence);
              }
            }
          }
        }
      });
    });
  });
  
  // Extract names from dialogue/quotes (e.g., "Hello," Alex said)
  const quotePattern = /["'`]([^"'`]+)["'`]\s*,\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  let match;
  while ((match = quotePattern.exec(cleanText)) !== null) {
    const name = match[2].trim();
    const isProperNoun = /^[A-Z]/.test(name);
    const hasNoLowercaseWords = !/\b[a-z]+\b/.test(name);
    const isNotPronoun = !pronouns.has(name.toLowerCase());
    
    if (isProperNoun && name.length >= 2 && name.length <= 30 && 
        !skipWords.has(name) && isNotPronoun && hasNoLowercaseWords) {
      if (!characterCandidates.has(name)) {
        characterCandidates.set(name, { name, count: 0, context: [] });
      }
      characterCandidates.get(name).count++;
      // Add context from the quote
      if (characterCandidates.get(name).context.length < 5) {
        const quoteContext = match[0].trim();
        if (quoteContext.length >= 20) {
          characterCandidates.get(name).context.push(quoteContext);
        }
      }
    }
  }
  
  // Also extract names that appear as subjects (e.g., "Alex walked", "Morgan approached")
  const actionVerbs = ['walked', 'ran', 'stood', 'sat', 'looked', 'watched', 'approached', 'entered', 'left', 'moved', 'turned', 'smiled', 'frowned', 'nodded', 'shook', 'reached', 'touched', 'grabbed', 'picked', 'put', 'placed', 'took', 'gave', 'handed', 'threw', 'caught', 'opened', 'closed', 'pushed', 'pulled'];
  sentences.forEach(sentence => {
    actionVerbs.forEach(verb => {
      // Pattern: "Alex walked" or "Alex, walked" (with comma)
      const patterns = [
        new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s+${verb}\\b`, 'gi'),
        new RegExp(`\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s*,\\s*${verb}\\b`, 'gi'),
      ];
      
      patterns.forEach(regex => {
        const matches = sentence.matchAll(regex);
        for (const match of matches) {
          const name = match[1].trim();
          const isProperNoun = /^[A-Z]/.test(name);
          const hasNoLowercaseWords = !/\b[a-z]+\b/.test(name);
          const isNotPronoun = !pronouns.has(name.toLowerCase());
          
          if (isProperNoun && name.length >= 2 && name.length <= 30 && 
              !skipWords.has(name) && isNotPronoun && hasNoLowercaseWords) {
            if (!characterCandidates.has(name)) {
              characterCandidates.set(name, { name, count: 0, context: [] });
            }
            characterCandidates.get(name).count++;
            // Add context
            if (characterCandidates.get(name).context.length < 5) {
              const trimmedSentence = sentence.trim();
              if (trimmedSentence.length >= 15) {
                characterCandidates.get(name).context.push(trimmedSentence);
              }
            }
          }
        }
      });
    });
  });
  
  // Extract capitalized words that appear frequently AND in name-like contexts
  // Only consider words that appear after common name indicators
  const nameContextMarkers = ['met', 'saw', 'knew', 'told', 'asked', 'called', 'named', 'introduced'];
  const nameContextWords = new Map();
  
  sentences.forEach(sentence => {
    nameContextMarkers.forEach(marker => {
      const regex = new RegExp(`\\b${marker}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)`, 'gi');
      const matches = sentence.matchAll(regex);
      for (const match of matches) {
        const name = match[1].trim();
        const isProperNoun = /^[A-Z]/.test(name);
        const hasNoLowercaseWords = !/\b[a-z]+\b/.test(name);
        const isNotPronoun = !pronouns.has(name.toLowerCase());
        
        if (isProperNoun && name.length >= 2 && name.length <= 30 && 
            !skipWords.has(name) && isNotPronoun && hasNoLowercaseWords) {
          nameContextWords.set(name, (nameContextWords.get(name) || 0) + 1);
        }
      }
    });
  });
  
  // Add names from context if they appear multiple times
  nameContextWords.forEach((count, name) => {
    if (count >= 2 && !characterCandidates.has(name)) {
      characterCandidates.set(name, { name, count, context: [] });
    }
  });
  
  // Filter out common false positives (locations, common nouns, pronouns)
  const locationWords = new Set([
    'Forest', 'Tower', 'Keep', 'City', 'Village', 'Town', 'Kingdom', 'Realm', 'Palace', 'Castle', 
    'Temple', 'Shrine', 'River', 'Lake', 'Sea', 'Ocean', 'Mountain', 'Hill', 'Valley', 'Desert',
    'Plains', 'Field', 'Market', 'Square', 'Garden', 'Park', 'Library', 'Academy', 'School',
    'House', 'Home', 'Inn', 'Tavern', 'Shop', 'Store', 'Workshop', 'Forge', 'Dungeon', 'Cave',
    'Ruins', 'Tomb', 'Grave', 'Gate', 'Bridge', 'Road', 'Path', 'Street', 'Hall', 'Room', 'Chamber'
  ]);
  
  // Location keywords that might appear in compound names
  const locationKeywords = new Set([
    'Tower', 'Forest', 'Keep', 'Palace', 'Castle', 'Temple', 'Shrine', 'River', 'Lake', 'Mountain',
    'Valley', 'Desert', 'Plains', 'Field', 'Market', 'Square', 'Garden', 'Park', 'Library',
    'Academy', 'School', 'House', 'Inn', 'Tavern', 'Shop', 'Workshop', 'Forge', 'Dungeon',
    'Cave', 'Ruins', 'Tomb', 'Gate', 'Bridge', 'Road', 'Path', 'Street', 'Hall', 'Room', 'Chamber'
  ]);
  
  const filtered = Array.from(characterCandidates.values())
    .filter(char => {
      const name = char.name;
      // Must start with capital letter
      if (!/^[A-Z]/.test(name)) return false;
      // Must not be a pronoun
      if (pronouns.has(name.toLowerCase())) return false;
      // Must not contain lowercase words (filters phrases)
      if (/\b[a-z]+\b/.test(name)) return false;
      // Must not be a single-word location
      if (locationWords.has(name)) return false;
      // Must not be in skip list
      if (skipWords.has(name)) return false;
      // Must be at least 2 characters
      if (name.length < 2) return false;
      
      // Check if name contains location keywords (e.g., "Crystal Tower", "Shadowmere Forest")
      const words = name.split(/\s+/);
      const hasLocationKeyword = words.some(word => locationKeywords.has(word));
      if (hasLocationKeyword) {
        // If it contains a location keyword, it's likely a location, not a character
        return false;
      }
      
      // Filter out names that are clearly locations (e.g., "The Awakening" might be a chapter title, but "Awakening Alex" suggests a character)
      // However, if it's a compound name with a location word, filter it out
      if (words.length > 1) {
        // Check if any word is a location keyword
        const locationWordCount = words.filter(w => locationKeywords.has(w)).length;
        // If more than half the words are location keywords, it's likely a location
        if (locationWordCount > 0 && locationWordCount >= words.length / 2) {
          return false;
        }
      }
      
      return true;
    });
    // Removed the filter that required at least 2 appearances - show all characters
  
  return filtered.sort((a, b) => b.count - a.count);
}

/**
 * Extract location names from text
 * @param {string} text - Text content to analyze
 * @returns {Array<{name: string, count: number}>} Array of location candidates
 */
export function extractLocations(text) {
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  
  // Common words to skip (not locations)
  const skipWords = new Set([
    'The', 'A', 'An', 'And', 'But', 'Or', 'Nor', 'For', 'So', 'Yet', 'As', 'If', 'When', 'Where', 'Why', 'How',
    'I', 'He', 'She', 'They', 'We', 'You', 'It', 'This', 'That', 'These', 'Those',
    'His', 'Her', 'Him', 'Them', 'Their', 'Theirs', 'Themselves',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 
    'August', 'September', 'October', 'November', 'December',
    'Chapter', 'Part', 'Section', 'Page', 'Story', 'Edge', 'All', 'Northern', 'Southern', 'Eastern', 'Western'
  ]);
  
  // Common location words that help identify locations
  const locationKeywords = new Set([
    'Forest', 'Tower', 'Keep', 'City', 'Village', 'Town', 'Kingdom', 'Realm', 'Palace', 'Castle', 
    'Temple', 'Shrine', 'Hall', 'Room', 'Chamber', 'Gate', 'Bridge', 'Road', 'Path', 'Street',
    'Mountain', 'Hill', 'Valley', 'River', 'Lake', 'Sea', 'Ocean', 'Desert', 'Plains', 'Field',
    'Market', 'Square', 'Garden', 'Park', 'Library', 'Academy', 'School', 'House', 'Home', 'Inn',
    'Tavern', 'Shop', 'Store', 'Workshop', 'Forge', 'Dungeon', 'Cave', 'Ruins', 'Tomb', 'Grave'
  ]);
  
  // Look for capitalized words after location markers
  const locationMarkers = ['in', 'at', 'to', 'from', 'near', 'inside', 'outside', 'within', 'through', 'across', 'beyond'];
  const locations = new Map();
  
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach(sentence => {
    locationMarkers.forEach(marker => {
      // Pattern 1: "in the Shadowmere Forest" or "at the Palace"
      const patternWithThe = new RegExp(`\\b${marker}\\s+the\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'gi');
      let match;
      while ((match = patternWithThe.exec(sentence)) !== null) {
        const location = match[1].trim();
        // Must be at least 3 chars, not a skip word, and ideally contains location keywords
        if (location.length >= 3 && location.length < 50 && !skipWords.has(location)) {
          // Check if it contains location keywords or is multi-word (more likely to be a location)
          const words = location.split(/\s+/);
          const hasLocationKeyword = words.some(w => locationKeywords.has(w));
          const isMultiWord = words.length > 1;
          
          // Prefer locations with keywords or multi-word names
          if (hasLocationKeyword || isMultiWord || location.length >= 6) {
            locations.set(location, (locations.get(location) || 0) + 1);
          }
        }
      }
      
      // Pattern 2: "in Shadowmere Forest" (without "the")
      const patternWithoutThe = new RegExp(`\\b${marker}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+)`, 'gi');
      while ((match = patternWithoutThe.exec(sentence)) !== null) {
        const location = match[1].trim();
        // Multi-word locations are more reliable
        if (location.length >= 3 && location.length < 50 && !skipWords.has(location)) {
          const words = location.split(/\s+/);
          // Must be multi-word or contain location keywords
          if (words.length > 1 || locationKeywords.has(location)) {
            locations.set(location, (locations.get(location) || 0) + 1);
          }
        }
      }
      
      // Pattern 3: Single word locations (be more strict)
      const patternSingle = new RegExp(`\\b${marker}\\s+([A-Z][a-z]{3,})`, 'gi');
      while ((match = patternSingle.exec(sentence)) !== null) {
        const location = match[1].trim();
        // Only accept if it's a known location keyword or appears multiple times
        if (locationKeywords.has(location) && !skipWords.has(location)) {
          locations.set(location, (locations.get(location) || 0) + 1);
        }
      }
    });
  });
  
  // Filter results - be more strict about what constitutes a real location
  const filtered = Array.from(locations.entries())
    .map(([name, count]) => ({ name, count }))
    .filter(loc => {
      // Must appear at least 2 times to be considered
      if (loc.count < 2) return false;
      
      // Filter out common false positives
      const words = loc.name.split(/\s+/);
      if (words.some(w => skipWords.has(w))) return false;
      
      // Filter out very short single words (unless they're location keywords)
      if (words.length === 1 && loc.name.length < 5 && !locationKeywords.has(loc.name)) {
        return false;
      }
      
      // Filter out phrases that start with articles (we should have caught these with "the")
      if (/^(the|a|an)\s+/i.test(loc.name)) {
        return false;
      }
      
      // For multi-word locations, require that they contain a location keyword
      // This filters out things like "Shadowmere Forest" if "Forest" isn't being recognized properly
      // Actually, "Shadowmere Forest" should be fine if it has "Forest" - but maybe the user doesn't want it
      // Let's be more strict: require location keywords for multi-word names
      if (words.length > 1) {
        const hasLocationKeyword = words.some(w => locationKeywords.has(w));
        // If it's multi-word but doesn't have a location keyword, it might not be a location
        // But some proper names like "New York" don't have keywords, so we'll allow it if it appears enough
        // Actually, let's require location keywords for multi-word locations to avoid false positives
        if (!hasLocationKeyword && loc.count < 3) {
          return false;
        }
      }
      
      // Filter out names that look like character names (proper nouns without location context)
      // If it's a single proper noun without a location keyword and appears infrequently, skip it
      if (words.length === 1 && !locationKeywords.has(loc.name) && loc.count < 3) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => b.count - a.count);
  
  return filtered;
}

/**
 * Get characters mentioned in a location
 * @param {string} locationName - Name of the location
 * @param {Array<{name: string, content: string}>} files - Array of file objects
 * @param {Array<string>} characterNames - List of character names
 * @returns {Array<{character: string, context: string, file: string}>} Characters mentioned in location context
 */
export function getCharactersInLocation(locationName, files, characterNames) {
  const results = [];
  const locationRegex = new RegExp(`\\b${locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
  
  files.forEach(file => {
    const cleanText = file.content.replace(/<[^>]*>/g, ' ');
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach(sentence => {
      if (locationRegex.test(sentence)) {
        // Check which characters are mentioned in this sentence
        characterNames.forEach(charName => {
          const charRegex = new RegExp(`\\b${charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (charRegex.test(sentence)) {
            results.push({
              character: charName,
              context: sentence.trim(),
              file: file.name,
            });
          }
        });
      }
    });
  });
  
  return results;
}

/**
 * Analyze character co-occurrences to suggest relationships
 * @param {string} text - Text content to analyze
 * @param {Array<string>} characterNames - List of character names to analyze
 * @returns {Array<{char1: string, char2: string, strength: number, context: string[]}>} Relationship suggestions
 */
export function analyzeRelationships(text, characterNames) {
  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const relationships = new Map();
  
  sentences.forEach(sentence => {
    const foundChars = characterNames.filter(char => {
      // Case-insensitive match for character names
      const regex = new RegExp(`\\b${char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(sentence);
    });
    
    // If multiple characters appear in the same sentence, they might have a relationship
    if (foundChars.length >= 2) {
      for (let i = 0; i < foundChars.length; i++) {
        for (let j = i + 1; j < foundChars.length; j++) {
          const char1 = foundChars[i];
          const char2 = foundChars[j];
          const key = [char1, char2].sort().join('|');
          
          if (!relationships.has(key)) {
            relationships.set(key, {
              char1: char1,
              char2: char2,
              strength: 0,
              context: [],
            });
          }
          
          const rel = relationships.get(key);
          rel.strength++;
          if (rel.context.length < 5) {
            rel.context.push(sentence.trim());
          }
        }
      }
    }
  });
  
  return Array.from(relationships.values())
    .filter(rel => rel.strength >= 2) // At least 2 co-occurrences
    .sort((a, b) => b.strength - a.strength);
}

/**
 * Extract all entities (characters, locations) from multiple files
 * @param {Array<{name: string, content: string}>} files - Array of file objects
 * @returns {{characters: Array, locations: Array, relationships: Array, dialogue: Array}} Extracted entities
 */
export function parseFiles(files) {
  const allCharacters = new Map();
  const allLocations = new Map();
  const allDialogue = [];
  const allText = files.map(f => f.content).join('\n\n');
  
  // Extract characters, locations, and dialogue from all files
  files.forEach(file => {
    const characters = extractCharacters(file.content);
    const locations = extractLocations(file.content);
    const dialogue = extractDialogue(file.content, file.name);
    
    // Merge characters
    characters.forEach(char => {
      if (allCharacters.has(char.name)) {
        const existing = allCharacters.get(char.name);
        existing.count += char.count;
        existing.context.push(...char.context);
      } else {
        allCharacters.set(char.name, { ...char });
      }
    });
    
    // Merge locations
    locations.forEach(loc => {
      allLocations.set(loc.name, (allLocations.get(loc.name) || 0) + loc.count);
    });
    
    // Collect dialogue
    allDialogue.push(...dialogue);
  });
  
  // Convert locations map to array
  const locationsArray = Array.from(allLocations.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  // Build character name list for relationship analysis
  const characterNames = Array.from(allCharacters.keys());
  
  // Analyze relationships
  const relationships = analyzeRelationships(allText, characterNames);
  
  return {
    characters: Array.from(allCharacters.values()),
    locations: locationsArray,
    relationships,
    dialogue: allDialogue,
  };
}
