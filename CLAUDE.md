# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-config CLI tool for syncing configuration between Mailchimp audiences. Currently supports:
- **Copying merge fields** with an interactive selection interface
- **Comparing tags** between audiences (read-only comparison, tags cannot be copied via API)

Built with TypeScript, Commander.js for CLI, and Prompts for interactive UX.

## Development Commands

```bash
# Build the project
npm run build

# Watch mode (auto-rebuild on changes)
npm run dev

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Test the built CLI locally
node dist/index.js merge-fields --help
```

## Architecture

### Module Structure

1. **src/index.ts** - CLI entry point
   - Uses Commander.js for command parsing
   - `setupCommand()` - Common logic for API key prompting, client creation, and list selection
   - Supports CLI arguments (--api-key, --source, --target) with fallback to interactive prompts
   - Orchestrates command flows for merge-fields and compare-tags
   - Handles user input validation and cancellation

2. **src/merge-fields.ts** - Merge fields operations
   - `listMergeFields()` - Fetches all merge fields with automatic pagination (handles 1000+ fields)
   - `compareMergeFields()` - Compares source and target audiences, returns diff showing what exists vs. available
   - `copyMergeFields()` - Copies selected fields sequentially, continues on partial failures
   - `createMergeField()` - Creates individual merge field, strips read-only properties (merge_id, list_id, _links)

3. **src/tags.ts** - Tag comparison operations
   - `listTags()` - Fetches all tags with automatic pagination (handles 1000+ tags)
   - `compareTags()` - Compares tags by name between source and target audiences
   - Returns sourceOnly, targetOnly, and common tag lists (all sorted alphabetically)

4. **src/lists.ts** - Audience selection utilities
   - `getAllLists()` - Fetches all audiences with pagination
   - `selectSourceAndTargetLists()` - Interactive prompts for selecting source and target audiences

5. **src/mailchimp-client.ts** - API client wrapper
   - `createMailchimpClient()` - Configures Mailchimp SDK with API key and server
   - `extractServerFromApiKey()` - Parses datacenter from API key format (key-datacenter)

6. **src/types.ts** - Type extensions
   - Extends `@mailchimp/mailchimp_marketing` module using TypeScript declaration merging
   - Adds missing method signatures that exist in the SDK but not in @types
   - Defines TagSearchResults interface for tagSearch API responses

### Key Architectural Decisions

- **Pagination**: All merge field fetches loop until `total_items` reached to handle large audiences
- **EMAIL field filtering**: EMAIL field is excluded from copy operations (it's a default field)
- **Sequential processing**: Fields are copied one at a time to avoid rate limiting and provide clear progress
- **Error resilience**: Partial failures don't stop the entire operation; errors are collected and reported
- **Type safety**: Module augmentation in types.ts extends incomplete upstream type definitions

### Testing Strategy

Tests use vitest with comprehensive mocking - no live API key required.

- **test/mocks/mailchimp.ts** - Reusable mock factories
  - `createMockMailchimpClient()` - Returns client with vi.fn() for all methods
  - `createMockMergeField()` - Generates test merge field data
  - `createMockMergeFieldsResponse()` - Mocks paginated API responses
  - `createMockTag()` - Generates test tag data
  - `createMockTagSearchResponse()` - Mocks paginated tag search API responses

- **Test files:**
  - `test/merge-fields.test.ts` - 18 tests covering merge field operations
  - `test/tags.test.ts` - 18 tests covering tag comparison operations
  - All tests cover pagination, error handling, comparison logic, edge cases

### Important Implementation Details

1. **API Key Format**: Expected format is `{key}-{datacenter}` (e.g., `abc123-us10`)
2. **Module Type**: Package uses `"type": "module"` (ESM), all imports use `.js` extension
3. **Read-only Properties**: When copying fields, merge_id, list_id, and _links must be stripped before POST
4. **Prompts Behavior**: Prompts returns undefined for cancelled operations, requires explicit checks
5. **Mailchimp API**: Single account assumption - tool designed for copying between audiences in same account

## Running the CLI for Testing

```bash
# Build first
npm run build

# Merge fields - with interactive prompts
node dist/index.js merge-fields

# Merge fields - with CLI arguments
node dist/index.js merge-fields -k YOUR_KEY-us10 -s SOURCE_ID -t TARGET_ID

# Compare tags - with interactive prompts
node dist/index.js compare-tags

# Compare tags - with CLI arguments
node dist/index.js compare-tags -k YOUR_KEY-us10 -s SOURCE_ID -t TARGET_ID

# Install globally for system-wide testing
npm link
mailchimp-config-sync merge-fields
mailchimp-config-sync compare-tags
```

## Known Limitations

### Tags Cannot Be Synced

**Why tags can't be copied between audiences:**
- Mailchimp's API provides no "create tag" endpoint
- Tags only exist when applied to audience members via POST `/lists/{list_id}/members/{subscriber_hash}/tags`
- They are member metadata, not standalone audience configuration
- The UI may show a tag creation interface, but internally it just creates an empty tag reference

**What the compare-tags command does:**
- Reads tags from both audiences using the `tagSearch` API endpoint
- Compares tags by name (IDs are audience-specific and cannot be matched)
- Returns three lists: sourceOnly (missing in target), targetOnly (extra in target), and common
- Provides visibility/audit capability so users can see what tags exist where

**Workaround for migrating tags:**
To establish tags in a target audience, you must apply them to members:
1. Use compare-tags command to see which tags are missing in target
2. Manually create tags in target audience UI by tagging at least one member with each tag name
3. Alternatively: Export/import members with their tags from source to target

**Impact on segments:**
- Tag-based segments CAN be synced if the required tags already exist in the target audience
- Users can run compare-tags first, manually create missing tags in UI, then sync tag-based segments
- Campaign activity conditions still can't be synced (campaign IDs differ between audiences)

## Adding New Features

When extending to support other Mailchimp resources (interest categories, signup forms, etc.):

1. Create a new module in `src/` following the merge-fields.ts pattern
2. Add command to src/index.ts using Commander's `.command()`
3. Implement pagination if the resource supports it (check total_items in response)
4. Add type extensions in src/types.ts if SDK methods are missing from @types
5. Create test file in `test/` with mock factories in `test/mocks/`
6. Follow the same error handling pattern: continue on partial failures, collect errors, report at end
