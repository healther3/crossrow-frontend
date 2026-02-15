import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChatPage() {
    const navigate = useNavigate();
    const bottomRef = useRef(null);
    const [input, setInput] = useState('');

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

            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: "I am listening. Tell me what burdens your mind.",
                    sender: "ai"
                }]);
            }, 1000);
        }
    };

    return (
        <div className="relative min-h-screen font-vn overflow-hidden flex flex-col">
            {/* 1. 蒙版：稍微加深一点，配合紧凑的白字，对比度更高 */}
            <div className="absolute inset-0 z-0 bg-slate-900/70 backdrop-blur-[1px]" />

            {/* 2. 退出按钮 */}
            <button
                onClick={() => navigate('/')}
                className="fixed top-6 right-8 z-50 text-white/40 hover:text-white vn-text-shadow text-sm transition-colors cursor-pointer"
            >
                [ Return ]
            </button>

            {/* 3. 主要内容容器
         - max-w-5xl mx-auto: 让内容块在屏幕中间，但保留较宽的阅读区域
         - px-8 md:px-16: 左右留白，让文字块看起来更“聚气”
      */}
            <div className="relative z-10 flex flex-col w-full max-w-5xl mx-auto h-screen px-8 md:px-16 py-12">

                {/* 聊天记录区域 */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                    {/* space-y-6: 这里的间距就是你要求的“空行表达人物转化” */}
                    <div className="flex flex-col space-y-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className="animate-fade-in w-full text-left">
                                {/* 排版调整：
                   - text-lg md:text-xl: 字体变小，更精致
                   - leading-snug: 行距变紧
                   - tracking-tight: 字距变紧
                   - vn-text-shadow: 保持硬黑边，确保清晰
                */}
                                <p className={`text-lg md:text-xl leading-none tracking-tight vn-text-shadow break-words ${
                                    msg.sender === 'user' ? 'text-cyan-200' : 'text-white'
                                }`}>
                                    {msg.text}
                                </p>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* 4. 底部输入区域 */}
                <div className="mt-4 pt-4 border-t border-white/10 w-full">
                    <div className="flex items-center w-full">
                        {/* 提示符也相应变小 */}
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