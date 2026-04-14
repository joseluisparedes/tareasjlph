-- Agrega columna 'origen' a la tabla tareas para diferenciar
-- tareas creadas manualmente vs. por integración (API/webhook)
ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'manual';

-- Constraint para validar solo valores permitidos
ALTER TABLE public.tareas
  ADD CONSTRAINT tareas_origen_check CHECK (origen IN ('manual', 'integracion'));

-- Las tareas existentes quedan como 'manual' por defecto
