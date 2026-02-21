import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSettings } from '../context/SettingsContext';
import { useTransition } from '../context/TransitionContext';
import { useAuth } from '../context/AuthContext'; // 引入 auth 以获取 token

// 复用的选项按钮组件
const OptionButton = ({ label, isSelected, onClick, size = "text-1xl" }) => {
    return (
        <button
            onClick={onClick}
            className="group relative px-8 py-2 overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer"
        >
            <span
                className={`relative z-10 font-serif ${size} transition-colors duration-300 
                ${isSelected ? 'text-blue-600 font-bold' : 'text-slate-400 group-hover:text-blue-500'}`}
            >
                {label}
            </span>
            <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full transition-all duration-300 text-blue-400 font-serif text-xl
                ${isSelected ? 'translate-x-2 opacity-100' : 'opacity-0 group-hover:translate-x-2 group-hover:opacity-100'}`}
            >
                ▶
            </span>
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
    const { token } = useAuth(); // 获取 JWT Token 用来上传图片

    const [tempMode, setTempMode] = useState(bgConfig.mode);
    const [locationStatus, setLocationStatus] = useState('');

    // 自定义上传的状态
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');

    // --- GPS 获取逻辑 ---
    const handleLocationRequest = () => {
        if (!navigator.geolocation) {
            setLocationStatus("System Error: Geolocation unavailable.");
            return;
        }
        setLocationStatus("Acquiring signal...");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                updateCoords(coords);
                setTempMode('USER');
                setLocationStatus("Coordinates confirmed.");
                setUploadMsg('');
            },
            (error) => {
                console.error(error);
                setLocationStatus("Signal lost. Defaulting to Random.");
                setTempMode('RANDOM');
            }
        );
    };

    // --- 图片上传逻辑 ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // --- 新增：前端文件大小校验 (这里限制为 5MB) ---
        const MAX_SIZE_MB = 5;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setUploadMsg(`Error: Image is too large. Please select a file under ${MAX_SIZE_MB}MB.`);
            e.target.value = null; // 清空选择
            return;
        }

        setIsUploading(true);
        setUploadMsg("Uploading to cloud storage...");

        const formData = new FormData();
        formData.append("file", file); // 对应后端 @RequestParam("file")

        try {
            const response = await fetch("http://localhost:8123/api/user/background", {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                    // 注意：这里绝对不能手动设置 Content-Type: multipart/form-data
                },
                body: formData
            });

            if (response.ok) {
                const url = await response.text();
                setUploadMsg("Transmission complete. Custom background applied.");
                setTempMode('CUSTOM'); // 上传成功后自动切换到 CUSTOM 模式
            } else {
                const errorText = await response.text();
                setUploadMsg(`Error: ${errorText}`);
            }
        } catch (error) {
            setUploadMsg(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    const handleSave = () => {
        updateMode(tempMode);
        if (navigateWithTransition) {
            navigateWithTransition('/');
        } else {
            navigate('/');
        }
    };

    const selectTheme = (mode) => {
        setTempMode(mode);
        setLocationStatus('');
        setUploadMsg('');
    };

    return (
        <div className="relative min-h-screen font-serif overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-0" />

            <Navbar />

            <div className="relative z-10 w-full max-w-5xl px-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 md:p-16 text-center transform transition-all duration-500">

                    <h2 className="text-4xl md:text-5xl font-bold text-slate-700 mb-12 tracking-wider vn-title-container">
                        Configuration
                    </h2>

                    <div className="mb-8">
                        <p className="text-slate-400 text-lg mb-6 uppercase tracking-[0.2em]">
                            - Background Source -
                        </p>

                        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                            <OptionButton label="Random" isSelected={tempMode === 'RANDOM'} onClick={() => selectTheme('RANDOM')} />
                            <OptionButton label="Nature" isSelected={tempMode === 'NATURE'} onClick={() => selectTheme('NATURE')} />
                            <OptionButton label="Urban" isSelected={tempMode === 'URBAN'} onClick={() => selectTheme('URBAN')} />
                            <OptionButton label="Landmark" isSelected={tempMode === 'LANDMARK'} onClick={() => selectTheme('LANDMARK')} />

                            <div className="hidden md:block w-px h-8 bg-slate-300/50" />

                            <OptionButton label="Local (GPS)" isSelected={tempMode === 'USER'} onClick={handleLocationRequest} />

                            <div className="hidden md:block w-px h-8 bg-slate-300/50" />

                            {/* 新增的 Custom 按钮 */}
                            <OptionButton label="Custom" isSelected={tempMode === 'CUSTOM'} onClick={() => selectTheme('CUSTOM')} />
                        </div>

                        {/* 状态提示文字 (GPS) */}
                        <div className="h-6 mt-4 flex items-center justify-center">
                            <span className={`text-sm font-sans tracking-wide transition-opacity duration-300 ${locationStatus ? 'opacity-100 text-blue-500' : 'opacity-0'}`}>
                                {locationStatus}
                            </span>
                        </div>
                    </div>

                    {/* --- 新增：Custom 模式下的上传区域 --- */}
                    <div className={`transition-all duration-500 overflow-hidden ${tempMode === 'CUSTOM' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col items-center p-6 bg-slate-50/50 rounded-xl border border-slate-200/50 mx-auto max-w-md">
                            <input
                                type="file"
                                accept="image/*"
                                id="custom-bg-upload"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                            {/* 复古风伪装按钮 */}
                            <label
                                htmlFor="custom-bg-upload"
                                className={`group relative px-6 py-2 border border-slate-300 rounded hover:border-blue-400 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <span className="font-sans text-sm tracking-widest text-slate-500 group-hover:text-blue-500 transition-colors">
                                    {isUploading ? '[ UPLOADING... ]' : '[ SELECT IMAGE ]'}
                                </span>
                            </label>

                            {/* 提示信息 */}
                            <span className="mt-4 text-xs font-sans tracking-wide text-blue-400">
                                {uploadMsg || (
                                    <span className="text-slate-400">
                                        Data is empty. Upload an image to initialize your world.
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className="flex justify-center gap-12 mt-10 pt-8 border-t border-slate-100">
                        <OptionButton label="Confirm" isSelected={false} size="text-xl" onClick={handleSave} />
                        <OptionButton label="Cancel" isSelected={false} size="text-xl" onClick={() => navigate('/')} />
                    </div>

                </div>
            </div>
        </div>
    );
}