import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generatePdf(html: string, name = 'document'): Promise<Buffer> {
    this.logger.debug(`Generating PDF for: ${name}`);

    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'networkidle' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '18mm', right: '20mm', bottom: '18mm', left: '20mm' },
        printBackground: true,
        displayHeaderFooter: false,
      });

      this.logger.log(`PDF generated for: ${name} (${pdf.length} bytes)`);
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
