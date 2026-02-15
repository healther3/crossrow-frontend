import React from 'react';
import Navbar from './components/Navbar';
import Background from './components/Background';
function App() {
    return (
        <div className="relative min-h-screen">
            {/* 1. 背景 */}
            <Background />
            {/* 2. 顶部导航栏 */}
            <Navbar />

            {/* 3. 主内容区域占位符 */}
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-4xl font-serif text-blue-900/80">
                    Waiting for Content...
                </h1>
            </div>
        </div>
    );
}

export default App;