import React, { useState } from 'react';
import { User, LogIn } from 'lucide-react';

export default function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const handleAuthClick = () => {
        setIsLoggedIn(!isLoggedIn);
    };

    return (
        // changed: z-50 确保在最顶层，bg-slate-900/80 实现深色磨砂
        <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/10 bg-slate-200/100 backdrop-blur-md shadow-lg transition-all duration-300">
            <div className="mx-auto w-full px-6 lg:px-12">
                <div className="flex h-16 items-center justify-between">

                    {/* 左侧：Logo 或 品牌名 (可选，目前留空或放个小的 Home 图标) */}
                    <div className="flex-shrink-0">
                        {/* 如果需要 logo 可以放这里 */}
                    </div>

                    {/* 右侧：功能区 (只保留登录/用户中心) */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleAuthClick}
                            className="group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-300 hover:text-white rounded-full hover:bg-white/10"
                        >
                            {/* 这里的文字会在登录状态改变 */}
                            <span>{isLoggedIn ? '用户中心' : '登录'}</span>

                            {/* 下划线动画 */}
                            <span className="absolute bottom-1 left-4 right-4 h-[1px] scale-x-0 bg-blue-400 transition-transform duration-300 group-hover:scale-x-100" />
                        </button>
                    </div>

                </div>
            </div>
        </nav>
    );
}