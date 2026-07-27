class UBB {
    constructor(btnArea, textArea, owner) {
        this.btnArea = btnArea;
        this.textArea = textArea;
        this.owner = owner;
        this.alterCallback = null;
        this.init();
    }

    static escapeHTML(text) {
        if (text === null || text === undefined) {
            return '';
        }
        return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    static parseStyleAttributes(attrString, defaultProp) {
        const permittedProps = [
            'display', 'height', 'width', 'border', 'border-top', 'border-bottom',
            'border-left', 'border-right', 'padding', 'padding-top', 'padding-bottom',
            'padding-left', 'padding-right', 'background-color', 'margin', 'margin-top',
            'margin-bottom', 'margin-left', 'margin-right', 'color', 'font-size',
            'overflow', 'overflow-x', 'overflow-y', 'align', 'valign', 'colspan', 'float'
        ];

        const styles = {};
        if (attrString) {
            const parts = attrString.split('|');
            if (parts[0] && !parts[0].includes('=')) {
                styles[defaultProp] = parts.shift().trim();
            }
            parts.forEach(part => {
                const [key, value] = part.split('=', 2);
                if (key && value) {
                    const trimmedKey = key.trim().toLowerCase();
                    if (permittedProps.includes(trimmedKey)) {
                        styles[trimmedKey] = value.trim();
                    }
                }
            });
        }
        return styles;
    }

    static LabelType = {
        a: { num: 1, note: '锚标', express: (attrs) => `<a name="${attrs}"></a>` },
        b: { num: 2, note: '粗体', express: (content) => `<b>${content}</b>` },
        i: { num: 2, note: '斜体', express: (content) => `<i>${content}</i>` },
        u: { num: 2, note: '带下划线', express: (content, attrs) => attrs ? `<u title="${UBB.escapeHTML(attrs.slice(0, 200))}" style="cursor:pointer">${content}</u>` : `<u>${content}</u>` },
        s: { num: 2, note: '带删除线', express: (content) => `<s>${content}</s>` },
        sup: { num: 2, note: '上标', inSelf: true, express: (content) => `<sup>${content}</sup>` },
        sub: { num: 2, note: '下标', inSelf: true, express: (content) => `<sub>${content}</sub>` },
        div: {
            num: 2, note: '块', inSelf: true, express: (content, attrs) => {
                const styleObj = UBB.parseStyleAttributes(attrs, 'background-color');
                if (styleObj.float === 'left') {
                    styleObj.clear = 'left';
                }
                const style = Object.entries(styleObj)
                    .sort((a, b) => a[0].localeCompare(b[0])) // Sort for consistent output
                    .map(([key, value]) => `${key}:${UBB.escapeHTML(value)};`)
                    .join('');
                return `<div style="${style}">${content}</div>`;
            }
        },
        color: { num: 2, note: '文字颜色', inSelf: true, express: (content, attrs) => `<span style="color:${attrs}">${content}</span>` },
        size: { num: 2, note: '文字尺寸', inSelf: true, express: (content, attrs) => `<font size="${attrs}">${content}</font>` },
        r: { num: 2, note: '禁止转义' },
        hr: { num: 1, note: '水平分隔线', express: () => `<hr>` },
        url: { num: 2, note: '链接', express: (content, attrs) => `<a href="${attrs.startsWith('http') ? '' : 'http://'}${attrs}" target="_blank" rel="noopener noreferrer">${content}</a>` },
        article: { num: 2, note: '帖子链接', express: (content, attrs) => `<a class="atcllink" data-atclid="${attrs}">${content}</a>` },
        user: { num: 1, note: '召唤用户', express: (attrs) => `<a class="userlink" data-userid="${attrs}">[@……]</a>` },
        pic: { num: 1, note: '图片', express: (attrs) => `<img src="${attrs}"/>` },
        title: { num: 2, notIn: ['color', 'url', 'b', 'i', 'u', 'size'], express: (content) => `<div class="toggle-title" style="cursor: pointer;">${content.replace(/\n/g, '')}</div>` },
        content: { num: 2, inSelf: true, express: (content) => `<div class="toggle-content" style="display: none;">${content}</div>` },
        toggle: { num: 2, noText: true, inSelf: true, express: (content, attrs) => `<div class="toggle">${content}</div>` },
        table: { num: 2, noText: true, express: (content) => `<table class="common" align="center"><tbody>${content}</tbody></table>` },
        tr: { num: 2, mustIn: 'table', express: (content) => `<tr>${content}</tr>` },
        td: { num: 2, mustIn: 'tr', express: (content) => `<td>${content}</td>` },
        select: { num: 2, noText: true, inSelf: true, express: (content, attrs) => `<div class="select" data-mode="${attrs || '0'}"><div class="head"></div><div class="body">${content}</div></div>` },
        choice: { num: 2, mustIn: 'select', inSelf: true, express: (content, attrs) => `<div class="choice" data-sel="${attrs || 'off'}">${content}</div>` },
        goto: { num: 2, note: '页内跳转', express: (content, attrs) => `<a href="javascript:;" onclick="UBB.goto(this, '${attrs}')">${content}</a>` },
        tabs: {
            num: 2,
            express: (content) => {
                const buttons = [];
                const contents = [];
                const tabRegex = /<!--tab-title:([^>]+)-->([\s\S]*?)<!--\/tab-->/g;
                let match;
                while ((match = tabRegex.exec(content)) !== null) {
                    buttons.push(match[1]);
                    contents.push(match[2]);
                }

                const buttonsHtml = buttons.map((title, index) =>
                    `<button class="tab-button${index === 0 ? ' active' : ''}" onclick="UBB.switchTab(this, ${index})">${UBB.escapeHTML(title)}</button>`
                ).join('');

                const contentsHtml = contents.map((tabContent, index) =>
                    `<div class="tab-content" style="display: ${index === 0 ? 'block' : 'none'};">${tabContent}</div>`
                ).join('');

                return `<div class="tabs"><div class="tab-buttons">${buttonsHtml}</div><div class="tab-contents">${contentsHtml}</div></div>`;
            }
        },
        tab: { num: 2, mustIn: 'tabs', express: (content, attrs) => `<!--tab-title:${attrs}-->${content}<!--/tab-->` },
        emote: { num: 1, re: /\[em(\d{1,2})\]/i, note: '表情', express: (_, attrs) => `<img src="emote/em${attrs}.gif">` }
    };

    init() {
        if (!this.btnArea) return;
        this.btnArea.innerHTML = '';
        const labelProto = {
            insert: (label) => {
                const selStart = this.textArea.selectionStart, selEnd = this.textArea.selectionEnd;
                const content = this.textArea.value, selectedText = content.substring(selStart, selEnd);

                if (label.name === 'toggle') {
                    const titleText = selectedText || 'TITLE';
                    const finalTag = `[toggle=off][title]${titleText}[/title][content]CONTENT[/content][/toggle]`;
                    this.textArea.value = content.substring(0, selStart) + finalTag + content.substring(selEnd);
                    this.textArea.focus();
                    const contentStart = this.textArea.value.indexOf('CONTENT', selStart);
                    this.textArea.selectionStart = contentStart;
                    this.textArea.selectionEnd = contentStart + 'CONTENT'.length;
                } else {
                    const startTag = `[${label.name}${label.num === 2 && label.name !== 'b' && label.name !== 'i' && label.name !== 'u' ? `=${label.content || ''}` : ''}]`;
                    const endTag = label.num === 1 ? '' : `[/${label.name}]`;
                    const finalTag = `${startTag}${selectedText || (label.content || '')}${endTag}`;
                    this.textArea.value = content.substring(0, selStart) + finalTag + content.substring(selEnd);
                    this.textArea.focus();
                    this.textArea.selectionStart = selStart + startTag.length;
                    this.textArea.selectionEnd = selStart + startTag.length + (selectedText || (label.content || '')).length;
                }
            }
        };

        for (const name in UBB.LabelType) {
            const label = { ...UBB.LabelType[name], name };
            if (label.static || label.re || name === 'r' || name === 'tab') continue;
            const btn = document.createElement('span');
            btn.className = 'btn';
            btn.title = label.note;
            btn.textContent = name;
            btn.addEventListener('click', () => labelProto.insert(label));
            this.btnArea.appendChild(btn);
        }
    }

    express(text, isRecursiveCall = false) {
        if (!isRecursiveCall) {
            const r_contents = [];
            const placeholder = (index) => `__R_PLACEHOLDER_${index}__`;

            const singleTagRegex = /^\[(\/)?([a-z]+)(?:=[^\]]*)?\]$/i;

            text = text.replace(/\[r\]([\s\S]*?)\[\/r\]/gi, (match, content) => {
                const trimmedContent = content.trim();
                const tagMatch = trimmedContent.match(singleTagRegex);

                let html;
                // Check if the trimmed content is a single, valid UBB tag.
                if (tagMatch && UBB.LabelType[tagMatch[2].toLowerCase()]) {
                     html = content; // Return original content with spaces
                } else {
                    html = `[r]${this.express(content, true)}[/r]`;
                }

                const index = r_contents.push(html) - 1;
                return placeholder(index);
            });
            this.r_contents = r_contents;
            this.placeholder = placeholder;
        }

        const stack = [{ tag: null, content: '' }];
        const tagRegex = /\[(\/)?([a-z]+)(?:=([^\]]*))?\]|\[em(\d{1,2})\]/ig;

        let lastIndex = 0;
        let match;

        while ((match = tagRegex.exec(text)) !== null) {
            const leadingText = text.substring(lastIndex, match.index);
            if (leadingText) {
                stack[stack.length - 1].content += UBB.escapeHTML(leadingText);
            }
            lastIndex = tagRegex.lastIndex;

            const tagContent = match[0];
            const isClosing = !!match[1];
            const tagName = match[2] ? match[2].toLowerCase() : (match[4] ? 'emote' : null);
            const attrs = match[3] || (match[4] || '');
            const tagDef = tagName ? UBB.LabelType[tagName] : null;

            if (!tagDef || tagName === 'r') {
                stack[stack.length - 1].content += UBB.escapeHTML(tagContent);
                continue;
            }

            if (isClosing) {
                if (stack.length > 1 && stack[stack.length - 1].tag === tagName) {
                    const closed = stack.pop();
                    const grandParent = stack[stack.length - 1];
                    const html = tagDef.express(closed.content, closed.attrs);
                    grandParent.content += html;
                } else {
                    stack[stack.length - 1].content += UBB.escapeHTML(tagContent);
                }
            } else {
                if (tagDef.num === 1) {
                    stack[stack.length - 1].content += tagDef.express(attrs);
                } else {
                    stack.push({ tag: tagName, attrs: attrs, content: '' });
                }
            }
        }

        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            stack[stack.length - 1].content += UBB.escapeHTML(remainingText);
        }

        while (stack.length > 1) {
            const unclosed = stack.pop();
            const parent = stack[stack.length - 1];
            const originalTag = `[${unclosed.tag}${unclosed.attrs ? '=' + unclosed.attrs : ''}]`;
            parent.content += UBB.escapeHTML(originalTag) + unclosed.content;
        }

        let finalHtml = stack[0].content;

        if (!isRecursiveCall) {
            if(this.r_contents){
                this.r_contents.forEach((html, index) => {
                    finalHtml = finalHtml.replace(UBB.escapeHTML(this.placeholder(index)), html);
                });
            }
            finalHtml = finalHtml.replace(/\n/g, '<br />');
        }

        return finalHtml;
    }

    static switchTab(button, index) {
        const tabButtons = button.parentElement;
        const tabsContainer = tabButtons.parentElement;
        const tabContents = tabsContainer.querySelector('.tab-contents');

        Array.from(tabButtons.children).forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        Array.from(tabContents.children).forEach((content, i) => {
            content.style.display = i === index ? 'block' : 'none';
        });
    }

    static goto(element, anchorName) {
        const dom = element.closest('#output') || document;
        const target = dom.querySelector(`a[name="${anchorName}"]`);

        if (target) {
            let current = target.parentElement;
            const parents = [];
            while (current && current !== dom) {
                parents.unshift(current);
                current = current.parentElement;
            }

            parents.forEach(parent => {
                if (parent.classList.contains('toggle-content') && parent.style.display === 'none') {
                    parent.previousElementSibling?.click();
                }
                if (parent.classList.contains('tab-content') && parent.style.display === 'none') {
                    const tabsContainer = parent.closest('.tabs');
                    const tabIndex = Array.from(parent.parentElement.children).indexOf(parent);
                    tabsContainer.querySelector(`.tab-buttons > .tab-button:nth-child(${tabIndex + 1})`)?.click();
                }
            });

            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    awake(dom) {
        dom.querySelectorAll('.toggle-title').forEach(title => {
            title.onclick = () => {
                const content = title.nextElementSibling;
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            };
        });
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = UBB;
}
