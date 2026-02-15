import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUUID, getUserId } from '../utils/uuid';

// 打字机速度配置
const TYPE_SPEED_MS = 30;
const CHARS_PER_TICK = 3;

export default function ChatPage() {
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);

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

                // 直接截取目标文本的前 nextIndex 个字符作为显示内容
                const displayText = targetTextRef.current.slice(0, nextIndex);

                setMessages(prev => {
                    const newMessages = [...prev];
                    const targetIndex = newMessages.findIndex(m => m.id === currentMsgIdRef.current);
                    if (targetIndex !== -1) {
                        // 直接设置，而不是追加，避免重复
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

    // --- 重建目标文本（按 step 顺序）---
    const rebuildTargetText = () => {
        const sortedSteps = Array.from(stepContentsRef.current.entries())
            .sort((a, b) => a[0] - b[0]); // 按 step ID 排序

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

            // --- 处理 step 事件 ---
            eventSource.addEventListener("step", (event) => {
                const stepId = parseInt(event.lastEventId, 10);
                let rawData = event.data;

                // 数据清洗
                if (rawData.startsWith('"') && rawData.endsWith('"')) {
                    try { rawData = JSON.parse(rawData); } catch(e) {}
                }

                // 使用 Map 存储，自动去重（相同 stepId 会覆盖）
                if (!isNaN(stepId)) {
                    stepContentsRef.current.set(stepId, rawData);
                    rebuildTargetText();
                }
            });

            // --- 处理 complete 事件 ---
            eventSource.addEventListener("complete", (event) => {
                let rawData = event.data;

                if (rawData.startsWith('"') && rawData.endsWith('"')) {
                    try { rawData = JSON.parse(rawData); } catch(e) {}
                }

                // complete 使用一个特殊的大 ID 确保排在最后
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
            <div className="absolute inset-0 z-0 bg-slate-900/70 backdrop-blur-[1px]" />

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