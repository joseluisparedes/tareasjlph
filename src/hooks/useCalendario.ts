import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/cliente';
import { ActividadCalendario } from '../types';

export function useCalendario() {
    const [actividades, setActividades] = useState<ActividadCalendario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarActividades = async () => {
        try {
            setCargando(true);
            const { data, error } = await supabase
                .from('actividades_calendario')
                .select(`*`)
                .order('fecha_inicio', { ascending: true });

            if (error) throw error;

            // Obtener usuarios por separado para evitar problemas de Foreign Key en PostgREST
            const { data: usersData } = await supabase.from('usuarios').select('id, nombre_completo');
            const usersMap = new Map((usersData || []).map(u => [u.id, u.nombre_completo]));

            const mapeadas: ActividadCalendario[] = (data || []).map((dbItem: any) => ({
                id: dbItem.id,
                descripcion: dbItem.descripcion,
                tipo_actividad: dbItem.tipo_actividad,
                fecha_inicio: dbItem.fecha_inicio,
                fecha_fin: dbItem.fecha_fin,
                hora_inicio: dbItem.hora_inicio,
                hora_fin: dbItem.hora_fin,
                creado_por: dbItem.creado_por,
                creado_por_nombre: usersMap.get(dbItem.creado_por) || 'Desconocido',
                fecha_creacion: dbItem.fecha_creacion,
            }));

            setActividades(mapeadas);
        } catch (e: any) {
            console.error('Error cargando actividades:', e.message);
            setError(e.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarActividades();
    }, []);

    const crearActividad = async (actividad: Omit<ActividadCalendario, 'id' | 'creado_por_nombre' | 'fecha_creacion'>) => {
        const { data, error } = await supabase
            .from('actividades_calendario')
            .insert([{
                descripcion: actividad.descripcion,
                tipo_actividad: actividad.tipo_actividad,
                fecha_inicio: actividad.fecha_inicio,
                fecha_fin: actividad.fecha_fin,
                hora_inicio: actividad.hora_inicio || null,
                hora_fin: actividad.hora_fin || null,
                creado_por: actividad.creado_por
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creando actividad:', error);
            throw error;
        }

        await cargarActividades();
        return data;
    };

    const actualizarActividad = async (id: string, actividad: Partial<Omit<ActividadCalendario, 'id' | 'creado_por' | 'creado_por_nombre' | 'fecha_creacion'>>) => {
        const actualizacion: any = {};
        if (actividad.descripcion !== undefined) actualizacion.descripcion = actividad.descripcion;
        if (actividad.tipo_actividad !== undefined) actualizacion.tipo_actividad = actividad.tipo_actividad;
        if (actividad.fecha_inicio !== undefined) actualizacion.fecha_inicio = actividad.fecha_inicio;
        if (actividad.fecha_fin !== undefined) actualizacion.fecha_fin = actividad.fecha_fin;
        if (actividad.hora_inicio !== undefined) actualizacion.hora_inicio = actividad.hora_inicio || null;
        if (actividad.hora_fin !== undefined) actualizacion.hora_fin = actividad.hora_fin || null;

        const { error } = await supabase
            .from('actividades_calendario')
            .update(actualizacion)
            .eq('id', id);

        if (error) {
            console.error('Error actualizando actividad:', error);
            throw error;
        }

        await cargarActividades();
    };

    const eliminarActividad = async (id: string) => {
        const { error } = await supabase
            .from('actividades_calendario')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error eliminando actividad:', error);
            throw error;
        }

        await cargarActividades();
    };

    return {
        actividades,
        cargando,
        error,
        crearActividad,
        actualizarActividad,
        eliminarActividad,
        recargar: cargarActividades
    };
}
