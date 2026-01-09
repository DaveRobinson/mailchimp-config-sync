import mailchimp from '@mailchimp/mailchimp_marketing';

export interface MailchimpConfig {
  apiKey: string;
  server: string;
}

export function createMailchimpClient(config: MailchimpConfig) {
  mailchimp.setConfig({
    apiKey: config.apiKey,
    server: config.server,
  });

  return mailchimp;
}

export function extractServerFromApiKey(apiKey: string): string {
  const parts = apiKey.split('-');
  if (parts.length !== 2) {
    throw new Error('Invalid API key format. Expected format: key-server');
  }
  return parts[1]!;
}
