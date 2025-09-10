"use client"
import { clearSession } from '@/app/actions/session';
import { useEffect } from 'react';

export default function LogoutPage() {
    useEffect(() => {
        const logout = async () => {
            await clearSession();
            window.location.href = '/auth/login';
        };
        logout();
    }, []);

    return null;
}