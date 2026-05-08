import { useState, useEffect, useCallback, useRef } from 'react';
import { catalogosApi } from '../lib/api/catalogos';
import type { CatalogoItem, CatalogType } from '../types';
import { useAuth } from './useAuth';
import { useWorkspaces } from './useWorkspaces';

export function useCatalogos() {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspaces();
    const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userId = user?.id;
    const workspaceId = currentWorkspace?.id;

    const cargar = useCallback(async (silencioso = false) => {
        if (!userId || !workspaceId) {
            setCatalogos([]);
            setCargando(false);
            return;
        }
        try {
            if (!silencioso) setCargando(true);
            setError(null);
            // Modificar API para recibir workspaceId si es necesario, 
            // o filtrar aquí si la API aún no lo soporta.
            // Por ahora asumo que actualizaremos la API para aceptar workspaceId.
            const datos = await catalogosApi.obtenerTodos(workspaceId);
            setCatalogos(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar catálogos');
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
            setCatalogos([]);
            setCargando(false);
        }
    }, [cargar, workspaceId]);

    const porTipo = (tipo: CatalogType) =>
        catalogos.filter(c => c.tipo === tipo && c.esta_activo);

    const crearItem = async (tipo: CatalogType, valor: string) => {
        if (!workspaceId) throw new Error("No hay espacio de trabajo seleccionado");
        const maxOrden = Math.max(0, ...catalogos.filter(c => c.tipo === tipo).map(c => c.orden));
        const nuevo = await catalogosApi.crear(tipo, valor, maxOrden + 1, workspaceId);
        setCatalogos(prev => [...prev, nuevo]);
        return nuevo;
    };

    const actualizarItem = async (id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'color' | 'abreviatura' | 'orden'>>) => {
        const actualizado = await catalogosApi.actualizar(id, cambios);
        setCatalogos(prev => prev.map(c => c.id === id ? actualizado : c));
        return actualizado;
    };

    const eliminarItem = async (id: string) => {
        await catalogosApi.eliminar(id);
        setCatalogos(prev => prev.filter(c => c.id !== id));
    };

    return { catalogos, cargando, error, recargar: cargar, porTipo, crearItem, actualizarItem, eliminarItem };
}
