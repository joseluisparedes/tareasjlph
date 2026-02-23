import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/cliente';

export interface UsuarioDB {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    rol: string;
}

export function useUsuarios() {
    const [usuarios, setUsuarios] = useState<UsuarioDB[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        setCargando(true);
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .order('nombre_completo');

        if (!error && data) {
            setUsuarios(data);
        }
        setCargando(false);
    };

    const actualizarUsuario = async (id: string, datos: Partial<Omit<UsuarioDB, 'id' | 'correo_electronico'>>) => {
        const { error } = await supabase
            .from('usuarios')
            .update(datos)
            .eq('id', id);

        if (!error) {
            setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...datos } : u));
        }
        return { error };
    };

    const eliminarUsuario = async (id: string) => {
        const { error } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', id);

        if (!error) {
            setUsuarios(prev => prev.filter(u => u.id !== id));
        }
        return { error };
    };

    return { usuarios, cargando, recargar: cargarUsuarios, actualizarUsuario, eliminarUsuario };
}
