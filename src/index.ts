#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import type mailchimp from '@mailchimp/mailchimp_marketing';
import { createMailchimpClient, extractServerFromApiKey } from './mailchimp-client.js';
import { compareMergeFields, copyMergeFields } from './merge-fields.js';
import { compareTags } from './tags.js';
import { selectSourceAndTargetLists } from './lists.js';

const program = new Command();

program
  .name('mailchimp-config-sync')
  .description('Sync configuration between Mailchimp audiences')
  .version('1.0.0');

interface CommandSetup {
  client: typeof mailchimp;
  sourceListId: string;
  targetListId: string;
  sourceName: string;
  targetName: string;
}

interface CommandOptions {
  apiKey?: string;
  source?: string;
  target?: string;
}

async function setupCommand(options: CommandOptions): Promise<CommandSetup | undefined> {
  let apiKey = options.apiKey;

  if (!apiKey) {
    const response = await prompts({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Mailchimp API key:',
      validate: (value: string) => value.length > 0 || 'API key is required',
    });

    if (!response.apiKey) {
      console.log('Operation cancelled');
      return undefined;
    }

    apiKey = response.apiKey;
  }

  if (!apiKey) {
    throw new Error('API key is required');
  }

  const server = extractServerFromApiKey(apiKey);
  const client = createMailchimpClient({ apiKey, server });

  let sourceListId = options.source;
  let targetListId = options.target;
  let sourceName = '';
  let targetName = '';

  // If source and target IDs are provided, fetch the list names
  if (sourceListId && targetListId) {
    const allLists = await (async () => {
      const lists: any[] = [];
      let offset = 0;
      const count = 1000;
      while (true) {
        const response = await client.lists.getAllLists({ count, offset });
        if (!('lists' in response)) {
          throw new Error('Failed to fetch lists');
        }
        lists.push(...response.lists);
        if (lists.length >= response.total_items) {
          break;
        }
        offset += count;
      }
      return lists;
    })();

    const sourceList = allLists.find(l => l.id === sourceListId);
    const targetList = allLists.find(l => l.id === targetListId);

    if (!sourceList) {
      throw new Error(`Source list with ID ${sourceListId} not found`);
    }
    if (!targetList) {
      throw new Error(`Target list with ID ${targetListId} not found`);
    }

    sourceName = sourceList.name;
    targetName = targetList.name;
  } else {
    // Use interactive selection
    const listSelection = await selectSourceAndTargetLists(client);

    if (!listSelection) {
      console.log('Operation cancelled');
      return undefined;
    }

    sourceListId = listSelection.source.id;
    targetListId = listSelection.target.id;
    sourceName = listSelection.source.name;
    targetName = listSelection.target.name;
  }

  return {
    client,
    sourceListId,
    targetListId,
    sourceName,
    targetName,
  };
}

program
  .command('merge-fields')
  .description('Copy merge fields from one audience to another')
  .option('-k, --api-key <key>', 'Mailchimp API key')
  .option('-s, --source <listId>', 'Source audience ID')
  .option('-t, --target <listId>', 'Target audience ID')
  .action(async (options: CommandOptions) => {
    try {
      const setup = await setupCommand(options);

      if (!setup) {
        process.exit(0);
      }

      const { client, sourceListId, targetListId, sourceName, targetName } = setup;

      console.log(`Source: ${sourceName} (${sourceListId})`);
      console.log(`Target: ${targetName} (${targetListId})`);

      console.log('\nFetching merge fields...');

      const diffs = await compareMergeFields(client, sourceListId, targetListId);

      if (diffs.length === 0) {
        console.log('No merge fields found in source audience');
        process.exit(0);
      }

      const availableToCopy = diffs.filter(d => !d.existsInTarget);

      if (availableToCopy.length === 0) {
        console.log('\nAll merge fields from source already exist in target audience');
        process.exit(0);
      }

      console.log('\nMerge fields status:');
      for (const diff of diffs) {
        const status = diff.existsInTarget ? '✓ Already exists' : '○ Available to copy';
        console.log(`  ${status}: ${diff.field.tag} (${diff.field.name}) - ${diff.field.type}`);
      }

      const { selectedFields } = await prompts({
        type: 'multiselect',
        name: 'selectedFields',
        message: 'Select merge fields to copy:',
        choices: availableToCopy.map(d => ({
          title: `${d.field.tag} - ${d.field.name} (${d.field.type})`,
          value: d.field,
          description: d.field.help_text || undefined,
        })),
        min: 1,
      });

      if (!selectedFields || selectedFields.length === 0) {
        console.log('No fields selected. Operation cancelled');
        process.exit(0);
      }

      console.log(`\nCopying ${selectedFields.length} merge field(s)...`);

      const result = await copyMergeFields(client, targetListId, selectedFields);

      console.log(`\n✓ Successfully copied ${result.created} merge field(s)`);

      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(error => console.log(`  ✗ ${error}`));
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('compare-tags')
  .description('Compare tags between two audiences')
  .option('-k, --api-key <key>', 'Mailchimp API key')
  .option('-s, --source <listId>', 'Source audience ID')
  .option('-t, --target <listId>', 'Target audience ID')
  .action(async (options: CommandOptions) => {
    try {
      const setup = await setupCommand(options);

      if (!setup) {
        process.exit(0);
      }

      const { client, sourceListId, targetListId, sourceName, targetName } = setup;

      console.log(`Source: ${sourceName} (${sourceListId})`);
      console.log(`Target: ${targetName} (${targetListId})`);

      console.log('\n⚠️  Note: Tags cannot be copied automatically via the Mailchimp API.');
      console.log('    Tags are created when applied to members, not as standalone entities.\n');

      console.log('Fetching tags...');

      const comparison = await compareTags(client, sourceListId, targetListId);

      console.log('\n📊 Tag Comparison Results:\n');

      if (comparison.sourceOnly.length > 0) {
        console.log(`Missing in target (${comparison.sourceOnly.length}):`);
        comparison.sourceOnly.forEach(tag => console.log(`  • ${tag}`));
        console.log('');
      } else {
        console.log('✓ All source tags exist in target\n');
      }

      if (comparison.targetOnly.length > 0) {
        console.log(`Only in target (${comparison.targetOnly.length}):`);
        comparison.targetOnly.forEach(tag => console.log(`  • ${tag}`));
        console.log('');
      }

      if (comparison.common.length > 0) {
        console.log(`Common to both (${comparison.common.length}):`);
        comparison.common.forEach(tag => console.log(`  • ${tag}`));
      } else if (comparison.sourceOnly.length === 0 && comparison.targetOnly.length === 0) {
        console.log('No tags found in either audience');
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
