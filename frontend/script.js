// 状态管理
let currentThreadId = null;
let chatHistory = [];
let isGenerating = false;
let isSidebarCollapsed = false;

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
    const icon = document.getElementById('sidebarToggleIcon');
    
    isSidebarCollapsed = !isSidebarCollapsed;
    
    if (isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        icon.className = 'fa-solid fa-chevron-right';
    } else {
        sidebar.classList.remove('collapsed');
        icon.className = 'fa-solid fa-chevron-left';
    }
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
        const div = document.createElement('div');
        div.className = `history-item ${session.id === currentThreadId ? 'active' : ''}`;
        div.textContent = session.title || 'New Chat';
        div.onclick = () => switchThread(session.id);
        list.appendChild(div);
    });
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
    if (isGenerating) return;
    const newId = generateUUID();
    const newSession = {
        id: newId,
        title: 'New Chat',
        messages: []
    };
    
    chatHistory.unshift(newSession);
    localStorage.setItem('chat_sessions', JSON.stringify(chatHistory));
    
    switchThread(newId);
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
            <div class="message-text">${htmlContent}</div>
        </div>
    `;
    
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    
    // 针对历史消息，确保代码高亮
    if (isHistory) {
        msgDiv.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }

    return msgDiv.querySelector('.message-text'); // 返回文本容器引用
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

    // 添加用户消息到界面
    appendMessageToDOM('user', text, true);
    input.value = '';
    input.style.height = 'auto'; 
    
    const sessionIndex = chatHistory.findIndex(s => s.id === currentThreadId);
    if (sessionIndex !== -1) {
        chatHistory[sessionIndex].messages.push({ role: 'user', content: text });
        if (chatHistory[sessionIndex].messages.length === 1) {
            chatHistory[sessionIndex].title = text.slice(0, 20) + (text.length > 20 ? '...' : '');
            renderSidebar();
        }
    }

    // 创建助手消息容器
    const aiTextContainer = appendMessageToDOM('assistant', '');
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
                            
                            // 保持滚动到底部
                            const container = document.getElementById('chatContainer');
                            container.scrollTop = container.scrollHeight;
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
}