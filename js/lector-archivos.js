// Lee lo que el usuario elige o arrastra (el .zip del export, archivos .csv sueltos
// o la carpeta del export) y devuelve [{ nombre, texto }] con solo los CSV que usa la app.

// Para archivos elegidos con el botón (una lista de File).
async function leerArchivosSeleccionados(listaArchivos) {
    const archivos = [];
    for (const archivo of listaArchivos) {
        if (archivo.name.toLowerCase().endsWith(".zip")) {
            for (const archivoDelZip of await leerZip(archivo)) {
                archivos.push(archivoDelZip);
            }
        } else if (esArchivoNecesario(archivo.name)) {
            archivos.push({ nombre: archivo.name, texto: await archivo.text() });
        }
    }

    if (archivos.length === 0) {
        throw new Error(
            "No encontré archivos del export.\n" +
            "Elige el .zip de Simple Health Export CSV, sus archivos .csv o la carpeta."
        );
    }
    return archivos;
}

// Para lo que se suelta en la zona de arrastre: puede incluir una carpeta.
async function leerArchivosArrastrados(transferencia) {
    // Las entradas se toman antes del primer await: después el navegador vacía la lista.
    const entradas = Array.from(transferencia.items).map(function (elemento) {
        return elemento.webkitGetAsEntry();
    });

    const listaArchivos = [];
    for (const entrada of entradas) {
        if (entrada === null) {
            continue;
        }
        if (entrada.isDirectory) {
            for (const entradaDeCarpeta of await leerEntradasDeCarpeta(entrada)) {
                if (entradaDeCarpeta.isFile) {
                    listaArchivos.push(await obtenerArchivo(entradaDeCarpeta));
                }
            }
        } else {
            listaArchivos.push(await obtenerArchivo(entrada));
        }
    }
    return leerArchivosSeleccionados(listaArchivos);
}

async function leerZip(archivoZip) {
    // fflate se carga desde un CDN: sin internet no está disponible.
    if (typeof fflate === "undefined") {
        throw new Error("No se pudo cargar el lector de .zip. Revisa tu conexión a internet.");
    }

    const bytes = new Uint8Array(await archivoZip.arrayBuffer());
    let contenido;
    try {
        // Solo se descomprimen los CSV que usa la app: un export de años puede pesar mucho.
        contenido = fflate.unzipSync(bytes, {
            filter: function (entradaDelZip) {
                return esArchivoNecesario(obtenerNombreBase(entradaDelZip.name));
            },
        });
    } catch (error) {
        throw new Error("No se pudo abrir el .zip. ¿Es el archivo del export?");
    }

    const archivos = [];
    for (const [ruta, datos] of Object.entries(contenido)) {
        archivos.push({ nombre: obtenerNombreBase(ruta), texto: fflate.strFromU8(datos) });
    }
    return archivos;
}

// Un archivo es necesario si es el CSV de alguna de las métricas que usa la app.
// Así se descartan el resto del export y los archivos ocultos de macOS ("._…").
function esArchivoNecesario(nombre) {
    return Object.values(METRICAS).some(function (metrica) {
        return esArchivoDeMetrica(nombre, metrica);
    });
}

// "carpeta/archivo.csv" -> "archivo.csv"
function obtenerNombreBase(ruta) {
    return ruta.split("/").pop();
}

// La API de carpetas del navegador usa callbacks; estas dos funciones la convierten en promesas.

// readEntries entrega el contenido por partes: se repite hasta recibir una parte vacía.
async function leerEntradasDeCarpeta(carpeta) {
    const lector = carpeta.createReader();
    const entradas = [];
    let parte = await leerParteDeCarpeta(lector);
    while (parte.length > 0) {
        for (const entrada of parte) {
            entradas.push(entrada);
        }
        parte = await leerParteDeCarpeta(lector);
    }
    return entradas;
}

function leerParteDeCarpeta(lector) {
    return new Promise(function (resolver, rechazar) {
        lector.readEntries(resolver, rechazar);
    });
}

function obtenerArchivo(entrada) {
    return new Promise(function (resolver, rechazar) {
        entrada.file(resolver, rechazar);
    });
}
