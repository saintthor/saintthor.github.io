const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let errorOccurred = false;

  page.on('pageerror', error => {
    console.error(`[Browser Page Error]: ${error.message}`);
    errorOccurred = true;
  });

  try {
    const filePath = `file://${process.cwd()}/test.html`;
    await page.goto(filePath);

    // Give the script a moment to render.
    await page.waitForTimeout(500);

    if (errorOccurred) {
      throw new Error("A JavaScript error occurred on the page. Check the console output.");
    }

    // --- Verification for [div] tag ---
    console.log('--- Verifying [div] tag ---');
    const divElement = await page.locator('#output .common').first();
    const styleAttribute = await divElement.getAttribute('style');

    if (!styleAttribute) throw new Error('[div] tag did not render a style attribute.');

    const expectedStyles = {
        'background-color': '#ffffcc',
        'float': 'right',
        'width': '400px'
    };

    for (const [key, value] of Object.entries(expectedStyles)) {
        if (!styleAttribute.includes(`${key}:${value}`)) {
            throw new Error(`[div] style mismatch. Expected "${key}:${value}" in "${styleAttribute}"`);
        }
        console.log(`  ✅ Style correct: ${key}:${value}`);
    }
    console.log('--- [div] tag verification PASSED ---');


    // --- Verification for [r] tag ---
    console.log('\n--- Verifying [r] tag ---');
    const outputHtml = await page.innerHTML('#output');

    // Check that the nested [b] tag was NOT rendered as an element.
    const bTagCount = await page.locator('#output b').count();
    if (bTagCount > 0) {
        throw new Error(`[r] tag failed: It rendered a nested <b> tag when it should have been escaped.`);
    }
    console.log('  ✅ No <b> element found inside output.');

    // Check that the text content was correctly escaped and is present.
    const expectedEscapedText = '[b]This bold tag should NOT be rendered.[/b]';
    if (!outputHtml.includes(expectedEscapedText)) {
        throw new Error(`[r] tag failed: The escaped content "${expectedEscapedText}" was not found in the output HTML.`);
    }
    console.log(`  ✅ Escaped text found: "${expectedEscapedText}"`);
    console.log('--- [r] tag verification PASSED ---');

    console.log('\n\n✅ All verifications passed!');

  } catch (error) {
    console.error(`\n\n❌ Verification FAILED: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
