import { useState, useEffect, useCallback, useRef } from 'react';
import { dominiosApi } from '../lib/api/dominios';
import type { Dominio } from '../lib/supabase/tipos-bd';
import { useAuth } from './useAuth';
import { useWorkspaces } from './useWorkspaces';

export function useDominios() {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspaces();
    const [dominios, setDominios] = useState<Dominio[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = user?.id;
    const workspaceId = currentWorkspace?.id;

    const cargar = useCallback(async (silencioso = false) => {
        if (!userId || !workspaceId) {
            setDominios([]);
            setCargando(false);
            return;
        }
        try {
            if (!silencioso) setCargando(true);
            setError(null);
            const datos = await dominiosApi.obtenerTodos(workspaceId);
            setDominios(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar dominios');
        } finally {
            if (!silencioso) setCargando(false);
        }
    }, [userId, workspaceId]);

    const lastWorkspaceId = useRef<string | null>(null);

    useEffect(() => {
        if (workspaceId) {
            if (lastWorkspaceId.current !== workspaceId) {
                lastWorkspaceId.current = workspaceId;
                cargar();
            }
        } else {
            lastWorkspaceId.current = null;
            setDominios([]);
            setCargando(false);
        }
    }, [cargar, workspaceId]);

    const crearDominio = async (nombre: string) => {
        if (!workspaceId) throw new Error("No hay espacio de trabajo seleccionado");
        const nuevo = await dominiosApi.crear(nombre, workspaceId);
        setDominios(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        return nuevo;
    };

    const actualizarDominio = async (id: string, cambios: Partial<Pick<Dominio, 'nombre' | 'esta_activo'>>) => {
        const actualizado = await dominiosApi.actualizar(id, cambios);
        setDominios(prev => prev.map(d => d.id === id ? actualizado : d));
        return actualizado;
    };

    const eliminarDominio = async (id: string) => {
        await dominiosApi.eliminar(id);
        setDominios(prev => prev.filter(d => d.id !== id));
    };

    return {
        dominios,
        cargando,
        error,
        recargar: cargar,
        crearDominio,
        actualizarDominio,
        eliminarDominio,
    };
}
