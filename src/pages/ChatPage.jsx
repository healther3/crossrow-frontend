import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTransition } from '../context/TransitionContext';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';

// 引入刚剥离出去的侧边栏组件
import SessionSidebar from '../components/SessionSidebar';

const TYPE_SPEED_MS = 30;
const CHARS_PER_TICK = 3;

export default function ChatPage() {
    const { navigateWithTransition } = useTransition();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [modalImage, setModalImage] = useState(null);
    const [agentQuestion, setAgentQuestion] = useState(null);
    const [isExpertMode, setIsExpertMode] = useState(false);

    // --- 极简的会话状态 ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [chatId, setChatId] = useState(null);

    const { bgConfig } = useSettings();
    const { userId, token } = useAuth();

    const [messages, setMessages] = useState([
        { id: 1, text: "Wait... where am I?", sender: "user" },
        { id: 2, text: "You have arrived. This is the boundary of consciousness.", sender: "ai" },
        { id: 3, text: "The noise of the world fades away here.", sender: "ai" },
    ]);

    const targetTextRef = useRef("");
    const displayedIndexRef = useRef(0);
    const currentMsgIdRef = useRef(null);
    const stepContentsRef = useRef(new Map());
    const eventSourceRef = useRef(null);

    const [bgUrl, setBgUrl] = useState(null);
    const baseUrlAPI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8123';

    // ==========================================
    // 侧边栏回调逻辑 (只负责清屏，不处理数据请求)
    // ==========================================
    const handleSessionSelect = (selectedId) => {
        if (chatId === selectedId) return;
        setChatId(selectedId);
        // ⚠️ 未来调用 GET /messages/{selectedId} 加载历史记录，目前仅做清屏
        setMessages([
            { id: 1, text: "[System]: Loading historical records...", sender: "ai" }
        ]);
        stepContentsRef.current.clear();
    };

    const handleNewSession = (newId) => {
        setChatId(newId);
        setMessages([
            { id: 1, text: "Wait... where am I?", sender: "user" },
            { id: 2, text: "You have arrived. This is the boundary of consciousness.", sender: "ai" },
            { id: 3, text: "The noise of the world fades away here.", sender: "ai" },
        ]);
        stepContentsRef.current.clear();
    };

    // 背景图获取逻辑
    useEffect(() => {
        const fetchBackgroundUrl = async () => {
            try {
                let mode = bgConfig?.mode || 'RANDOM';

                if (mode === 'USER' && (!bgConfig?.coords || !bgConfig.coords.lat)) {
                    mode = 'RANDOM';
                }

                if (mode === 'CUSTOM') {
                    const response = await fetch(`${baseUrlAPI}/api/user/background`, {
                        method: "GET",
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        setBgUrl(await response.text());
                    }
                    return;
                }

                const baseUrl = `${baseUrlAPI}/api/crossrow/image/background`;
                const params = new URLSearchParams();
                params.append("userId", userId);
                params.append("mode", mode);

                if (mode === 'USER' && bgConfig?.coords) {
                    params.append("lat", bgConfig.coords.lat);
                    params.append("lng", bgConfig.coords.lng);
                }

                const response = await fetch(`${baseUrl}?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const urlString = await response.text();
                    if (urlString && urlString.startsWith('http')) {
                        setBgUrl(urlString);
                    } else if (urlString && urlString.startsWith('/api')) {
                        setBgUrl(`${baseUrlAPI}${urlString}`);
                    }
                }
            } catch (error) {
                console.error("Error fetching background:", error);
            }
        };

        fetchBackgroundUrl();
    }, [bgConfig, userId, token, baseUrlAPI]);

    // 自动滚动 & 清理 EventSource
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    useEffect(() => {
        return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
    }, []);

    // --- 打字机引擎 ---
    useEffect(() => {
        const timer = setInterval(() => {
            if (currentMsgIdRef.current && displayedIndexRef.current < targetTextRef.current.length) {
                const nextIndex = Math.min(
                    displayedIndexRef.current + CHARS_PER_TICK,
                    targetTextRef.current.length
                );
                const displayText = targetTextRef.current.slice(0, nextIndex);
                setMessages(prev => {
                    const newMessages = [...prev];
                    const targetIndex = newMessages.findIndex(m => m.id === currentMsgIdRef.current);
                    if (targetIndex !== -1) {
                        newMessages[targetIndex] = { ...newMessages[targetIndex], text: displayText };
                    }
                    return newMessages;
                });
                displayedIndexRef.current = nextIndex;
            }
        }, TYPE_SPEED_MS);
        return () => clearInterval(timer);
    }, []);

    const rebuildTargetText = () => {
        const sortedSteps = Array.from(stepContentsRef.current.entries())
            .sort((a, b) => a[0] - b[0]);
        targetTextRef.current = sortedSteps
            .map(([_, content]) => content.replace(/\\n/g, '\n'))
            .join("\n\n");
    };

    // 核心发送逻辑
    const handleSend = (e) => {
        if (e.key === 'Enter' && input.trim() && !isSending && !e.nativeEvent.isComposing) {
            if (!chatId) return; // 没拿到会话ID不允许发送

            setIsSending(true);
            setAgentQuestion(null);
            const userText = input.trim();
            setInput('');

            const userMsgId = Date.now();
            const aiMsgId = userMsgId + 1;

            currentMsgIdRef.current = aiMsgId;
            targetTextRef.current = "";
            displayedIndexRef.current = 0;
            stepContentsRef.current.clear();

            if (eventSourceRef.current) eventSourceRef.current.close();

            setMessages(prev => [
                ...prev,
                { id: userMsgId, text: userText, sender: "user" },
                { id: aiMsgId, text: "", sender: "ai" }
            ]);

            const endpoint = isExpertMode ? 'expert/chat' : 'agent/chat';
            const url = `${baseUrlAPI}/api/crossrow/${endpoint}?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}&token=${token}`;

            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            const processDataWithHiddenActions = (rawData) => {
                let cleanedData = rawData;
                if (cleanedData.startsWith('"') && cleanedData.endsWith('"')) {
                    try { cleanedData = JSON.parse(cleanedData); } catch(e) {}
                }

                const actionRegex = /<hidden_action\s+type=['"]show_image['"]\s+url=['"](.*?)['"]\s*\/>/gi;
                let match;
                while ((match = actionRegex.exec(cleanedData)) !== null) {
                    const gcsUrl = match[1];
                    setTimeout(() => { setModalImage(gcsUrl); }, 800);
                }
                cleanedData = cleanedData.replace(actionRegex, '').trim();

                const askRegex = /<hidden_action\s+type=['"]ask_human['"]\s+question=['"](.*?)['"]\s*\/>/gi;
                let askMatch;
                while ((askMatch = askRegex.exec(cleanedData)) !== null) {
                    const questionText = askMatch[1];
                    setTimeout(() => { setAgentQuestion(questionText); }, 500);
                }
                cleanedData = cleanedData.replace(askRegex, '');
                cleanedData = cleanedData.replace('(Waiting for user input...)', '');

                return cleanedData.trim();
            };

            eventSource.addEventListener("step", (event) => {
                const stepId = event.lastEventId ? parseInt(event.lastEventId, 10) : Date.now();
                const cleanedData = processDataWithHiddenActions(event.data);
                if (!isNaN(stepId)) {
                    stepContentsRef.current.set(stepId, cleanedData);
                    rebuildTargetText();
                }
            });

            eventSource.addEventListener("complete", (event) => {
                const cleanedData = processDataWithHiddenActions(event.data);
                const completeId = 999999;
                if (!stepContentsRef.current.has(completeId)) {
                    stepContentsRef.current.set(completeId, cleanedData);
                    rebuildTargetText();
                }
            });

            eventSource.onerror = (err) => {
                eventSource.close();
                setIsSending(false);
                eventSourceRef.current = null;
            };
        }
    };

    return (
        <div className="relative min-h-screen font-vn overflow-hidden flex">

            {/* --- 背景图渲染层 --- */}
            <div className="absolute inset-0 z-0 bg-slate-900">
                {bgUrl && (
                    <img
                        src={bgUrl}
                        alt="Background"
                        className="w-full h-full object-cover opacity-60 filter brightness-75 contrast-125 transition-opacity duration-1000 animate-fade-in"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/90 backdrop-blur-[1px]" />
            </div>

            {/* --- 左侧边栏 (抽离为独立组件) --- */}
            <SessionSidebar
                isSidebarOpen={isSidebarOpen}
                currentChatId={chatId}
                onSessionSelect={handleSessionSelect}
                onNewSession={handleNewSession}
                token={token}
            />

            {/* --- 右侧聊天主区域 --- */}
            <div className="relative z-10 flex flex-col flex-1 h-screen">
                <div className="flex justify-between items-center p-6 w-full">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                        <Menu size={24} />
                    </button>
                    <button
                        onClick={() => navigateWithTransition('/')}
                        className="text-white/40 hover:text-white vn-text-shadow text-sm transition-colors cursor-pointer font-sans tracking-widest"
                    >
                        [ Return ]
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col w-full max-w-5xl mx-auto px-8 md:px-16 pb-12">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 pr-2">
                        <div className="flex flex-col space-y-6">
                            {messages.map((msg) => (
                                <div key={msg.id} className="animate-fade-in w-full text-left">
                                    <p className={`text-lg md:text-xl leading-snug tracking-tight vn-text-shadow break-words whitespace-pre-wrap ${
                                        msg.sender === 'user' ? 'text-cyan-200' : 'text-white'
                                    }`}>
                                        {msg.text}
                                    </p>
                                </div>
                            ))}
                            <div ref={bottomRef}/>
                        </div>
                    </div>

                    <div className={`mt-4 pt-4 border-t transition-colors duration-500 w-full ${
                        agentQuestion ? 'border-yellow-400/50' : (isExpertMode ? 'border-blue-500/50' : 'border-white/10')
                    }`}>
                        <div className="flex justify-between items-end mb-2 min-h-[24px]">
                            <div>
                                {agentQuestion && (
                                    <div className="text-sm text-yellow-300 font-serif tracking-wide animate-pulse">
                                        [System]: Waiting for confirmation: "{agentQuestion}"
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setIsExpertMode(!isExpertMode)}
                                disabled={isSending || agentQuestion}
                                className={`text-xs font-sans tracking-widest px-3 py-1 rounded transition-all duration-300 border ${
                                    isExpertMode
                                        ? 'border-blue-500 text-blue-300 bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                                        : 'border-slate-500/50 text-slate-400 hover:text-slate-200 hover:border-slate-400'
                                } ${isSending || agentQuestion ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {isExpertMode ? '✦ EXPERT COUNCIL' : '✧ STANDARD'}
                            </button>
                        </div>

                        <div className="flex items-center w-full">
                            <span className={`text-lg md:text-xl vn-text-shadow mr-2 font-bold transition-colors ${
                                agentQuestion ? 'text-yellow-400' : (isExpertMode ? 'text-blue-400' : 'text-white/50')
                            }`}>
                                &gt;
                            </span>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleSend}
                                autoFocus
                                disabled={isSending || !chatId}
                                placeholder={isSending ? "Processing..." : (agentQuestion ? "Type your answer here..." : "Message...")}
                                className={`flex-1 w-full bg-transparent border-none outline-none text-lg md:text-xl text-white vn-text-shadow placeholder-white/20 font-vn leading-snug tracking-tight caret-transparent cursor-blink ${isSending ? 'opacity-50' : ''}`}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {modalImage && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
                    <button onClick={() => setModalImage(null)} className="absolute top-6 right-8 text-white/50 hover:text-white text-4xl font-sans transition-colors cursor-pointer">&times;</button>
                    <div className="relative max-w-5xl max-h-[85vh] p-4 bg-white/5 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10">
                        <img src={modalImage} alt="Generated Output" className="max-w-full max-h-full object-contain rounded-lg" />
                    </div>
                </div>
            )}
        </div>
    );
}