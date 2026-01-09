import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTags, compareTags } from '../src/tags.js';
import {
  createMockMailchimpClient,
  createMockTag,
  createMockTagSearchResponse,
  createMockErrorResponse,
} from './mocks/mailchimp.js';

describe('tags', () => {
  let mockClient: ReturnType<typeof createMockMailchimpClient>;

  beforeEach(() => {
    mockClient = createMockMailchimpClient();
    vi.clearAllMocks();
  });

  describe('listTags', () => {
    it('should fetch all tags in a single request', async () => {
      const tags = [
        createMockTag({ id: 1, name: 'VIP' }),
        createMockTag({ id: 2, name: 'Newsletter' }),
        createMockTag({ id: 3, name: 'Customer' }),
      ];

      mockClient.lists.tagSearch.mockResolvedValue(
        createMockTagSearchResponse(tags)
      );

      const result = await listTags(mockClient as any, 'list-123');

      expect(result).toEqual(tags);
      expect(mockClient.lists.tagSearch).toHaveBeenCalledTimes(1);
      expect(mockClient.lists.tagSearch).toHaveBeenCalledWith('list-123', {
        count: 1000,
        offset: 0,
      });
    });

    it('should handle pagination when total_items exceeds count', async () => {
      const firstBatch = [
        createMockTag({ id: 1, name: 'Tag1' }),
        createMockTag({ id: 2, name: 'Tag2' }),
      ];
      const secondBatch = [
        createMockTag({ id: 3, name: 'Tag3' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce({
          ...createMockTagSearchResponse(firstBatch),
          total_items: 3,
        })
        .mockResolvedValueOnce({
          ...createMockTagSearchResponse(secondBatch),
          total_items: 3,
        });

      const result = await listTags(mockClient as any, 'list-123');

      expect(result).toHaveLength(3);
      expect(result).toEqual([...firstBatch, ...secondBatch]);
      expect(mockClient.lists.tagSearch).toHaveBeenCalledTimes(2);
      expect(mockClient.lists.tagSearch).toHaveBeenNthCalledWith(1, 'list-123', {
        count: 1000,
        offset: 0,
      });
      expect(mockClient.lists.tagSearch).toHaveBeenNthCalledWith(2, 'list-123', {
        count: 1000,
        offset: 1000,
      });
    });

    it('should handle empty list', async () => {
      mockClient.lists.tagSearch.mockResolvedValue(
        createMockTagSearchResponse([])
      );

      const result = await listTags(mockClient as any, 'list-123');

      expect(result).toEqual([]);
      expect(mockClient.lists.tagSearch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when response is invalid', async () => {
      mockClient.lists.tagSearch.mockResolvedValue(
        createMockErrorResponse(400, 'Bad request')
      );

      await expect(listTags(mockClient as any, 'list-123')).rejects.toThrow(
        'Failed to fetch tags'
      );
    });

    it('should throw error when response has no tags array', async () => {
      mockClient.lists.tagSearch.mockResolvedValue({
        total_items: 0,
        _links: [],
      } as any);

      await expect(listTags(mockClient as any, 'list-123')).rejects.toThrow(
        'Failed to fetch tags'
      );
    });
  });

  describe('compareTags', () => {
    it('should identify tags only in source', async () => {
      const sourceTags = [
        createMockTag({ id: 1, name: 'VIP' }),
        createMockTag({ id: 2, name: 'Newsletter' }),
        createMockTag({ id: 3, name: 'Beta-Tester' }),
      ];

      const targetTags = [
        createMockTag({ id: 10, name: 'VIP' }),
        createMockTag({ id: 11, name: 'Newsletter' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(sourceTags))
        .mockResolvedValueOnce(createMockTagSearchResponse(targetTags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual(['Beta-Tester']);
      expect(result.targetOnly).toEqual([]);
      expect(result.common).toEqual(['Newsletter', 'VIP']);
    });

    it('should identify tags only in target', async () => {
      const sourceTags = [
        createMockTag({ id: 1, name: 'VIP' }),
      ];

      const targetTags = [
        createMockTag({ id: 10, name: 'VIP' }),
        createMockTag({ id: 11, name: 'Legacy' }),
        createMockTag({ id: 12, name: 'Churned' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(sourceTags))
        .mockResolvedValueOnce(createMockTagSearchResponse(targetTags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual([]);
      expect(result.targetOnly).toEqual(['Churned', 'Legacy']);
      expect(result.common).toEqual(['VIP']);
    });

    it('should return sorted results', async () => {
      const sourceTags = [
        createMockTag({ id: 1, name: 'Zebra' }),
        createMockTag({ id: 2, name: 'Apple' }),
        createMockTag({ id: 3, name: 'Banana' }),
      ];

      const targetTags = [
        createMockTag({ id: 10, name: 'Banana' }),
        createMockTag({ id: 11, name: 'Yak' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(sourceTags))
        .mockResolvedValueOnce(createMockTagSearchResponse(targetTags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual(['Apple', 'Zebra']);
      expect(result.targetOnly).toEqual(['Yak']);
      expect(result.common).toEqual(['Banana']);
    });

    it('should handle case when all tags are common', async () => {
      const tags = [
        createMockTag({ id: 1, name: 'VIP' }),
        createMockTag({ id: 2, name: 'Customer' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(tags))
        .mockResolvedValueOnce(createMockTagSearchResponse(tags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual([]);
      expect(result.targetOnly).toEqual([]);
      expect(result.common).toEqual(['Customer', 'VIP']);
    });

    it('should handle case when no tags overlap', async () => {
      const sourceTags = [
        createMockTag({ id: 1, name: 'VIP' }),
        createMockTag({ id: 2, name: 'Newsletter' }),
      ];

      const targetTags = [
        createMockTag({ id: 10, name: 'Legacy' }),
        createMockTag({ id: 11, name: 'Churned' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(sourceTags))
        .mockResolvedValueOnce(createMockTagSearchResponse(targetTags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual(['Newsletter', 'VIP']);
      expect(result.targetOnly).toEqual(['Churned', 'Legacy']);
      expect(result.common).toEqual([]);
    });

    it('should handle empty source list', async () => {
      const targetTags = [
        createMockTag({ id: 10, name: 'Legacy' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse([]))
        .mockResolvedValueOnce(createMockTagSearchResponse(targetTags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual([]);
      expect(result.targetOnly).toEqual(['Legacy']);
      expect(result.common).toEqual([]);
    });

    it('should handle empty target list', async () => {
      const sourceTags = [
        createMockTag({ id: 1, name: 'VIP' }),
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(sourceTags))
        .mockResolvedValueOnce(createMockTagSearchResponse([]));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual(['VIP']);
      expect(result.targetOnly).toEqual([]);
      expect(result.common).toEqual([]);
    });

    it('should handle both lists empty', async () => {
      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse([]))
        .mockResolvedValueOnce(createMockTagSearchResponse([]));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual([]);
      expect(result.targetOnly).toEqual([]);
      expect(result.common).toEqual([]);
    });

    it('should compare by name not by ID', async () => {
      const sourceTags = [
        createMockTag({ id: 1, name: 'VIP' }),
      ];

      const targetTags = [
        createMockTag({ id: 999, name: 'VIP' }), // Different ID, same name
      ];

      mockClient.lists.tagSearch
        .mockResolvedValueOnce(createMockTagSearchResponse(sourceTags))
        .mockResolvedValueOnce(createMockTagSearchResponse(targetTags));

      const result = await compareTags(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.sourceOnly).toEqual([]);
      expect(result.targetOnly).toEqual([]);
      expect(result.common).toEqual(['VIP']);
    });
  });
});
