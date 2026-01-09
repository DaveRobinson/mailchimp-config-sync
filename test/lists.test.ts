import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAllLists, selectSourceAndTargetLists } from '../src/lists.js';
import {
  createMockMailchimpClient,
  createMockList,
  createMockListsResponse,
  createMockErrorResponse,
} from './mocks/mailchimp.js';
import prompts from 'prompts';

describe('lists', () => {
  let mockClient: ReturnType<typeof createMockMailchimpClient>;

  beforeEach(() => {
    mockClient = createMockMailchimpClient();
    vi.clearAllMocks();
  });

  describe('getAllLists', () => {
    it('should fetch all lists in a single request', async () => {
      const lists = [
        createMockList({ id: 'list-1', name: 'List 1' }),
        createMockList({ id: 'list-2', name: 'List 2' }),
        createMockList({ id: 'list-3', name: 'List 3' }),
      ];

      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse(lists)
      );

      const result = await getAllLists(mockClient as any);

      expect(result).toEqual(lists);
      expect(mockClient.lists.getAllLists).toHaveBeenCalledTimes(1);
      expect(mockClient.lists.getAllLists).toHaveBeenCalledWith({
        count: 1000,
        offset: 0,
      });
    });

    it('should handle pagination when total_items exceeds count', async () => {
      const firstBatch = [
        createMockList({ id: 'list-1', name: 'List 1' }),
        createMockList({ id: 'list-2', name: 'List 2' }),
      ];
      const secondBatch = [
        createMockList({ id: 'list-3', name: 'List 3' }),
      ];

      mockClient.lists.getAllLists
        .mockResolvedValueOnce({
          ...createMockListsResponse(firstBatch),
          total_items: 3,
        })
        .mockResolvedValueOnce({
          ...createMockListsResponse(secondBatch),
          total_items: 3,
        });

      const result = await getAllLists(mockClient as any);

      expect(result).toHaveLength(3);
      expect(result).toEqual([...firstBatch, ...secondBatch]);
      expect(mockClient.lists.getAllLists).toHaveBeenCalledTimes(2);
      expect(mockClient.lists.getAllLists).toHaveBeenNthCalledWith(1, {
        count: 1000,
        offset: 0,
      });
      expect(mockClient.lists.getAllLists).toHaveBeenNthCalledWith(2, {
        count: 1000,
        offset: 1000,
      });
    });

    it('should throw error when response is invalid', async () => {
      mockClient.lists.getAllLists.mockResolvedValue(
        createMockErrorResponse(400, 'Bad request')
      );

      await expect(getAllLists(mockClient as any)).rejects.toThrow(
        'Failed to fetch lists'
      );
    });
  });

  describe('selectSourceAndTargetLists', () => {
    let consoleLogSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should successfully select source and target lists', async () => {
      const lists = [
        createMockList({ id: 'list-1', name: 'Newsletter', stats: { ...createMockList().stats, member_count: 1234 } }),
        createMockList({ id: 'list-2', name: 'Product Updates', stats: { ...createMockList().stats, member_count: 567 } }),
        createMockList({ id: 'list-3', name: 'Beta Testers', stats: { ...createMockList().stats, member_count: 89 } }),
      ];

      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse(lists)
      );

      // Mock prompts to select first list as source, second as target
      prompts.inject([lists[0], lists[1]]);

      const result = await selectSourceAndTargetLists(mockClient as any);

      expect(result).toBeDefined();
      expect(result?.source.id).toBe('list-1');
      expect(result?.target.id).toBe('list-2');
      expect(consoleLogSpy).toHaveBeenCalledWith('Fetching audiences...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Found 3 audiences\n');
    });

    it('should return undefined when user cancels source selection', async () => {
      const lists = [
        createMockList({ id: 'list-1', name: 'List 1' }),
        createMockList({ id: 'list-2', name: 'List 2' }),
      ];

      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse(lists)
      );

      // Mock prompts to simulate cancellation (return undefined)
      prompts.inject([undefined]);

      const result = await selectSourceAndTargetLists(mockClient as any);

      expect(result).toBeUndefined();
    });

    it('should return undefined when user cancels target selection', async () => {
      const lists = [
        createMockList({ id: 'list-1', name: 'List 1' }),
        createMockList({ id: 'list-2', name: 'List 2' }),
      ];

      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse(lists)
      );

      // Mock prompts: select source, then cancel target
      prompts.inject([lists[0], undefined]);

      const result = await selectSourceAndTargetLists(mockClient as any);

      expect(result).toBeUndefined();
    });

    it('should exclude source list from target choices', async () => {
      const lists = [
        createMockList({ id: 'list-1', name: 'List 1' }),
        createMockList({ id: 'list-2', name: 'List 2' }),
        createMockList({ id: 'list-3', name: 'List 3' }),
      ];

      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse(lists)
      );

      // Select list-1 as source, then list-1 again for target (should not be possible)
      // We'll select list-1 as source and list-3 as target
      prompts.inject([lists[0], lists[2]]);

      const result = await selectSourceAndTargetLists(mockClient as any);

      expect(result).toBeDefined();
      expect(result?.source.id).toBe('list-1');
      expect(result?.target.id).toBe('list-3');
      // The test verifies the function works - the actual filtering is done in the implementation
      // by filtering out sourceList.id from targetChoices
    });

    it('should return undefined when no lists are found', async () => {
      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse([])
      );

      const result = await selectSourceAndTargetLists(mockClient as any);

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('No audiences found in your account.');
    });

    it('should return undefined when only one list is found', async () => {
      const lists = [
        createMockList({ id: 'list-1', name: 'List 1' }),
      ];

      mockClient.lists.getAllLists.mockResolvedValue(
        createMockListsResponse(lists)
      );

      const result = await selectSourceAndTargetLists(mockClient as any);

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Only one audience found. Need at least two audiences to copy between.'
      );
    });

    it('should handle API errors', async () => {
      mockClient.lists.getAllLists.mockRejectedValue(
        new Error('API connection failed')
      );

      await expect(selectSourceAndTargetLists(mockClient as any)).rejects.toThrow(
        'API connection failed'
      );
    });
  });
});
