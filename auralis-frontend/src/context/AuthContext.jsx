import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();
const API_URL = '/api';

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('auralis_user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (err) {
            console.error("Auth initialization error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const userData = await response.json();
            const userWithAvatar = {
                ...userData,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0D8ABC&color=fff`
            };

            setUser(userWithAvatar);
            localStorage.setItem('auralis_user', JSON.stringify(userWithAvatar));

            // Role-based redirection with history replacement
            if (userWithAvatar.role === 'Admin') {
                navigate('/admin', { replace: true });
            } else if (userWithAvatar.role === 'Doctor') {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/portal', { replace: true }); // Patient Portal
            }

            return { success: true };
        } catch (err) {
            console.error("Auth Exception:", err);
            alert(err.message);
            throw err;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auralis_user');
        navigate('/login', { replace: true });
    };

    const register = async (name, email, password, gender, role = 'Patient') => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, gender, role })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            const userData = await response.json();
            const userWithAvatar = {
                ...userData,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=0D8ABC&color=fff`
            };

            setUser(userWithAvatar);
            localStorage.setItem('auralis_user', JSON.stringify(userWithAvatar));

            // Redirect based on role with history replacement
            if (role === 'Doctor') {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/portal', { replace: true });
            }

            return { success: true };
        } catch (err) {
            console.error("Auth Exception:", err);
            alert(err.message);
            throw err;
        }
    };

    const refreshUser = (updatedData) => {
        const userWithAvatar = {
            ...updatedData,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedData.name)}&background=0D8ABC&color=fff`
        };
        setUser(userWithAvatar);
        localStorage.setItem('auralis_user', JSON.stringify(userWithAvatar));
    };

    const value = {
        user,
        login,
        logout,
        register,
        refreshUser,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
