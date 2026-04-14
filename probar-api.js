// Script de prueba usando Fetch global de Node

// Reemplaza esto con tu UUID "TO DO" real
const MI_COLUMNA_ID = "1e5aa67b-096d-47ca-9b38-7ecbaf4ddb42"; 

const url = "https://lsuwdvpeeyctyfaqxgmr.supabase.co/functions/v1/webhook-tareas";
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzdXdkdnBlZXljdHlmYXF4Z21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzg0NDcsImV4cCI6MjA4Njk1NDQ0N30.dJK9sM5fTH6dVf-cJ-pGDGiRSp8sLgbQsKnaw7IfMTQ";

async function probarAPI() {
    console.log("🚀 Enviando prueba a la API...");

    try {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                titulo: "Correo de Prueba API",
                descripcion: "Prueba ejecutada desde el script antes de conectar Power Automate",
                columna_id: MI_COLUMNA_ID
            })
        });

        const datos = await respuesta.json();
        console.log("📥 Respuesta de Supabase:", datos);
        
        if (datos.success) {
            console.log("✅ ¡ÉXTIO! Abre el tablero TareasJLPH para ver tu nueva tarjeta.");
        } else {
            console.log("❌ Hubo un error:", datos.error);
        }

    } catch (error) {
        console.error("Error conectando con la API:", error);
    }
}

probarAPI();
