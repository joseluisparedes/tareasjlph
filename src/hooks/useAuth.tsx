import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase/cliente';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '../types';

interface PerfilUsuario {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    rol: UserRole;
}

interface AuthContextType {
    user: User | null;
    perfil: PerfilUsuario | null;
    session: Session | null;
    cargando: boolean;
    esAdministrador: boolean;
    iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
    registrarse: (correo: string, contrasena: string, nombreCompleto: string) => Promise<void>;
    cerrarSesion: () => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MASTER_ADMIN_EMAIL = 'jose241100@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarPerfil = async (userId: string) => {
        const { data } = await supabase
            .from('usuarios')
            .select('id, nombre_completo, correo_electronico, rol')
            .eq('id', userId)
            .maybeSingle();
        if (data) setPerfil(data as PerfilUsuario);
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) cargarPerfil(session.user.id);
            setCargando(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                cargarPerfil(session.user.id);
            } else {
                setPerfil(null);
            }
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

        // Crear perfil — el trigger de BD asignará el rol correcto automáticamente
        if (data.user) {
            await supabase.from('usuarios').insert({
                id: data.user.id,
                nombre_completo: nombreCompleto,
                correo_electronico: correo,
                // El trigger asigna 'Administrador' si es el master, 'Colaborador' para todos los demás
                rol: correo === MASTER_ADMIN_EMAIL ? 'Administrador' : 'Colaborador',
            });
        }
    };

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
    };

    const esAdministrador = perfil?.rol === 'Administrador';

    return (
        <AuthContext.Provider value={{ user, perfil, session, cargando, esAdministrador, iniciarSesion, registrarse, cerrarSesion, error }}>
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
    if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    return msg;
}
