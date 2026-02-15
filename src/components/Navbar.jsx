// src/components/Navbar.jsx
import React, { useState } from 'react';

export default function Navbar() {
    // 3. 简单的状态模拟：false 代表未登录，true 代表已登录
    // 后续这里会替换为读取 localStorage 或全局状态
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // 模拟登录/登出的处理函数
    const handleAuthClick = () => {
        if (isLoggedIn) {
            // 如果已登录，点击跳转到用户中心（此处暂仅打印）
            console.log("跳转至用户中心");
        } else {
            // 如果未登录，执行登录逻辑
            setIsLoggedIn(true); // 暂时模拟点击即登录
            console.log("跳转至登录页");
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50">
            {/* 视觉容器：
         1. h-12: 高度固定，类似 Apple 导航栏的高度
         2. bg-white/70: 白色背景，70% 不透明度
         3. backdrop-blur-md: 关键的磨砂玻璃效果
         4. border-b: 底部一条细微的分界线
      */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-12 items-center justify-between border-b border-gray-200/50 bg-white/70 backdrop-blur-md shadow-sm rounded-b-lg">

                    {/* 左侧：登录/用户中心区域 */}
                    <div className="flex items-center">
                        <button
                            onClick={handleAuthClick}
                            className="text-xs font-medium text-gray-600 hover:text-black transition-colors duration-300 px-3 py-1 rounded-md hover:bg-gray-100/50"
                        >
                            {/* 根据状态动态显示文字 */}
                            {isLoggedIn ? '用户中心' : '登录'}
                        </button>
                    </div>

                    {/* 中间/右侧：装饰性菜单 (模拟 Apple 那个长长的菜单项，为了视觉平衡) */}
                    <div className="hidden md:flex space-x-8 text-[11px] font-normal text-gray-500">
                        {/* 这些是不可点击的装饰，模仿原图的布局感 */}
                        <span className="cursor-default hover:text-gray-900 transition-colors">Store</span>
                        <span className="cursor-default hover:text-gray-900 transition-colors">Mac</span>
                        <span className="cursor-default hover:text-gray-900 transition-colors">iPad</span>
                        <span className="cursor-default hover:text-gray-900 transition-colors">iPhone</span>
                        <span className="cursor-default hover:text-gray-900 transition-colors">Support</span>
                    </div>

                    {/* 右侧占位，保持 Flex 平衡，或者放搜索图标 */}
                    <div className="w-8"></div>
                </div>
            </div>
        </nav>
    );
}