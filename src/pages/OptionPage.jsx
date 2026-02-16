import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSettings } from '../context/SettingsContext';

// 一个复用的“Start风格”选项按钮组件
const OptionButton = ({ label, isSelected, onClick, size = "text-1xl" }) => {
    return (
        <button
            onClick={onClick}
            className="group relative px-8 py-2 overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer"
        >
            {/* 文字：选中时常亮蓝色，未选中时灰色但悬停变蓝 */}
            <span
                className={`relative z-10 font-serif ${size} transition-colors duration-300 
                ${isSelected ? 'text-blue-600 font-bold' : 'text-slate-400 group-hover:text-blue-500'}`}
            >
                {label}
            </span>

            {/* 左箭头：选中时常驻，未选中时悬停出现 */}
            <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full transition-all duration-300 text-blue-400 font-serif text-xl
                ${isSelected ? 'translate-x-2 opacity-100' : 'opacity-0 group-hover:translate-x-2 group-hover:opacity-100'}`}
            >
                ▶
            </span>

            {/* 右箭头 */}
            <span
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-full transition-all duration-300 text-blue-400 font-serif text-xl
                ${isSelected ? '-translate-x-2 opacity-100' : 'opacity-0 group-hover:-translate-x-2 group-hover:opacity-100'}`}
            >
                ◀
            </span>
        </button>
    );
};

export default function OptionsPage() {
    const navigate = useNavigate();
    const { bgConfig, updateMode, updateCoords } = useSettings();

    // 临时状态
    const [tempMode, setTempMode] = useState(bgConfig.mode);
    const [locationStatus, setLocationStatus] = useState('');

    const handleLocationRequest = () => {
        if (!navigator.geolocation) {
            setLocationStatus("System Error: Geolocation unavailable.");
            return;
        }

        setLocationStatus("Acquiring signal...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateCoords(coords);
                setTempMode('USER');
                setLocationStatus("Coordinates confirmed.");
            },
            (error) => {
                console.error(error);
                setLocationStatus("Signal lost. Defaulting to Random.");
                setTempMode('RANDOM');
            }
        );
    };

    const handleSave = () => {
        updateMode(tempMode);
        navigate('/');
    };

    return (
        <div className="relative min-h-screen font-serif overflow-hidden flex items-center justify-center">
            {/* 背景组件不需要在这里重复引入，App.jsx 已经是全局背景了，这里只需要画 UI */}
            {/* 如果想让 Option 页背景稍微暗一点以突出白色卡片，可以加个遮罩 */}
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-0" />

            <Navbar />

            {/* 白色打底的主容器 */}
            <div className="relative z-10 w-full max-w-3xl px-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 md:p-16 transform transition-all duration-500">

                    {/* 标题 */}
                    <h2 className="text-2xl md:text-2xl font-bold mb-5 tracking-wider vn-title-container">
                        Config
                    </h2>
                    {/* 选项组：背景源 */}
                    <div className="mb-1">
                        <p className="text-slate-500 uppercase tracking-[0.2em]">
                            - Background Source -
                        </p>

                        <div className="flex md:flex-row">
                            {/* 选项 1: Random */}
                            <OptionButton
                                label="Random"
                                isSelected={tempMode === 'RANDOM'}
                                onClick={() => {
                                    setTempMode('RANDOM');
                                    setLocationStatus('');
                                }}
                            />

                            {/* 选项 2: Local */}
                            <OptionButton
                                label="Local (GPS)"
                                isSelected={tempMode === 'USER'}
                                onClick={handleLocationRequest}
                            />
                        </div>

                        {/* 状态提示文字 */}
                        <div className="h-8 mt-4 flex">
                            <span className={`text-sm font-sans tracking-wide transition-opacity duration-300 ${locationStatus ? 'opacity-100 text-blue-500' : 'opacity-0'}`}>
                                {locationStatus || "Ready"}
                            </span>
                        </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className="flex justify-center gap-12 mt-12 pt-8 border-t border-slate-100">
                        {/* 确认按钮 */}
                        <OptionButton
                            label="Confirm"
                            isSelected={false} // 操作按钮不需要常亮选中态
                            size="text-xl"
                            onClick={handleSave}
                        />

                        {/* 取消按钮 */}
                        <OptionButton
                            label="Cancel"
                            isSelected={false}
                            size="text-xl"
                            onClick={() => navigate('/')}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}