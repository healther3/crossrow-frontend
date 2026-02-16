import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Background from './components/Background';
import InteractiveCanvas from './components/InteractiveCanvas';
import ChatPage from './pages/ChatPage';
import OptionsPage from './pages/OptionPage';
import { SettingsProvider } from './context/SettingsContext';

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
                - choose life? -
            </p>

            {/* Menu Buttons Area */}
            <div className="pointer-events-auto flex flex-col items-center gap-8">

                {/* 1. Start Button */}
                <Link
                    to="/chat"
                    className="group relative px-12 py-3 overflow-hidden rounded-full transition-all duration-300 hover:scale-110"
                >
                    <span className="relative z-10 font-serif text-1xl md:text-2xl text-slate-600 group-hover:text-blue-600 transition-colors duration-300">
                        Start
                    </span>
                    {/* 左箭头 */}
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-4 group-hover:opacity-100 text-blue-400 font-serif text-2xl md:text-3xl">▶</span>
                    {/* 右箭头 */}
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full opacity-0 transition-all duration-300 group-hover:-translate-x-4 group-hover:opacity-100 text-blue-400 font-serif text-2xl md:text-3xl">◀</span>
                </Link>

                {/* 2. Config Button (现在和 Start 风格完全一致) */}
                <Link
                    to="/options"
                    className="group relative px-12 py-3 overflow-hidden rounded-full transition-all duration-300 hover:scale-110"
                >
                    <span className="relative z-10 font-serif text-2xl md:text-2xl text-slate-500 group-hover:text-blue-500 transition-colors duration-300">
                        Config
                    </span>
                    {/* 复用箭头动画 */}
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 transition-all duration-300 group-hover:translate-x-4 group-hover:opacity-100 text-blue-400 font-serif text-xl md:text-2xl">▶</span>
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full opacity-0 transition-all duration-300 group-hover:-translate-x-4 group-hover:opacity-100 text-blue-400 font-serif text-xl md:text-2xl">◀</span>
                </Link>

                {/* 3. Exit Button */}
                <button className="group relative px-10 py-2 overflow-hidden rounded-full transition-all duration-300 hover:scale-105 cursor-default">
                     <span className="font-serif text-xl md:text-2xl text-slate-400 group-hover:text-slate-600 transition-colors">
                        Exit
                    </span>
                </button>
            </div>
        </div>
    );
}

function App() {
    return (
        <SettingsProvider>
            <BrowserRouter>
                <div className="relative min-h-screen text-gray-800 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-hidden">
                    <Background />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/options" element={<OptionsPage />} />
                    </Routes>
                </div>
            </BrowserRouter>
        </SettingsProvider>
    );
}

export default App;