import type { lists, ErrorResponse } from '@mailchimp/mailchimp_marketing';
import { vi } from 'vitest';

export function createMockList(overrides: Partial<lists.List> = {}): lists.List {
  return {
    id: 'test-list-id',
    web_id: 12345,
    name: 'Test List',
    contact: {
      company: 'Test Company',
      address1: '123 Test St',
      address2: '',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      country: 'US',
      phone: '',
    },
    permission_reminder: 'You are receiving this email because you signed up.',
    use_archive_bar: true,
    campaign_defaults: {
      from_name: 'Test Sender',
      from_email: 'test@example.com',
      subject: 'Test Subject',
      language: 'en',
    },
    notify_on_subscribe: false,
    notify_on_unsubscribe: false,
    date_created: '2024-01-01T00:00:00+00:00',
    list_rating: 0,
    email_type_option: false,
    subscribe_url_short: 'http://eepurl.com/test',
    subscribe_url_long: 'http://test.us1.list-manage.com/subscribe',
    beamer_address: 'test@inbound.mailchimp.com',
    visibility: 'pub' as lists.ListVisibility,
    double_optin: false,
    has_welcome: false,
    marketing_permissions: false,
    modules: [],
    stats: {
      member_count: 100,
      total_contacts: 100,
      unsubscribe_count: 0,
      cleaned_count: 0,
      member_count_since_send: 0,
      unsubscribe_count_since_send: 0,
      cleaned_count_since_send: 0,
      campaign_count: 0,
      campaign_last_sent: '',
      merge_field_count: 5,
      avg_sub_rate: 0,
      avg_unsub_rate: 0,
      target_sub_rate: 0,
      open_rate: 0,
      click_rate: 0,
      last_sub_date: '',
      last_unsub_date: '',
    },
    _links: [],
    ...overrides,
  };
}

export function createMockMergeField(overrides: Partial<lists.MergeField> = {}): lists.MergeField {
  return {
    merge_id: 1,
    tag: 'TEST',
    name: 'Test Field',
    type: 'text',
    required: false,
    default_value: '',
    public: true,
    display_order: 1,
    options: {
      default_country: 156,
      phone_format: '',
      date_format: '',
      choices: [],
      size: 25,
    },
    help_text: '',
    list_id: 'test-list-id',
    _links: [],
    ...overrides,
  };
}

export function createMockTag(overrides: Partial<lists.Tags> = {}): lists.Tags {
  return {
    id: 1,
    name: 'Test Tag',
    ...overrides,
  };
}

export function createMockMailchimpClient() {
  return {
    setConfig: vi.fn(),
    lists: {
      getAllLists: vi.fn(),
      getListMergeFields: vi.fn(),
      getListMergeField: vi.fn(),
      addListMergeField: vi.fn(),
      updateListMergeField: vi.fn(),
      deleteListMergeField: vi.fn(),
      tagSearch: vi.fn(),
    },
  };
}

export function createMockListsResponse(
  listItems: lists.List[]
): lists.ListsSuccessResponse {
  return {
    lists: listItems,
    total_items: listItems.length,
    constraints: {
      may_create: true,
      max_instances: 100,
      current_total_instances: listItems.length,
    },
    _links: [],
  };
}

export function createMockMergeFieldsResponse(
  fields: lists.MergeField[]
): lists.MergeFieldSuccessResponse {
  return {
    merge_fields: fields,
    list_id: 'test-list-id',
    total_items: fields.length,
    _links: [],
  };
}

export function createMockTagSearchResponse(
  tags: lists.Tags[]
): { tags: lists.Tags[]; total_items: number; _links: any[] } {
  return {
    tags,
    total_items: tags.length,
    _links: [],
  };
}

export function createMockErrorResponse(
  status: number,
  detail: string
): ErrorResponse {
  return {
    type: 'error',
    title: 'Error',
    status,
    detail,
    instance: '',
  };
}
