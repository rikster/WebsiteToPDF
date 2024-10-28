export interface WebsiteConfig {
  urls: string[];
  outputFile: string;
}

export const config: WebsiteConfig = {
  urls: [
    'https://docs.fatzebra.com/docs/download-transactions',
    'https://docs.fatzebra.com/docs/settlement-summary-report-1'
  ],
  outputFile: 'fatzebra-docs.pdf'
};

