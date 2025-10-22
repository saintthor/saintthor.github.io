const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Load the test page
    const filePath = path.resolve(__dirname, 'test.html');
    await page.goto(`file://${filePath}`);

    // Click the generate button
    await page.click('button:has-text("Generate")');

    // Get the generated HTML
    const outputHtml = await page.evaluate(() => document.getElementById('output').innerHTML);

    // Define the expected HTML
    const expected = `<div style="background-color:#ffffcc;float:right;width:400px;">test div float right</div>\n<div style="background-color:#ccffff;float:left;width:400px;clear:left;">test div float left</div>\n&lt;b&gt;\n<b>bold</b>\n&lt;r&gt;[b]bold[/b]&lt;/r&gt;\n&lt;r&gt;some text&lt;/r&gt;\n&lt;b&gt;&lt;/b&gt;\n<div class="toggle"><div class="toggle-title" style="cursor: pointer;">Click to open</div><div class="toggle-content" style="display: none;">Here is the content.</div></div>\n<a name="anchor1"></a>This is an anchor.\nYou can jump to it using <a href="javascript:;" onclick="UBB.goto(this, 'anchor1')">this link</a>.\n\n<div class="tabs"><div class="tab-buttons"><button class="tab-button active" onclick="UBB.switchTab(this, 0)">Tab1</button><button class="tab-button" onclick="UBB.switchTab(this, 1)">Tab2</button></div><div class="tab-contents"><div class="tab-content" style="display: block;">Content of tab 1. <a name="anchor2"></a>Anchor in tab 1</div><div class="tab-content" style="display: none;">Content of tab 2. You can jump to <a href="javascript:;" onclick="UBB.goto(this, 'anchor2')">anchor in tab 1</a>.</div></div></div>`;

    // Compare the generated HTML with the expected HTML
    try {
        assert.strictEqual(outputHtml.trim(), expected.trim(), 'Initial content rendering is incorrect.');
        console.log('Initial content rendering test passed.');
    } catch (error) {
        console.error('Initial content rendering test failed:');
        console.error('Expected:\n', expected.trim());
        console.error('Actual:\n', outputHtml.trim());
        await browser.close();
        process.exit(1);
    }

    // Test [goto] functionality with hidden tabs
    // 1. Switch to Tab2
    await page.click('button:has-text("Tab2")');
    // 2. Click the link to go to anchor2 (which is in hidden Tab1)
    await page.click('a:has-text("anchor in tab 1")');
    // 3. Check if Tab1 is now active
    const tab1ButtonClass = await page.getAttribute('button:has-text("Tab1")', 'class');
    const tab1ContentStyle = await page.getAttribute('.tab-content', 'style');

    try {
        assert(tab1ButtonClass.includes('active'), 'Tab1 button should be active after goto.');
        assert(tab1ContentStyle.includes('display: block'), 'Tab1 content should be visible after goto.');
        console.log('[goto] functionality with hidden tabs test passed.');
    } catch (error) {
        console.error('[goto] functionality with hidden tabs test failed:');
        console.error('Tab1 Button Class:', tab1ButtonClass);
        console.error('Tab1 Content Style:', tab1ContentStyle);
        await browser.close();
        process.exit(1);
    }

    // Test toggle button functionality
    await page.fill('textarea', 'Selected Text');
    await page.evaluate(() => {
        const textarea = document.getElementById('input');
        textarea.select();
    });
    await page.click('button:has-text("Toggle")');
    const textareaValue = await page.evaluate(() => document.getElementById('input').value);
    const expectedTextareaValue = `[toggle=off][title]Selected Text[/title][content]CONTENT[/content][/toggle]`;

    try {
        assert.strictEqual(textareaValue, expectedTextareaValue, 'Toggle button did not insert correct UBB code.');

        // Verify selection
        const selection = await page.evaluate(() => {
            const textarea = document.getElementById('input');
            return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
        });
        assert.strictEqual(selection, 'CONTENT', 'The word "CONTENT" should be selected after toggle button click.');

        console.log('Toggle button functionality test passed.');
    } catch(error) {
        console.error('Toggle button functionality test failed:');
        console.error('Expected Textarea Value:\n', expectedTextareaValue);
        console.error('Actual Textarea Value:\n', textareaValue);
        await browser.close();
        process.exit(1);
    }


    await browser.close();
    console.log('All tests passed!');
})();