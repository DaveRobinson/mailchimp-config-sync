import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listMergeFields,
  compareMergeFields,
  copyMergeFields,
  createMergeField,
} from '../src/merge-fields.js';
import {
  createMockMailchimpClient,
  createMockMergeField,
  createMockMergeFieldsResponse,
  createMockErrorResponse,
} from './mocks/mailchimp.js';

describe('merge-fields', () => {
  let mockClient: ReturnType<typeof createMockMailchimpClient>;

  beforeEach(() => {
    mockClient = createMockMailchimpClient();
    vi.clearAllMocks();
  });

  describe('listMergeFields', () => {
    it('should fetch all merge fields in a single request', async () => {
      const fields = [
        createMockMergeField({ merge_id: 1, tag: 'EMAIL', name: 'Email' }),
        createMockMergeField({ merge_id: 2, tag: 'FNAME', name: 'First Name' }),
        createMockMergeField({ merge_id: 3, tag: 'LNAME', name: 'Last Name' }),
      ];

      mockClient.lists.getListMergeFields.mockResolvedValue(
        createMockMergeFieldsResponse(fields)
      );

      const result = await listMergeFields(mockClient as any, 'list-123');

      expect(result).toEqual(fields);
      expect(mockClient.lists.getListMergeFields).toHaveBeenCalledTimes(1);
      expect(mockClient.lists.getListMergeFields).toHaveBeenCalledWith('list-123', {
        count: 1000,
        offset: 0,
      });
    });

    it('should handle pagination when total_items exceeds count', async () => {
      const firstBatch = [
        createMockMergeField({ merge_id: 1, tag: 'FIELD1' }),
        createMockMergeField({ merge_id: 2, tag: 'FIELD2' }),
      ];
      const secondBatch = [
        createMockMergeField({ merge_id: 3, tag: 'FIELD3' }),
      ];

      mockClient.lists.getListMergeFields
        .mockResolvedValueOnce({
          ...createMockMergeFieldsResponse(firstBatch),
          total_items: 3,
        })
        .mockResolvedValueOnce({
          ...createMockMergeFieldsResponse(secondBatch),
          total_items: 3,
        });

      const result = await listMergeFields(mockClient as any, 'list-123');

      expect(result).toHaveLength(3);
      expect(result).toEqual([...firstBatch, ...secondBatch]);
      expect(mockClient.lists.getListMergeFields).toHaveBeenCalledTimes(2);
      expect(mockClient.lists.getListMergeFields).toHaveBeenNthCalledWith(1, 'list-123', {
        count: 1000,
        offset: 0,
      });
      expect(mockClient.lists.getListMergeFields).toHaveBeenNthCalledWith(2, 'list-123', {
        count: 1000,
        offset: 1000,
      });
    });

    it('should throw error when response is invalid', async () => {
      mockClient.lists.getListMergeFields.mockResolvedValue(
        createMockErrorResponse(400, 'Bad request')
      );

      await expect(listMergeFields(mockClient as any, 'list-123')).rejects.toThrow(
        'Failed to fetch merge fields'
      );
    });
  });

  describe('createMergeField', () => {
    it('should create a merge field successfully', async () => {
      const newField = createMockMergeField({
        tag: 'PHONE',
        name: 'Phone Number',
        type: 'phone',
      });

      mockClient.lists.addListMergeField.mockResolvedValue(newField);

      const result = await createMergeField(mockClient as any, 'list-123', newField);

      expect(result).toEqual(newField);
      expect(mockClient.lists.addListMergeField).toHaveBeenCalledTimes(1);
      expect(mockClient.lists.addListMergeField).toHaveBeenCalledWith(
        'list-123',
        expect.objectContaining({
          tag: 'PHONE',
          name: 'Phone Number',
          type: 'phone',
        })
      );
    });

    it('should exclude merge_id, list_id, and _links from request', async () => {
      const field = createMockMergeField({
        merge_id: 999,
        list_id: 'old-list',
        tag: 'CUSTOM',
      });

      mockClient.lists.addListMergeField.mockResolvedValue(field);

      await createMergeField(mockClient as any, 'new-list', field);

      const callArgs = mockClient.lists.addListMergeField.mock.calls[0];
      expect(callArgs?.[1]).not.toHaveProperty('merge_id');
      expect(callArgs?.[1]).not.toHaveProperty('list_id');
      expect(callArgs?.[1]).not.toHaveProperty('_links');
    });

    it('should throw error when creation fails', async () => {
      mockClient.lists.addListMergeField.mockResolvedValue(
        createMockErrorResponse(400, 'Invalid merge field')
      );

      await expect(
        createMergeField(mockClient as any, 'list-123', createMockMergeField())
      ).rejects.toThrow('Failed to create merge field');
    });
  });

  describe('compareMergeFields', () => {
    it('should identify fields that exist in source but not target', async () => {
      const sourceFields = [
        createMockMergeField({ tag: 'EMAIL', name: 'Email' }),
        createMockMergeField({ tag: 'FNAME', name: 'First Name' }),
        createMockMergeField({ tag: 'CUSTOM1', name: 'Custom 1' }),
        createMockMergeField({ tag: 'CUSTOM2', name: 'Custom 2' }),
      ];

      const targetFields = [
        createMockMergeField({ tag: 'EMAIL', name: 'Email' }),
        createMockMergeField({ tag: 'FNAME', name: 'First Name' }),
        createMockMergeField({ tag: 'CUSTOM1', name: 'Custom 1' }),
      ];

      mockClient.lists.getListMergeFields
        .mockResolvedValueOnce(createMockMergeFieldsResponse(sourceFields))
        .mockResolvedValueOnce(createMockMergeFieldsResponse(targetFields));

      const result = await compareMergeFields(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result).toHaveLength(3);
      expect(result.find(d => d.field.tag === 'FNAME')?.existsInTarget).toBe(true);
      expect(result.find(d => d.field.tag === 'CUSTOM1')?.existsInTarget).toBe(true);
      expect(result.find(d => d.field.tag === 'CUSTOM2')?.existsInTarget).toBe(false);
    });

    it('should filter out EMAIL field from results', async () => {
      const sourceFields = [
        createMockMergeField({ tag: 'EMAIL', name: 'Email' }),
        createMockMergeField({ tag: 'FNAME', name: 'First Name' }),
      ];

      mockClient.lists.getListMergeFields
        .mockResolvedValueOnce(createMockMergeFieldsResponse(sourceFields))
        .mockResolvedValueOnce(createMockMergeFieldsResponse([]));

      const result = await compareMergeFields(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result.find(d => d.field.tag === 'EMAIL')).toBeUndefined();
      expect(result).toHaveLength(1);
      expect(result[0]?.field.tag).toBe('FNAME');
    });

    it('should handle empty source list', async () => {
      mockClient.lists.getListMergeFields
        .mockResolvedValueOnce(createMockMergeFieldsResponse([]))
        .mockResolvedValueOnce(createMockMergeFieldsResponse([]));

      const result = await compareMergeFields(
        mockClient as any,
        'source-list',
        'target-list'
      );

      expect(result).toEqual([]);
    });
  });

  describe('copyMergeFields', () => {
    it('should copy multiple merge fields successfully', async () => {
      const fields = [
        createMockMergeField({ tag: 'CUSTOM1', name: 'Custom 1' }),
        createMockMergeField({ tag: 'CUSTOM2', name: 'Custom 2' }),
      ];

      mockClient.lists.addListMergeField
        .mockResolvedValueOnce(fields[0]!)
        .mockResolvedValueOnce(fields[1]!);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await copyMergeFields(mockClient as any, 'target-list', fields);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.lists.addListMergeField).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Created merge field: CUSTOM1 (Custom 1)');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Created merge field: CUSTOM2 (Custom 2)');

      consoleLogSpy.mockRestore();
    });

    it('should handle partial failures gracefully', async () => {
      const fields = [
        createMockMergeField({ tag: 'CUSTOM1', name: 'Custom 1' }),
        createMockMergeField({ tag: 'CUSTOM2', name: 'Custom 2' }),
        createMockMergeField({ tag: 'CUSTOM3', name: 'Custom 3' }),
      ];

      mockClient.lists.addListMergeField
        .mockResolvedValueOnce(fields[0]!)
        .mockResolvedValueOnce(createMockErrorResponse(400, 'Field already exists'))
        .mockResolvedValueOnce(fields[2]!);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await copyMergeFields(mockClient as any, 'target-list', fields);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('CUSTOM2');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '✗ Error creating CUSTOM2:',
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle complete failure', async () => {
      const fields = [
        createMockMergeField({ tag: 'CUSTOM1', name: 'Custom 1' }),
      ];

      mockClient.lists.addListMergeField.mockResolvedValue(
        createMockErrorResponse(500, 'Server error')
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await copyMergeFields(mockClient as any, 'target-list', fields);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);

      consoleErrorSpy.mockRestore();
    });

    it('should return success when no fields to copy', async () => {
      const result = await copyMergeFields(mockClient as any, 'target-list', []);

      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockClient.lists.addListMergeField).not.toHaveBeenCalled();
    });
  });
});
