const UBB = require('./ubb.js');
const ubb = new UBB();

const testInput = `[div=#ffffcc|float=right|width=400px]test div float right[/div]
[div=#ccffff|float=left|width=400px]test div float left[/div]
[r][b][/r]
[b]bold[/b]
[r][b]bold[/b][/r]
[r]some text[/r]
[r][b][/r][r][/b][/r]
[toggle=off][title]Click to open[/title][content]Here is the content.[/content][/toggle]
[a=anchor1]This is an anchor.[/a]
You can jump to it using [goto=anchor1]this link[/goto].

[tabs]
[tab=Tab1]Content of tab 1. [a=anchor2]Anchor in tab 1[/a][/tab]
[tab=Tab2]Content of tab 2. You can jump to [goto=anchor2]anchor in tab 1[/goto].[/tab]
[/tabs]`;

const expected = `<div style="background-color:#ffffcc;float:right;width:400px;">test div float right</div><br />
<div style="background-color:#ccffff;clear:left;float:left;width:400px;">test div float left</div><br />
&lt;b&gt;<br />
<b>bold</b><br />
&lt;r&gt;<b>bold</b>&lt;/r&gt;<br />
&lt;r&gt;some text&lt;/r&gt;<br />
&lt;r&gt;<b></b>&lt;/r&gt;<br />
<div class="toggle"><div class="toggle-title" style="cursor: pointer;">Click to open</div><div class="toggle-content" style="display: none;">Here is the content.</div></div><br />
<a name="anchor1"></a>This is an anchor.&lt;/a&gt;<br />
You can jump to it using <a href="javascript:;" onclick="UBB.goto(this, 'anchor1')">this link</a>.<br />
<br />
<div class="tabs"><div class="tab-buttons"><button class="tab-button active" onclick="UBB.switchTab(this, 0)">Tab1</button><button class="tab-button" onclick="UBB.switchTab(this, 1)">Tab2</button></div><div class="tab-contents"><div class="tab-content" style="display: block;">Content of tab 1. <a name="anchor2"></a>Anchor in tab 1&lt;/a&gt;</div><div class="tab-content" style="display: none;">Content of tab 2. You can jump to <a href="javascript:;" onclick="UBB.goto(this, 'anchor2')">anchor in tab 1</a>.</div></div></div>`;

try {
    const output = ubb.express(testInput);

    const sortStyles = (html) => {
        return html.replace(/style="([^"]+)"/g, (match, styles) => {
            const sorted = styles.split(';').filter(s => s).sort().join(';');
            return `style="${sorted};"`;
        });
    };

    const sortedOutput = sortStyles(output);
    const sortedExpected = sortStyles(expected);

    console.log('--- UBB Output (Styles Sorted) ---');
    console.log(sortedOutput);
    console.log('---------------------------------');

    const normalize = (str) => str.replace(/\s+/g, '').replace(/<br\s*\/?>/g, '');

    if (normalize(sortedOutput) === normalize(sortedExpected)) {
        console.log('✅ TEST PASSED');
    } else {
        console.error('❌ TEST FAILED');
        console.error('Expected (normalized):\n', normalize(sortedExpected));
        console.error('Actual (normalized):\n', normalize(sortedOutput));
        console.error('\n--- Original Expected ---\n', expected.trim());
        console.error('\n--- Original Actual ---\n', output.trim());
        process.exit(1);
    }
} catch (e) {
    console.error('An error occurred during UBB processing:', e);
    process.exit(1);
}
