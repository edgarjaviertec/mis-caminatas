// Ejecuta las pruebas de la app con Node, sin paquetes:
//     node pruebas/ejecutar-pruebas.js
// Termina con código 1 si alguna prueba falla (así Netlify no publica).

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RAIZ = path.join(__dirname, "..");
const CARPETA_DATOS = path.join(__dirname, "datos");
const REFERENCIA = JSON.parse(fs.readFileSync(path.join(__dirname, "datos-referencia.json"), "utf-8"));

// La zona horaria decide a qué día pertenece cada muestra. Se fija la misma con la
// que se generó la referencia, antes de crear cualquier fecha.
process.env.TZ = REFERENCIA.zonaHoraria;

// Los mismos scripts de la app y en el mismo orden que en index.html.
// Se cargan como scripts clásicos: sus funciones quedan globales, igual que en el navegador.
const SCRIPTS_DE_LA_APP = [
    "js/formato.js",
    "js/lector-csv.js",
    "js/procesador-salud.js",
];
for (const script of SCRIPTS_DE_LA_APP) {
    const rutaScript = path.join(RAIZ, script);
    vm.runInThisContext(fs.readFileSync(rutaScript, "utf-8"), { filename: rutaScript });
}

const resultado = { pasaron: 0, fallaron: 0 };

function informarPrueba(descripcion, diferencias) {
    if (diferencias.length === 0) {
        resultado.pasaron++;
        console.log("OK     " + descripcion);
        return;
    }
    resultado.fallaron++;
    console.log("FALLA  " + descripcion);
    for (const diferencia of diferencias) {
        console.log("         " + diferencia);
    }
}

function comprobarIgual(descripcion, obtenido, esperado) {
    const textoObtenido = JSON.stringify(obtenido);
    const textoEsperado = JSON.stringify(esperado);
    if (textoObtenido === textoEsperado) {
        informarPrueba(descripcion, []);
    } else {
        informarPrueba(descripcion, ["esperado " + textoEsperado + ", obtenido " + textoObtenido]);
    }
}

function comprobarError(descripcion, funcion, textoEsperado) {
    try {
        funcion();
        informarPrueba(descripcion, ["esperaba un error y no hubo ninguno"]);
    } catch (error) {
        if (error.message.includes(textoEsperado)) {
            informarPrueba(descripcion, []);
        } else {
            informarPrueba(descripcion, ["mensaje inesperado: " + error.message]);
        }
    }
}

function leerArchivosDePrueba() {
    return fs.readdirSync(CARPETA_DATOS).sort().map(function (nombre) {
        return { nombre: nombre, texto: fs.readFileSync(path.join(CARPETA_DATOS, nombre), "utf-8") };
    });
}

// Arma un CSV mínimo con el formato del export, para los casos pequeños.
function crearCsv(filas) {
    const encabezado = "type,sourceName,sourceVersion,productType,device,startDate,endDate,unit,value";
    return "sep=,\n" + encabezado + "\n" + filas.join("\n") + "\n";
}

function crearFila(inicio, fin, valor) {
    return "Metrica,iPhone,26.6,\"iPhone17,5\",\"<<HKDevice>, name:iPhone>\"," + inicio + "," + fin + ",count," + valor;
}

// "2025-03-08T08:15:02" en hora local, como en la referencia.
function formatearMomentoLocal(momento) {
    const hora = String(momento.getHours()).padStart(2, "0");
    const minutos = String(momento.getMinutes()).padStart(2, "0");
    const segundos = String(momento.getSeconds()).padStart(2, "0");
    return obtenerFechaLocal(momento) + "T" + hora + ":" + minutos + ":" + segundos;
}

// Compara un día calculado con el de la referencia y devuelve la lista de diferencias.
function compararDia(diaObtenido, diaEsperado) {
    const diferencias = [];
    const campos = ["pasos", "caloriasActivas", "distanciaKm", "pisos", "numeroCaminatas", "minutosCaminata"];
    for (const campo of campos) {
        if (diaObtenido[campo] !== diaEsperado[campo]) {
            diferencias.push(campo + ": esperado " + diaEsperado[campo] + ", obtenido " + diaObtenido[campo]);
        }
    }

    const segmentosEsperados = diaEsperado.lineaTiempo;
    const segmentosObtenidos = diaObtenido.lineaTiempo.map(function (segmento) {
        return {
            tipo: segmento.tipo,
            inicio: formatearMomentoLocal(segmento.inicio),
            fin: formatearMomentoLocal(segmento.fin),
            minutos: segmento.minutos,
            kmh: segmento.kmh,
            nivel: segmento.nivel,
            calorias: segmento.calorias,
        };
    });
    if (segmentosObtenidos.length !== segmentosEsperados.length) {
        diferencias.push("segmentos: esperado " + segmentosEsperados.length + ", obtenido " + segmentosObtenidos.length);
        return diferencias;
    }
    for (let indice = 0; indice < segmentosEsperados.length; indice++) {
        const textoObtenido = JSON.stringify(segmentosObtenidos[indice]);
        const textoEsperado = JSON.stringify(segmentosEsperados[indice]);
        if (textoObtenido !== textoEsperado) {
            diferencias.push("segmento " + (indice + 1) + ": esperado " + textoEsperado);
            diferencias.push("            obtenido " + textoObtenido);
        }
    }
    return diferencias;
}

// ---------------------------------------------------------------------------
// Comparación completa contra la referencia
// ---------------------------------------------------------------------------

console.log("\nDatos de prueba contra la referencia (" + REFERENCIA.zonaHoraria + ")\n");

const datosCalculados = procesarArchivos(leerArchivosDePrueba());

comprobarIgual("advertencias", datosCalculados.advertencias, REFERENCIA.advertencias);
comprobarIgual(
    "días encontrados",
    datosCalculados.dias.map(function (dia) { return dia.fecha; }),
    REFERENCIA.dias.map(function (dia) { return dia.fecha; })
);
for (const diaEsperado of REFERENCIA.dias) {
    const diaObtenido = datosCalculados.dias.find(function (dia) {
        return dia.fecha === diaEsperado.fecha;
    });
    const descripcion = formatearFechaCompleta(diaEsperado.fecha) + ": totales y " +
        diaEsperado.lineaTiempo.length + " segmentos";
    if (!diaObtenido) {
        informarPrueba(descripcion, ["el día no aparece en el resultado"]);
        continue;
    }
    informarPrueba(descripcion, compararDia(diaObtenido, diaEsperado));
}

// ---------------------------------------------------------------------------
// Lector CSV
// ---------------------------------------------------------------------------

console.log("\nLector CSV\n");

const filasConComillas = leerCsv(crearCsv([
    crearFila("2025-03-08 10:00:00 +0000", "2025-03-08 10:05:00 +0000", "512.0"),
]));
comprobarIgual("ignora la línea sep=, y lee una fila", filasConComillas.length, 1);
comprobarIgual("respeta las comas dentro de comillas", filasConComillas[0].valor, "512.0");
comprobarIgual("traduce las columnas al español", filasConComillas[0].inicio, "2025-03-08 10:00:00 +0000");
comprobarIgual(
    "dos comillas seguidas son una comilla literal",
    separarCampos("uno,\"dice \"\"hola\"\"\",tres"),
    ["uno", "dice \"hola\"", "tres"]
);
comprobarIgual("acepta saltos de línea de Windows", leerCsv("a,value\r\n1,2\r\n")[0].valor, "2");

// ---------------------------------------------------------------------------
// Procesador: casos que los datos reales no cubren
// ---------------------------------------------------------------------------

console.log("\nProcesador\n");

comprobarError(
    "sin StepCount avisa que no es el export correcto",
    function () {
        procesarArchivos([{ nombre: "HKQuantityTypeIdentifierFlightsClimbed_x.csv", texto: crearCsv([]) }]);
    },
    "no contiene datos de pasos"
);

comprobarError(
    "StepCount sin filas válidas avisa que no hay días",
    function () {
        procesarArchivos([{ nombre: "HKQuantityTypeIdentifierStepCount_x.csv", texto: crearCsv([]) }]);
    },
    "No encontré muestras de pasos"
);

const soloPasos = procesarArchivos([{
    nombre: "HKQuantityTypeIdentifierStepCount_x.csv",
    texto: crearCsv([crearFila("2025-03-08 15:00:00 +0000", "2025-03-08 15:10:00 +0000", "100")]),
}]);
comprobarIgual(
    "avisa las métricas opcionales que faltan",
    soloPasos.advertencias,
    ["calorías activas", "distancia", "pisos", "velocidad de marcha"]
);

const conFilasInvalidas = procesarArchivos([{
    nombre: "HKQuantityTypeIdentifierStepCount_x.csv",
    texto: crearCsv([
        crearFila("2025-03-08 15:00:00 +0000", "2025-03-08 15:10:00 +0000", "100"),
        crearFila("2025-03-08 15:20:00 +0000", "2025-03-08 15:30:00 +0000", ""),
        crearFila("fecha rota", "2025-03-08 15:30:00 +0000", "50"),
        crearFila("2025-03-08 16:00:00 +0000", "fin roto", "20"),
    ]),
}]);
comprobarIgual("ignora filas inválidas y usa el inicio si falta el fin", conFilasInvalidas.dias[0].pasos, 120);

// 23:50 -> 00:10 hora local (UTC-5): 10 minutos en cada día.
const cruceMedianoche = procesarArchivos([{
    nombre: "HKQuantityTypeIdentifierStepCount_x.csv",
    texto: crearCsv([crearFila("2025-03-09 04:50:00 +0000", "2025-03-09 05:10:00 +0000", "100")]),
}]);
comprobarIgual(
    "reparte una muestra que cruza la medianoche",
    cruceMedianoche.dias.map(function (dia) { return [dia.fecha, dia.pasos]; }),
    [["2025-03-08", 50], ["2025-03-09", 50]]
);

comprobarIgual(
    "niveles de caminata según la velocidad",
    [3.4, 3.5, 4.9, 5.0, 6.4, 6.5].map(nivelCaminata),
    ["recreativo", "saludable", "saludable", "optimo", "optimo", "intenso"]
);

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

console.log("\nFormato\n");

comprobarIgual("pasos con punto de miles", [862, 9500, 19117].map(formatearPasos), ["862", "9.500", "19.117"]);
comprobarIgual("fecha corta", formatearFechaCorta("2025-03-08"), "08/03");
comprobarIgual("fecha completa", formatearFechaCompleta("2025-03-08"), "08/03/2025");
comprobarIgual(
    "hora en 12 horas",
    [
        new Date(2025, 2, 8, 0, 5),
        new Date(2025, 2, 8, 8, 5),
        new Date(2025, 2, 8, 12, 30),
        new Date(2025, 2, 8, 23, 59),
    ].map(formatearHora),
    ["12:05 AM", "8:05 AM", "12:30 PM", "11:59 PM"]
);

// ---------------------------------------------------------------------------

const total = resultado.pasaron + resultado.fallaron;
console.log("\nResultado: " + resultado.pasaron + " de " + total + " pruebas pasaron\n");
if (resultado.fallaron > 0) {
    process.exit(1);
}
