import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase/cliente';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    cargando: boolean;
    iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
    registrarse: (correo: string, contrasena: string, nombreCompleto: string) => Promise<void>;
    cerrarSesion: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Obtener sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setCargando(false);
        });

        // Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setCargando(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const iniciarSesion = async (correo: string, contrasena: string) => {
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
        if (error) throw new Error(traducirError(error.message));
    };

    const registrarse = async (correo: string, contrasena: string, nombreCompleto: string) => {
        setError(null);
        const { data, error } = await supabase.auth.signUp({
            email: correo,
            password: contrasena,
            options: { data: { nombre_completo: nombreCompleto } }
        });
        if (error) throw new Error(traducirError(error.message));

        // Crear perfil en tabla usuarios
        if (data.user) {
            await supabase.from('usuarios').insert({
                id: data.user.id,
                nombre_completo: nombreCompleto,
                correo_electronico: correo,
                rol: 'Editor',
            });
        }
    };

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, cargando, iniciarSesion, registrarse, cerrarSesion, error }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
}

function traducirError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
    if (msg.includes('User already registered')) return 'Este correo ya está registrado.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('Unable to validate email')) return 'Correo electrónico inválido.';
    return msg;
}
