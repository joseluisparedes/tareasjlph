import { useState, useEffect, useCallback } from 'react';
import { dominiosApi } from '../lib/api/dominios';
import type { Dominio } from '../lib/supabase/tipos-bd';
import { useAuth } from './useAuth';

export function useDominios() {
    const { user } = useAuth();
    const [dominios, setDominios] = useState<Dominio[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        if (!user) {
            setDominios([]);
            setCargando(false);
            return;
        }
        try {
            setCargando(true);
            setError(null);
            const datos = await dominiosApi.obtenerTodos();
            setDominios(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar dominios');
        } finally {
            setCargando(false);
        }
    }, [user]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const crearDominio = async (nombre: string) => {
        const nuevo = await dominiosApi.crear(nombre);
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
