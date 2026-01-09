# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-config CLI tool for syncing configuration between Mailchimp audiences. Currently supports copying merge fields with an interactive selection interface. Built with TypeScript, Commander.js for CLI, and Prompts for interactive UX.

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

The codebase is split into three main modules:

1. **src/index.ts** - CLI entry point
   - Uses Commander.js for command parsing
   - Prompts for API key and audience IDs if not provided
   - Orchestrates the interactive merge field selection flow
   - Handles user input validation and cancellation

2. **src/merge-fields.ts** - Core business logic
   - `listMergeFields()` - Fetches all merge fields with automatic pagination (handles 1000+ fields)
   - `compareMergeFields()` - Compares source and target audiences, returns diff showing what exists vs. available
   - `copyMergeFields()` - Copies selected fields sequentially, continues on partial failures
   - `createMergeField()` - Creates individual merge field, strips read-only properties (merge_id, list_id, _links)

3. **src/mailchimp-client.ts** - API client wrapper
   - `createMailchimpClient()` - Configures Mailchimp SDK with API key and server
   - `extractServerFromApiKey()` - Parses datacenter from API key format (key-datacenter)

4. **src/types.ts** - Type extensions
   - Extends `@mailchimp/mailchimp_marketing` module using TypeScript declaration merging
   - Adds missing method signatures that exist in the SDK but not in @types

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

- **Test coverage**: 95.55% with 18 tests covering pagination, error handling, comparison logic, and partial failures

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

# Test with prompts
node dist/index.js merge-fields

# Test with API key parameter
node dist/index.js merge-fields -k YOUR_KEY-us10

# Install globally for system-wide testing
npm link
mailchimp-config-sync merge-fields
```

## Adding New Features

When extending to support other Mailchimp resources (interest categories, signup forms, etc.):

1. Create a new module in `src/` following the merge-fields.ts pattern
2. Add command to src/index.ts using Commander's `.command()`
3. Implement pagination if the resource supports it (check total_items in response)
4. Add type extensions in src/types.ts if SDK methods are missing from @types
5. Create test file in `test/` with mock factories in `test/mocks/`
6. Follow the same error handling pattern: continue on partial failures, collect errors, report at end
