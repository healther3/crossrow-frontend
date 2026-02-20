import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSettings } from '../context/SettingsContext';
import { useTransition } from '../context/TransitionContext';

// 一个复用的“Start风格”选项按钮组件 (完全保留你的样式设定)
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

export default function OptionPage() {
    const navigate = useNavigate();
    const { navigateWithTransition } = useTransition();
    const { bgConfig, updateMode, updateCoords } = useSettings();

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
        // 使用你的原生跳转逻辑，也可以换成 navigateWithTransition('/')
        if (navigateWithTransition) {
            navigateWithTransition('/');
        } else {
            navigate('/');
        }
    };

    // 新增：快速选择主题，清空 GPS 提示
    const selectTheme = (mode) => {
        setTempMode(mode);
        setLocationStatus('');
    };

    return (
        <div className="relative min-h-screen font-serif overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-0" />

            <Navbar />

            <div className="relative z-10 w-full max-w-4xl px-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 md:p-16 text-center transform transition-all duration-500">

                    <h2 className="text-4xl md:text-5xl font-bold text-slate-700 mb-12 tracking-wider vn-title-container">
                        Configuration
                    </h2>

                    <div className="mb-12">
                        <p className="text-slate-400 text-lg mb-6 uppercase tracking-[0.2em]">
                            - Background Source -
                        </p>

                        {/* 这里的布局只加上了 flex-wrap 和微调的 gap，其余都是你的原始设计 */}
                        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                            <OptionButton label="Random" isSelected={tempMode === 'RANDOM'} onClick={() => selectTheme('RANDOM')} />
                            <OptionButton label="Nature" isSelected={tempMode === 'NATURE'} onClick={() => selectTheme('NATURE')} />
                            <OptionButton label="Urban" isSelected={tempMode === 'URBAN'} onClick={() => selectTheme('URBAN')} />
                            <OptionButton label="Landmark" isSelected={tempMode === 'LANDMARK'} onClick={() => selectTheme('LANDMARK')} />

                            <div className="hidden md:block w-px h-8 bg-slate-300/50" />

                            <OptionButton
                                label="Local (GPS)"
                                isSelected={tempMode === 'USER'}
                                onClick={handleLocationRequest}
                            />
                        </div>

                        {/* 状态提示文字 */}
                        <div className="h-8 mt-4 flex items-center justify-center">
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