// Formato de números, fechas y horas para mostrar en pantalla.

// Punto para los miles y coma para los decimales: 19.117 pasos, 3,2 km.
// Se usa "de-DE" porque "es-ES" no separa los miles en números de 4 cifras (9500).
const FORMATO_NUMEROS = new Intl.NumberFormat("de-DE");

function formatearNumero(numero) {
    return FORMATO_NUMEROS.format(numero);
}

// Número con la palabra en singular o plural: "1 piso", "2 pisos".
function formatearCantidad(cantidad, singular, plural) {
    const palabra = cantidad === 1 ? singular : plural;
    return formatearNumero(cantidad) + " " + palabra;
}

// "2025-03-08" -> "08/03"
function formatearFechaCorta(fecha) {
    const [anio, mes, dia] = fecha.split("-");
    return dia + "/" + mes;
}

// "2025-03-08" -> "08/03/2025"
function formatearFechaCompleta(fecha) {
    const [anio, mes, dia] = fecha.split("-");
    return dia + "/" + mes + "/" + anio;
}

// Hora en formato de 12 horas: "8:05 AM", "12:30 PM".
function formatearHora(momento) {
    const horas = momento.getHours();
    const minutos = String(momento.getMinutes()).padStart(2, "0");
    const sufijo = horas < 12 ? "AM" : "PM";
    const horasEn12 = horas % 12 === 0 ? 12 : horas % 12;
    return horasEn12 + ":" + minutos + " " + sufijo;
}
