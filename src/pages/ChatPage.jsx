import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUUID, getUserId } from '../utils/uuid';
import { useSettings } from '../context/SettingsContext';

// 打字机速度配置
const TYPE_SPEED_MS = 30;
const CHARS_PER_TICK = 3;

export default function ChatPage() {
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    // 1. 获取全局配置 (从 OptionsPage 传来的)
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

    // --- 背景图状态 ---
    const [bgUrl, setBgUrl] = useState(null);

    // 2. 异步获取背景图 URL (适配你的后端返回 String 的情况)
    useEffect(() => {
        const fetchBackgroundUrl = async () => {
            try {
                // 你的后端接口地址
                const baseUrl = "http://localhost:8123/api/crossrow/image/background";
                const params = new URLSearchParams();

                // 确定模式: 如果 context 里没值，默认 RANDOM
                const mode = bgConfig?.mode === 'USER' ? 'USER' : 'RANDOM';
                params.append("mode", mode);

                // 如果是 USER 模式且有坐标，传给后端
                if (mode === 'USER' && bgConfig?.coords) {
                    params.append("lat", bgConfig.coords.lat);
                    params.append("lng", bgConfig.coords.lng);
                }

                // 发起请求拿到 URL 字符串
                const response = await fetch(`${baseUrl}?${params.toString()}`);

                if (response.ok) {
                    const urlString = await response.text(); // 后端返回的是纯文本 URL
                    console.log("Got background URL:", urlString);
                    // 只有当返回了有效 URL 时才更新
                    if (urlString && urlString.startsWith('http')) {
                        setBgUrl(urlString);
                    }
                } else {
                    console.error("Failed to fetch background URL");
                }
            } catch (error) {
                console.error("Error fetching background:", error);
            }
        };

        fetchBackgroundUrl();
    }, [bgConfig]); // 当 bgConfig 变化时（比如用户改了设置），重新获取

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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

            setMessages(prev => [
                ...prev,
                { id: userMsgId, text: userText, sender: "user" },
                { id: aiMsgId, text: "", sender: "ai" }
            ]);

            const url = `http://localhost:8123/api/crossrow/agent/chat?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}`;
            const eventSource = new EventSource(url);

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
            };
        }
    };

    return (
        <div className="relative min-h-screen font-vn overflow-hidden flex flex-col">

            {/* --- 背景图渲染层 --- */}
            <div className="absolute inset-0 z-0 bg-slate-900">
                {/* 1. 图片层：使用 object-cover 铺满 */}
                {bgUrl && (
                    <img
                        src={bgUrl}
                        alt="Background"
                        className="w-full h-full object-cover opacity-60 filter brightness-75 contrast-125 transition-opacity duration-1000 animate-fade-in"
                        onError={(e) => {
                            e.target.style.display = 'none'; // 加载失败时隐藏
                        }}
                    />
                )}

                {/* 2. 蒙版层：保留之前的 backdrop-blur，但叠加在图片上 */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/90 backdrop-blur-[1px]" />
            </div>

            <button
                onClick={() => navigate('/')}
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