-- Migration 20240524000000_create_tareas.sql
CREATE TABLE public.tareas_columnas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tareas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    columna_id UUID REFERENCES public.tareas_columnas(id) ON DELETE CASCADE,
    estado TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Terminada')),
    urgencia TEXT NOT NULL DEFAULT 'Verde' CHECK (urgencia IN ('Verde', 'Amarillo', 'Rojo')),
    orden INTEGER NOT NULL,
    creado_por UUID REFERENCES auth.users(id),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para fecha_actualizacion en tareas
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_tareas
BEFORE UPDATE ON public.tareas
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Habilitar RLS
ALTER TABLE public.tareas_columnas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

-- Politicas para tareas_columnas
CREATE POLICY "Usuarios autenticados pueden ver columnas" ON public.tareas_columnas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear columnas" ON public.tareas_columnas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar columnas" ON public.tareas_columnas
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar columnas" ON public.tareas_columnas
    FOR DELETE USING (auth.role() = 'authenticated');

-- Politicas para tareas
CREATE POLICY "Usuarios autenticados pueden ver tareas" ON public.tareas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden crear tareas" ON public.tareas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar tareas" ON public.tareas
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden eliminar tareas" ON public.tareas
    FOR DELETE USING (auth.role() = 'authenticated');
