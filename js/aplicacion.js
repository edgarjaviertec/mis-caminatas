// Une todo: eventos de la página, estado y cambio entre pantallas.
// Siempre es el último script que se carga.

const TEXTO_INICIAL_ZONA = "Elige el .zip del export de Simple Health Export CSV";

// Único estado de la app.
const estado = {
    dias: [],
    indiceSeleccionado: -1,
    indiceBajoCursor: -1,
};

const elementos = {
    pantallaInicio: document.getElementById("pantalla-inicio"),
    pantallaTablero: document.getElementById("pantalla-tablero"),
    zonaArrastre: document.getElementById("zona-arrastre"),
    zonaArrastreMensaje: document.getElementById("zona-arrastre-mensaje"),
    selectorArchivos: document.getElementById("selector-archivos"),
    botonVolver: document.getElementById("boton-volver"),
    resumenPasos: document.getElementById("resumen-pasos"),
    resumenCalorias: document.getElementById("resumen-calorias"),
    resumenDetalle: document.getElementById("resumen-detalle"),
    contenedorGrafico: document.getElementById("contenedor-grafico"),
    graficoPasos: document.getElementById("grafico-pasos"),
    tituloActividad: document.getElementById("titulo-actividad"),
    lineaTiempo: document.getElementById("linea-tiempo"),
    avisoAdvertencias: document.getElementById("aviso-advertencias"),
};

// --- Pantalla de inicio ---

async function cargarExport(promesaArchivos) {
    try {
        const archivos = await promesaArchivos;
        const datos = procesarArchivos(archivos);
        mostrarTablero(datos);
    } catch (error) {
        mostrarError(error.message);
    }
}

function mostrarError(mensaje) {
    elementos.zonaArrastreMensaje.replaceChildren(crearIcono("fa-triangle-exclamation"), " " + mensaje);
    elementos.zonaArrastre.classList.add("tiene-error");
}

function reiniciarZonaArrastre() {
    elementos.zonaArrastreMensaje.textContent = TEXTO_INICIAL_ZONA;
    elementos.zonaArrastre.classList.remove("tiene-error", "esta-activa");
}

elementos.selectorArchivos.addEventListener("change", function () {
    cargarExport(leerArchivosSeleccionados(elementos.selectorArchivos.files));
    // Permite volver a elegir el mismo archivo más tarde.
    elementos.selectorArchivos.value = "";
});

elementos.zonaArrastre.addEventListener("dragover", function (evento) {
    // Sin preventDefault el navegador no permite soltar aquí.
    evento.preventDefault();
    elementos.zonaArrastre.classList.add("esta-activa");
});

elementos.zonaArrastre.addEventListener("dragleave", function () {
    elementos.zonaArrastre.classList.remove("esta-activa");
});

elementos.zonaArrastre.addEventListener("drop", function (evento) {
    evento.preventDefault();
    elementos.zonaArrastre.classList.remove("esta-activa");
    cargarExport(leerArchivosArrastrados(evento.dataTransfer));
});

// --- Tablero ---

function mostrarTablero(datos) {
    estado.dias = datos.dias;
    estado.indiceBajoCursor = -1;

    if (datos.advertencias.length > 0) {
        elementos.avisoAdvertencias.replaceChildren(
            crearIcono("fa-circle-info"),
            " Sin datos de: " + datos.advertencias.join(", ")
        );
        elementos.avisoAdvertencias.hidden = false;
    } else {
        elementos.avisoAdvertencias.hidden = true;
    }

    elementos.pantallaInicio.hidden = true;
    elementos.pantallaTablero.hidden = false;

    // El tablero ya es visible: ahora el gráfico puede medir su ancho.
    seleccionarDia(estado.dias.length - 1);
    elementos.contenedorGrafico.scrollLeft = elementos.contenedorGrafico.scrollWidth;
}

function seleccionarDia(indice) {
    estado.indiceSeleccionado = indice;
    const dia = estado.dias[indice];

    elementos.resumenPasos.textContent = formatearPasos(dia.pasos);
    elementos.resumenCalorias.textContent = "pasos (" + dia.caloriasActivas + " calorías)";
    elementos.resumenDetalle.textContent =
        dia.distanciaKm + " km · " + dia.pisos + " pisos · " + formatearFechaCompleta(dia.fecha);

    mostrarLineaTiempo(dia, elementos.tituloActividad, elementos.lineaTiempo);
    redibujarGrafico();
}

function redibujarGrafico() {
    dibujarGraficoBarras(elementos.graficoPasos, estado.dias, estado.indiceSeleccionado, estado.indiceBajoCursor);
}

function volverAlInicio() {
    reiniciarZonaArrastre();
    elementos.pantallaTablero.hidden = true;
    elementos.pantallaInicio.hidden = false;
}

elementos.botonVolver.addEventListener("click", volverAlInicio);

elementos.graficoPasos.addEventListener("click", function (evento) {
    const indice = obtenerIndiceDiaEnPosicion(elementos.graficoPasos, estado.dias.length, evento.offsetX);
    if (indice !== -1) {
        seleccionarDia(indice);
    }
});

elementos.graficoPasos.addEventListener("pointermove", function (evento) {
    // En pantallas táctiles no hay cursor: solo se resalta con el mouse.
    if (evento.pointerType !== "mouse") {
        return;
    }
    const indice = obtenerIndiceDiaEnPosicion(elementos.graficoPasos, estado.dias.length, evento.offsetX);
    if (indice !== estado.indiceBajoCursor) {
        estado.indiceBajoCursor = indice;
        redibujarGrafico();
    }
});

elementos.graficoPasos.addEventListener("pointerleave", function () {
    if (estado.indiceBajoCursor !== -1) {
        estado.indiceBajoCursor = -1;
        redibujarGrafico();
    }
});

// El gráfico se redibuja si cambia el ancho de la ventana o el tema claro/oscuro.
window.addEventListener("resize", function () {
    if (!elementos.pantallaTablero.hidden) {
        redibujarGrafico();
    }
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (!elementos.pantallaTablero.hidden) {
        redibujarGrafico();
    }
});
