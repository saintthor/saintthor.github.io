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
    await page.click('#generate');

    if (errorOccurred) {
      throw new Error("A JavaScript error occurred on the page. Check the console output.");
    }

    // --- Verification for [r] tag ---
    console.log('--- Verifying [r] tag ---');
    const outputHtml = await page.innerHTML('#output');

    // Expected outputs after single HTML escaping
    const expectedRContent = [
        '&lt;b&gt;',
        '&lt;/b&gt;',
        '&lt;r&gt;[b]invalid&lt;/b&gt;&lt;/r&gt;'
    ];

    for (const expected of expectedRContent) {
        if (!outputHtml.includes(expected)) {
            console.log('--- Actual HTML Output ---');
            console.log(outputHtml);
            console.log('--------------------------');
            throw new Error(`[r] tag verification failed. Expected to find "${expected}" in the output.`);
        }
        console.log(`  ✅ Found expected output: ${expected}`);
    }
    console.log('--- [r] tag verification PASSED ---');


    // --- Verification for toggle button ---
    console.log('\n--- Verifying toggle button functionality ---');
    const textArea = page.locator('#input');
    await textArea.fill('This is a test.');
    await textArea.selectText();

    const toggleButton = page.locator('#btnArea .btn', { hasText: 'toggle' });
    await toggleButton.click();

    const expectedToggleText = `[toggle=off][title]This is a test.[/title][content][/content][/toggle]`;
    const actualText = await textArea.inputValue();

    if (actualText !== expectedToggleText) {
        throw new Error(`Toggle button failed. Expected "${expectedToggleText}", but got "${actualText}".`);
    }
    console.log('  ✅ Toggle button correctly inserted the text.');

    const cursorPosition = await textArea.evaluate(el => el.selectionStart);
    const expectedCursorPosition = `[toggle=off][title]This is a test.[/title][content]`.length;
    if (cursorPosition !== expectedCursorPosition) {
        throw new Error(`Toggle button failed. Expected cursor at position ${expectedCursorPosition}, but it was at ${cursorPosition}.`);
    }
    console.log(`  ✅ Cursor position is correct at ${cursorPosition}.`);
    console.log('--- Toggle button verification PASSED ---');

    console.log('\n\n✅ All verifications passed!');

  } catch (error) {
    console.error(`\n\n❌ Verification FAILED: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
