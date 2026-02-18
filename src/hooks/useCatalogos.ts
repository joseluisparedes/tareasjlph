import { useState, useEffect, useCallback } from 'react';
import { catalogosApi } from '../lib/api/catalogos';
import type { CatalogoItem, CatalogType } from '../types';

export function useCatalogos() {
    const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            const datos = await catalogosApi.obtenerTodos();
            setCatalogos(datos);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar catálogos');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const porTipo = (tipo: CatalogType) =>
        catalogos.filter(c => c.tipo === tipo && c.esta_activo);

    const crearItem = async (tipo: CatalogType, valor: string) => {
        const maxOrden = Math.max(0, ...catalogos.filter(c => c.tipo === tipo).map(c => c.orden));
        const nuevo = await catalogosApi.crear(tipo, valor, maxOrden + 1);
        setCatalogos(prev => [...prev, nuevo]);
        return nuevo;
    };

    const actualizarItem = async (id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'color' | 'abreviatura'>>) => {
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
