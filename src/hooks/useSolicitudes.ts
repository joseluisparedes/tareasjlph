import { useState, useEffect, useCallback, useRef } from 'react';
import { solicitudesApi } from '../lib/api/solicitudes';
import type { Solicitud } from '../lib/supabase/tipos-bd';
import { useAuth } from './useAuth';
import { useWorkspaces } from './useWorkspaces';
import { supabase } from '../lib/supabase/cliente';

export function useSolicitudes() {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspaces();
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = user?.id;
    const workspaceId = currentWorkspace?.id;

    const cargar = useCallback(async (silencioso = false) => {
        if (!userId || !workspaceId) {
            setSolicitudes([]);
            setCargando(false);
            return;
        }
        try {
            if (!silencioso) setCargando(true);
            setError(null);
            const datos = await solicitudesApi.obtenerTodas(workspaceId);
            setSolicitudes(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
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
            setSolicitudes([]);
            setCargando(false);
        }
        
        const handleSync = () => {
             cargar(true);
        };
        
        window.addEventListener('solicitudes-sync', handleSync);
        return () => window.removeEventListener('solicitudes-sync', handleSync);
    }, [cargar, workspaceId]);

    const notifySync = () => window.dispatchEvent(new CustomEvent('solicitudes-sync'));

    const crearSolicitud = async (solicitud: Omit<Solicitud, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>) => {
        const nueva = await solicitudesApi.crear({ ...solicitud, espacio_id: workspaceId });
        setSolicitudes(prev => [nueva, ...prev]);
        notifySync();
        return nueva;
    };

    const actualizarSolicitud = async (id: string, cambios: Partial<Solicitud>) => {
        const actualizada = await solicitudesApi.actualizar(id, cambios);
        setSolicitudes(prev => prev.map(s => s.id === id ? actualizada : s));
        notifySync();
        return actualizada;
    };

    const cambiarEstado = async (id: string, estado: Solicitud['estado']) => {
        const actualizada = await solicitudesApi.cambiarEstado(id, estado);
        setSolicitudes(prev => prev.map(s => s.id === id ? actualizada : s));
        notifySync();
        return actualizada;
    };

    const eliminarSolicitud = async (id: string) => {
        // Desvincular cualquier tarea que estuviera relacionada con esta iniciativa
        const { error: errorTareas } = await supabase
            .from('tareas')
            .update({ iniciativa_id: null })
            .eq('iniciativa_id', id);

        if (errorTareas) {
            console.error('Error al desvincular tareas de la iniciativa eliminada:', errorTareas);
        }

        await solicitudesApi.eliminar(id);
        setSolicitudes(prev => prev.filter(s => s.id !== id));
        notifySync();
    };

    const reordenarSolicitudes = async (updates: { id: string, orden: number }[]) => {
        await solicitudesApi.reordenarSolicitudes(updates);
        // Optimistic update already handled in KanbanBoard, but we can refresh
        notifySync();
    };

    return {
        solicitudes,
        cargando,
        error,
        recargar: cargar,
        crearSolicitud,
        actualizarSolicitud,
        cambiarEstado,
        reordenarSolicitudes,
        eliminarSolicitud,
    };
}
