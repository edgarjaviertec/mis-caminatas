// Gráfico de barras de pasos por día, estilo Pedometer++, dibujado en un canvas.

const META_PASOS = 10000;
const PROPORCION_META_EN_ROJO = 0.3;     // menos del 30 % de la meta: barra roja

const ALTO_GRAFICO = 320;
const ANCHO_MINIMO_POR_DIA = 66;         // con muchos días el gráfico se desplaza a los lados
const MARGEN_SUPERIOR = 44;              // espacio para el número sobre la barra más alta
const MARGEN_INFERIOR = 42;              // espacio para la fecha
const MARGEN_LATERAL = 10;
const PROPORCION_ANCHO_BARRA = 0.6;      // ancho de la barra respecto a su columna
const ANCHO_MAXIMO_BARRA = 46;
const RADIO_MAXIMO_BARRA = 9;
const ALTO_MINIMO_BARRA = 3;             // un día con pocos pasos igual se ve
const ESPACIO_SOBRE_BARRA_MAS_ALTA = 1.12;
const ALTO_MINIMO_PARA_TEXTO_INTERIOR = 42;
const TAMANIO_ESCALERA = 9;

// Dibuja el gráfico completo. El canvas toma el ancho de su contenedor, o más si
// hay muchos días (entonces el contenedor se desplaza).
function dibujarGraficoBarras(canvas, dias, indiceSeleccionado, indiceBajoCursor) {
    const anchoDisponible = canvas.parentElement.clientWidth;
    const ancho = Math.max(anchoDisponible, dias.length * ANCHO_MINIMO_POR_DIA);
    const alto = ALTO_GRAFICO;

    // En pantallas Retina el canvas tiene más píxeles reales que CSS; sin esto se ve borroso.
    const densidad = window.devicePixelRatio || 1;
    canvas.style.width = ancho + "px";
    canvas.style.height = alto + "px";
    canvas.width = Math.round(ancho * densidad);
    canvas.height = Math.round(alto * densidad);
    const contexto = canvas.getContext("2d");
    contexto.scale(densidad, densidad);

    const colores = leerColores();
    contexto.fillStyle = colores.fondo;
    contexto.fillRect(0, 0, ancho, alto);
    if (dias.length === 0) {
        return;
    }

    const altoZona = alto - MARGEN_SUPERIOR - MARGEN_INFERIOR;
    const anchoColumna = (ancho - 2 * MARGEN_LATERAL) / dias.length;
    const anchoBarra = Math.min(anchoColumna * PROPORCION_ANCHO_BARRA, ANCHO_MAXIMO_BARRA);
    const radio = Math.min(anchoBarra / 2, RADIO_MAXIMO_BARRA);
    const baseY = MARGEN_SUPERIOR + altoZona;

    let maximoPasos = META_PASOS;
    for (const dia of dias) {
        maximoPasos = Math.max(maximoPasos, dia.pasos);
    }
    const escalaMaxima = maximoPasos * ESPACIO_SOBRE_BARRA_MAS_ALTA;

    // Línea de la meta
    const yMeta = baseY - (META_PASOS / escalaMaxima) * altoZona;
    contexto.strokeStyle = colores.verde;
    contexto.lineWidth = 1.5;
    contexto.beginPath();
    contexto.moveTo(MARGEN_LATERAL, yMeta);
    contexto.lineTo(ancho - MARGEN_LATERAL, yMeta);
    contexto.stroke();

    dias.forEach(function (dia, indice) {
        const centroX = MARGEN_LATERAL + anchoColumna * indice + anchoColumna / 2;
        const inicioColumna = centroX - anchoColumna / 2;
        const altoBarra = Math.max((dia.pasos / escalaMaxima) * altoZona, ALTO_MINIMO_BARRA);
        const xBarra = centroX - anchoBarra / 2;
        const yBarra = baseY - altoBarra;
        const colorBarra = elegirColorBarra(dia.pasos, colores);

        // Fondo de la columna seleccionada o bajo el cursor
        if (indice === indiceSeleccionado) {
            contexto.fillStyle = colores.columnaSeleccionada;
            contexto.fillRect(inicioColumna, MARGEN_SUPERIOR - 4, anchoColumna, altoZona + MARGEN_INFERIOR);
        } else if (indice === indiceBajoCursor) {
            contexto.fillStyle = colores.columnaBajoCursor;
            contexto.fillRect(inicioColumna, MARGEN_SUPERIOR - 4, anchoColumna, altoZona + MARGEN_INFERIOR);
        }

        // Barra: esquinas redondeadas solo arriba
        contexto.fillStyle = colorBarra;
        contexto.beginPath();
        contexto.roundRect(xBarra, yBarra, anchoBarra, altoBarra, [radio, radio, 0, 0]);
        contexto.fill();
        if (indice === indiceBajoCursor) {
            // Aclara la barra bajo el cursor
            contexto.fillStyle = "rgba(255, 255, 255, 0.25)";
            contexto.fill();
        }

        // Pasos sobre la barra
        contexto.fillStyle = colorBarra;
        contexto.font = "bold 13px " + colores.fuente;
        contexto.textAlign = "center";
        contexto.textBaseline = "bottom";
        contexto.fillText(formatearPasos(dia.pasos), centroX, yBarra - 4);

        // Pisos y distancia dentro de la barra, si cabe
        if (altoBarra > ALTO_MINIMO_PARA_TEXTO_INTERIOR) {
            dibujarTextoInterior(contexto, dia, xBarra, anchoBarra, baseY, colores);
        }

        // Fecha debajo
        contexto.fillStyle = indice === indiceSeleccionado ? colores.texto : colores.textoTenue;
        contexto.font = "12px " + colores.fuente;
        contexto.textAlign = "center";
        contexto.textBaseline = "top";
        contexto.fillText(formatearFechaCorta(dia.fecha), centroX, baseY + 8);
    });
}

// Número de pisos con el icono de escalera y, debajo, la distancia.
function dibujarTextoInterior(contexto, dia, xBarra, anchoBarra, baseY, colores) {
    const separacion = 3;
    const yFila = baseY - 34;
    contexto.font = "10px " + colores.fuente;
    contexto.fillStyle = colores.textoSobreBarra;
    contexto.textBaseline = "middle";

    const textoPisos = String(dia.pisos);
    const anchoTexto = contexto.measureText(textoPisos).width;
    const anchoTotal = anchoTexto + separacion + TAMANIO_ESCALERA;
    const xInicio = xBarra + (anchoBarra - anchoTotal) / 2;

    contexto.textAlign = "left";
    contexto.fillText(textoPisos, xInicio, yFila + TAMANIO_ESCALERA / 2);
    dibujarEscalera(contexto, xInicio + anchoTexto + separacion, yFila, colores.textoSobreBarra);

    contexto.textAlign = "center";
    contexto.fillText(dia.distanciaKm + "km", xBarra + anchoBarra / 2, baseY - 12);
}

// Escalera de 3 escalones que suben hacia la derecha (estilo Pedometer++).
function dibujarEscalera(contexto, x, y, color) {
    const alturasEscalones = [0.45, 0.72, 1.0];
    const anchoEscalon = TAMANIO_ESCALERA / alturasEscalones.length;
    contexto.fillStyle = color;
    alturasEscalones.forEach(function (proporcionAlto, posicion) {
        const altoEscalon = TAMANIO_ESCALERA * proporcionAlto;
        contexto.fillRect(
            x + posicion * anchoEscalon,
            y + TAMANIO_ESCALERA - altoEscalon,
            anchoEscalon + 0.5,
            altoEscalon
        );
    });
}

function elegirColorBarra(pasos, colores) {
    if (pasos >= META_PASOS) {
        return colores.verde;
    }
    if (pasos < META_PASOS * PROPORCION_META_EN_ROJO) {
        return colores.rojo;
    }
    return colores.naranja;
}

// Día que corresponde a una posición horizontal dentro del canvas, o -1 si ninguno.
function obtenerIndiceDiaEnPosicion(canvas, cantidadDias, posicionX) {
    const anchoColumna = (canvas.clientWidth - 2 * MARGEN_LATERAL) / cantidadDias;
    const indice = Math.floor((posicionX - MARGEN_LATERAL) / anchoColumna);
    if (indice < 0 || indice >= cantidadDias) {
        return -1;
    }
    return indice;
}

// Los colores viven en css/estilos.css (sección CONFIGURACION), así el modo oscuro
// se define en un solo lugar.
function leerColores() {
    const estilos = getComputedStyle(document.documentElement);
    function leerVariable(nombre) {
        return estilos.getPropertyValue(nombre).trim();
    }
    return {
        fuente: leerVariable("--fuente"),
        fondo: leerVariable("--color-fondo"),
        texto: leerVariable("--color-texto"),
        textoTenue: leerVariable("--color-texto-tenue"),
        naranja: leerVariable("--color-naranja"),
        verde: leerVariable("--color-verde"),
        rojo: leerVariable("--color-rojo"),
        textoSobreBarra: leerVariable("--color-texto-sobre-barra"),
        columnaSeleccionada: leerVariable("--color-columna-seleccionada"),
        columnaBajoCursor: leerVariable("--color-columna-bajo-cursor"),
    };
}
