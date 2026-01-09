import type mailchimp from '@mailchimp/mailchimp_marketing';
import type { lists } from '@mailchimp/mailchimp_marketing';
import './types.js';

export async function listTags(
  client: typeof mailchimp,
  listId: string
): Promise<lists.Tags[]> {
  const allTags: lists.Tags[] = [];
  let offset = 0;
  const count = 1000;

  while (true) {
    const response = await client.lists.tagSearch(listId, { count, offset });

    if (!('tags' in response) || !Array.isArray(response.tags)) {
      throw new Error('Failed to fetch tags');
    }

    allTags.push(...response.tags);

    if (allTags.length >= response.total_items) {
      break;
    }

    offset += count;
  }

  return allTags;
}

export interface TagComparison {
  sourceOnly: string[];
  targetOnly: string[];
  common: string[];
}

export async function compareTags(
  client: typeof mailchimp,
  sourceListId: string,
  targetListId: string
): Promise<TagComparison> {
  const sourceTags = await listTags(client, sourceListId);
  const targetTags = await listTags(client, targetListId);

  const sourceNames = new Set(sourceTags.map(t => t.name));
  const targetNames = new Set(targetTags.map(t => t.name));

  const sourceOnly: string[] = [];
  const targetOnly: string[] = [];
  const common: string[] = [];

  for (const name of sourceNames) {
    if (targetNames.has(name)) {
      common.push(name);
    } else {
      sourceOnly.push(name);
    }
  }

  for (const name of targetNames) {
    if (!sourceNames.has(name)) {
      targetOnly.push(name);
    }
  }

  // Sort for consistent output
  sourceOnly.sort();
  targetOnly.sort();
  common.sort();

  return { sourceOnly, targetOnly, common };
}
