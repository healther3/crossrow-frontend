import React, { useEffect, useState } from 'react';

export default function Background() {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // 鼠标移动事件监听
        const handleMouseMove = (event) => {
            setMousePos({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
            {/* 1. 基础底色：稍微加深一点点的蓝白底 */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-100/40 to-slate-100" />

            {/* 2. 色块层：颜色加深，对比度提高 */}
            {/* 注意：这里的 animate-pulse 或 opacity 可以根据喜好微调
         颜色改为了 blue-400/50, indigo-500/40 等更深的颜色
      */}

            {/* 左上深蓝 */}
            <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/30 blur-[100px] mix-blend-multiply animate-pulse"
                 style={{ animationDuration: '8s' }} />

            {/* 右侧青蓝 */}
            <div className="absolute top-[20%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/30 blur-[120px] mix-blend-multiply" />

            {/* 底部紫蓝 */}
            <div className="absolute -bottom-[10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-indigo-500/30 blur-[100px] mix-blend-multiply" />

            {/* 3. 交互层：鼠标驱散光晕 (The Dispersal Effect) */}
            <div
                className="pointer-events-none absolute -inset-20 z-10 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(144px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.9), rgba(255,255,255,0.4) 40%, transparent 80%)`
                }}
            >
                {/* 原理解析：
           这一层位于色块之上。
           radial-gradient 创建了一个以鼠标为中心的白色光圈。
           中心是 90% 透明度的白色（几乎不透明），边缘透明。
           当白色光圈盖住下面的蓝色色块时，视觉上就感觉色块被“照亮”或“驱散”了。
        */}
            </div>

            {/* 4. 噪点纹理：增加高级感 */}
            <div className="absolute inset-0 opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}