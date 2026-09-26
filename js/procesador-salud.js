// Convierte los CSV del export en datos por día: pasos, calorías, distancia, pisos
// y la línea de tiempo de caminatas.
//
// Las caminatas se detectan con WalkingSpeed (la marcha real que registra Apple),
// no agrupando pasos: así se distingue cuándo caminaste de verdad, cuándo diste
// pasos sueltos y cuándo estuviste sentado.

const MINUTOS_HUECO_ENTRE_TRAMOS = 5;   // un hueco mayor empieza un tramo nuevo
const MINUTOS_MINIMOS_CAMINATA = 3;     // un tramo más corto es "caminata corta"
const MINUTOS_MINIMOS_SENTADO = 5;      // un hueco más corto no se muestra
const MINUTOS_MAXIMOS_SENTADO = 180;    // un hueco más largo (noche) no se muestra
const MILISEGUNDOS_POR_MINUTO = 60 * 1000;

// Nombre de cada métrica en los archivos del export.
const METRICAS = {
    pasos: "StepCount",
    caloriasActivas: "ActiveEnergyBurned",
    distancia: "DistanceWalkingRunning",
    pisos: "FlightsClimbed",
    velocidadMarcha: "WalkingSpeed",
};

// Recibe [{ nombre, texto }] y devuelve { dias, advertencias }.
// Lanza un Error con un mensaje para el usuario si no hay datos de pasos.
function procesarArchivos(archivos) {
    const archivoPasos = buscarArchivo(archivos, METRICAS.pasos);
    if (!archivoPasos) {
        throw new Error(
            "Este export no contiene datos de pasos (StepCount).\n" +
            "¿Es el export correcto de Simple Health Export CSV?"
        );
    }

    const advertencias = [];
    const archivoCalorias = buscarArchivo(archivos, METRICAS.caloriasActivas);
    const archivoDistancia = buscarArchivo(archivos, METRICAS.distancia);
    const archivoPisos = buscarArchivo(archivos, METRICAS.pisos);
    const archivoVelocidad = buscarArchivo(archivos, METRICAS.velocidadMarcha);
    if (!archivoCalorias) {
        advertencias.push("calorías activas");
    }
    if (!archivoDistancia) {
        advertencias.push("distancia");
    }
    if (!archivoPisos) {
        advertencias.push("pisos");
    }
    if (!archivoVelocidad) {
        advertencias.push("velocidad de marcha");
    }

    const muestrasCalorias = leerMuestras(archivoCalorias);
    const pasosPorDia = sumarPorDia(leerMuestras(archivoPasos));
    const caloriasPorDia = sumarPorDia(muestrasCalorias);
    const distanciaPorDia = sumarPorDia(leerMuestras(archivoDistancia));
    const pisosPorDia = sumarPorDia(leerMuestras(archivoPisos));

    // La marcha necesita inicio y fin reales para medir cuánto duró cada tramo.
    const muestrasVelocidad = leerMuestras(archivoVelocidad).filter(function (muestra) {
        return muestra.tieneFin;
    });
    const velocidadPorDia = agruparPorDia(muestrasVelocidad);
    const caloriasAgrupadasPorDia = agruparPorDia(muestrasCalorias);

    const dias = [];
    for (const fecha of Object.keys(pasosPorDia).sort()) {
        const lineaTiempo = construirLineaTiempo(
            velocidadPorDia[fecha] || [],
            caloriasAgrupadasPorDia[fecha] || []
        );
        const caminatas = lineaTiempo.filter(function (segmento) {
            return segmento.tipo === "caminata";
        });
        let minutosCaminata = 0;
        for (const caminata of caminatas) {
            minutosCaminata += caminata.minutos;
        }

        dias.push({
            fecha: fecha,
            pasos: Math.round(pasosPorDia[fecha]),
            caloriasActivas: Math.round(caloriasPorDia[fecha] || 0),
            distanciaKm: redondearUnDecimal(distanciaPorDia[fecha] || 0),
            pisos: Math.round(pisosPorDia[fecha] || 0),
            lineaTiempo: lineaTiempo,
            numeroCaminatas: caminatas.length,
            minutosCaminata: minutosCaminata,
        });
    }

    if (dias.length === 0) {
        throw new Error("No encontré muestras de pasos con fecha válida en ese export.");
    }
    return { dias: dias, advertencias: advertencias };
}

// Los archivos se llaman "HKQuantityTypeIdentifierStepCount_<fecha>_SimpleHealthExportCSV.csv".
// El "_" final evita confundir métricas de nombre parecido.
function buscarArchivo(archivos, metrica) {
    const prefijo = "HKQuantityTypeIdentifier" + metrica + "_";
    return archivos.find(function (archivo) {
        return archivo.nombre.startsWith(prefijo) && archivo.nombre.endsWith(".csv");
    });
}

// Devuelve [{ inicio, fin, valor, tieneFin }] con fechas y números ya convertidos.
// Las filas sin inicio o valor válidos se ignoran; si falta el fin se usa el inicio.
function leerMuestras(archivo) {
    if (!archivo) {
        return [];
    }
    const muestras = [];
    for (const fila of leerCsv(archivo.texto)) {
        const inicio = convertirFecha(fila.inicio);
        const valor = convertirNumero(fila.valor);
        if (inicio === null || valor === null) {
            continue;
        }
        const fin = convertirFecha(fila.fin);
        muestras.push({
            inicio: inicio,
            fin: fin === null ? inicio : fin,
            valor: valor,
            tieneFin: fin !== null,
        });
    }
    return muestras;
}

// "2025-03-08 15:42:52 +0000" (UTC) -> Date. Devuelve null si el texto no es válido.
function convertirFecha(texto) {
    if (typeof texto !== "string") {
        return null;
    }
    const partes = texto.trim().split(" ");
    if (partes.length !== 3) {
        return null;
    }
    const [fecha, hora, zona] = partes;
    const zonaIso = zona.slice(0, 3) + ":" + zona.slice(3);
    const momento = new Date(fecha + "T" + hora + zonaIso);
    if (isNaN(momento.getTime())) {
        return null;
    }
    return momento;
}

// Devuelve null si el texto no es un número (Number("") sería 0).
function convertirNumero(texto) {
    if (typeof texto !== "string" || texto.trim() === "") {
        return null;
    }
    const numero = Number(texto);
    if (isNaN(numero)) {
        return null;
    }
    return numero;
}

// Día local de un momento, como texto: "2025-03-08".
function obtenerFechaLocal(momento) {
    const anio = momento.getFullYear();
    const mes = String(momento.getMonth() + 1).padStart(2, "0");
    const dia = String(momento.getDate()).padStart(2, "0");
    return anio + "-" + mes + "-" + dia;
}

function sumarPorDia(muestras) {
    const totalPorDia = {};
    for (const muestra of muestras) {
        repartirPorDia(totalPorDia, muestra.inicio, muestra.fin, muestra.valor);
    }
    return totalPorDia;
}

// Suma el valor de una muestra repartiéndolo entre los días que abarca.
// Una muestra puede cruzar la medianoche (23:56 -> 00:06). Salud reparte el valor
// según el tiempo que la muestra pasa en cada día; aquí se hace lo mismo para que
// los totales diarios coincidan con los del iPhone.
function repartirPorDia(totalPorDia, inicio, fin, valor) {
    const duracionTotal = fin - inicio;
    if (duracionTotal <= 0 || obtenerFechaLocal(inicio) === obtenerFechaLocal(fin)) {
        sumarEnDia(totalPorDia, obtenerFechaLocal(inicio), valor);
        return;
    }
    let inicioTramo = inicio;
    while (inicioTramo < fin) {
        const medianocheSiguiente = new Date(
            inicioTramo.getFullYear(), inicioTramo.getMonth(), inicioTramo.getDate() + 1
        );
        const finTramo = fin < medianocheSiguiente ? fin : medianocheSiguiente;
        const proporcion = (finTramo - inicioTramo) / duracionTotal;
        sumarEnDia(totalPorDia, obtenerFechaLocal(inicioTramo), valor * proporcion);
        inicioTramo = finTramo;
    }
}

function sumarEnDia(totalPorDia, fecha, valor) {
    if (totalPorDia[fecha] === undefined) {
        totalPorDia[fecha] = 0;
    }
    totalPorDia[fecha] += valor;
}

// Agrupa las muestras según el día en que empiezan: { "2025-03-08": [muestras] }.
function agruparPorDia(muestras) {
    const muestrasPorDia = {};
    for (const muestra of muestras) {
        const fecha = obtenerFechaLocal(muestra.inicio);
        if (muestrasPorDia[fecha] === undefined) {
            muestrasPorDia[fecha] = [];
        }
        muestrasPorDia[fecha].push(muestra);
    }
    return muestrasPorDia;
}

// Construye la línea de tiempo de un día a partir de las muestras de marcha:
// agrupa las muestras cercanas en tramos, intercala los ratos "sentado" y marca
// como "caminata-corta" los tramos demasiado cortos.
// Cada segmento: { tipo, inicio, fin, minutos, kmh, nivel, calorias }.
function construirLineaTiempo(muestrasVelocidad, muestrasCalorias) {
    const tramos = agruparEnTramos(muestrasVelocidad);
    const segmentos = [];
    let finTramoAnterior = null;

    for (const tramo of tramos) {
        if (finTramoAnterior !== null) {
            const minutosHueco = (tramo.inicio - finTramoAnterior) / MILISEGUNDOS_POR_MINUTO;
            if (minutosHueco >= MINUTOS_MINIMOS_SENTADO && minutosHueco <= MINUTOS_MAXIMOS_SENTADO) {
                segmentos.push(crearSegmento("sentado", finTramoAnterior, tramo.inicio, minutosHueco));
            }
        }

        const minutosTramo = (tramo.fin - tramo.inicio) / MILISEGUNDOS_POR_MINUTO;
        let sumaVelocidades = 0;
        for (const velocidad of tramo.velocidades) {
            sumaVelocidades += velocidad;
        }
        const kmh = redondearUnDecimal(sumaVelocidades / tramo.velocidades.length);

        if (minutosTramo >= MINUTOS_MINIMOS_CAMINATA) {
            const caminata = crearSegmento("caminata", tramo.inicio, tramo.fin, minutosTramo);
            caminata.kmh = kmh;
            caminata.nivel = nivelCaminata(kmh);
            caminata.calorias = Math.round(
                sumarCaloriasEnVentana(muestrasCalorias, tramo.inicio, tramo.fin)
            );
            segmentos.push(caminata);
        } else {
            const caminataCorta = crearSegmento("caminata-corta", tramo.inicio, tramo.fin, minutosTramo);
            caminataCorta.kmh = kmh;
            segmentos.push(caminataCorta);
        }
        finTramoAnterior = tramo.fin;
    }
    return segmentos;
}

function crearSegmento(tipo, inicio, fin, minutos) {
    return {
        tipo: tipo,
        inicio: inicio,
        fin: fin,
        minutos: Math.round(minutos),
        kmh: 0,
        nivel: "",
        calorias: 0,
    };
}

// Une las muestras separadas por huecos de hasta MINUTOS_HUECO_ENTRE_TRAMOS.
// Devuelve [{ inicio, fin, velocidades }].
function agruparEnTramos(muestrasVelocidad) {
    const muestrasOrdenadas = muestrasVelocidad.slice().sort(function (primera, segunda) {
        if (primera.inicio - segunda.inicio !== 0) {
            return primera.inicio - segunda.inicio;
        }
        return primera.fin - segunda.fin;
    });

    const tramos = [];
    let tramoActual = null;
    for (const muestra of muestrasOrdenadas) {
        const esContinuacion = tramoActual !== null &&
            muestra.inicio - tramoActual.fin <= MINUTOS_HUECO_ENTRE_TRAMOS * MILISEGUNDOS_POR_MINUTO;
        if (esContinuacion) {
            tramoActual.fin = muestra.fin;
            tramoActual.velocidades.push(muestra.valor);
        } else {
            tramoActual = { inicio: muestra.inicio, fin: muestra.fin, velocidades: [muestra.valor] };
            tramos.push(tramoActual);
        }
    }
    return tramos;
}

// Calorías quemadas dentro de [inicio, fin]: de cada muestra de calorías se toma
// la parte proporcional al tiempo que se solapa con la caminata.
function sumarCaloriasEnVentana(muestrasCalorias, inicio, fin) {
    let calorias = 0;
    for (const muestra of muestrasCalorias) {
        const inicioSolapamiento = Math.max(muestra.inicio, inicio);
        const finSolapamiento = Math.min(muestra.fin, fin);
        const solapamiento = finSolapamiento - inicioSolapamiento;
        const duracionMuestra = muestra.fin - muestra.inicio;
        if (solapamiento > 0 && duracionMuestra > 0) {
            calorias += muestra.valor * (solapamiento / duracionMuestra);
        }
    }
    return calorias;
}

// Nivel de la caminata según la velocidad de marcha.
function nivelCaminata(kmh) {
    if (kmh < 3.5) {
        return "recreativo";
    }
    if (kmh < 5.0) {
        return "saludable";
    }
    if (kmh < 6.5) {
        return "optimo";
    }
    return "intenso";
}

function redondearUnDecimal(numero) {
    return Math.round(numero * 10) / 10;
}
