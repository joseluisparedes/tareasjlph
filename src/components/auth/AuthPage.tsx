import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogIn, UserPlus, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

type AuthMode = 'login' | 'register';

export function AuthPage() {
    const { iniciarSesion, registrarse } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [nombreCompleto, setNombreCompleto] = useState('');
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mensaje, setMensaje] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMensaje(null);
        setCargando(true);

        try {
            if (mode === 'login') {
                await iniciarSesion(correo, contrasena);
            } else {
                if (!nombreCompleto.trim()) {
                    setError('El nombre completo es requerido.');
                    return;
                }
                await registrarse(correo, contrasena, nombreCompleto);
                setMensaje('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.');
                setMode('login');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo / Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">BRM Task Manager</h1>
                    <p className="text-slate-400 mt-1 text-sm">Gestión de Portafolio TI</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Tab switcher */}
                    <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                        <button
                            onClick={() => { setMode('login'); setError(null); setMensaje(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${mode === 'login'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <LogIn size={16} />
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => { setMode('register'); setError(null); setMensaje(null); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${mode === 'register'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <UserPlus size={16} />
                            Crear Cuenta
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nombre (solo registro) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    value={nombreCompleto}
                                    onChange={e => setNombreCompleto(e.target.value)}
                                    placeholder="Juan Pérez"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        {/* Correo */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                value={correo}
                                onChange={e => setCorreo(e.target.value)}
                                placeholder="usuario@empresa.com"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={mostrarContrasena ? 'text' : 'password'}
                                    value={contrasena}
                                    onChange={e => setContrasena(e.target.value)}
                                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                                    required
                                    minLength={6}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                >
                                    {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Mensaje de éxito */}
                        {mensaje && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
                                {mensaje}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={cargando}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 mt-2"
                        >
                            {cargando ? (
                                <><Loader2 size={18} className="animate-spin" /> Procesando...</>
                            ) : mode === 'login' ? (
                                <><LogIn size={18} /> Iniciar Sesión</>
                            ) : (
                                <><UserPlus size={18} /> Crear Cuenta</>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-500 text-xs mt-6">
                    © 2026 BRM IT Task Manager · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}
