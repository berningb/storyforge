import { useCallback } from 'react';
import { extractDialogue } from '../lib/textParser';

export const useEntitySearch = (files, characters) => {
  // Search for character dialogue
  const searchCharacterDialogue = useCallback((characterName) => {
    const allDialogue = [];
    const characterNameLower = characterName.toLowerCase().trim();
    const characterNameEscaped = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    files.forEach(file => {
      // Skip image files or files without content
      if (!file.content || file.isImage) return;
      
      const dialogue = extractDialogue(file.content, file.path);
      
      const characterDialogue = dialogue.filter(d => {
        const speakerLower = d.speaker.toLowerCase().trim();
        if (speakerLower === characterNameLower) return true;
        const speakerRegex = new RegExp(`\\b${characterNameEscaped}\\b`, 'i');
        if (speakerRegex.test(d.speaker)) return true;
        if (speakerLower.startsWith(characterNameLower + ' ') || characterNameLower.startsWith(speakerLower + ' ')) return true;
        return false;
      });
      
      allDialogue.push(...characterDialogue);
    });
    
    return allDialogue;
  }, [files]);

  // Search for character mentions (non-dialogue mentions in text)
  const searchCharacterMentions = useCallback((characterName) => {
    const escapedCharacter = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const characterRegex = new RegExp(`\\b${escapedCharacter}\\b`, 'gi');
    const allMentions = [];
    
    files.forEach(file => {
      // Skip image files or files without content
      if (!file.content || file.isImage) return;
      
      const dialogue = extractDialogue(file.content, file.path);
      
      let textWithoutDialogue = file.content.replace(/<[^>]*>/g, ' ');
      
      dialogue.forEach(d => {
        if (d.context) {
          const escapedContext = d.context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          textWithoutDialogue = textWithoutDialogue.replace(new RegExp(escapedContext, 'gi'), ' ');
        }
      });
      
      dialogue.forEach(d => {
        if (d.dialogue) {
          const quotedDialoguePattern = new RegExp(`["'""][^"'""]*${d.dialogue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"'""]*["'""]`, 'gi');
          textWithoutDialogue = textWithoutDialogue.replace(quotedDialoguePattern, ' ');
        }
      });
      
      const sentences = textWithoutDialogue.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        const sentenceTrimmed = sentence.trim();
        if (!sentenceTrimmed) return;
        if (/^["'""]/.test(sentenceTrimmed)) return;
        
        characterRegex.lastIndex = 0;
        if (characterRegex.test(sentenceTrimmed)) {
          allMentions.push({
            context: sentenceTrimmed,
            file: file.path,
          });
        }
      });
    });
    
    return allMentions;
  }, [files]);

  // Search for location mentions and context
  const searchLocationMentions = useCallback((locationName) => {
    const escapedLocation = locationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locationRegex = new RegExp(`\\b${escapedLocation}\\b`, 'gi');
    const allMentions = [];
    
    files.forEach(file => {
      // Skip image files or files without content
      if (!file.content || file.isImage) return;
      
      const cleanText = file.content.replace(/<[^>]*>/g, ' ');
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        locationRegex.lastIndex = 0;
        if (locationRegex.test(sentence)) {
          const charactersInContext = characters.filter(charName => {
            const charRegex = new RegExp(`\\b${charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            return charRegex.test(sentence);
          });
          
          allMentions.push({
            context: sentence.trim(),
            file: file.path,
            characters: charactersInContext,
          });
        }
      });
    });
    
    return allMentions;
  }, [files, characters]);

  // Generic search for any item's dialogue
  const searchItemDialogue = useCallback((itemName) => {
    const allDialogue = [];
    const itemNameLower = itemName.toLowerCase().trim();
    const itemNameEscaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    files.forEach(file => {
      // Skip image files or files without content
      if (!file.content || file.isImage) return;
      
      const dialogue = extractDialogue(file.content, file.path);
      
      const itemDialogue = dialogue.filter(d => {
        const speakerLower = d.speaker.toLowerCase().trim();
        if (speakerLower === itemNameLower) return true;
        const speakerRegex = new RegExp(`\\b${itemNameEscaped}\\b`, 'i');
        if (speakerRegex.test(d.speaker)) return true;
        if (speakerLower.startsWith(itemNameLower + ' ') || itemNameLower.startsWith(speakerLower + ' ')) return true;
        return false;
      });
      
      allDialogue.push(...itemDialogue);
    });
    
    return allDialogue;
  }, [files]);

  // Generic search for any item's mentions (non-dialogue mentions in text)
  const searchItemMentions = useCallback((itemName) => {
    const escapedItem = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const itemRegex = new RegExp(`\\b${escapedItem}\\b`, 'gi');
    const allMentions = [];
    
    files.forEach(file => {
      // Skip image files or files without content
      if (!file.content || file.isImage) return;
      
      const dialogue = extractDialogue(file.content, file.path);
      
      let textWithoutDialogue = file.content.replace(/<[^>]*>/g, ' ');
      
      dialogue.forEach(d => {
        if (d.context) {
          const escapedContext = d.context.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          textWithoutDialogue = textWithoutDialogue.replace(new RegExp(escapedContext, 'gi'), ' ');
        }
      });
      
      dialogue.forEach(d => {
        if (d.dialogue) {
          const quotedDialoguePattern = new RegExp(`["'""][^"'""]*${d.dialogue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"'""]*["'""]`, 'gi');
          textWithoutDialogue = textWithoutDialogue.replace(quotedDialoguePattern, ' ');
        }
      });
      
      const sentences = textWithoutDialogue.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        const sentenceTrimmed = sentence.trim();
        if (!sentenceTrimmed) return;
        if (/^["'""]/.test(sentenceTrimmed)) return;
        
        itemRegex.lastIndex = 0;
        if (itemRegex.test(sentenceTrimmed)) {
          allMentions.push({
            context: sentenceTrimmed,
            file: file.path,
          });
        }
      });
    });
    
    return allMentions;
  }, [files]);

  return {
    searchCharacterDialogue,
    searchCharacterMentions,
    searchLocationMentions,
    searchItemDialogue,
    searchItemMentions,
  };
};

