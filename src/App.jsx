import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Background from './components/Background';
import InteractiveCanvas from './components/InteractiveCanvas';
import ChatPage from './pages/ChatPage';
import OptionsPage from './pages/OptionPage'; // 引入新页面
import { SettingsProvider } from './context/SettingsContext'; // 引入 Context

function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen z-10 relative pointer-events-none">
            <InteractiveCanvas />
            <Navbar />

            {/* Title */}
            <div className="vn-title-container text-6xl md:text-8xl mb-16 tracking-wide -mt-20 transition-all duration-700 ease-in-out">
                <span className="vn-title-stroke" aria-hidden="true">Choose Life?</span>
                <span className="vn-title-fill">Choose Life?</span>
            </div>

            <p className="mt-2 text-xl font-medium text-slate-500 tracking-wide drop-shadow-sm mb-16">
                - Choose Life?? -
            </p>

            {/* Menu Buttons */}
            <div className="pointer-events-auto flex flex-col items-center gap-6">
                {/* Start Button */}
                <Link
                    to="/chat"
                    className="group relative px-8 py-3 overflow-hidden rounded-full transition-all duration-300 hover:scale-105"
                >
                    <span className="relative z-10 font-serif text-3xl md:text-4xl text-slate-600 group-hover:text-blue-600 transition-colors duration-300">
                        Start
                    </span>
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-blue-400 font-serif text-2xl">▶</span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 text-blue-400 font-serif text-2xl">◀</span>
                </Link>

                {/* --- 新增：Config 按钮 --- */}
                <Link
                    to="/options"
                    className="group relative px-8 py-2 overflow-hidden rounded-full transition-all duration-300 hover:scale-105"
                >
                    <span className="relative z-10 font-serif text-2xl md:text-3xl text-slate-500 group-hover:text-blue-500 transition-colors duration-300">
                        Config
                    </span>
                    {/* 复古风格的下划线动画 */}
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-blue-400 transition-all duration-300 group-hover:w-2/3"></span>
                </Link>

                {/* Exit Button (Placeholder) */}
                <button className="font-serif text-xl text-slate-400 hover:text-slate-600 transition-colors cursor-default">
                    Exit
                </button>
            </div>
        </div>
    );
}

function App() {
    return (
        <SettingsProvider> {/* 1. 包裹 Context */}
            <BrowserRouter>
                <div className="relative min-h-screen text-gray-800 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-hidden">
                    <Background />

                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/options" element={<OptionsPage />} /> {/* 2. 新增路由 */}
                    </Routes>

                </div>
            </BrowserRouter>
        </SettingsProvider>
    );
}

export default App;