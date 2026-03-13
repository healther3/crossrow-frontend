import React, { useState, useEffect, useRef } from 'react';
import { generateUUID } from '../utils/uuid';
import { useSettings } from '../context/SettingsContext';
import { useTransition } from '../context/TransitionContext';
import { useAuth } from '../context/AuthContext';

// 打字机速度配置
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

    // 1. 获取全局配置
    const { bgConfig } = useSettings();

    // ID 管理
    const { userId, token } = useAuth();
    const [chatId] = useState(generateUUID());

    const [messages, setMessages] = useState([
        { id: 1, text: "Wait... where am I?", sender: "user" },
        { id: 2, text: "You have arrived. This is the boundary of consciousness.", sender: "ai" },
        { id: 3, text: "The noise of the world fades away here.", sender: "ai" },
    ]);

    // --- 打字机核心状态 ---
    const targetTextRef = useRef("");
    const displayedIndexRef = useRef(0);
    const currentMsgIdRef = useRef(null);

    // --- 使用 Map 存储每个 step 的内容，确保顺序和去重 ---
    const stepContentsRef = useRef(new Map());

    // 2. 引用 EventSource 以便组件卸载时关闭它
    const eventSourceRef = useRef(null);

    // --- 背景图状态 ---
    const [bgUrl, setBgUrl] = useState(null);

    // 3. 异步获取背景图 URL
    useEffect(() => {
        const fetchBackgroundUrl = async () => {
            try {
                let mode = bgConfig?.mode || 'RANDOM';

                // 唯一需要干预的情况：选了 USER 但没拿坐标，强制降级防报错
                if (mode === 'USER' && (!bgConfig?.coords || !bgConfig.coords.lat)) {
                    console.warn("[FrontEnd] User mode selected but no coords found. Falling back to RANDOM.");
                    mode = 'RANDOM';
                }

                console.log(`[FrontEnd] Fetching background... Mode: ${mode}, User: ${userId}`);

                // 读取环境变量或使用默认值 (解决硬编码问题)
                const baseUrlAPI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8123';

                // ==========================================
                // 分支 1：如果是 CUSTOM 模式，调用你的新接口
                // ==========================================
                if (mode === 'CUSTOM') {
                    const response = await fetch(`${baseUrlAPI}/api/user/background`, {
                        method: "GET",
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const customUrl = await response.text();
                        console.log("[FrontEnd] Got Custom background URL:", customUrl);
                        setBgUrl(customUrl);
                    } else {
                        console.error("[FrontEnd] Failed to fetch custom background. Status:", response.status);
                    }
                    return;
                }

                // ==========================================
                // 分支 2：如果是其他模式，调用原有的地图/街景接口
                // ==========================================
                const baseUrl = `${baseUrlAPI}/api/crossrow/image/background`;
                const params = new URLSearchParams();

                params.append("userId", userId);
                params.append("mode", mode);

                if (mode === 'USER' && bgConfig?.coords) {
                    params.append("lat", bgConfig.coords.lat);
                    params.append("lng", bgConfig.coords.lng);
                }

                const response = await fetch(`${baseUrl}?${params.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const urlString = await response.text();
                    console.log("[FrontEnd] Got generated background URL:", urlString);
                    if (urlString && urlString.startsWith('http')) {
                        setBgUrl(urlString);
                    } else if (urlString && urlString.startsWith('/api')) {
                        setBgUrl(`${baseUrlAPI}${urlString}`);
                    }
                } else {
                    console.error("[FrontEnd] Failed to fetch generated background. Status:", response.status);
                }
            } catch (error) {
                console.error("[FrontEnd] Error fetching background:", error);
            }
        };

        fetchBackgroundUrl();
    }, [bgConfig, userId, token]); // 依赖项加上 userId 和 token 更严谨

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 4. 组件卸载时的清理逻辑
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                console.log("Closing EventSource on unmount");
                eventSourceRef.current.close();
            }
        };
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
                        newMessages[targetIndex] = {
                            ...newMessages[targetIndex],
                            text: displayText
                        };
                    }
                    return newMessages;
                });

                displayedIndexRef.current = nextIndex;
            }
        }, TYPE_SPEED_MS);

        return () => clearInterval(timer);
    }, []);

    // --- 重建目标文本 ---
    const rebuildTargetText = () => {
        const sortedSteps = Array.from(stepContentsRef.current.entries())
            .sort((a, b) => a[0] - b[0]);

        targetTextRef.current = sortedSteps
            .map(([_, content]) => content.replace(/\\n/g, '\n'))
            .join("\n\n");
    };

    const handleSend = (e) => {
        if (e.key === 'Enter' && input.trim() && !isSending && !e.nativeEvent.isComposing) {
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

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            setMessages(prev => [
                ...prev,
                { id: userMsgId, text: userText, sender: "user" },
                { id: aiMsgId, text: "", sender: "ai" }
            ]);

            // --- 修复：动态判断路由，并拼接 baseUrl ---
            const endpoint = isExpertMode ? 'expert/chat' : 'agent/chat';
            const baseUrlAPI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8123';
            const url = `${baseUrlAPI}/api/crossrow/${endpoint}?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}&token=${token}`;

            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            const processDataWithHiddenActions = (rawData) => {
                let cleanedData = rawData;

                if (cleanedData.startsWith('"') && cleanedData.endsWith('"')) {
                    try { cleanedData = JSON.parse(cleanedData); } catch(e) {}
                }

                // 1. 解析显示图片标签
                const actionRegex = /<hidden_action\s+type=['"]show_image['"]\s+url=['"](.*?)['"]\s*\/>/gi;
                let match;
                while ((match = actionRegex.exec(cleanedData)) !== null) {
                    const gcsUrl = match[1];
                    setTimeout(() => {
                        setModalImage(gcsUrl);
                    }, 800);
                }
                cleanedData = cleanedData.replace(actionRegex, '').trim();

                // 2. 解析 Ask Human 标签
                const askRegex = /<hidden_action\s+type=['"]ask_human['"]\s+question=['"](.*?)['"]\s*\/>/gi;
                let askMatch;
                while ((askMatch = askRegex.exec(cleanedData)) !== null) {
                    const questionText = askMatch[1];
                    setTimeout(() => {
                        setAgentQuestion(questionText);
                    }, 500);
                }
                cleanedData = cleanedData.replace(askRegex, '');

                // 去除可能从后端传来的提示文本
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
                    // --- 修复：存入 cleanedData，而不是报错的 rawData ---
                    stepContentsRef.current.set(completeId, cleanedData);
                    rebuildTargetText();
                }
            });

            eventSource.onerror = (err) => {
                console.log("Stream ended");
                eventSource.close();
                setIsSending(false);
                eventSourceRef.current = null;
            };
        }
    };

    return (
        <div className="relative min-h-screen font-vn overflow-hidden flex flex-col">

            <div className="absolute inset-0 z-0 bg-slate-900">
                {bgUrl && (
                    <img
                        src={bgUrl}
                        alt="Background"
                        className="w-full h-full object-cover opacity-60 filter brightness-75 contrast-125 transition-opacity duration-1000 animate-fade-in"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            console.warn("Background image failed to load");
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/90 backdrop-blur-[1px]" />
            </div>

            <button
                onClick={() => navigateWithTransition('/')}
                className="fixed top-6 right-8 z-50 text-white/40 hover:text-white vn-text-shadow text-sm transition-colors cursor-pointer"
            >
                [ Return ]
            </button>

            <div className="relative z-10 flex flex-col w-full max-w-5xl mx-auto h-screen px-8 md:px-16 py-12">
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
                                    ? 'border-blue-500 text-blue-300 bg-blue-500/20 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                    : 'border-slate-500/50 text-slate-400 hover:text-slate-200 hover:border-slate-400'
                            } ${isSending || agentQuestion ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title="Toggle Multi-Agent Expert Routing"
                        >
                            {isExpertMode ? '✦ EXPERT' : '✧ STANDARD'}
                        </button>
                    </div>

                    <div className="flex items-center w-full">
                        <span className={`text-lg md:text-xl vn-text-shadow mr-2 font-bold transition-colors ${
                            agentQuestion ? 'text-purple-400' : (isExpertMode ? 'text-white-400' : 'text-white/50')
                        }`}>
                            &gt;
                        </span>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleSend}
                            autoFocus
                            disabled={isSending}
                            placeholder={isSending ? "Processing..." : (agentQuestion ? "Type your answer here..." : "Message...")}
                            className={`flex-1 w-full bg-transparent border-none outline-none text-lg md:text-xl text-white vn-text-shadow placeholder-white/20 font-vn leading-snug tracking-tight caret-transparent cursor-blink ${isSending ? 'opacity-50' : ''}`}
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>

            {modalImage && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
                    <button
                        onClick={() => setModalImage(null)}
                        className="absolute top-6 right-8 text-white/50 hover:text-white text-4xl font-sans transition-colors cursor-pointer"
                        title="Close"
                    >
                        &times;
                    </button>

                    <div className="relative max-w-5xl max-h-[85vh] p-4 bg-white/5 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10">
                        <img
                            src={modalImage}
                            alt="Generated Output"
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}