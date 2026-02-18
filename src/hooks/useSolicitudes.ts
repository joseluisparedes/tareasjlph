import { useState, useEffect, useCallback } from 'react';
import { solicitudesApi } from '../lib/api/solicitudes';
import type { Solicitud } from '../lib/supabase/tipos-bd';

export function useSolicitudes() {
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            const datos = await solicitudesApi.obtenerTodas();
            setSolicitudes(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const crearSolicitud = async (solicitud: Omit<Solicitud, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>) => {
        const nueva = await solicitudesApi.crear(solicitud);
        setSolicitudes(prev => [nueva, ...prev]);
        return nueva;
    };

    const actualizarSolicitud = async (id: string, cambios: Partial<Solicitud>) => {
        const actualizada = await solicitudesApi.actualizar(id, cambios);
        setSolicitudes(prev => prev.map(s => s.id === id ? actualizada : s));
        return actualizada;
    };

    const cambiarEstado = async (id: string, estado: Solicitud['estado']) => {
        const actualizada = await solicitudesApi.cambiarEstado(id, estado);
        setSolicitudes(prev => prev.map(s => s.id === id ? actualizada : s));
        return actualizada;
    };

    const eliminarSolicitud = async (id: string) => {
        await solicitudesApi.eliminar(id);
        setSolicitudes(prev => prev.filter(s => s.id !== id));
    };

    return {
        solicitudes,
        cargando,
        error,
        recargar: cargar,
        crearSolicitud,
        actualizarSolicitud,
        cambiarEstado,
        eliminarSolicitud,
    };
}
