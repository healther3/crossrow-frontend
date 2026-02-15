import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateUUID, getUserId } from '../utils/uuid';


export default function ChatPage() {
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');

    // temporary ids
    const [userId] = useState(getUserId());
    const [chatId] = useState(generateUUID());

    const [messages, setMessages] = useState([
        { id: 1, text: "Wait... where am I?", sender: "user" },
        { id: 2, text: "You have arrived. This is the boundary of consciousness.", sender: "ai" },
        { id: 3, text: "The noise of the world fades away here.", sender: "ai" },
    ]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e) => {
        if (e.key === 'Enter' && input.trim()) {
            const userMsg = { id: Date.now(), text: input, sender: "user" };
            setMessages(prev => [...prev, userMsg]);
            setInput('');

            // 1. 先把用户的消息显示在界面上
            const userMsgId = Date.now();
            setMessages(prev => [...prev, { id: userMsgId, text: userText, sender: "user" }]);

            // 2. 创建一个空的 AI 消息占位符，准备接收数据
            const aiMsgId = userMsgId + 1;
            setMessages(prev => [...prev, { id: aiMsgId, text: "", sender: "ai" }]);

            // 3. 构建后端请求 URL
            const url = `http://localhost:8123/api/crossrow/agent/chat?message=${encodeURIComponent(userText)}&chatId=${chatId}&userId=${userId}`;

            // 4. 建立 EventSource 连接 (这是处理 Server-Sent Events 的标准 API)
            const eventSource = new EventSource(url);

            // 监听消息事件 (后端每发送一个字符/片段，这里就会触发一次)
            eventSource.onmessage = (event) => {
                // 后端传回来的数据在 event.data 中
                const newData = event.data;
                // 更新 UI：找到最后那条 AI 消息，把新数据追加上去
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsgIndex = newMessages.findIndex(m => m.id === aiMsgId);
                    if (lastMsgIndex !== -1) {
                        // 注意：这里需要处理换行符，如果后端传回的是特定格式
                        // 简单文本流直接追加即可
                        newMessages[lastMsgIndex].text += newData;
                    }
                    return newMessages;
                });
            };

// 监听错误或结束
            eventSource.onerror = (err) => {
                // SSE 的特性是连接关闭也会触发 error，所以这里通常意味着流结束了
                console.log("Stream ended or error occurred");
                eventSource.close(); // 务必关闭连接，否则浏览器会尝试自动重连
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
                            className="flex-1 w-full bg-transparent border-none outline-none text-lg md:text-xl text-white vn-text-shadow placeholder-white/20 font-vn leading-snug tracking-tight caret-transparent cursor-blink"
                            placeholder=""
                            autoComplete="off"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}