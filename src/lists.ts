import type mailchimp from '@mailchimp/mailchimp_marketing';
import type { lists } from '@mailchimp/mailchimp_marketing';
import prompts from 'prompts';
import './types.js';

export async function getAllLists(
  client: typeof mailchimp
): Promise<lists.List[]> {
  const allLists: lists.List[] = [];
  let offset = 0;
  const count = 1000;

  while (true) {
    const response = await client.lists.getAllLists({ count, offset });

    if (!('lists' in response)) {
      throw new Error('Failed to fetch lists');
    }

    allLists.push(...response.lists);

    if (allLists.length >= response.total_items) {
      break;
    }

    offset += count;
  }

  return allLists;
}

function formatListChoice(list: lists.List) {
  const memberCount = list.stats.member_count.toLocaleString();
  const shortId = list.id.substring(0, 6);
  return {
    title: `${list.name} (${memberCount} members) - ${shortId}`,
    value: list,
    description: `ID: ${list.id} | Created: ${new Date(list.date_created).toLocaleDateString()}`,
  };
}

export async function selectSourceAndTargetLists(
  client: typeof mailchimp
): Promise<{ source: lists.List; target: lists.List } | undefined> {
  console.log('Fetching audiences...');
  const allLists = await getAllLists(client);

  if (allLists.length === 0) {
    console.error('No audiences found in your account.');
    return undefined;
  }

  if (allLists.length === 1) {
    console.error('Only one audience found. Need at least two audiences to copy between.');
    return undefined;
  }

  console.log(`Found ${allLists.length} audiences\n`);

  // Select source list
  const sourceResponse = await prompts({
    type: 'select',
    name: 'source',
    message: 'Select source audience:',
    choices: allLists.map(formatListChoice),
  });

  if (!sourceResponse.source) {
    return undefined;
  }

  const sourceList = sourceResponse.source as lists.List;

  // Select target list (excluding source)
  const targetChoices = allLists
    .filter(list => list.id !== sourceList.id)
    .map(formatListChoice);

  const targetResponse = await prompts({
    type: 'select',
    name: 'target',
    message: 'Select target audience:',
    choices: targetChoices,
  });

  if (!targetResponse.target) {
    return undefined;
  }

  const targetList = targetResponse.target as lists.List;

  return { source: sourceList, target: targetList };
}
