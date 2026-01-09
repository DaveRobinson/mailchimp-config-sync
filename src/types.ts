import type { lists, ErrorResponse } from '@mailchimp/mailchimp_marketing';

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
  }
}
