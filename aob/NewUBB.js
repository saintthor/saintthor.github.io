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
        s: { num: 2, note: '带删除线', express: (content) => `<s><strike>${content}</strike></s>` },
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
                return `<div class="common" style="${style}">${content}</div>`;
            }
        },
        color: { num: 2, note: '文字颜色', inSelf: true, express: (content, attrs) => `<span style="color:${attrs}">${content}</span>` },
        size: { num: 2, note: '文字尺寸', inSelf: true, express: (content, attrs) => `<font size="${attrs}">${content}</font>` },
        r: { num: 2, note: '禁止转义' },
        hr: { num: 1, note: '水平分隔线', express: () => `<hr>` },
        url: { num: 2, note: '链接', express: (content, attrs) => {
            const Address = attrs || content;
            const href = (Address.startsWith('http://') || Address.startsWith('https://')) ? Address : 'http://' + Address;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">${content}</a>`;
        } },
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
        emote: { num: 1, re: /\[em(\d{1,2})\]/i, note: '表情', express: (attrs) => `<img src="emote/em${attrs}.gif">` }
    };

    init() {
        if (!this.btnArea) return;
        this.btnArea.innerHTML = '';
        const labelProto = {
            insert: (label) => {
                const scroll = this.textArea.scrollTop;
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
                this.textArea.scrollTop = scroll;
                if (typeof this.alterCallback === 'function') {
                    this.alterCallback(this.textArea.value);
                }
            }
        };

        for (const name in UBB.LabelType) {
            const label = { ...UBB.LabelType[name], name };
            if (label.static || name === 'r' || name === 'tab') continue;
            const btn = document.createElement('span');
            btn.className = 'btn';
            btn.title = label.note;
            btn.textContent = name;
            btn.addEventListener('click', () => {
                if (name === 'emote') {
                    let emArea = this.btnArea.querySelector('.emarea');
                    if (emArea) {
                        emArea.style.display = emArea.style.display === 'none' ? 'block' : 'none';
                        return;
                    }

                    emArea = document.createElement('div');
                    emArea.className = 'emarea';
                    for (let i = 1; i <= 64; i++) {
                        const nStr = '0' + i;
                        const suffix = nStr.slice(nStr.length - 2);
                        const img = document.createElement('img');
                        img.src = `emote/em${suffix}.gif`;
                        img.style.cursor = 'pointer';
                        img.addEventListener('click', () => {
                            const scroll = this.textArea.scrollTop;
                            const selStart = this.textArea.selectionStart;
                            const content = this.textArea.value;
                            const tag = `[em${suffix}]`;
                            this.textArea.value = content.substring(0, selStart) + tag + content.substring(selStart);
                            this.textArea.focus();
                            this.textArea.selectionStart = this.textArea.selectionEnd = selStart + tag.length;
                            this.textArea.scrollTop = scroll;
                            if (typeof this.alterCallback === 'function') {
                                this.alterCallback(this.textArea.value);
                            }
                        });
                        emArea.appendChild(img);
                    }
                    this.btnArea.appendChild(emArea);
                } else {
                    labelProto.insert(label);
                }
            });
            this.btnArea.appendChild(btn);
        }
    }

    express(text, isRecursiveCall = false) {
        if (text === null || text === undefined) {
            return '';
        }
        text = text.toString();

        if (!isRecursiveCall) {
            const r_contents = [];
            const placeholder = (index) => `__R_PLACEHOLDER_${index}__`;

            text = text.replace(/\[r\]([\s\S]*?)\[\/r\]/gi, (match, content) => {
                const html = UBB.escapeHTML(content);
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
            if (this.r_contents) {
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
                if (parent.classList.contains('content') && parent.style.display === 'none') {
                    const prev = parent.previousElementSibling;
                    if (prev && prev.classList.contains('title')) {
                        prev.click();
                    }
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
        // Toggle behavior
        dom.querySelectorAll('div.toggle > .title').forEach(title => {
            if (!title.querySelector('.trigger')) {
                const trigger = document.createElement('span');
                trigger.className = 'trigger';
                trigger.innerHTML = '◤';
                title.insertBefore(trigger, title.firstChild);
            }

            title.onclick = () => {
                const triggerSpan = title.querySelector('.trigger');
                const parent = title.parentElement;
                const content = Array.from(parent.children).find(child => child.classList.contains('content'));

                if (triggerSpan.innerHTML === '◣') {
                    title.style.display = 'block';
                    parent.style.display = 'block';
                    parent.classList.add('leftborder');
                    if (content) {
                        content.style.display = 'block';
                    }
                    triggerSpan.innerHTML = '◤';
                } else {
                    title.style.display = 'inline';
                    parent.style.display = 'inline';
                    parent.classList.remove('leftborder');
                    if (content) {
                        content.style.display = 'none';
                    }
                    triggerSpan.innerHTML = '◣';
                }
            };
        });

        dom.querySelectorAll('div.toggle').forEach(toggle => {
            if (toggle.getAttribute('data-on') !== 'on') {
                const title = toggle.querySelector(':scope > .title');
                if (title) {
                    title.click();
                }
            }
        });

        // Select behavior
        dom.querySelectorAll('div.select').forEach(select => {
            const mode = select.getAttribute('data-mode') || '0';
            const body = select.querySelector(':scope > .body');
            if (!body) return;

            if (mode === '0') {
                let selKey = null;
                const choices = body.querySelectorAll(':scope > .choice');
                const head = select.querySelector(':scope > .head');

                choices.forEach((choice, idx) => {
                    const title = choice.querySelector(':scope > .title');
                    if (title) {
                        const span = document.createElement('span');
                        span.className = 'selkey';
                        span.innerHTML = title.innerHTML;
                        span.dataset.index = idx;

                        if (choice.getAttribute('data-sel') === 'on') {
                            selKey = span;
                            span.dataset.sel = 'on';
                        }
                        if (head) {
                            head.appendChild(span);
                        }
                        title.remove();
                    }
                });

                if (head) {
                    const selKeys = head.querySelectorAll('.selkey');
                    selKeys.forEach(span => {
                        span.onclick = () => {
                            choices.forEach((c, cIdx) => {
                                const content = c.querySelector(':scope > .content');
                                if (content) {
                                    content.style.display = (cIdx == span.dataset.index) ? 'block' : 'none';
                                }
                            });
                            selKeys.forEach(s => s.style.backgroundColor = '');
                            span.style.backgroundColor = '#ffcc22';
                        };
                    });
                }

                choices.forEach(c => {
                    const content = c.querySelector(':scope > .content');
                    if (content) {
                        content.style.display = 'none';
                    }
                });

                if (selKey) {
                    selKey.click();
                }
            } else if (mode === '1') {
                const choices = body.querySelectorAll(':scope > .choice');
                const head = select.querySelector(':scope > .head');

                choices.forEach(choice => {
                    const title = choice.querySelector(':scope > .title');
                    if (title) {
                        const trigger = document.createElement('span');
                        trigger.className = 'trigger';
                        trigger.innerHTML = '◣';
                        title.insertBefore(trigger, title.firstChild);

                        title.onclick = () => {
                            const triggerSpan = title.querySelector('.trigger');
                            if (triggerSpan.innerHTML === '◣') {
                                choices.forEach(c => {
                                    const cContent = c.querySelector(':scope > .content');
                                    if (cContent) cContent.style.display = 'none';
                                    c.classList.remove('leftborder');
                                    const cTrigger = c.querySelector(':scope > .title > .trigger');
                                    if (cTrigger) cTrigger.innerHTML = '◣';
                                });

                                choice.classList.add('leftborder');
                                const content = choice.querySelector(':scope > .content');
                                if (content) content.style.display = 'block';
                                triggerSpan.innerHTML = '◤';
                            } else {
                                choice.classList.remove('leftborder');
                                const content = choice.querySelector(':scope > .content');
                                if (content) content.style.display = 'none';
                                triggerSpan.innerHTML = '◣';
                            }
                        };
                    }
                });

                if (head) {
                    head.remove();
                }

                const selectedChoice = body.querySelector(':scope > .choice[data-sel=on]');
                if (selectedChoice) {
                    const selectedTitle = selectedChoice.querySelector(':scope > .title');
                    if (selectedTitle) {
                        selectedTitle.click();
                    }
                }
            } else if (mode === '2') {
                let selFrame = null;
                const head = select.querySelector(':scope > .head');
                const choices = body.querySelectorAll(':scope > .choice');

                if (head) {
                    head.innerHTML = '<button class="prev">﹤</button><button class="play">▷</button><button class="next">﹥</button>';
                }

                choices.forEach(choice => {
                    const title = choice.querySelector(':scope > .title');
                    if (title) {
                        title.remove();
                    }
                    choice.style.display = 'none';
                });

                selFrame = body.querySelector(':scope > .choice');
                if (selFrame) {
                    selFrame.style.display = 'block';
                }

                const turnNext = () => {
                    if (selFrame) {
                        selFrame.style.display = 'none';
                        let nextFrame = selFrame.nextElementSibling;
                        while (nextFrame && !nextFrame.classList.contains('choice')) {
                            nextFrame = nextFrame.nextElementSibling;
                        }
                        if (nextFrame) {
                            selFrame = nextFrame;
                        } else {
                            selFrame = body.querySelector(':scope > .choice');
                        }
                        if (selFrame) {
                            selFrame.style.display = 'block';
                        }
                    }
                };

                const nextBtn = select.querySelector('.next');
                if (nextBtn) {
                    nextBtn.onclick = turnNext;
                }

                const prevBtn = select.querySelector('.prev');
                if (prevBtn) {
                    prevBtn.onclick = () => {
                        if (selFrame) {
                            selFrame.style.display = 'none';
                            let prevFrame = selFrame.previousElementSibling;
                            while (prevFrame && !prevFrame.classList.contains('choice')) {
                                prevFrame = prevFrame.previousElementSibling;
                            }
                            if (prevFrame) {
                                selFrame = prevFrame;
                            } else {
                                const allChoices = body.querySelectorAll(':scope > .choice');
                                selFrame = allChoices[allChoices.length - 1];
                            }
                            if (selFrame) {
                                selFrame.style.display = 'block';
                            }
                        }
                    };
                }

                const playBtn = select.querySelector('.play');
                let timer = null;

                const play = () => {
                    if (playBtn && playBtn.dataset.playing === 'on') {
                        turnNext();
                        timer = setTimeout(play, 1000);
                    }
                };

                if (playBtn) {
                    playBtn.onclick = () => {
                        if (playBtn.dataset.playing === 'on') {
                            playBtn.innerHTML = '▷';
                            playBtn.dataset.playing = '';
                            if (timer) {
                                clearTimeout(timer);
                                timer = null;
                            }
                        } else {
                            playBtn.innerHTML = '□';
                            playBtn.dataset.playing = 'on';
                            play();
                        }
                    };
                }
            }
        });

        // Goto links click and hover logic
        dom.querySelectorAll('a.goto').forEach(gotoLink => {
            const anchorName = gotoLink.getAttribute('data-anchor');

            gotoLink.onclick = (e) => {
                e.preventDefault();
                UBB.goto(gotoLink, anchorName);
            };

            gotoLink.onmouseover = () => {
                const target = dom.querySelector(`a[name="${anchorName}"]`);
                if (target) {
                    const parent = target.parentElement;
                    if (parent) {
                        parent.classList.add('light');
                        setTimeout(() => parent.classList.remove('light'), 2000);
                    }
                }
            };

            gotoLink.onmouseout = () => {
                const target = dom.querySelector(`a[name="${anchorName}"]`);
                if (target) {
                    const parent = target.parentElement;
                    if (parent) {
                        setTimeout(() => parent.classList.remove('light'), 2000);
                    }
                }
            };
        });

        // Article and user links click handlers
        dom.querySelectorAll('a.atcllink').forEach(link => {
            link.onclick = () => {
                if (this.owner && this.owner.Forum && typeof this.owner.Forum.Search === 'function') {
                    this.owner.Forum.Search(link.getAttribute('data-atclid'));
                }
            };
        });

        dom.querySelectorAll('a.userlink').forEach(link => {
            const pubKey = link.getAttribute('data-userid');
            if (this.owner && this.owner.Feel && typeof this.owner.Feel.GetShowName === 'function') {
                const showName = this.owner.Feel.GetShowName(pubKey);
                if (showName) {
                    link.textContent = '@' + showName;
                }
            }
            link.onclick = () => {
                if (this.owner && typeof this.owner.SeekUser === 'function') {
                    const handler = this.owner.SeekUser(pubKey);
                    if (typeof handler === 'function') {
                        handler();
                    }
                }
            };
        });
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = UBB;
}
