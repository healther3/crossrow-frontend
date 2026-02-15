// src/App.jsx
import React from 'react';
import Navbar from './components/Navbar';
import Background from './components/Background';
import InteractiveCanvas from './components/InteractiveCanvas';

function App() {
    return (
        <div className="relative min-h-screen text-gray-800 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-hidden">

            <Background />
            <InteractiveCanvas />
            <Navbar />

            <div className="flex flex-col items-center justify-center min-h-screen z-10 relative pointer-events-none">

                {/* --- 修改开始：Logo 区域 --- */}
                <div className="vn-title-container text-7xl md:text-9xl font-bold tracking-tight">
                    {/* 底层：白色描边 */}
                    <span className="vn-title-stroke" aria-hidden="true">
            Crossrow
          </span>
                    {/* 顶层：渐变填充 */}
                    <span className="vn-title-fill">
            Crossrow
          </span>
                </div>
                {/* --- 修改结束 --- */}

                <p className="mt-6 text-xl font-medium text-slate-500 tracking-[0.5em] uppercase drop-shadow-sm">
                    -     开始对话吧   -
                </p>

                {/* 第三阶段我们会在这里加按钮，现在先留空 */}
            </div>
        </div>
    );
}

export default App;