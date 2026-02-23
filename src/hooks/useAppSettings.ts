import { useState, useEffect, useCallback } from 'react';
import { appSettingsApi } from '../lib/api/appSettings';

export function useAppSettings() {
    const [permitirRegistro, setPermitirRegistro] = useState<boolean | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            const permiso = await appSettingsApi.obtenerPermisoRegistro();
            setPermitirRegistro(permiso);
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

    return {
        permitirRegistro,
        cargando,
        error,
        recargar: cargar,
        actualizarPermisoRegistro,
    };
}
