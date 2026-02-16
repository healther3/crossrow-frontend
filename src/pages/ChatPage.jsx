import React, { useState, useEffect, useRef } from 'react';
// 1. 之前遗留的未使用引用已清理
import { generateUUID, getUserId } from '../utils/uuid';
import { useSettings } from '../context/SettingsContext';
import { useTransition } from '../context/TransitionContext';

// 打字机速度配置
const TYPE_SPEED_MS = 30;
const CHARS_PER_TICK = 3;

export default function ChatPage() {
    const { navigateWithTransition } = useTransition();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    // 1. 获取全局配置
    const { bgConfig } = useSettings();

    // ID 管理
    const userId = "admin";
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

    // 3. 异步获取背景图 URL (修复鉴权问题)
    useEffect(() => {
        const fetchBackgroundUrl = async () => {
            try {
                const baseUrl = "http://localhost:8123/api/crossrow/image/background";
                const params = new URLSearchParams();

                // --- 修复点 1：必须携带 userId，否则后端 SimpleAuthAdvisor 会拦截报 403 ---
                params.append("userId", userId);

                // --- 修复点 2：智能回退逻辑 ---
                let mode = bgConfig?.mode === 'USER' ? 'USER' : 'RANDOM';

                // 如果是 USER 模式但没有坐标数据，强制降级为 RANDOM，防止后端报错
                if (mode === 'USER' && (!bgConfig?.coords || !bgConfig.coords.lat)) {
                    console.warn("[FrontEnd] User mode selected but no coords found. Falling back to RANDOM.");
                    mode = 'RANDOM';
                }

                params.append("mode", mode);

                if (mode === 'USER' && bgConfig?.coords) {
                    params.append("lat", bgConfig.coords.lat);
                    params.append("lng", bgConfig.coords.lng);
                }

                console.log(`[FrontEnd] Fetching background... Mode: ${mode}, User: ${userId}`);

                const response = await fetch(`${baseUrl}?${params.toString()}`);

                if (response.ok) {
                    const urlString = await response.text();
                    // 简单的 URL 校验
                    if (urlString && urlString.startsWith('http')) {
                        setBgUrl(urlString);
                    }
                } else {
                    console.error("[FrontEnd] Failed to fetch background URL. Status:", response.status);
                }
            } catch (error) {
                console.error("[FrontEnd] Error fetching background:", error);
            }
        };

        fetchBackgroundUrl();
    }, [bgConfig]); // 当配置变化时重新获取

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
            .map(([_, content]) => content)
            .join("\n\n");
    };

    const handleSend = (e) => {
        if (e.key === 'Enter' && input.trim() && !isSending && !e.nativeEvent.isComposing) {
            setIsSending(true);
            const userText = input.trim();
            setInput('');

            const userMsgId = Date.now();
            const aiMsgId = userMsgId + 1;

            // 重置状态
            currentMsgIdRef.current = aiMsgId;
            targetTextRef.current = "";
            displayedIndexRef.current = 0;
            stepContentsRef.current.clear();

            // 发送前先关闭可能存在的旧连接
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            setMessages(prev => [
                ...prev,
                { id: userMsgId, text: userText, sender: "user" },
                { id: aiMsgId, text: "", sender: "ai" }
            ]);

            const url = `http://localhost:8123/api/crossrow/agent/chat?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}`;
            const eventSource = new EventSource(url);

            eventSourceRef.current = eventSource;

            eventSource.addEventListener("step", (event) => {
                const stepId = event.lastEventId ? parseInt(event.lastEventId, 10) : Date.now();
                let rawData = event.data;

                if (rawData.startsWith('"') && rawData.endsWith('"')) {
                    try { rawData = JSON.parse(rawData); } catch(e) {}
                }

                if (!isNaN(stepId)) {
                    stepContentsRef.current.set(stepId, rawData);
                    rebuildTargetText();
                }
            });

            eventSource.addEventListener("complete", (event) => {
                let rawData = event.data;
                if (rawData.startsWith('"') && rawData.endsWith('"')) {
                    try { rawData = JSON.parse(rawData); } catch(e) {}
                }

                const completeId = 999999;
                if (!stepContentsRef.current.has(completeId)) {
                    stepContentsRef.current.set(completeId, rawData);
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

            {/* --- 背景图渲染层 --- */}
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
                {/* 蒙版层：保证文字清晰度 */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/90 backdrop-blur-[1px]" />
            </div>

            <button
                onClick={() => navigateWithTransition('/')}
                className="fixed top-6 right-8 z-50 text-white/40 hover:text-white vn-text-shadow text-sm transition-colors cursor-pointer"
            >
                [ Return ]
            </button>

            <div className="relative z-10 flex flex-col w-full max-w-5xl mx-auto h-screen px-8 md:px-16 py-12">
                <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
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
                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 w-full">
                    <div className="flex items-center w-full">
                        <span className="text-lg md:text-xl text-white/50 vn-text-shadow mr-2 font-bold">
                            &gt;
                        </span>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleSend}
                            autoFocus
                            disabled={isSending}
                            className={`flex-1 w-full bg-transparent border-none outline-none text-lg md:text-xl text-white vn-text-shadow placeholder-white/20 font-vn leading-snug tracking-tight caret-transparent cursor-blink ${isSending ? 'opacity-50' : ''}`}
                            placeholder={isSending ? "Processing..." : ""}
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}