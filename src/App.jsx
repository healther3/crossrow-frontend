// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Background from './components/Background';
import InteractiveCanvas from './components/InteractiveCanvas';
import ChatPage from './pages/ChatPage'; // 引入新页面

// 提取原来的主页内容为一个组件，保持代码整洁
function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen z-10 relative pointer-events-none">
            <InteractiveCanvas />
            <Navbar/>

            {/* 1. 标题区域
         mb-12: 给下方按钮留出空间
         -mt-20: 稍微向上偏移一点，视觉上更平衡
      */}
            <div className="vn-title-container text-6xl md:text-8xl mb-16 tracking-wide -mt-20 transition-all duration-700 ease-in-out">
                <span className="vn-title-stroke" aria-hidden="true">Choose Life?</span>
                <span className="vn-title-fill">Choose Life?</span>
            </div>

            <p className="mt-2 text-xl font-medium text-slate-500 tracking-wide drop-shadow-sm mb-16">
                - Choose Life??? -
            </p>

            {/* 2. 菜单区域 (Start 按钮)
         pointer-events-auto: 必须加！否则会被父级的 none 拦截导致无法点击
      */}
            <div className="pointer-events-auto flex flex-col items-center gap-6">
                <Link
                    to="/chat"
                    className="group relative px-8 py-3 overflow-hidden rounded-full transition-all duration-300 hover:scale-105"
                >
                    {/* 按钮文字：经典的衬线体 */}
                    <span className="relative z-10 font-serif text-3xl md:text-4xl text-slate-600 group-hover:text-blue-600 transition-colors duration-300">
            Start
          </span>

                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-blue-400 font-serif text-2xl">
            ▶
          </span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-blue-400 font-serif text-2xl">
            ◀
          </span>
                </Link>

                {/* 预留 Exit 按钮位置，以后可以加 */}
                {/* <button onClick={...} className="...">Exit</button> */}
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="relative min-h-screen text-gray-800 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-hidden">
                {/* 全局背景组件：即使切换页面，如果想保留背景，放在 Routes 外面 */}
                <Background />
                {/* 路由配置 */}
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/chat" element={<ChatPage />} />
                </Routes>

            </div>
        </BrowserRouter>
    );
}

export default App;