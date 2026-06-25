import puppeteer from 'puppeteer'

/**
 * Fetch rendered HTML and extracted text from a URL using a headless browser.
 * Used as fallback when regular fetch returns JS-only pages.
 */
export async function fetchRenderedHtml(url: string): Promise<{ html: string; text: string }> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    })

    // Wait for late-loading content
    await new Promise(resolve => setTimeout(resolve, 2000))

    const html = await page.content()
    const text = await page.evaluate(() => document.body.innerText)
    return { html, text }
  } finally {
    await browser.close()
  }
}
