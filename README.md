# Website to PDF

This is a simple tool to convert a list of URLs to a single PDF file.
It will recursively crawl the website, following links and converting each page to be merged into a single PDF.

## Usage

1. Install dependencies: `npm install`
2. Configure: config.ts
   1. urls: Array of URLs to convert to PDF
   2. outputFile: Path to save the output PDF file
3. Build: `npm run build`
4. Start: `npm run start`

