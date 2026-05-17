import { useState, useEffect, useCallback } from 'react';
import { appSettingsApi } from '../lib/api/appSettings';

export function useAppSettings(espacioId?: string | null) {
    const [permitirRegistro, setPermitirRegistro] = useState<boolean | null>(null);
    const [umbrales, setUmbrales] = useState<{ yellow: number, red: number }>({ yellow: 7, red: 14 });
    const [importFields, setImportFields] = useState<string[]>([]);
    const [exportFields, setExportFields] = useState<string[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            
            // Si hay espacioId, obtenemos sus umbrales. Si no, usamos los por defecto o globales.
            const fetchPromises: [
                Promise<boolean>, 
                Promise<{yellow: number, red: number}>,
                Promise<string[]>,
                Promise<string[]>
            ] = [
                appSettingsApi.obtenerPermisoRegistro(),
                espacioId 
                    ? appSettingsApi.obtenerUmbralesEstatus(espacioId) 
                    : Promise.resolve({ yellow: 7, red: 14 }),
                espacioId
                    ? appSettingsApi.obtenerConfigCampos(espacioId, 'import')
                    : Promise.resolve([]),
                espacioId
                    ? appSettingsApi.obtenerConfigCampos(espacioId, 'export')
                    : Promise.resolve([])
            ];

            const [permiso, thresholds, impF, expF] = await Promise.all(fetchPromises);
            setPermitirRegistro(permiso);
            setUmbrales(thresholds);
            setImportFields(impF);
            setExportFields(expF);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar configuración de la app');
            setPermitirRegistro(true);
        } finally {
            setCargando(false);
        }
    }, [espacioId]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const actualizarPermisoRegistro = async (permitir: boolean) => {
        await appSettingsApi.actualizarPermisoRegistro(permitir);
        setPermitirRegistro(permitir);
    };

    const actualizarUmbrales = async (yellow: number, red: number) => {
        if (!espacioId) return;
        await appSettingsApi.actualizarUmbralesEstatus(espacioId, yellow, red);
        setUmbrales({ yellow, red });
    };

    const actualizarConfigCampos = async (tipo: 'import' | 'export', campos: string[]) => {
        if (!espacioId) return;
        await appSettingsApi.actualizarConfigCampos(espacioId, tipo, campos);
        if (tipo === 'import') setImportFields(campos);
        else setExportFields(campos);
    };

    return {
        permitirRegistro,
        umbrales,
        importFields,
        exportFields,
        cargando,
        error,
        recargar: cargar,
        actualizarPermisoRegistro,
        actualizarUmbrales,
        actualizarConfigCampos,
    };
}
