# Caminatas

Identifica las caminatas que haces cada día y las calorías que quemas en cada una, a partir del export de **Simple Health Export CSV** del iPhone.

Todo se procesa en tu navegador: tus datos de salud no se suben a ningún servidor. La política de seguridad del sitio ni siquiera permite que la página se conecte a uno.

## Cómo usarla

1. En el iPhone, exporta tus datos con **Simple Health Export CSV** y guarda el `.zip` en la app Archivos.
2. Abre la web en Safari y toca **Elegir archivo**.
3. Elige el `.zip`.

Para tenerla como app: en Safari toca **Compartir** y luego **Agregar a pantalla de inicio**.

En la computadora también puedes arrastrar el `.zip`, los archivos `.csv` o la carpeta del export.

## Desarrollo

No hay nada que instalar ni compilar: abre `index.html` con doble clic (hace falta internet para los CDN).

Pruebas (Node 20 o superior, sin paquetes):

```
node pruebas/ejecutar-pruebas.js
```

Netlify corre las mismas pruebas antes de publicar; si alguna falla, no publica.

Las convenciones de código, nombres, estilos y pruebas están en [CLAUDE.md](CLAUDE.md).
