import type mailchimp from '@mailchimp/mailchimp_marketing';
import type { lists } from '@mailchimp/mailchimp_marketing';
import './types.js';

export async function listMergeFields(
  client: typeof mailchimp,
  listId: string
): Promise<lists.MergeField[]> {
  const allFields: lists.MergeField[] = [];
  let offset = 0;
  const count = 1000;

  while (true) {
    const response = await client.lists.getListMergeFields(listId, { count, offset });

    if (!('merge_fields' in response)) {
      throw new Error('Failed to fetch merge fields');
    }

    allFields.push(...response.merge_fields);

    if (allFields.length >= response.total_items) {
      break;
    }

    offset += count;
  }

  return allFields;
}

export async function createMergeField(
  client: typeof mailchimp,
  listId: string,
  mergeField: Partial<lists.MergeField>
): Promise<lists.MergeField> {
  const { merge_id, list_id, _links, ...fieldData } = mergeField;
  const response = await client.lists.addListMergeField(listId, fieldData);
  if ('merge_id' in response) {
    return response as lists.MergeField;
  }
  throw new Error('Failed to create merge field');
}

export interface MergeFieldDiff {
  field: lists.MergeField;
  existsInTarget: boolean;
}

export async function compareMergeFields(
  client: typeof mailchimp,
  sourceListId: string,
  targetListId: string
): Promise<MergeFieldDiff[]> {
  const sourceFields = await listMergeFields(client, sourceListId);
  const targetFields = await listMergeFields(client, targetListId);

  const targetTags = new Set(targetFields.map(f => f.tag));

  return sourceFields
    .filter(f => f.tag !== 'EMAIL')
    .map(field => ({
      field,
      existsInTarget: targetTags.has(field.tag),
    }));
}

export async function copyMergeFields(
  client: typeof mailchimp,
  targetListId: string,
  fields: lists.MergeField[]
): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (const field of fields) {
    try {
      await createMergeField(client, targetListId, field);
      console.log(`✓ Created merge field: ${field.tag} (${field.name})`);
      created++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to create ${field.tag}: ${message}`);
      console.error(`✗ Error creating ${field.tag}:`, message);
    }
  }

  return { created, errors };
}
