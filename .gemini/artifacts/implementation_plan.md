# Mejora de la Experiencia Móvil (Responsive Design)

El objetivo es transformar la aplicación para que sea 100% usable en dispositivos móviles sin afectar la experiencia actual de escritorio. Para lograr esto, aplicaremos clases utilitarias de TailwindCSS (`md:`, `lg:`, `sm:`) y rediseñaremos la navegación y el layout para pantallas pequeñas.

## User Review Required

> [!IMPORTANT]  
> **Comportamiento del Kanban en móviles:** Para el tablero Kanban, la mejor práctica en móviles es mantener las columnas lado a lado pero permitiendo **hacer scroll horizontal** (deslizar el dedo de izquierda a derecha para ver las demás columnas), en lugar de apilar todas las columnas verticalmente (lo que haría imposible ver el estado global). ¿Estás de acuerdo con este enfoque?

> [!IMPORTANT]  
> **Comportamiento del Menú Lateral (Sidebar):** En dispositivos móviles, el menú lateral estará oculto por defecto y se abrirá mediante un botón de menú (hamburguesa) en la parte superior. Al abrirse, cubrirá parcialmente la pantalla con un fondo oscuro translúcido. ¿Te parece correcta esta navegación?

## Open Questions

> [!WARNING]  
> 1. Para la **Vista de Tabla**, en móviles las tablas son difíciles de leer. La solución estándar es permitir el scroll horizontal solo en la tabla. ¿Es aceptable?
> 2. Hay muchos filtros en el Dashboard. En móviles, planeo que estos filtros se desplieguen en una sola fila con scroll horizontal para no ocupar la mitad de la pantalla antes de llegar a los datos. ¿Te parece bien?

## Proposed Changes

### 1. App.tsx y Layout Principal
- **[MODIFY]** `src/App.tsx`: 
  - Ajustar el margen del contenedor principal para que en móviles sea `ml-0` y en escritorio mantenga `md:ml-64` o `md:ml-20`.
  - Reorganizar el `<header>` superior para que la información del usuario y los botones se apilen correctamente o escondan texto no esencial en pantallas pequeñas.
  - Añadir un botón flotante o en el header exclusivo para móviles que abra el `Sidebar`.
  - Añadir un fondo oscuro (`overlay`) cuando el menú esté abierto en móviles.

### 2. Navegación (Sidebar)
- **[MODIFY]** `src/components/shared/Sidebar.tsx`:
  - Usar transformaciones CSS (`-translate-x-full`) para esconderlo completamente en móviles si está cerrado.
  - Asegurar que el z-index sea alto (`z-50`) para que se sobreponga al contenido en móviles.

### 3. Dashboard y Filtros
- **[MODIFY]** `src/components/dashboard/Dashboard.tsx`:
  - Cambiar los contenedores flex a `flex-col md:flex-row` en la barra de acciones superior.
  - Envolver los filtros (`MultiSelectDropdown`) en un contenedor con `overflow-x-auto whitespace-nowrap scrollbar-hide` para móviles.

### 4. Vistas (Kanban, Tabla, Timeline)
- **[MODIFY]** `src/components/dashboard/KanbanBoard.tsx` (y TareasModule):
  - Añadir clases para permitir scroll horizontal fluido (`snap-x snap-mandatory overflow-x-auto`) en el contenedor principal de las columnas.
  - Asegurar que las tarjetas (`KanbanCard`) mantengan un ancho mínimo fijo para que no se aplasten.
- **[MODIFY]** `src/components/dashboard/RequestTable.tsx`:
  - Envolver la tabla en un `div` con `overflow-x-auto`.

### 5. Formularios y Modales
- **[MODIFY]** `src/components/dashboard/RequestModal.tsx` y `ConfirmModal.tsx`:
  - Cambiar los anchos fijos a responsivos: `w-[95%] md:w-[800px]`.
  - Hacer que las grillas internas (formularios a dos columnas) sean `grid-cols-1 md:grid-cols-2`.
  - Ajustar padding para aprovechar el espacio en pantallas pequeñas (`p-4 md:p-6`).

## Verification Plan

### Manual Verification
1. Abrir la aplicación en un navegador de escritorio y verificar que la experiencia original no haya sufrido alteraciones.
2. Usar las herramientas de desarrollador (F12 -> Vista de dispositivo móvil) para simular pantallas pequeñas (iPhone 12/13, Galaxy S20).
3. Verificar la apertura/cierre del menú lateral, usabilidad de los modales, y que el tablero Kanban pueda deslizarse horizontalmente sin romper el layout general.
