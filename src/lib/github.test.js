import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as githubModule from './github.js';

// Mock global fetch
global.fetch = vi.fn();

// Get functions after import
const {
  getGitHubToken,
  getCurrentGitHubUser,
  fetchUserRepos,
  fetchMarkdownFiles,
  fetchFileContent,
  getUsernameFromId,
  getFileSha,
  updateFileContent,
  getGitHubUsername,
} = githubModule;

describe('github', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getGitHubToken', () => {
    it('should return null (not implemented)', async () => {
      const mockUser = { providerData: [] };
      const result = await getGitHubToken(mockUser);
      expect(result).toBeNull();
    });
  });

  describe('getCurrentGitHubUser', () => {
    it('should return null (not implemented)', async () => {
      const result = await getCurrentGitHubUser();
      expect(result).toBeNull();
    });
  });

  describe('fetchUserRepos', () => {
    it('should fetch user repos successfully', async () => {
      const mockUser = {
        providerData: [{ providerId: 'github.com', uid: 'testuser' }],
      };
      const mockRepos = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'testuser/repo1',
          description: 'Test repo',
          private: false,
          default_branch: 'main',
          updated_at: '2024-01-01T00:00:00Z',
          html_url: 'https://github.com/testuser/repo1',
        },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockRepos,
      });

      const result = await fetchUserRepos(mockUser);

      expect(result).toEqual([
        {
          id: 1,
          name: 'repo1',
          fullName: 'testuser/repo1',
          description: 'Test repo',
          private: false,
          defaultBranch: 'main',
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://github.com/testuser/repo1',
        },
      ]);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/users/testuser/repos?sort=updated&per_page=100',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
    });

    it('should extract username from GitHub email', async () => {
      const mockUser = {
        email: '12345+testuser@users.noreply.github.com',
        providerData: [],
      };
      const mockRepos = [];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockRepos,
      });

      await fetchUserRepos(mockUser);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('testuser'),
        expect.any(Object)
      );
    });

    it('should handle 404 error', async () => {
      const mockUser = {
        providerData: [{ providerId: 'github.com', uid: 'nonexistent' }],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'User not found',
      });

      await expect(fetchUserRepos(mockUser)).rejects.toThrow('GitHub user');
    });

    it('should handle 403 rate limit error', async () => {
      const mockUser = {
        providerData: [{ providerId: 'github.com', uid: 'testuser' }],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Rate limit exceeded',
      });

      await expect(fetchUserRepos(mockUser)).rejects.toThrow('rate limit');
    });

    it('should throw error if username cannot be determined', async () => {
      const mockUser = {
        providerData: [],
      };

      await expect(fetchUserRepos(mockUser)).rejects.toThrow('Could not determine');
    });
  });

  describe('fetchMarkdownFiles', () => {
    it('should fetch markdown files successfully', async () => {
      const mockBranchData = { object: { sha: 'branchsha' } };
      const mockTreeData = {
        tree: [
          { type: 'blob', path: 'test.md', sha: 'filesha', size: 100, url: 'https://github.com/test.md' },
          { type: 'blob', path: 'readme.txt', sha: 'txtsha', size: 50, url: 'https://github.com/readme.txt' },
        ],
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBranchData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTreeData,
        });

      const result = await fetchMarkdownFiles('owner', 'repo', 'main');

      expect(result).toEqual([
        {
          path: 'test.md',
          sha: 'filesha',
          size: 100,
          url: 'https://github.com/test.md',
        },
      ]);
    });

    it('should fallback to master branch if main fails', async () => {
      const mockMasterData = { object: { sha: 'mastersha' } };
      const mockTreeData = { tree: [] };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMasterData,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTreeData,
        });

      await fetchMarkdownFiles('owner', 'repo', 'main');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('master'),
        expect.any(Object)
      );
    });
  });

  describe('fetchFileContent', () => {
    it('should fetch file content without token (base64)', async () => {
      const mockData = {
        content: btoa('Test content'),
        sha: 'abc123',
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchFileContent('owner', 'repo', 'test.md', 'main');

      expect(result).toBe('Test content');
    });

    it('should fetch file content with token (raw)', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => 'Raw content',
      });

      const result = await fetchFileContent('owner', 'repo', 'test.md', 'main', 'token123');

      expect(result).toBe('Raw content');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token token123',
            'Accept': 'application/vnd.github.v3.raw',
          }),
        })
      );
    });

    it('should fallback to master branch if main fails', async () => {
      const mockData = { content: btoa('Content'), sha: 'abc123' };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        });

      const result = await fetchFileContent('owner', 'repo', 'test.md', 'main');

      expect(result).toBe('Content');
    });
  });

  describe('getFileSha', () => {
    it('should fetch file SHA successfully', async () => {
      const mockData = { sha: 'abc123' };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockData,
      });

      const result = await getFileSha('owner', 'repo', 'test.md', 'main', 'token123');

      expect(result).toBe('abc123');
    });

    it('should throw error on failure', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        getFileSha('owner', 'repo', 'test.md', 'main', 'token123')
      ).rejects.toThrow('Failed to fetch file SHA');
    });
  });

  describe('updateFileContent', () => {
    it('should update file content successfully', async () => {
      const mockResult = { content: { sha: 'newsha' } };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      // Mock getFileSha
      const githubModule = await import('./github.js');
      vi.spyOn(githubModule, 'getFileSha').mockResolvedValue('oldsha');

      const result = await updateFileContent(
        'owner',
        'repo',
        'test.md',
        'New content',
        'oldsha',
        'main',
        'Update test',
        'token123'
      );

      expect(result).toEqual(mockResult);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'token token123',
          }),
        })
      );
    });

    it('should fetch SHA if not provided', async () => {
      const mockResult = { content: { sha: 'newsha' } };
      const mockShaResult = { sha: 'fetchedsha' };

      // Mock fetch calls: one for getFileSha (when sha is null), one for updateFileContent
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockShaResult, // For getFileSha call
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult, // For updateFileContent call
        });

      // Call updateFileContent with null SHA - this should trigger getFileSha internally
      const result = await updateFileContent(
        'owner',
        'repo',
        'test.md',
        'New content',
        null, // null SHA should trigger getFileSha call
        'main',
        'Update test',
        'token123'
      );

      // Verify the update succeeded (which means getFileSha was called internally)
      expect(result).toBeDefined();
      // Verify fetch was called twice: once for getFileSha, once for update
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error if token is missing', async () => {
      await expect(
        updateFileContent(
          'owner',
          'repo',
          'test.md',
          'Content',
          'sha',
          'main',
          'Message',
          null
        )
      ).rejects.toThrow('GitHub access token required');
    });

    it('should retry on SHA mismatch', async () => {
      const mockResult = { content: { sha: 'newsha' } };
      const mockShaResult = { sha: 'newsha' };

      // Setup fetch mocks: 
      // 1. Initial PUT fails with SHA mismatch
      // 2. getFileSha is called to get latest SHA (makes a fetch call)
      // 3. Retry PUT succeeds
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ message: 'sha does not match' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockShaResult, // For getFileSha call during retry
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResult, // For retry PUT
        });

      const result = await updateFileContent(
        'owner',
        'repo',
        'test.md',
        'Content',
        'oldsha',
        'main',
        'Message',
        'token123'
      );

      expect(result).toEqual(mockResult);
      // Fetch is called 3 times: initial PUT (fail) + getFileSha (success) + retry PUT (success)
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getGitHubUsername', () => {
    it('should extract username from provider uid', async () => {
      const mockUser = {
        providerData: [{ providerId: 'github.com', uid: 'testuser' }],
      };

      const result = await getGitHubUsername(mockUser);

      expect(result).toBe('testuser');
    });

    it('should extract username from GitHub email', async () => {
      const mockUser = {
        providerData: [],
        email: '12345+testuser@users.noreply.github.com',
      };

      vi.spyOn(githubModule, 'getUsernameFromId').mockResolvedValue(null);

      const result = await getGitHubUsername(mockUser);

      expect(result).toBe('testuser');
    });

    it('should use displayName if it looks like a username', async () => {
      const mockUser = {
        providerData: [],
        displayName: 'testuser',
      };

      const result = await getGitHubUsername(mockUser);

      expect(result).toBe('testuser');
    });

    it('should return null if username cannot be determined', async () => {
      const mockUser = {
        providerData: [],
      };

      const result = await getGitHubUsername(mockUser);

      expect(result).toBeNull();
    });
  });
});

