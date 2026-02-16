import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import { useSettings } from '../context/SettingsContext';

export default function OptionsPage() {
    const navigate = useNavigate();
    const { bgConfig, updateMode, updateCoords } = useSettings();
    const [tempMode, setTempMode] = useState(bgConfig.mode); // 临时状态，点OK才保存
    const [locationStatus, setLocationStatus] = useState(''); // 提示信息

    // 处理地理位置获取
    const handleLocationRequest = () => {
        if (!navigator.geolocation) {
            setLocationStatus("Error: Geolocation not supported");
            return;
        }

        setLocationStatus("Locating...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateCoords(coords); // 获取成功直接存入 context (因为坐标是客观事实)
                setTempMode('USER');  // 选中 USER 模式
                setLocationStatus("Coordinates acquired.");
            },
            (error) => {
                console.error(error);
                setLocationStatus("Location denied. Defaulting to RANDOM.");
                setTempMode('RANDOM'); // 失败则回退到随机
            }
        );
    };

    const handleSave = () => {
        updateMode(tempMode);
        navigate('/'); // 返回主页
    };

    return (
        <div className="relative min-h-screen font-serif overflow-hidden flex items-center justify-center">
            <Background />
            <Navbar />

            {/* 复古设置面板容器 */}
            <div className="relative z-10 w-full max-w-4xl p-1">
                {/* 顶部标题栏装饰 */}
                <div className="mb-4 ml-4">
                    <div className="inline-block bg-gradient-to-r from-slate-200 to-transparent px-8 py-1 rounded-l-full border-l-4 border-blue-800">
                        <span className="text-3xl font-bold text-slate-800 tracking-widest uppercase" style={{ textShadow: '1px 1px 0 #fff' }}>
                            Options
                        </span>
                    </div>
                </div>

                {/* 蓝色半透明主面板 */}
                <div className="bg-gradient-to-b from-[#4a7a9e]/90 to-[#2c4e6e]/90 backdrop-blur-md rounded-2xl border-2 border-white/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] p-8 md:p-12 text-white">

                    <div className="space-y-8">
                        {/* 选项行：Background Settings */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6">
                            <div className="text-2xl font-bold drop-shadow-md mb-4 md:mb-0">
                                • Background Source
                            </div>

                            <div className="flex gap-8 text-xl">
                                {/* Random 选项 */}
                                <button
                                    onClick={() => setTempMode('RANDOM')}
                                    className="group flex items-center gap-3 hover:text-cyan-200 transition-colors cursor-pointer"
                                >
                                    {/* 模拟复选框 */}
                                    <div className={`w-5 h-5 border-2 border-white flex items-center justify-center ${tempMode === 'RANDOM' ? 'bg-white' : ''}`}>
                                        {tempMode === 'RANDOM' && <div className="w-3 h-3 bg-blue-900" />}
                                    </div>
                                    <span className={tempMode === 'RANDOM' ? "font-bold text-white" : "text-white/70"}>
                                        Random
                                    </span>
                                </button>

                                {/* User Local 选项 */}
                                <button
                                    onClick={handleLocationRequest}
                                    className="group flex items-center gap-3 hover:text-cyan-200 transition-colors cursor-pointer"
                                >
                                    <div className={`w-5 h-5 border-2 border-white flex items-center justify-center ${tempMode === 'USER' ? 'bg-white' : ''}`}>
                                        {tempMode === 'USER' && <div className="w-3 h-3 bg-blue-900" />}
                                    </div>
                                    <span className={tempMode === 'USER' ? "font-bold text-white" : "text-white/70"}>
                                        Local (GPS)
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* 状态显示区域 (类似游戏底部的提示栏) */}
                        <div className="h-8 text-center text-cyan-200 font-sans text-sm tracking-wide">
                            {locationStatus && `[System]: ${locationStatus}`}
                        </div>
                    </div>

                    {/* 底部按钮栏 */}
                    <div className="mt-12 flex justify-end gap-6 border-t border-white/20 pt-6">
                        <button
                            onClick={handleSave}
                            className="px-8 py-2 bg-slate-800/50 hover:bg-slate-700/80 border border-white/20 rounded shadow-lg transition-all text-xl font-bold tracking-widest hover:scale-105 active:scale-95"
                        >
                            OK
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="px-8 py-2 hover:bg-white/10 border border-transparent hover:border-white/20 rounded transition-all text-xl tracking-widest text-white/70 hover:text-white"
                        >
                            CANCEL
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}