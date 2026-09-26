// Lista de actividad de un día: caminatas, caminatas cortas y ratos sentado.

// Icono y nombre de cada nivel de caminata (según la velocidad de marcha).
const NIVELES_CAMINATA = {
    recreativo: { icono: "fa-feather", nombre: "recreativo" },
    saludable: { icono: "fa-circle-check", nombre: "saludable" },
    optimo: { icono: "fa-dumbbell", nombre: "óptimo" },
    intenso: { icono: "fa-bolt", nombre: "intenso" },
};

function mostrarLineaTiempo(dia, elementoTitulo, elementoLista) {
    elementoTitulo.replaceChildren("Actividad del " + formatearFechaCorta(dia.fecha));
    if (dia.numeroCaminatas > 0) {
        elementoTitulo.append(
            " · ",
            crearIcono("fa-person-walking"),
            " " + dia.numeroCaminatas + " caminatas · " + dia.minutosCaminata + " min"
        );
    }

    if (dia.lineaTiempo.length === 0) {
        const filaVacia = crearElemento("li", "linea-tiempo-vacia",
            "Sin datos de marcha ese día (el CSV de WalkingSpeed no tiene muestras).");
        elementoLista.replaceChildren(filaVacia);
        return;
    }

    const filas = dia.lineaTiempo.map(function (segmento) {
        if (segmento.tipo === "sentado") {
            return crearFilaSentado(segmento);
        }
        if (segmento.tipo === "caminata-corta") {
            return crearFilaCaminataCorta(segmento);
        }
        return crearFilaCaminata(segmento);
    });
    elementoLista.replaceChildren(...filas);
}

function crearFilaSentado(segmento) {
    const fila = crearElemento("li", "linea-tiempo-fila esta-sentado");
    fila.append(
        crearIcono("fa-chair"),
        crearElemento("span", "linea-tiempo-descripcion", "sentado ~" + segmento.minutos + " min")
    );
    return fila;
}

function crearFilaCaminataCorta(segmento) {
    const fila = crearElemento("li", "linea-tiempo-fila esta-caminando-poco");
    fila.append(
        crearIcono("fa-shoe-prints"),
        crearElemento("span", "linea-tiempo-hora", formatearHora(segmento.inicio)),
        crearElemento("span", "linea-tiempo-descripcion", "caminata corta")
    );
    return fila;
}

function crearFilaCaminata(segmento) {
    const nivel = NIVELES_CAMINATA[segmento.nivel];
    const horario = formatearHora(segmento.inicio) + "–" + formatearHora(segmento.fin);

    const calorias = crearElemento("span", "linea-tiempo-calorias");
    calorias.append(crearIcono("fa-fire"), " " + segmento.calorias + " cal");

    const etiquetaNivel = crearElemento("span", "linea-tiempo-nivel nivel-" + segmento.nivel);
    etiquetaNivel.append(crearIcono(nivel.icono), " " + nivel.nombre);

    const fila = crearElemento("li", "linea-tiempo-fila");
    fila.append(
        crearIcono("fa-person-walking"),
        crearElemento("span", "linea-tiempo-hora", horario),
        crearElemento("span", "linea-tiempo-minutos", segmento.minutos + " min"),
        crearElemento("span", "linea-tiempo-velocidad", segmento.kmh + " km/h"),
        calorias,
        etiquetaNivel
    );
    return fila;
}

// Se usa textContent (no innerHTML): el texto nunca se interpreta como HTML.
function crearElemento(etiqueta, clases, texto) {
    const elemento = document.createElement(etiqueta);
    elemento.className = clases;
    if (texto !== undefined) {
        elemento.textContent = texto;
    }
    return elemento;
}

function crearIcono(claseIcono) {
    const icono = document.createElement("i");
    icono.className = "fa-solid " + claseIcono;
    icono.setAttribute("aria-hidden", "true");
    return icono;
}
