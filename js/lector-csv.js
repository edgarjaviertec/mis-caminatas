// Convierte el texto de un CSV de Simple Health Export CSV en filas con claves en español.

// Columnas del export que usa la app y su nombre dentro de la app.
const COLUMNAS_CSV = {
    startDate: "inicio",
    endDate: "fin",
    value: "valor",
    unit: "unidad",
    sourceName: "fuente",
};

// Devuelve una lista de filas: { inicio, fin, valor, unidad, fuente }, todo como texto.
// Si falta una columna, su valor queda como undefined.
function leerCsv(texto) {
    const lineas = texto.split("\n").map(function (linea) {
        return linea.replace("\r", "");
    });

    // El export empieza con "sep=," para que Excel detecte el separador.
    if (lineas.length > 0 && lineas[0].toLowerCase().startsWith("sep=")) {
        lineas.shift();
    }
    if (lineas.length === 0) {
        return [];
    }

    const encabezados = separarCampos(lineas[0]);
    const filas = [];
    for (const linea of lineas.slice(1)) {
        if (linea.trim() === "") {
            continue;
        }
        const campos = separarCampos(linea);
        const fila = {};
        for (const [columna, clave] of Object.entries(COLUMNAS_CSV)) {
            fila[clave] = campos[encabezados.indexOf(columna)];
        }
        filas.push(fila);
    }
    return filas;
}

// Separa una línea por comas, respetando los campos entre comillas:
// "iPhone17,5" es un solo campo aunque tenga una coma dentro.
function separarCampos(linea) {
    const campos = [];
    let campoActual = "";
    let estaDentroDeComillas = false;

    for (let posicion = 0; posicion < linea.length; posicion++) {
        const caracter = linea[posicion];
        const siguienteCaracter = linea[posicion + 1];

        if (caracter === "\"" && estaDentroDeComillas && siguienteCaracter === "\"") {
            // Dos comillas seguidas dentro de un campo son una comilla literal.
            campoActual += "\"";
            posicion++;
        } else if (caracter === "\"") {
            estaDentroDeComillas = !estaDentroDeComillas;
        } else if (caracter === "," && !estaDentroDeComillas) {
            campos.push(campoActual);
            campoActual = "";
        } else {
            campoActual += caracter;
        }
    }
    campos.push(campoActual);
    return campos;
}
