// 状态管理
let currentThreadId = null;
let chatHistory = [];
let isGenerating = false;
let isSidebarCollapsed = false;
let currentUserMessageElement = null; // 当前用户提问的DOM元素
let userScrolledUp = false; // 用户是否向上滚动了

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    setupEventListeners();
    initTheme();
    
    // 配置 Marked.js (Markdown 解析器)
    marked.setOptions({
        // 使用 highlight.js 进行代码高亮
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        gfm: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    });
});

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (systemPrefersDark) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

// 设置主题
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (theme === 'dark') {
        themeIcon.className = 'fa-solid fa-sun';
        themeText.textContent = '浅色模式';
    } else {
        themeIcon.className = 'fa-solid fa-moon';
        themeText.textContent = '深色模式';
    }
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainChat = document.querySelector('.main-chat');
    const floatingControls = document.getElementById('floatingControls');
    
    isSidebarCollapsed = !isSidebarCollapsed;
    
    if (isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        mainChat.classList.add('sidebar-collapsed');
        floatingControls.classList.add('visible');
    } else {
        sidebar.classList.remove('collapsed');
        mainChat.classList.remove('sidebar-collapsed');
        floatingControls.classList.remove('visible');
    }
}

// 滚动到用户提问位置
function scrollToUserQuestion() {
    if (currentUserMessageElement) {
        userScrolledUp = true; // 标记用户主动滚动
        currentUserMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 显示生成中气泡
function showGeneratingBubble(text) {
    const bubble = document.getElementById('generatingBubble');
    const textEl = document.getElementById('generatingText');
    textEl.textContent = text.length > 20 ? text.slice(0, 20) + '...' : text;
    bubble.classList.add('visible');
}

// 隐藏生成中气泡
function hideGeneratingBubble() {
    const bubble = document.getElementById('generatingBubble');
    bubble.classList.remove('visible');
}

// 智能滚动 - 只有在底部时才自动滚动
function smartScroll() {
    if (!userScrolledUp) {
        const container = document.getElementById('chatContainer');
        container.scrollTop = container.scrollHeight;
    }
}

// 检查用户是否在底部
function isNearBottom() {
    const container = document.getElementById('chatContainer');
    const threshold = 100; // 距离底部100px内认为在底部
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
}

// 生成 UUID (用于 Thread ID)
function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// 加载历史记录
function loadHistory() {
    const saved = localStorage.getItem('chat_sessions');
    if (saved) {
        chatHistory = JSON.parse(saved);
        renderSidebar();
        if (chatHistory.length > 0) {
            switchThread(chatHistory[0].id);
        } else {
            createNewChat();
        }
    } else {
        createNewChat();
    }
}

// 渲染侧边栏
function renderSidebar() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    chatHistory.forEach(session => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `history-item ${session.id === currentThreadId ? 'active' : ''}`;
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-item-title';
        titleSpan.textContent = session.title || 'New Chat';
        titleSpan.onclick = () => switchThread(session.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-item-delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChat(session.id);
        };
        
        itemDiv.appendChild(titleSpan);
        itemDiv.appendChild(deleteBtn);
        list.appendChild(itemDiv);
    });
}

// 删除对话历史
function deleteChat(id) {
    if (confirm('确定要删除这个对话吗？')) {
        chatHistory = chatHistory.filter(session => session.id !== id);
        localStorage.setItem('chat_sessions', JSON.stringify(chatHistory));
        
        // 如果删除的是当前对话，或者已经没有对话了，则切换或创建新对话
        if (chatHistory.length === 0) {
            // 删除了最后一个，自动创建新聊天
            createNewChat();
        } else if (id === currentThreadId) {
            // 删除的是当前对话，切换到第一个
            switchThread(chatHistory[0].id);
        }
        
        renderSidebar();
    }
}

// 切换对话
function switchThread(id) {
    if (isGenerating) return;
    currentThreadId = id;
    renderSidebar(); 
    
    const session = chatHistory.find(s => s.id === id);
    const container = document.getElementById('chatContainer');
    
    container.innerHTML = '';
    
    if (!session || session.messages.length === 0) {
        container.innerHTML = `
            <div class="welcome-screen" id="welcomeScreen">
                <h1 class="welcome-title">Chat Agent</h1>
                <p class="welcome-text">基于LangChain的强大AI助手，可以帮助您解答问题、创作文字等</p>
                <div class="examples">
                    <div class="example-card" onclick="sendExample('帮我写一个Python冒泡排序算法')">
                        <h3>💻 编程</h3>
                        <p>帮我写一个Python冒泡排序算法</p>
                    </div>
                    <div class="example-card" onclick="sendExample('写一篇关于人工智能的散文')">
                        <h3>✍️ 写作</h3>
                        <p>写一篇关于人工智能的散文</p>
                    </div>
                    <div class="example-card" onclick="sendExample('什么是量子计算？用简单易懂的语言解释')">
                        <h3>🤔 解释</h3>
                        <p>什么是量子计算？用简单易懂的语言解释</p>
                    </div>
                </div>
            </div>`;
    } else {
        session.messages.forEach(msg => {
            appendMessageToDOM(msg.role, msg.content, true);
        });
    }
}

// 新建对话
function createNewChat() {
    // 如果正在生成，先停止
    if (isGenerating) {
        isGenerating = false;
        hideGeneratingBubble();
    }
    
    const newId = generateUUID();
    const newSession = {
        id: newId,
        title: 'New Chat',
        messages: []
    };
    
    chatHistory.unshift(newSession);
    localStorage.setItem('chat_sessions', JSON.stringify(chatHistory));
    
    switchThread(newId);
    renderSidebar();
}

// 添加消息到 DOM
function appendMessageToDOM(role, content, isHistory = false) {
    const container = document.getElementById('chatContainer');
    
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.remove();

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    const icon = role === 'user' ? 'U' : 'AI'; 
    
    let htmlContent;
    if (isHistory || role === 'assistant') {
        // 对于历史消息或者助手消息，解析Markdown
        htmlContent = marked.parse(content);
    } else {
        // 对于用户消息，转义HTML并转换换行符
        htmlContent = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    msgDiv.innerHTML = `
        <div class="message-content">
            <div class="message-avatar">${icon}</div>
            <div class="message-text">
                <div class="message-bubble">${htmlContent}</div>
            </div>
        </div>
    `;
    
    container.appendChild(msgDiv);
    
    // 只有在不是生成中或用户没有主动滚动时才自动滚动
    if (!isGenerating || !userScrolledUp) {
        container.scrollTop = container.scrollHeight;
    }
    
    // 针对历史消息，确保代码高亮
    if (isHistory) {
        msgDiv.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }

    // 返回消息元素和气泡元素
    return {
        element: msgDiv,
        bubble: msgDiv.querySelector('.message-bubble')
    };
}

// 发送示例消息
function sendExample(text) {
    const input = document.getElementById('userInput');
    input.value = text;
    sendMessage();
}

// 发送消息核心逻辑 (带实时 Markdown 和代码高亮)
async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    const sendBtn = document.getElementById('sendBtn');
    
    if (!text || isGenerating) return;
    
    isGenerating = true;
    sendBtn.disabled = true;
    userScrolledUp = false; // 重置滚动状态

    // 添加用户消息到界面
    const userMsg = appendMessageToDOM('user', text, true);
    currentUserMessageElement = userMsg.element; // 保存用户消息元素引用
    input.value = '';
    input.style.height = 'auto'; 
    
    // 显示生成中气泡
    showGeneratingBubble(text);
    
    const sessionIndex = chatHistory.findIndex(s => s.id === currentThreadId);
    if (sessionIndex !== -1) {
        chatHistory[sessionIndex].messages.push({ role: 'user', content: text });
        if (chatHistory[sessionIndex].messages.length === 1) {
            chatHistory[sessionIndex].title = text.slice(0, 20) + (text.length > 20 ? '...' : '');
            renderSidebar();
        }
    }

    // 创建助手消息容器
    const aiMsg = appendMessageToDOM('assistant', '');
    const aiTextContainer = aiMsg.bubble;
    const cursorHTML = '<span class="cursor">|</span>'; 
    aiTextContainer.innerHTML = cursorHTML;
    
    let fullResponse = "";
    let dataBuffer = ""; 
    const separator = '\n\n'; 

    try {
        const response = await fetch('http://127.0.0.1:8000/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: "user", content: text }],
                configurable: { thread_id: currentThreadId }
            })
        });

        if (!response.body) throw new Error("Stream not available");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (value) {
                dataBuffer += decoder.decode(value, { stream: true });
            }

            if (done && dataBuffer.trim() === "") break;

            let blockIndex = dataBuffer.indexOf(separator);
            
            while (blockIndex !== -1) {
                const sseBlock = dataBuffer.substring(0, blockIndex + separator.length);
                dataBuffer = dataBuffer.substring(blockIndex + separator.length);
                
                const dataLine = sseBlock.trim().split('\n').find(line => line.startsWith('data: '));
                
                if (dataLine) {
                    const dataStr = dataLine.replace('data: ', '').trim();
                    
                    if (dataStr === '[DONE]') {
                        blockIndex = -1; 
                        break; 
                    } 

                    try {
                        const data = JSON.parse(dataStr);
                        if (data.text) {
                            fullResponse += data.text;
                            
                            // 实时解析 Markdown
                            aiTextContainer.innerHTML = marked.parse(fullResponse) + cursorHTML;
                            
                            // 实时高亮：只对新创建的 'pre code' 元素进行高亮
                            aiTextContainer.querySelectorAll('pre code').forEach((el) => {
                                // hljs 会给高亮后的元素添加 'hljs' class
                                if (!el.classList.contains('hljs')) { 
                                    hljs.highlightElement(el);
                                }
                            });
                            
                            // 智能滚动 - 只有用户没有向上滚动时才自动滚动
                            smartScroll();
                        }
                    } catch (e) {
                        console.error("❌ JSON 解析错误:", dataStr, e);
                    }
                }
                
                blockIndex = dataBuffer.indexOf(separator);
            }
            
            if (done && blockIndex === -1) break; 
        }

        // 保存到历史记录
        if (sessionIndex !== -1) {
            chatHistory[sessionIndex].messages.push({ role: 'assistant', content: fullResponse });
            localStorage.setItem('chat_sessions', JSON.stringify(chatHistory));
        }

    } catch (error) {
        console.error("🔥 网络或流中断错误:", error);
        const errorMessage = `**Error:** ${error.message}`;
        aiTextContainer.innerHTML = marked.parse(errorMessage);
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
        userScrolledUp = false;
        currentUserMessageElement = null;
        
        // 隐藏生成中气泡
        hideGeneratingBubble();
        
        // 确保光标被移除并最终渲染
        aiTextContainer.innerHTML = marked.parse(fullResponse);
        
        // 最终高亮所有代码块
        document.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }
}

// 辅助：输入框回车发送和自动高度
function setupEventListeners() {
    const input = document.getElementById('userInput');
    const container = document.getElementById('chatContainer');
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 自动高度
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // 监听滚轮事件 - 用户主动滚动时立即标记
    container.addEventListener('wheel', (e) => {
        if (isGenerating && e.deltaY < 0) {
            // 用户向上滚动
            userScrolledUp = true;
        }
    });
    
    // 监听滚动事件 - 检测用户是否回到底部
    container.addEventListener('scroll', () => {
        if (isGenerating && userScrolledUp) {
            // 如果用户回到了底部，重新开启自动滚动
            if (isNearBottom()) {
                userScrolledUp = false;
            }
        }
    });
}