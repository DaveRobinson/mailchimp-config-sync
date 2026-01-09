#!/usr/bin/env node

import { Command } from 'commander';
import prompts from 'prompts';
import { createMailchimpClient, extractServerFromApiKey } from './mailchimp-client.js';
import { compareMergeFields, copyMergeFields } from './merge-fields.js';
import { selectSourceAndTargetLists } from './lists.js';

const program = new Command();

program
  .name('mailchimp-config-sync')
  .description('Sync configuration between Mailchimp audiences')
  .version('1.0.0');

program
  .command('merge-fields')
  .description('Copy merge fields from one audience to another')
  .option('-k, --api-key <key>', 'Mailchimp API key')
  .action(async (options: { apiKey?: string }) => {
    try {
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
          process.exit(0);
        }

        apiKey = response.apiKey;
      }

      if (!apiKey) {
        throw new Error('API key is required');
      }

      const server = extractServerFromApiKey(apiKey);
      const client = createMailchimpClient({ apiKey, server });

      const listSelection = await selectSourceAndTargetLists(client);

      if (!listSelection) {
        console.log('Operation cancelled');
        process.exit(0);
      }

      const sourceListId = listSelection.source.id;
      const targetListId = listSelection.target.id;

      console.log(`Source: ${listSelection.source.name} (${sourceListId})`);
      console.log(`Target: ${listSelection.target.name} (${targetListId})`);

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

program.parse();
