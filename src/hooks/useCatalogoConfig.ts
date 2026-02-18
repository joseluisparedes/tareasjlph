import { useState, useEffect, useCallback } from 'react';
import { catalogoConfigApi } from '../lib/api/catalogoConfig';
import type { CatalogoConfig, CatalogType } from '../types';

export function useCatalogoConfig() {
    const [configs, setConfigs] = useState<CatalogoConfig[]>([]);

    const cargar = useCallback(async () => {
        try {
            const datos = await catalogoConfigApi.obtenerTodos();
            setConfigs(datos);
        } catch {
            setConfigs([]);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const getModo = (tipo: CatalogType): 'desplegable' | 'cuadros' =>
        configs.find(c => c.tipo === tipo)?.modo_visualizacion ?? 'desplegable';

    const setModo = async (tipo: CatalogType, modo: 'desplegable' | 'cuadros') => {
        await catalogoConfigApi.upsert(tipo, modo);
        setConfigs(prev => {
            const existe = prev.find(c => c.tipo === tipo);
            if (existe) return prev.map(c => c.tipo === tipo ? { ...c, modo_visualizacion: modo } : c);
            return [...prev, { tipo, modo_visualizacion: modo }];
        });
    };

    return { configs, getModo, setModo };
}
