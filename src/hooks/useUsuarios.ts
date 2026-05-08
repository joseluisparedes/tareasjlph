import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/cliente';
import { useAuth } from './useAuth';
import { useWorkspaces } from './useWorkspaces';

export interface UsuarioDB {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    rol: string;
}

export function useUsuarios(options: { global?: boolean } = {}) {
    const { user, perfil } = useAuth();
    const { currentWorkspace } = useWorkspaces();
    const [usuarios, setUsuarios] = useState<UsuarioDB[]>([]);
    const [cargando, setCargando] = useState(true);

    const userId = user?.id;
    const workspaceId = currentWorkspace?.id;
    const isGlobal = options.global === true;

    useEffect(() => {
        cargarUsuarios();
    }, [userId, workspaceId, isGlobal]);

    const cargarUsuarios = async () => {
        if (!userId) {
            setUsuarios([]);
            setCargando(false);
            return;
        }
        setCargando(true);

        // Si se pide lista global Y es administrador, traemos todos
        if (isGlobal && perfil?.rol === 'Administrador') {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('nombre_completo');
            
            if (!error && data) setUsuarios(data);
        } else if (workspaceId) {
            // Por defecto, o si no es admin, solo miembros del espacio actual
            const { data, error } = await supabase
                .from('espacio_miembros')
                .select(`
                    usuarios:usuario_id (
                        id,
                        nombre_completo,
                        correo_electronico,
                        rol
                    )
                `)
                .eq('espacio_id', workspaceId);

            if (!error && data) {
                // Extraer el objeto usuario de la respuesta del join
                const listaFiltrada = data
                    .map((m: any) => m.usuarios as UsuarioDB)
                    .filter(u => u !== null)
                    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
                
                setUsuarios(listaFiltrada);
            }
        } else if (perfil?.rol === 'Administrador') {
            // Fallback para admin si no hay workspace seleccionado pero se pide lista (podría pasar en carga inicial)
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('nombre_completo');
            
            if (!error && data) setUsuarios(data);
        } else {
            setUsuarios([]);
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
