import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveRepoCharacters,
  loadRepoCharacters,
  saveRepoLocations,
  loadRepoLocations,
  saveRepoKeywords,
  loadRepoKeywords,
  loadRepoData,
  saveRepoFilesCache,
  loadRepoFilesCache,
} from './repoData.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('./firebase.js', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
}));

describe('repoData', () => {
  const mockUserId = 'user123';
  const mockRepoFullName = 'owner/repo';
  const mockRepoDocId = 'owner_repo';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(doc).mockReturnValue({ id: mockRepoDocId });
  });

  describe('saveRepoCharacters', () => {
    it('should save characters to Firestore', async () => {
      const characters = ['Alex', 'Morgan'];
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await saveRepoCharacters(mockUserId, mockRepoFullName, characters);

      expect(doc).toHaveBeenCalledWith(db, 'users', mockUserId, 'repos', mockRepoDocId);
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          repoFullName: mockRepoFullName,
          characters,
          updatedAt: expect.any(Date),
        },
        { merge: true }
      );
    });

    it('should throw error on failure', async () => {
      const error = new Error('Firestore error');
      vi.mocked(setDoc).mockRejectedValue(error);

      await expect(
        saveRepoCharacters(mockUserId, mockRepoFullName, [])
      ).rejects.toThrow('Firestore error');
    });
  });

  describe('loadRepoCharacters', () => {
    it('should load characters from Firestore', async () => {
      const mockCharacters = ['Alex', 'Morgan'];
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ characters: mockCharacters }),
      });

      const result = await loadRepoCharacters(mockUserId, mockRepoFullName);

      expect(result).toEqual(mockCharacters);
      expect(doc).toHaveBeenCalledWith(db, 'users', mockUserId, 'repos', mockRepoDocId);
    });

    it('should return empty array if document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const result = await loadRepoCharacters(mockUserId, mockRepoFullName);

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      vi.mocked(getDoc).mockRejectedValue(new Error('Error'));

      const result = await loadRepoCharacters(mockUserId, mockRepoFullName);

      expect(result).toEqual([]);
    });
  });

  describe('saveRepoLocations', () => {
    it('should save locations to Firestore', async () => {
      const locations = ['Forest', 'Tower'];
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await saveRepoLocations(mockUserId, mockRepoFullName, locations);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          repoFullName: mockRepoFullName,
          locations,
          updatedAt: expect.any(Date),
        },
        { merge: true }
      );
    });
  });

  describe('loadRepoLocations', () => {
    it('should load locations from Firestore', async () => {
      const mockLocations = ['Forest', 'Tower'];
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ locations: mockLocations }),
      });

      const result = await loadRepoLocations(mockUserId, mockRepoFullName);

      expect(result).toEqual(mockLocations);
    });

    it('should return empty array if document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const result = await loadRepoLocations(mockUserId, mockRepoFullName);

      expect(result).toEqual([]);
    });
  });

  describe('saveRepoKeywords', () => {
    it('should save keywords to Firestore', async () => {
      const keywords = [
        { word: 'magic', color: { class: 'bg-purple-200', text: 'text-purple-800' } }
      ];
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await saveRepoKeywords(mockUserId, mockRepoFullName, keywords);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          repoFullName: mockRepoFullName,
          keywords,
          updatedAt: expect.any(Date),
        },
        { merge: true }
      );
    });
  });

  describe('loadRepoKeywords', () => {
    it('should load keywords from Firestore', async () => {
      const mockKeywords = [
        { word: 'magic', color: { class: 'bg-purple-200', text: 'text-purple-800' } }
      ];
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ keywords: mockKeywords }),
      });

      const result = await loadRepoKeywords(mockUserId, mockRepoFullName);

      expect(result).toEqual(mockKeywords);
    });

    it('should return empty array if document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const result = await loadRepoKeywords(mockUserId, mockRepoFullName);

      expect(result).toEqual([]);
    });
  });

  describe('loadRepoData', () => {
    it('should load all repo data (characters, locations, keywords)', async () => {
      const mockData = {
        characters: ['Alex'],
        locations: ['Forest'],
        keywords: [{ word: 'magic', color: {} }],
      };
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockData,
      });

      const result = await loadRepoData(mockUserId, mockRepoFullName);

      expect(result).toEqual(mockData);
    });

    it('should return empty arrays if document does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const result = await loadRepoData(mockUserId, mockRepoFullName);

      expect(result).toEqual({
        characters: [],
        locations: [],
        keywords: [],
      });
    });

    it('should return empty arrays on error', async () => {
      vi.mocked(getDoc).mockRejectedValue(new Error('Error'));

      const result = await loadRepoData(mockUserId, mockRepoFullName);

      expect(result).toEqual({
        characters: [],
        locations: [],
        keywords: [],
      });
    });
  });

  describe('saveRepoFilesCache', () => {
    it('should save files cache to Firestore', async () => {
      const files = [
        {
          path: 'test.md',
          sha: 'abc123',
          size: 100,
          content: 'Test content',
          url: 'https://github.com/test.md',
        }
      ];
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await saveRepoFilesCache(mockUserId, mockRepoFullName, files);

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          repoFullName: mockRepoFullName,
          filesCache: files.map(f => ({
            path: f.path,
            sha: f.sha,
            size: f.size,
            content: f.content,
            url: f.url,
          })),
          filesCacheUpdated: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        { merge: true }
      );
    });
  });

  describe('loadRepoFilesCache', () => {
    it('should load files cache from Firestore', async () => {
      const mockDate = new Date();
      const mockFiles = [
        {
          path: 'test.md',
          sha: 'abc123',
          size: 100,
          content: 'Test content',
          url: 'https://github.com/test.md',
        }
      ];
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          filesCache: mockFiles,
          filesCacheUpdated: { toDate: () => mockDate },
        }),
      });

      const result = await loadRepoFilesCache(mockUserId, mockRepoFullName);

      expect(result).toEqual({
        files: mockFiles,
        cacheDate: mockDate,
      });
    });

    it('should return null if cache does not exist', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      });

      const result = await loadRepoFilesCache(mockUserId, mockRepoFullName);

      expect(result).toBeNull();
    });

    it('should return null if filesCache is not an array', async () => {
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          filesCache: null,
        }),
      });

      const result = await loadRepoFilesCache(mockUserId, mockRepoFullName);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      vi.mocked(getDoc).mockRejectedValue(new Error('Error'));

      const result = await loadRepoFilesCache(mockUserId, mockRepoFullName);

      expect(result).toBeNull();
    });
  });
});

