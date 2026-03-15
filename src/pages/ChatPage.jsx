import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useTransition } from '../context/TransitionContext';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';

import SessionSidebar from '../components/SessionSidebar';
import AgentTracePanel from '../components/AgentTracePanel';
import ImageModal from '../components/ImageModal';

const TYPE_SPEED_MS = 20;
const CHARS_PER_TICK = 3;
const MODES = ['PREFERRED', 'AUTO', 'AGENT', 'EXPERT'];

export default function ChatPage() {
    const { navigateWithTransition } = useTransition();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [modalImage, setModalImage] = useState(null);
    const [agentQuestion, setAgentQuestion] = useState(null);

    const [chatModeIndex, setChatModeIndex] = useState(0);
    const chatMode = MODES[chatModeIndex];
    const [preferredModel, setPreferredModel] = useState('STANDARD');

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [chatId, setChatId] = useState(null);

    const { bgConfig } = useSettings();
    const { userId, token } = useAuth();

    const [messages, setMessages] = useState([]);

    const targetTextRef = useRef("");
    const displayedIndexRef = useRef(0);
    const currentMsgIdRef = useRef(null);
    const eventSourceRef = useRef(null);
    const stepContentsRef = useRef(new Map()); // 用于拼接流式数据

    const [bgUrl, setBgUrl] = useState(null);
    const baseUrlAPI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8123';

    // 获取偏好模型
    useEffect(() => {
        const fetchPref = async () => {
            if(!token) return;
            try {
                const res = await fetch(`${baseUrlAPI}/api/user/model-preference`, { headers: {'Authorization': `Bearer ${token}`} });
                if(res.ok) {
                    const data = await res.json();
                    if(data.currentModel) setPreferredModel(data.currentModel);
                }
            } catch(e) {}
        };
        fetchPref();
    }, [token, baseUrlAPI]);

    // 加载历史记录
    const loadChatHistory = async (targetChatId) => {
        try {
            const response = await fetch(`${baseUrlAPI}/api/sessions/${targetChatId}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const historyData = await response.json();
                if (!historyData || historyData.length === 0) {
                    setMessages([
                        { id: 1, text: "Wait... where am I?", sender: "user" },
                        { id: 2, text: "You have arrived. This is the boundary of consciousness.", sender: "ai" }
                    ]);
                    return;
                }
                const formattedMessages = historyData.map((item, index) => ({
                    id: Date.now() + index,
                    text: item.content,
                    sender: item.role === 'user' ? 'user' : 'ai',
                    steps: [],
                    tokenUsage: null
                }));
                setMessages(formattedMessages);
            } else {
                setMessages([{ id: Date.now(), text: "[System]: Error loading memory.", sender: "system" }]);
            }
        } catch (error) {
            setMessages([{ id: Date.now(), text: "[System]: Network anomaly detected.", sender: "system" }]);
        }
    };

    // 侧边栏回调
    const handleSessionSelect = (selectedId) => {
        if (chatId === selectedId) return;
        if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
        setIsSending(false); setAgentQuestion(null); currentMsgIdRef.current = null; targetTextRef.current = ""; displayedIndexRef.current = 0; stepContentsRef.current.clear();

        setChatId(selectedId);
        setMessages([{ id: Date.now(), text: "[System]: Accessing memory archives...", sender: "system" }]);
        loadChatHistory(selectedId);
    };

    const handleNewSession = (newId) => {
        if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
        setIsSending(false); setAgentQuestion(null); currentMsgIdRef.current = null; targetTextRef.current = ""; displayedIndexRef.current = 0; stepContentsRef.current.clear();

        setChatId(newId);
        setMessages([
            { id: 1, text: "Wait... where am I?", sender: "user" },
            { id: 2, text: "You have arrived. This is the boundary of consciousness.", sender: "ai" }
        ]);
    };

    // 背景逻辑
    useEffect(() => {
        const fetchBackgroundUrl = async () => {
            try {
                let mode = bgConfig?.mode || 'RANDOM';
                if (mode === 'USER' && (!bgConfig?.coords || !bgConfig.coords.lat)) mode = 'RANDOM';
                if (mode === 'CUSTOM') {
                    const response = await fetch(`${baseUrlAPI}/api/user/background`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (response.ok) setBgUrl(await response.text());
                    return;
                }
                const baseUrl = `${baseUrlAPI}/api/crossrow/image/background`;
                const params = new URLSearchParams();
                params.append("userId", userId); params.append("mode", mode);
                if (mode === 'USER' && bgConfig?.coords) { params.append("lat", bgConfig.coords.lat); params.append("lng", bgConfig.coords.lng); }
                const response = await fetch(`${baseUrl}?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) {
                    const urlString = await response.text();
                    if (urlString && urlString.startsWith('http')) setBgUrl(urlString);
                    else if (urlString && urlString.startsWith('/api')) setBgUrl(`${baseUrlAPI}${urlString}`);
                }
            } catch (error) {}
        };
        fetchBackgroundUrl();
    }, [bgConfig, userId, token, baseUrlAPI]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    useEffect(() => { return () => { if (eventSourceRef.current) eventSourceRef.current.close(); }; }, []);

    // 打字机
    useEffect(() => {
        const timer = setInterval(() => {
            if (currentMsgIdRef.current && displayedIndexRef.current < targetTextRef.current.length) {
                const nextIndex = Math.min(displayedIndexRef.current + CHARS_PER_TICK, targetTextRef.current.length);
                const displayText = targetTextRef.current.slice(0, nextIndex);
                setMessages(prev => {
                    const newMessages = [...prev];
                    const targetIndex = newMessages.findIndex(m => m.id === currentMsgIdRef.current);
                    if (targetIndex !== -1) { newMessages[targetIndex] = { ...newMessages[targetIndex], text: displayText }; }
                    return newMessages;
                });
                displayedIndexRef.current = nextIndex;
            }
        }, TYPE_SPEED_MS);
        return () => clearInterval(timer);
    }, []);

    // 核心发送逻辑
    const handleSend = async (e) => {
        if (e.key === 'Enter' && input.trim() && !isSending && !e.nativeEvent.isComposing) {
            if (!chatId) return;

            setIsSending(true); setAgentQuestion(null);
            const userText = input.trim(); setInput('');
            const userMsgId = Date.now(); const aiMsgId = userMsgId + 1;

            currentMsgIdRef.current = aiMsgId; targetTextRef.current = ""; displayedIndexRef.current = 0; stepContentsRef.current.clear();
            if (eventSourceRef.current) eventSourceRef.current.close();

            setMessages(prev => [
                ...prev,
                { id: userMsgId, text: userText, sender: "user" },
                { id: aiMsgId, text: "", sender: "ai", steps: [], tokenUsage: null }
            ]);

            let finalUrl = '';
            try {
                if (chatMode === 'EXPERT') {
                    const preRes = await fetch(`${baseUrlAPI}/api/crossrow/expert/preview?message=${encodeURIComponent(userText)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if(preRes.ok) {
                        const expertName = await preRes.text();
                        setMessages(prev => [...prev, { id: Date.now() + 2, text: `[System Log]: Routing query to specialist [ ${expertName.toUpperCase()} ]`, sender: "system" }]);
                    }
                    finalUrl = `${baseUrlAPI}/api/crossrow/expert/chat?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}&token=${token}`;
                } else if (chatMode === 'AUTO') {
                    const decisionRes = await fetch(`${baseUrlAPI}/api/crossrow/route/decision?message=${encodeURIComponent(userText)}`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if(decisionRes.ok) {
                        const decision = await decisionRes.json();
                        const model = decision.selectedModel || decision.model || 'Optimal Framework';
                        const reason = decision.taskReview?.reason || decision.reason || 'Complexity Evaluated';
                        setMessages(prev => [...prev, { id: Date.now() + 2, text: `[Auto-Selection Trace]:\n- Analysis: ${reason}\n- Deployed Core: [ ${model} ]`, sender: "system" }]);
                    }
                    finalUrl = `${baseUrlAPI}/api/crossrow/chat/auto-route/sse?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}&token=${token}`;
                } else if (chatMode === 'PREFERRED') {
                    finalUrl = `${baseUrlAPI}/api/crossrow/chat/model/sse?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}&model=${preferredModel}&token=${token}`;
                } else {
                    finalUrl = `${baseUrlAPI}/api/crossrow/agent/chat?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}&token=${token}`;
                }

                const eventSource = new EventSource(finalUrl);
                eventSourceRef.current = eventSource;

                // --- 终极防御：使用 Set 确保弹窗只触发一次 ---
                let chunkCounter = 0;
                const processedImageUrls = new Set();
                const processedQuestions = new Set();

                // 在拼接完整的长字符串上执行解析，防止流式切片导致正则失效
                const processDataWithHiddenActions = (fullText) => {
                    let cleanedData = fullText;

                    const actionRegex = /<hidden_action\s+type=['"]show_image['"]\s+url=['"](.*?)['"]\s*\/>/gi;
                    let match;
                    while ((match = actionRegex.exec(cleanedData)) !== null) {
                        const gcsUrl = match[1];
                        if (!processedImageUrls.has(gcsUrl)) {
                            processedImageUrls.add(gcsUrl);
                            setTimeout(() => { setModalImage(gcsUrl); }, 800);
                        }
                    }
                    cleanedData = cleanedData.replace(actionRegex, '');

                    const askRegex = /<hidden_action\s+type=['"]ask_human['"]\s+question=['"](.*?)['"]\s*\/>/gi;
                    let askMatch;
                    while ((askMatch = askRegex.exec(cleanedData)) !== null) {
                        const questionText = askMatch[1];
                        if (!processedQuestions.has(questionText)) {
                            processedQuestions.add(questionText);
                            setTimeout(() => { setAgentQuestion(questionText); }, 500);
                        }
                    }
                    cleanedData = cleanedData.replace(askRegex, '');
                    cleanedData = cleanedData.replace('(Waiting for user input...)', '');
                    return cleanedData;
                };

                // 专门处理原始纯文本流 (比如模型直接返回的画图标签)
                const handleRawData = (data) => {
                    let cleanedData = data;
                    if (cleanedData.startsWith('"') && cleanedData.endsWith('"')) {
                        try { cleanedData = JSON.parse(cleanedData); } catch(e) {}
                    }
                    stepContentsRef.current.set(chunkCounter++, cleanedData);

                    const fullRawText = Array.from(stepContentsRef.current.entries()).sort((a, b) => Number(a[0]) - Number(b[0])).map(([_, content]) => content).join("");
                    targetTextRef.current = processDataWithHiddenActions(fullRawText.replace(/\\n/g, '\n'));
                };

                // 通道 1：捕获匿名事件 (Flux 返回的纯文本流)
                eventSource.onmessage = (event) => {
                    handleRawData(event.data);
                };

                // 通道 2：捕获命名事件 (Agent 返回的 JSON DTO)
                eventSource.addEventListener("step", (event) => {
                    try {
                        const dto = JSON.parse(event.data);
                        if (dto && (dto.stepType || dto.stepNumber !== undefined)) {

                            // ==========================================
                            // 【核心修复】：拦截并解析工具调用结果中的隐藏标签！
                            // ==========================================
                            if (dto.toolCalls && Array.isArray(dto.toolCalls)) {
                                dto.toolCalls.forEach(tool => {
                                    if (tool.result && typeof tool.result === 'string') {
                                        // 扫描工具的结果，触发图片弹窗，并把标签从文本中抹除
                                        tool.result = processDataWithHiddenActions(tool.result);
                                    }
                                });
                            }

                            setMessages(prev => prev.map(msg => {
                                if (msg.id === aiMsgId) {
                                    const newMsg = { ...msg };
                                    if (dto.stepType === "final_answer") {
                                        targetTextRef.current = processDataWithHiddenActions(dto.finalAnswer || "");
                                        if (dto.tokenUsage) newMsg.tokenUsage = dto.tokenUsage;
                                    } else {
                                        const existingSteps = newMsg.steps || [];
                                        const stepIndex = existingSteps.findIndex(s => s.stepNumber === dto.stepNumber);

                                        if (stepIndex !== -1) {
                                            const updatedSteps = [...existingSteps];
                                            updatedSteps[stepIndex] = dto;
                                            newMsg.steps = updatedSteps;
                                        } else {
                                            newMsg.steps = [...existingSteps, dto];
                                        }
                                    }
                                    return newMsg;
                                }
                                return msg;
                            }));
                        } else {
                            handleRawData(event.data);
                        }
                    } catch (parseError) {
                        handleRawData(event.data);
                    }
                });

                eventSource.addEventListener("complete", () => { eventSource.close(); setIsSending(false); eventSourceRef.current = null; });
                eventSource.addEventListener("error", (event) => {
                    try {
                        const errDto = JSON.parse(event.data);
                        setMessages(prev => [...prev, { id: Date.now(), text: `[System Error]: ${errDto.message || 'Unknown error'}`, sender: "system" }]);
                    } catch (e) {}
                    eventSource.close(); setIsSending(false); eventSourceRef.current = null;
                });

            } catch (err) { setIsSending(false); }
        }
    };

    // UI 颜色计算
    let modeLabel = ''; let modeStyle = ''; let inputBorder = ''; let inputArrow = '';
    switch(chatMode) {
        case 'PREFERRED': modeLabel = `✧ ${preferredModel.toUpperCase()}`; modeStyle = 'border-slate-500/50 text-slate-400 hover:text-slate-200 hover:border-slate-400'; inputBorder = 'border-white/10'; inputArrow = 'text-white/50'; break;
        case 'AUTO': modeLabel = '⟳ AUTO SELECTION'; modeStyle = 'border-cyan-500 text-cyan-300 bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.4)]'; inputBorder = 'border-cyan-500/50'; inputArrow = 'text-cyan-400'; break;
        case 'AGENT': modeLabel = '◈ AGENT'; modeStyle = 'border-blue-500 text-blue-300 bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.4)]'; inputBorder = 'border-blue-500/50'; inputArrow = 'text-blue-400'; break;
        case 'EXPERT': modeLabel = '✦ EXPERT COUNCIL'; modeStyle = 'border-purple-500 text-purple-300 bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.4)]'; inputBorder = 'border-purple-500/50'; inputArrow = 'text-purple-400'; break;
    }

    return (
        <div className="relative min-h-screen font-vn overflow-hidden flex">
            <div className="absolute inset-0 z-0 bg-slate-900">
                {bgUrl && <img src={bgUrl} alt="Background" className="w-full h-full object-cover opacity-60 filter brightness-75 contrast-125 transition-opacity duration-1000 animate-fade-in" onError={(e) => { e.target.style.display = 'none'; }} />}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/90 backdrop-blur-[1px]" />
            </div>

            <SessionSidebar isSidebarOpen={isSidebarOpen} currentChatId={chatId} onSessionSelect={handleSessionSelect} onNewSession={handleNewSession} token={token} />

            <div className="relative z-10 flex flex-col flex-1 h-screen">
                <div className="flex justify-between items-center p-6 w-full">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg cursor-pointer">
                        <Menu size={24} />
                    </button>
                    <button onClick={() => navigateWithTransition('/')} className="text-white/40 hover:text-white vn-text-shadow text-sm transition-colors cursor-pointer font-sans tracking-widest">
                        [ Return ]
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col w-full max-w-5xl mx-auto px-8 md:px-16 pb-12">
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-8 pr-2">
                        <div className="flex flex-col space-y-6">
                            {messages.map((msg) => (
                                <div key={msg.id} className="animate-fade-in w-full text-left">
                                    {msg.sender === 'ai' && <AgentTracePanel steps={msg.steps} tokenUsage={msg.tokenUsage} />}

                                    <p className={`text-lg md:text-xl leading-snug tracking-tight vn-text-shadow break-words whitespace-pre-wrap ${
                                        msg.sender === 'user' ? 'text-cyan-200' :
                                            msg.sender === 'system' ? 'text-green-400/80 font-mono text-sm border-l-2 border-green-500/50 pl-3 my-2 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                                                'text-white'
                                    }`}>
                                        {msg.text}
                                    </p>
                                </div>
                            ))}
                            <div ref={bottomRef}/>
                        </div>
                    </div>

                    <div className={`mt-4 pt-4 border-t transition-colors duration-500 w-full ${agentQuestion ? 'border-yellow-400/50' : inputBorder}`}>
                        <div className="flex justify-between items-end mb-2 min-h-[24px]">
                            <div>{agentQuestion && <div className="text-sm text-yellow-300 font-serif tracking-wide animate-pulse">[System]: Waiting for confirmation: "{agentQuestion}"</div>}</div>
                            <button onClick={() => setChatModeIndex((prev) => (prev + 1) % MODES.length)} disabled={isSending || agentQuestion} className={`text-xs font-sans tracking-widest px-3 py-1 rounded transition-all duration-300 border ${modeStyle} ${isSending || agentQuestion ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                {modeLabel}
                            </button>
                        </div>
                        <div className="flex items-center w-full">
                            <span className={`text-lg md:text-xl vn-text-shadow mr-2 font-bold transition-colors ${agentQuestion ? 'text-yellow-400' : inputArrow}`}>&gt;</span>
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleSend} autoFocus disabled={isSending || !chatId} placeholder={isSending ? "Processing..." : (agentQuestion ? "Type your answer here..." : "Message...")} className={`flex-1 w-full bg-transparent border-none outline-none text-lg md:text-xl text-white vn-text-shadow placeholder-white/20 font-vn leading-snug tracking-tight caret-transparent cursor-blink ${isSending ? 'opacity-50' : ''}`} autoComplete="off" />
                        </div>
                    </div>
                </div>
            </div>

            <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />
        </div>
    );
}