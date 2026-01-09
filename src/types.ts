import type { lists, ErrorResponse } from '@mailchimp/mailchimp_marketing';

export interface TagSearchResults {
  tags: lists.Tags[];
  total_items: number;
  _links?: any[];
}

declare module '@mailchimp/mailchimp_marketing' {
  namespace lists {
    function addListMergeField(
      listId: string,
      body: Partial<MergeField>
    ): Promise<MergeField | ErrorResponse>;

    function getListMergeField(
      listId: string,
      mergeId: string
    ): Promise<MergeField | ErrorResponse>;

    function tagSearch(
      listId: string,
      opts?: { name?: string; count?: number; offset?: number }
    ): Promise<TagSearchResults | ErrorResponse>;
  }
}
