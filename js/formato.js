// Formato de números, fechas y horas para mostrar en pantalla.

// "de-DE" usa punto como separador de miles también en números de 4 cifras
// (9.500); "es-ES" dejaría 9500 sin separar.
const FORMATO_MILES = new Intl.NumberFormat("de-DE");

function formatearPasos(pasos) {
    return FORMATO_MILES.format(pasos);
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
