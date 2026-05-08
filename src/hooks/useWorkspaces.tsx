import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase/cliente';
import { useAuth } from './useAuth';
import { Workspace, WorkspaceMember } from '../types';

interface WorkspaceContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    membership: WorkspaceMember | null;
    setCurrentWorkspace: (workspace: Workspace) => void;
    cargando: boolean;
    canEditIniciativas: () => boolean;
    canEditTareas: () => boolean;
    isMaster: () => boolean;
    refrescarMembresia: () => Promise<void>;
    crearWorkspace: (nombre: string) => Promise<Workspace>;
    agregarMiembro: (espacioId: string, usuarioId: string, rolIniciativas: 'lectura' | 'edicion', rolTareas: 'lectura' | 'edicion') => Promise<void>;
    actualizarMiembro: (id: string, cambios: Partial<WorkspaceMember>) => Promise<void>;
    removerMiembro: (id: string) => Promise<void>;
    obtenerMiembros: (espacioId: string) => Promise<WorkspaceMember[]>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user, perfil } = useAuth();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setWorkspaceState] = useState<Workspace | null>(null);
    const [membership, setMembership] = useState<WorkspaceMember | null>(null);
    const [cargando, setCargando] = useState(true);

    const cargarWorkspaces = async () => {
        if (!user) return;
        setCargando(true);

        const { data, error } = await supabase
            .from('espacio_miembros')
            .select('*, espacios_trabajo(*)')
            .eq('usuario_id', user.id);

        if (data && data.length > 0) {
            // Filtrar solo los que traen el objeto del espacio cargado (evitar nulos por RLS)
            const list = data
                .map((m: any) => m.espacios_trabajo as Workspace)
                .filter(w => w !== null);

            if (list.length > 0) {
                setWorkspaces(list);
                
                const lastId = localStorage.getItem('last_workspace_id');
                const initial = list.find(w => w?.id === lastId) || list[0];
                
                setWorkspaceState(initial);
                setMembership(data.find((m: any) => m.espacio_id === initial.id));
            } else {
                setWorkspaces([]);
                setWorkspaceState(null);
                setMembership(null);
            }
        } else {
            setWorkspaces([]);
            setWorkspaceState(null);
            setMembership(null);
        }
        setCargando(false);
    };

    const lastUserId = React.useRef<string | null>(null);

    useEffect(() => {
        if (user) {
            if (lastUserId.current !== user.id) {
                lastUserId.current = user.id;
                cargarWorkspaces();
            }
        } else {
            lastUserId.current = null;
            setWorkspaces([]);
            setWorkspaceState(null);
            setMembership(null);
            setCargando(false);
        }
    }, [user]);

    const setCurrentWorkspace = (workspace: Workspace) => {
        setWorkspaceState(workspace);
        localStorage.setItem('last_workspace_id', workspace.id);
        // Actualizar membresía para los permisos
        const m = workspaces.find(w => w.id === workspace.id);
        // Necesitamos recargar la membresía específica para obtener los roles
        if (user) {
            supabase
                .from('espacio_miembros')
                .select('*')
                .eq('usuario_id', user.id)
                .eq('espacio_id', workspace.id)
                .maybeSingle()
                .then(({ data }) => setMembership(data));
        }
    };

    const canEditIniciativas = () => {
        if (perfil?.rol === 'Administrador' || user?.email === 'jose241100@gmail.com') return true;
        return membership?.rol_iniciativas === 'edicion';
    };

    const canEditTareas = () => {
        if (perfil?.rol === 'Administrador' || user?.email === 'jose241100@gmail.com') return true;
        return membership?.rol_tareas === 'edicion';
    };

    const crearWorkspace = async (nombre: string) => {
        const { data, error } = await supabase
            .from('espacios_trabajo')
            .insert([{ nombre }])
            .select()
            .single();

        if (error) throw error;

        // Auto-asignarse como admin del nuevo grupo
        if (user) {
            await agregarMiembro(data.id, user.id, 'edicion', 'edicion');
        }

        await cargarWorkspaces();
        return data as Workspace;
    };

    const agregarMiembro = async (espacioId: string, usuarioId: string, rolIniciativas: 'lectura' | 'edicion', rolTareas: 'lectura' | 'edicion') => {
        const { error } = await supabase
            .from('espacio_miembros')
            .insert([{
                espacio_id: espacioId,
                usuario_id: usuarioId,
                rol_iniciativas: rolIniciativas,
                rol_tareas: rolTareas
            }]);

        if (error) throw error;
    };

    const actualizarMiembro = async (id: string, cambios: Partial<WorkspaceMember>) => {
        const { error } = await supabase
            .from('espacio_miembros')
            .update(cambios)
            .eq('id', id);

        if (error) throw error;

        // Si el miembro actualizado es el usuario actual, refrescar su membresía global
        if (membership && membership.id === id) {
            setMembership({ ...membership, ...cambios });
        }
    };

    const removerMiembro = async (id: string) => {
        const { error } = await supabase
            .from('espacio_miembros')
            .delete()
            .eq('id', id);

        if (error) throw error;
    };

    const obtenerMiembros = async (espacioId: string) => {
        const { data, error } = await supabase
            .from('espacio_miembros')
            .select(`
                *,
                usuarios:usuario_id (
                    id,
                    nombre_completo,
                    correo_electronico
                )
            `)
            .eq('espacio_id', espacioId);

        if (error) throw error;
        return data as any[];
    };

    return (
        <WorkspaceContext.Provider value={{ 
            workspaces, 
            currentWorkspace, 
            membership, 
            setCurrentWorkspace, 
            cargando,
            canEditIniciativas,
            canEditTareas,
            crearWorkspace,
            agregarMiembro,
            actualizarMiembro,
            removerMiembro,
            obtenerMiembros,
            refrescarMembresia: cargarWorkspaces
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspaces() {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) throw new Error('useWorkspaces debe usarse dentro de WorkspaceProvider');
    return ctx;
}
