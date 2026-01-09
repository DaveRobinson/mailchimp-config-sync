# Mailchimp Config Sync

A zero-config CLI tool for syncing configuration between Mailchimp audiences. Currently supports copying merge fields with an interactive selection interface.

## Features

- **Zero Configuration**: No config files needed - just your API key
- **Interactive Selection**: Browse merge fields and choose which to copy
- **Smart Comparison**: Automatically identifies which fields already exist in the target
- **Pagination Support**: Handles audiences with large numbers of merge fields
- **Type Safe**: Built with TypeScript for reliability
- **No Live API Required for Tests**: Comprehensive test suite with mocked API calls

## Installation

### Using npm (Local)

```bash
npm install
npm run build
npm link
```

### From Source

```bash
git clone <repository-url>
cd mailchimp-config-sync
npm install
npm run build
```

## Usage

### Basic Usage

Run the CLI and follow the interactive prompts:

```bash
mailchimp-config-sync merge-fields
```

You'll be prompted for:
1. Your Mailchimp API key (hidden input)
2. Source audience ID
3. Target audience ID
4. Which merge fields to copy (multi-select)

### With API Key Parameter

Pass your API key directly to skip the prompt:

```bash
mailchimp-config-sync merge-fields --api-key YOUR_API_KEY-us10
```

Or using the short form:

```bash
mailchimp-config-sync merge-fields -k YOUR_API_KEY-us10
```

### Example Session

```bash
$ mailchimp-config-sync merge-fields

? Enter your Mailchimp API key: ••••••••••••••••••••••••••
? Enter source audience ID: abc123
? Enter target audience ID: def456

Fetching merge fields...

Merge fields status:
  ✓ Already exists: FNAME (First Name) - text
  ✓ Already exists: LNAME (Last Name) - text
  ○ Available to copy: PHONE (Phone Number) - phone
  ○ Available to copy: BIRTHDAY (Birthday) - birthday
  ○ Available to copy: COMPANY (Company) - text

? Select merge fields to copy: (Space to select, Enter to confirm)
  ◉ PHONE - Phone Number (phone)
  ◯ BIRTHDAY - Birthday (birthday)
  ◉ COMPANY - Company (text)

Copying 2 merge field(s)...
✓ Created merge field: PHONE (Phone Number)
✓ Created merge field: COMPANY (Company)

✓ Successfully copied 2 merge field(s)
```

## Getting Your Mailchimp API Key

1. Log in to your Mailchimp account
2. Go to **Account > Extras > API Keys**
3. Create a new API key or use an existing one
4. Your API key format will be: `key-datacenter` (e.g., `abc123xyz-us10`)

The datacenter (the part after the dash) is automatically extracted from your API key.

**Note**: This tool works with multiple audiences within the same Mailchimp account.

## Getting Audience IDs

1. In Mailchimp, go to **Audience > All contacts**
2. Click **Settings > Audience name and defaults**
3. Look for **Audience ID** on the right side

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Watch Mode

Auto-rebuild on changes:

```bash
npm run dev
```

### Project Structure

```
src/
├── index.ts              # CLI entry point with Commander
├── mailchimp-client.ts   # Mailchimp API client wrapper
├── merge-fields.ts       # Merge field operations
└── types.ts              # TypeScript type extensions

test/
├── mocks/
│   └── mailchimp.ts      # Mock factories for testing
├── mailchimp-client.test.ts
└── merge-fields.test.ts
```

## Testing

Tests use **vitest** with comprehensive mocking - no live API key required.

### Run Tests

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

### Test Coverage

Current coverage: **95.55%**

- 18 tests across 2 test suites
- All merge field operations tested
- Pagination, error handling, and edge cases covered

## API

### Merge Fields Operations

The tool automatically handles:

- **Pagination**: Fetches all merge fields regardless of count
- **Filtering**: Excludes the default EMAIL field from copy operations
- **Error Handling**: Continues copying even if some fields fail
- **Validation**: Prevents duplicate fields in the target audience

### Supported Merge Field Types

All Mailchimp merge field types are supported:
- text
- number
- address
- phone
- date
- url
- imageurl
- radio
- dropdown
- birthday
- zip

## Limitations

- Currently only supports merge fields (not other audience settings)
- Does not copy field values, only field definitions
- Designed for copying between audiences in the same Mailchimp account

## Troubleshooting

### Invalid API Key Format

```
Error: Invalid API key format. Expected format: key-server
```

Make sure your API key includes the datacenter suffix (e.g., `-us10`).

### Field Already Exists

If a field with the same tag already exists in the target audience, it will be marked as "Already exists" and skipped from the selection list.

## License

MIT

## Contributing

Contributions welcome! Please ensure tests pass before submitting PRs:

```bash
npm test
npm run build
```
