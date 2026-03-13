import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';

export default function SessionSidebar({ isSidebarOpen, currentChatId, onSessionSelect, onNewSession, token }) {
    const [sessions, setSessions] = useState([]);

    // 重命名相关的状态
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    // --- 新增：自定义删除确认框的状态 ---
    const [sessionToDelete, setSessionToDelete] = useState(null);

    const baseUrlAPI = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8123';
    const sessionApiUrl = `${baseUrlAPI}/api/sessions`;

    // 1. 获取会话列表
    const fetchSessions = async () => {
        if (!token) return;
        try {
            const response = await fetch(sessionApiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
                if (!currentChatId && data.length > 0) {
                    onSessionSelect(data[0].id);
                } else if (!currentChatId && data.length === 0) {
                    createNewSession();
                }
            }
        } catch (error) {
            console.error("Failed to fetch sessions:", error);
        }
    };

    // 2. 创建新会话
    const createNewSession = async () => {
        try {
            const response = await fetch(sessionApiUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const newSession = await response.json();
                setSessions(prev => [newSession, ...prev]);
                onNewSession(newSession.id);
            }
        } catch (error) {
            console.error("Failed to create session:", error);
        }
    };

    // 3A. 触发删除意图（只弹窗，不发请求）
    const requestDelete = (e, id) => {
        e.stopPropagation();
        setSessionToDelete(id); // 记录要删除的ID，触发弹窗显示
    };

    // 3B. 正式执行删除（用户在弹窗中点了确认）
    const confirmDelete = async () => {
        if (!sessionToDelete) return;
        const id = sessionToDelete;

        try {
            const response = await fetch(`${sessionApiUrl}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const updatedSessions = sessions.filter(s => s.id !== id);
                setSessions(updatedSessions);

                if (id === currentChatId) {
                    if (updatedSessions.length > 0) {
                        onSessionSelect(updatedSessions[0].id);
                    } else {
                        createNewSession();
                    }
                }
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        } finally {
            // 无论成功失败，最后都要关闭弹窗
            setSessionToDelete(null);
        }
    };

    // 4. 开始编辑标题
    const startEditing = (e, session) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditTitle(session.title || 'New Conversation');
    };

    // 5. 保存编辑的标题
    const saveTitle = async (e, id) => {
        e.stopPropagation();
        if (!editTitle.trim()) {
            setEditingId(null);
            return;
        }

        try {
            const response = await fetch(`${sessionApiUrl}/${id}/title?title=${encodeURIComponent(editTitle)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setSessions(sessions.map(s => s.id === id ? { ...s, title: editTitle } : s));
                setEditingId(null);
            }
        } catch (error) {
            console.error("Failed to update title:", error);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [token]);

    return (
        <>
            <div className={`relative z-40 flex-shrink-0 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out ${
                isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'
            }`}>
                <div className="flex flex-col h-full p-4 w-72">
                    <button
                        onClick={createNewSession}
                        className="flex items-center justify-center gap-2 w-full py-3 mb-6 border border-white/20 rounded-xl text-white/80 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-400/50 transition-all duration-300 font-sans tracking-widest text-sm cursor-pointer shadow-lg"
                    >
                        <Plus size={18} /> NEW CHAT
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => onSessionSelect(session.id)}
                                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                                    currentChatId === session.id
                                        ? 'bg-blue-500/20 border border-blue-500/30 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                        : 'text-slate-400 hover:bg-white/5 border border-transparent hover:text-slate-200'
                                }`}
                            >
                                <MessageSquare size={16} className={`flex-shrink-0 ${currentChatId === session.id ? "text-blue-400" : "text-slate-500"}`} />

                                {editingId === session.id ? (
                                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.key === 'Enter' && saveTitle(e, session.id)}
                                            autoFocus
                                            className="flex-1 bg-black/30 border border-blue-500/50 rounded px-2 py-1 text-sm text-white outline-none w-full"
                                        />
                                        <button onClick={(e) => saveTitle(e, session.id)} className="text-green-400 hover:text-green-300 flex-shrink-0">
                                            <Check size={16} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-red-400 hover:text-red-300 flex-shrink-0">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-sans text-sm tracking-wide truncate flex-1">
                                            {session.title || 'New Conversation'}
                                        </span>

                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity duration-200">
                                            <button
                                                onClick={(e) => startEditing(e, session)}
                                                className="text-slate-400 hover:text-blue-400 transition-colors p-1"
                                                title="Rename"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                // 换成新的 requestDelete，而不是直接调后端的 deleteSession
                                                onClick={(e) => requestDelete(e, session.id)}
                                                className="text-slate-400 hover:text-red-400 transition-colors p-1"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- 新增：优雅的自定义删除确认弹窗 --- */}
            {sessionToDelete && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSessionToDelete(null)} // 点击背景区域取消
                >
                    <div
                        className="bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4 transform transition-all"
                        onClick={(e) => e.stopPropagation()} // 防止点击弹窗内部时触发背景的取消事件
                    >
                        <h3 className="text-2xl font-serif text-white mb-4 tracking-wide">Delete Memory?</h3>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            This action cannot be undone. This conversation will be permanently erased from the server.
                        </p>

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setSessionToDelete(null)}
                                className="px-5 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-sans tracking-wide cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-sm font-sans tracking-wide shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}