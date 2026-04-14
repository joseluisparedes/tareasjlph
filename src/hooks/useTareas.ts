import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/cliente';
import type { Tarea, TareaColumna } from '../lib/supabase/tipos-bd';
import { useAuth } from './useAuth';

const sortTareas = (tareas: Tarea[]) => {
    const pesos = { 'Rojo': 1, 'Amarillo': 2, 'Verde': 3 } as Record<string, number>;
    return [...tareas].sort((a, b) => {
        const wA = pesos[a.urgencia] || 4;
        const wB = pesos[b.urgencia] || 4;
        if (wA !== wB) return wA - wB;
        return a.orden - b.orden;
    });
};

export function useTareas() {
    const { user } = useAuth();
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [columnas, setColumnas] = useState<TareaColumna[]>([]);
    const [cargando, setCargando] = useState(true);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            let tareasQuery = supabase.from('tareas').select('*').order('orden', { ascending: true });
            let colsQuery = supabase.from('tareas_columnas').select('*').order('orden', { ascending: true });

            if (user) {
                tareasQuery = tareasQuery.eq('creado_por', user.id);
                colsQuery = colsQuery.eq('creado_por', user.id);
            }

            const [colsResponse, tareasResponse] = await Promise.all([
                colsQuery,
                tareasQuery
            ]);

            if (colsResponse.error) throw colsResponse.error;
            if (tareasResponse.error) throw tareasResponse.error;

            setColumnas(colsResponse.data || []);
            setTareas(sortTareas(tareasResponse.data || []));
        } catch (error) {
            console.error('Error al cargar tareas:', error);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        cargarDatos();
        
        const subscriptionTareas = supabase
            .channel('tareas_cambios')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => {
                cargarDatos();
            })
            .subscribe();

        const subscriptionColumnas = supabase
            .channel('columnas_cambios')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_columnas' }, () => {
                cargarDatos();
            })
            .subscribe();

        return () => {
            subscriptionTareas.unsubscribe();
            subscriptionColumnas.unsubscribe();
        };
    }, [user]);

    const crearColumna = async (nombre: string) => {
        const orden = columnas.length;
        
        // Optimistic UI
        const tempId = `temp-${Date.now()}`;
        const nuevaColumna = { id: tempId, nombre, orden, creado_por: user?.id || null, fecha_creacion: new Date().toISOString() };
        setColumnas(prev => [...prev, nuevaColumna]);

        const { data, error } = await supabase
            .from('tareas_columnas')
            .insert([{ nombre, orden, creado_por: user?.id || null }])
            .select()
            .single();

        if (error) {
            setColumnas(prev => prev.filter(c => c.id !== tempId));
            throw error;
        }
        
        setColumnas(prev => prev.map(c => c.id === tempId ? data : c));
        return data;
    };

    const actualizarColumna = async (id: string, nombre: string) => {
        setColumnas(prev => prev.map(c => c.id === id ? { ...c, nombre } : c));
        const { error } = await supabase
            .from('tareas_columnas')
            .update({ nombre })
            .eq('id', id);

        if (error) {
            cargarDatos(); // revert on error
            throw error;
        }
    };

    const eliminarColumna = async (id: string) => {
        const { error } = await supabase
            .from('tareas_columnas')
            .delete()
            .eq('id', id);

        if (error) throw error;
    };

    const reordenarColumnas = async (ordenes: { id: string; orden: number }[]) => {
        // Ejecución en paralelo de los updates
        const promesas = ordenes.map(col =>
            supabase
                .from('tareas_columnas')
                .update({ orden: col.orden })
                .eq('id', col.id)
        );
        const resultados = await Promise.all(promesas);
        const errores = resultados.filter(r => r.error);
        if (errores.length > 0) {
            console.error('Error reordenando verticales', errores);
            cargarDatos();
        }
    };

    const crearTarea = async (titulo: string, descripcion: string | null, columna_id: string, urgencia: 'Verde'|'Amarillo'|'Rojo' = 'Verde') => {
        const tareasColumna = tareas.filter(t => t.columna_id === columna_id && t.estado === 'Activa');
        const orden = tareasColumna.length;

        const tempId = `temp-t-${Date.now()}`;
        const nuevaTarea: Tarea = {
            id: tempId,
            titulo,
            descripcion,
            columna_id,
            estado: 'Activa',
            urgencia,
            origen: 'manual',
            orden,
            creado_por: user?.id || null,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
        };
        
        setTareas(prev => sortTareas([...prev, nuevaTarea]));

        const { data, error } = await supabase
            .from('tareas')
            .insert([{
                titulo,
                descripcion,
                columna_id,
                estado: 'Activa',
                urgencia,
                origen: 'manual',
                orden,
                creado_por: user?.id
            }])
            .select()
            .single();

        if (error) {
            setTareas(prev => prev.filter(t => t.id !== tempId));
            throw error;
        }
        
        setTareas(prev => sortTareas(prev.map(t => t.id === tempId ? data : t)));
        return data;
    };

    const duplicarTarea = async (tareaOriginal: Tarea) => {
        const tituloCopia = `${tareaOriginal.titulo} (Copia)`;
        await crearTarea(tituloCopia, tareaOriginal.descripcion, tareaOriginal.columna_id, tareaOriginal.urgencia);
    };

    const actualizarTarea = async (id: string, datos: Partial<Tarea>) => {
        setTareas(prev => sortTareas(prev.map(t => t.id === id ? { ...t, ...datos } : t)));
        const { error } = await supabase
            .from('tareas')
            .update(datos)
            .eq('id', id);

        if (error) {
            cargarDatos();
            throw error;
        }
    };

    const eliminarTarea = async (id: string) => {
        // Actualización optimista: removemos de la UI inmediatamente
        setTareas(prev => sortTareas(prev.filter(t => t.id !== id)));
        
        const { error } = await supabase
            .from('tareas')
            .delete()
            .eq('id', id);

        if (error) {
            cargarDatos(); // Revertir si hay error
            throw error;
        }
    };

    const moverTarea = async (
        tareaId: string,
        nuevaColumnaId: string | null,
        nuevoOrden: number,
        tareasActualizadasOpt: Tarea[]
    ) => {
        // Actualizamos UI optimistamente (aplicando ordenrición estricta)
        setTareas(sortTareas(tareasActualizadasOpt));

        try {
            // Actualizar la tarea arrastrada
             await supabase
                .from('tareas')
                .update({ columna_id: nuevaColumnaId, orden: nuevoOrden })
                .eq('id', tareaId);
                
            // Como las otras tareas cambiaron su orden (se desplazaron) 
            // supabase no soporta updateBatch nativo facilmente, pero dado que usamos
            // subscripciones Realtime, los cambios se reflejarán si los hacemos.
            // Una optimización simple: actualizar todas las interesadas de la nueva y vieja columna.
            
            const afectadas = tareasActualizadasOpt.filter(t => 
                (t.columna_id === nuevaColumnaId) || 
                (nuevaColumnaId !== null && t.columna_id === nuevaColumnaId)
            );

            // Actualizamos en paralelo las ordenadas (solo aquellas que hayan cambiado orden no está cacheado, asique subimos todas las de esta clumna)
            const promesas = afectadas.map(t => 
                supabase.from('tareas').update({ orden: t.orden }).eq('id', t.id)
            );
            
            await Promise.all(promesas);
        } catch (error) {
            console.error('Error al mover tarea:', error);
            cargarDatos(); // Revert
            throw error;
        }
    };

    return {
        tareas,
        columnas,
        cargando,
        crearColumna,
        actualizarColumna,
        eliminarColumna,
        reordenarColumnas,
        crearTarea,
        actualizarTarea,
        eliminarTarea,
        moverTarea,
        duplicarTarea,
        recargar: cargarDatos,
    };
}
