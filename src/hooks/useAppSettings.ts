import { useState, useEffect, useCallback } from 'react';
import { appSettingsApi } from '../lib/api/appSettings';

export function useAppSettings() {
    const [permitirRegistro, setPermitirRegistro] = useState<boolean | null>(null);
    const [umbrales, setUmbrales] = useState<{ yellow: number, red: number }>({ yellow: 7, red: 14 });
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            const [permiso, thresholds] = await Promise.all([
                appSettingsApi.obtenerPermisoRegistro(),
                appSettingsApi.obtenerUmbralesEstatus()
            ]);
            setPermitirRegistro(permiso);
            setUmbrales(thresholds);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar configuración de la app');
            // Por defecto, asume verdadero si hay error
            setPermitirRegistro(true);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const actualizarPermisoRegistro = async (permitir: boolean) => {
        await appSettingsApi.actualizarPermisoRegistro(permitir);
        setPermitirRegistro(permitir);
    };

    const actualizarUmbrales = async (yellow: number, red: number) => {
        await appSettingsApi.actualizarUmbralesEstatus(yellow, red);
        setUmbrales({ yellow, red });
    };

    return {
        permitirRegistro,
        umbrales,
        cargando,
        error,
        recargar: cargar,
        actualizarPermisoRegistro,
        actualizarUmbrales,
    };
}
