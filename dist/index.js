"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer = __importStar(require("puppeteer"));
const url_1 = require("url");
class WebsiteToPDF {
    constructor(options) {
        this.visitedUrls = new Set();
        this.toVisit = new Set([options.baseUrl]);
        this.pageContents = [];
        this.domain = new url_1.URL(options.baseUrl).hostname;
        // Set default options
        this.options = {
            baseUrl: options.baseUrl,
            outputFile: options.outputFile,
            delayBetweenRequests: options.delayBetweenRequests || 1000,
            maxPages: options.maxPages || Infinity
        };
    }
    isValidUrl(url) {
        try {
            const parsedUrl = new url_1.URL(url);
            const invalidExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip'];
            return parsedUrl.hostname === this.domain &&
                !invalidExtensions.some(ext => url.toLowerCase().endsWith(ext));
        }
        catch {
            return false;
        }
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getLinks(page, url) {
        const links = new Set();
        try {
            const hrefs = await page.evaluate(() => {
                const anchors = document.querySelectorAll('a');
                return Array.from(anchors).map(a => a.href);
            });
            for (const href of hrefs) {
                try {
                    const fullUrl = new url_1.URL(href, url).toString();
                    if (this.isValidUrl(fullUrl)) {
                        links.add(fullUrl);
                    }
                }
                catch (e) {
                    console.error(`Error processing URL ${href}:`, e);
                }
            }
        }
        catch (e) {
            console.error(`Error getting links from ${url}:`, e);
        }
        return links;
    }
    async crawl() {
        const browser = await puppeteer.launch();
        try {
            const page = await browser.newPage();
            while (this.toVisit.size > 0 && this.visitedUrls.size < this.options.maxPages) {
                const currentUrl = Array.from(this.toVisit)[0];
                this.toVisit.delete(currentUrl);
                if (!this.visitedUrls.has(currentUrl)) {
                    console.log(`Crawling: ${currentUrl}`);
                    try {
                        await page.goto(currentUrl, { waitUntil: 'networkidle0' });
                        // Get page content
                        const html = await page.content();
                        const title = await page.title();
                        this.pageContents.push({
                            url: currentUrl,
                            html,
                            title
                        });
                        // Get all links from the current page
                        const newLinks = await this.getLinks(page, currentUrl);
                        for (const link of newLinks) {
                            if (!this.visitedUrls.has(link)) {
                                this.toVisit.add(link);
                            }
                        }
                        this.visitedUrls.add(currentUrl);
                        // Be nice to the server
                        await this.delay(this.options.delayBetweenRequests);
                    }
                    catch (e) {
                        console.error(`Error processing ${currentUrl}:`, e);
                    }
                }
            }
        }
        finally {
            await browser.close();
        }
    }
    async generatePDF() {
        console.log('Generating PDF...');
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--js-flags=--max-old-space-size=4096'
            ],
            headless: true,
            timeout: 60000
        });
        try {
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(120000);
            await page.setDefaultTimeout(120000);
            await page.setViewport({ width: 1200, height: 800 });
            const combinedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Website Archive</title>
          <style>
            body { 
              font-family: Arial, sans-serif;
              margin: 20px;
              padding: 20px;
            }
            .page-break { 
              page-break-after: always; 
              height: 0;
              margin: 0;
              border: none;
            }
            .page-header {
              border-bottom: 1px solid #ccc;
              margin-bottom: 20px;
              padding-bottom: 10px;
            }
            .page-url {
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          ${this.pageContents.map(content => `
            <div class="page-content">
              <div class="page-header">
                <h1>${content.title}</h1>
                <div class="page-url">${content.url}</div>
              </div>
              ${content.html}
            </div>
            <div class="page-break"></div>
          `).join('\n')}
        </body>
        </html>
      `;
            await page.setContent(combinedHtml, {
                waitUntil: ['load', 'networkidle0'],
                timeout: 120000
            });
            // Add a small delay before PDF generation
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.pdf({
                path: this.options.outputFile,
                format: 'A4',
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                },
                printBackground: true
            });
            console.log(`PDF generated: ${this.options.outputFile}`);
        }
        finally {
            await browser.close();
        }
    }
}
// Example usage
async function main() {
    const crawler = new WebsiteToPDF({
        baseUrl: 'https://docs.fatzebra.com/docs/',
        outputFile: 'fatzebra_docs.pdf',
        delayBetweenRequests: 1000,
        maxPages: 100
    });
    try {
        await crawler.crawl();
        await crawler.generatePDF();
    }
    catch (error) {
        console.error('Error:', error);
    }
}
if (require.main === module) {
    main();
}
exports.default = WebsiteToPDF;
