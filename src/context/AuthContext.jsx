import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);
    const [userId, setUserId] = useState(localStorage.getItem('user_id') || null);

    // 当 token 变化时，同步到 localStorage
    useEffect(() => {
        if (token) {
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('user_id', userId);
        } else {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_id');
        }
    }, [token, userId]);

    // 登录方法
    const login = async (username, password) => {
        // 请根据你的后端实际前缀调整，这里假设带有 /api 前缀
        const response = await fetch('http://localhost:8123/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Login failed');
        }

        const data = await response.json();
        // 假设你的 AuthResponse 包含 token 和 userId/username
        setToken(data.token);
        // 如果后端返回了 id 就用 id，否则暂时用 username 作为标识
        setUserId(data.userId || username);
        return data;
    };

    // 注册方法
    const register = async (username, password) => {
        const response = await fetch('http://localhost:8123/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Registration failed');
        }
        return await response.text();
    };

    // 登出方法
    const logout = () => {
        setToken(null);
        setUserId(null);
    };

    return (
        <AuthContext.Provider value={{ token, userId, login, register, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}