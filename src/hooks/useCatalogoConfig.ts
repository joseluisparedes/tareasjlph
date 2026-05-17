import { useState, useEffect, useCallback } from 'react';
import { catalogoConfigApi } from '../lib/api/catalogoConfig';
import type { CatalogoConfig, CatalogType } from '../types';
import { useAuth } from './useAuth';
import { useWorkspaces } from './useWorkspaces';

export function useCatalogoConfig() {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspaces();
    const [configs, setConfigs] = useState<CatalogoConfig[]>([]);

    const workspaceId = currentWorkspace?.id;

    const cargar = useCallback(async () => {
        if (!user || !workspaceId) {
            setConfigs([]);
            return;
        }
        try {
            const datos = await catalogoConfigApi.obtenerTodos(workspaceId);
            setConfigs(datos);
        } catch {
            setConfigs([]);
        }
    }, [user, workspaceId]);

    useEffect(() => { cargar(); }, [cargar, workspaceId]);

    const getModo = (tipo: CatalogType): 'desplegable' | 'cuadros' =>
        configs.find(c => c.tipo === tipo)?.modo_visualizacion ?? 'desplegable';

    const setModo = async (tipo: CatalogType, modo: 'desplegable' | 'cuadros') => {
        if (!workspaceId) return;
        const currentVisible = getVisible(tipo);
        await catalogoConfigApi.upsert(tipo, modo, workspaceId, currentVisible);
        setConfigs(prev => {
            const existe = prev.find(c => c.tipo === tipo);
            if (existe) return prev.map(c => c.tipo === tipo ? { ...c, modo_visualizacion: modo } : c);
            return [...prev, { tipo, modo_visualizacion: modo, es_visible: currentVisible, espacio_id: workspaceId }];
        });
    };

    const getVisible = (tipo: CatalogType): boolean =>
        configs.find(c => c.tipo === tipo)?.es_visible ?? true;

    const setVisible = async (tipo: CatalogType, visible: boolean) => {
        if (!workspaceId) return;
        const currentModo = getModo(tipo);
        await catalogoConfigApi.upsert(tipo, currentModo, workspaceId, visible);
        setConfigs(prev => {
            const existe = prev.find(c => c.tipo === tipo);
            if (existe) return prev.map(c => c.tipo === tipo ? { ...c, es_visible: visible } : c);
            return [...prev, { tipo, modo_visualizacion: currentModo, es_visible: visible, espacio_id: workspaceId }];
        });
    };

    return { configs, getModo, setModo, getVisible, setVisible };
}
