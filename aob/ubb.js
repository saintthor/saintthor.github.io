class UBB {
    constructor(btnArea, textArea, owner) {
        this.btnArea = btnArea;
        this.textArea = textArea;
        this.owner = owner;
        this.alterCallback = null;
        this.init();
    }

    static escapeHTML(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    static LabelType = {
        a: { num: 1, note: '锚标', express: (attrs) => `<a name="${attrs}" style="display: inline-block; width: 1px; height: 1px;"></a>` },
        b: { num: 2, note: '粗体', express: (content) => `<b>${content}</b>` },
        i: { num: 2, note: '斜体', express: (content) => `<i>${content}</i>` },
        u: { num: 2, note: '带下划线', express: (content, attrs) => attrs ? `<u title="${UBB.escapeHTML(attrs.slice(0, 200))}" style="cursor:pointer">${content}</u>` : `<u>${content}</u>` },
        s: { num: 2, note: '带删除线', express: (content) => `<s>${content}</s>` },
        sup: { num: 2, note: '上标', inSelf: true, express: (content) => `<sup>${content}</sup>` },
        sub: { num: 2, note: '下标', express: (content) => `<sub>${content}</sub>` },
        div: { num: 2, note: '块', inSelf: true, express: (content, attrs) => `<div class="common" style="background-color:${attrs || '#ffffcc'}">${content}</div>` },
        color: { num: 2, note: '文字颜色', inSelf: true, express: (content, attrs) => `<span style="color:${attrs}">${content}</span>` },
        size: { num: 2, note: '文字尺寸', inSelf: true, express: (content, attrs) => `<font size="${attrs}">${content}</font>` },
        r: { num: 2, note: '禁止转义', express: (content) => content },
        hr: { num: 1, note: '水平分隔线', express: () => `<hr>` },
        url: { num: 2, note: '链接', express: (content, attrs) => `<a href="${attrs.startsWith('http') ? '' : 'http://'}${attrs}" target="_blank" rel="noopener noreferrer">${content}</a>` },
        article: { num: 2, note: '帖子链接', express: (content, attrs) => `<a class="atcllink" data-atclid="${attrs}">${content}</a>` },
        user: { num: 1, note: '召唤用户', express: (attrs) => `<a class="userlink" data-userid="${attrs}">[@……]</a>` },
        pic: { num: 1, note: '图片', express: (attrs) => `<img src="${attrs}"/>` },
        title: { num: 2, notIn: ['color', 'url', 'b', 'i', 'u', 'size'], express: (content) => `<div class="title">${content.replace(/\n/g, '')}</div>` },
        content: { num: 2, inSelf: true, express: (content) => `<div class="content">${content}</div>` },
        toggle: { num: 2, noText: true, inSelf: true, express: (content, attrs) => `<div class="toggle" data-on="${attrs || 'off'}">${content}</div>` },
        table: { num: 2, noText: true, express: (content) => `<table class="common" align="center"><tbody>${content}</tbody></table>` },
        tr: { num: 2, mustIn: 'table', express: (content) => `<tr>${content}</tr>` },
        td: { num: 2, mustIn: 'tr', express: (content) => `<td>${content}</td>` },
        select: { num: 2, noText: true, inSelf: true, express: (content, attrs) => `<div class="select" data-mode="${attrs || '0'}"><div class="head"></div><div class="body">${content}</div></div>` },
        choice: { num: 2, mustIn: 'select', inSelf: true, express: (content, attrs) => `<div class="choice" data-sel="${attrs || 'off'}">${content}</div>` },
        goto: { num: 2, note: '页内跳转', express: (content, attrs) => `<a class="goto" data-anchor="${attrs}">${content}</a>` },
        emote: { num: 1, re: /\[em(\d{1,2})\]/i, note: '表情', express: (_, attrs) => `<img src="emote/em${attrs}.gif">` }
    };
    init() {
        if (!this.btnArea) return;
        this.btnArea.innerHTML = '';
        const labelProto = {
            insert: (label) => {
                const selStart = this.textArea.selectionStart, selEnd = this.textArea.selectionEnd;
                const content = this.textArea.value, selectedText = content.substring(selStart, selEnd);
                const startTag = label.firstLabel || `[${label.name}${label.num === 2 && label.name !== 'r' ? `=${label.content || ''}` : ''}]`;
                const endTag = label.num === 1 ? '' : `[/${label.name}]`;
                const finalTag = `${startTag}${selectedText || (label.content || '')}${endTag}`;
                this.textArea.value = content.substring(0, selStart) + finalTag + content.substring(selEnd);
                this.textArea.focus();
                this.textArea.selectionStart = selStart + startTag.length;
                this.textArea.selectionEnd = selStart + startTag.length + (selectedText || (label.content || '')).length;
            }
        };

        for (const name in UBB.LabelType) {
            const label = { ...UBB.LabelType[name], name };
            if (label.static || label.re) continue;
            const btn = document.createElement('span');
            btn.className = 'btn';
            btn.title = label.note;
            btn.textContent = name;
            btn.addEventListener('click', () => labelProto.insert(label));
            this.btnArea.appendChild(btn);
        }
    }

    express(text) {
        const stack = [{ tag: null, content: '' }];
        const tagRegex = /\[(\/)?([a-z]+)(?:=([^\]]*))?\]|\[em(\d{1,2})\]/ig;

        let lastIndex = 0;
        let match;

        while ((match = tagRegex.exec(text)) !== null) {
            const leadingText = text.substring(lastIndex, match.index);
            if (leadingText) {
                stack[stack.length - 1].content += UBB.escapeHTML(leadingText);
            }
            lastIndex = match.index + match[0].length;

            if (match[0].startsWith('[em')) { // Emote tag
                const tagName = 'emote';
                const attrs = match[4];
                const tagDef = UBB.LabelType[tagName];
                if (tagDef && tagDef.num === 1) {
                    stack[stack.length - 1].content += tagDef.express(null, attrs);
                }
                continue;
            }

            const isClosing = !!match[1];
            const tagName = match[2].toLowerCase();
            const attrs = match[3] || '';
            const tagDef = UBB.LabelType[tagName];

            if (!tagDef) continue;

            if (isClosing) {
                if (stack.length > 1 && stack[stack.length - 1].tag === tagName) {
                    const closed = stack.pop();
                    const html = tagDef.express(closed.content, closed.attrs);
                    stack[stack.length - 1].content += html;
                } else {
                    stack[stack.length - 1].content += UBB.escapeHTML(match[0]);
                }
            } else {
                if (tagDef.num === 1) {
                    stack[stack.length - 1].content += tagDef.express(attrs);
                } else {
                    const parentTag = stack.length > 1 ? stack[stack.length - 1].tag : null;
                    if (tagDef.mustIn && tagDef.mustIn !== parentTag) throw new Error(`Tag [${tagName}] must be inside [${tagDef.mustIn}].`);
                    if (tagDef.notIn && parentTag && tagDef.notIn.includes(parentTag)) throw new Error(`Tag [${tagName}] cannot be inside [${parentTag}].`);
                    if (!tagDef.inSelf && stack.some(s => s.tag === tagName)) throw new Error(`Tag [${tagName}] cannot be nested in itself.`);
                    stack.push({ tag: tagName, attrs: attrs, content: '' });
                }
            }
        }

        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            stack[stack.length - 1].content += UBB.escapeHTML(remainingText);
        }

        while(stack.length > 1) {
            const unclosed = stack.pop();
            const parent = stack[stack.length - 1];
            parent.content += UBB.escapeHTML(`[${unclosed.tag}${unclosed.attrs ? '=' + unclosed.attrs : ''}]`) + unclosed.content;
        }

        return stack[0].content;
    }

    awake(dom) {
        // Toggle functionality
        dom.querySelectorAll('div.toggle > .title').forEach(title => {
            const trigger = document.createElement('span');
            trigger.className = 'trigger';
            trigger.textContent = '◤';
            title.prepend(trigger);

            title.addEventListener('click', () => {
                const content = title.nextElementSibling;
                const toggle = title.parentElement;
                if (trigger.textContent === '◤') {
                    trigger.textContent = '◣';
                    content.style.display = 'none';
                    toggle.classList.remove('leftborder');
                } else {
                    trigger.textContent = '◤';
                    content.style.display = 'block';
                    toggle.classList.add('leftborder');
                }
            });
        });

        dom.querySelectorAll('div.toggle').forEach(toggle => {
            if (toggle.dataset.on !== 'on') {
                toggle.querySelector('.title').click();
            }
        });

        // Select functionality
        dom.querySelectorAll('div.select').forEach(select => {
            const mode = select.dataset.mode || '0';
            const head = select.querySelector('.head');
            const body = select.querySelector('.body');
            const choices = Array.from(body.querySelectorAll('.choice'));

            if (mode === '0') { // Tabbed view
                choices.forEach((choice, index) => {
                    const title = choice.querySelector('.title');
                    if(title){
                        const key = document.createElement('span');
                        key.className = 'selkey';
                        key.innerHTML = title.innerHTML;
                        key.dataset.index = index;
                        if (choice.dataset.sel === 'on') {
                            key.dataset.sel = 'on';
                        }
                        head.appendChild(key);
                        title.remove();
                    }
                });

                head.addEventListener('click', (e) => {
                    if (e.target.classList.contains('selkey')) {
                        const index = e.target.dataset.index;
                        choices.forEach((c, i) => c.querySelector('.content').style.display = i == index ? 'block' : 'none');
                        head.querySelectorAll('.selkey').forEach(k => k.dataset.sel = '');
                        e.target.dataset.sel = 'on';
                    }
                });

                const initial = head.querySelector('.selkey[data-sel="on"]') || head.querySelector('.selkey');
                if(initial) initial.click();
            }
            // Other modes can be implemented here if needed
        });

        // Goto functionality
        dom.querySelectorAll('a.goto').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const anchorName = link.dataset.anchor;
                const target = dom.querySelector(`a[name="${anchorName}"]`);

                if (target) {
                    // Check if the target is inside a hidden toggle
                    const toggle = target.closest('.toggle');
                    if (toggle) {
                        const title = toggle.querySelector('.title');
                        const trigger = title ? title.querySelector('.trigger') : null;
                        if (trigger && trigger.textContent === '◣') {
                            title.click();
                        }
                    }

                    // Check if the target is inside a hidden select pane
                    const choice = target.closest('.choice');
                    if (choice) {
                        const select = choice.closest('.select');
                        const content = choice.querySelector('.content');
                        if (select && content && content.style.display === 'none') {
                            const choiceIndex = Array.from(select.querySelectorAll('.choice')).indexOf(choice);
                            const tab = select.querySelector(`.selkey[data-index="${choiceIndex}"]`);
                            if (tab) {
                                tab.click();
                            }
                        }
                    }

                    // Use a short timeout to allow the UI to update before scrolling
                    setTimeout(() => {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                }
            });
        });

        // Placeholder for external dependencies
        dom.querySelectorAll('a.atcllink').forEach(link => {
            console.log(`Article link to ${link.dataset.atclid} found.`);
        });
        dom.querySelectorAll('a.userlink').forEach(link => {
            console.log(`User link to ${link.dataset.userid} found.`);
        });
    }
}
