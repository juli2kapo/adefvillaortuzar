# A de F Villa Ortúzar — Estudio de Baile

Versión estática (HTML/CSS/JS, sin framework ni build) de la página
**Estudio de Baile** de la Asociación de Fomento Villa Ortúzar, portada
desde el sitio original de Wix para alojar en GitHub Pages.

## Estructura

```
adef-villa-ortuzar/
├── index.html              # Inicio
├── clases.html             # Clases
├── estudio-de-baile.html   # Estudio de Baile
├── conciertos.html         # Conciertos (+ Galería de Conciertos)
├── nuestro-espacio.html    # Nuestro Espacio
├── styles.css              # Estilos compartidos: paleta, hovers y transiciones
├── script.js               # Menú móvil + animaciones al hacer scroll
├── images/                 # Imágenes (descargadas del sitio original)
└── README.md
```

Todas las páginas comparten el mismo header, footer, hoja de estilos y
script, y la navegación enlaza entre los archivos `.html` locales (no
redirige al sitio Wix original).

## Ver en local

Abrí `index.html` en el navegador, o serví la carpeta:

```bash
python -m http.server 8000
# luego visitá http://localhost:8000
```

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (por ejemplo `adef-villa-ortuzar`).
2. Subí estos archivos a la rama `main`:
   ```bash
   git remote add origin https://github.com/USUARIO/adef-villa-ortuzar.git
   git push -u origin main
   ```
3. En **Settings → Pages**, elegí *Source: Deploy from a branch*,
   rama `main` y carpeta `/ (root)`. Guardá.
4. En unos minutos el sitio queda en
   `https://USUARIO.github.io/adef-villa-ortuzar/`.

## Notas de la migración

- **Contenido y diseño** reproducidos del sitio original: paleta granate/rosa,
  tipografías Montserrat + Open Sans, cursos mensuales y de verano.
- **Funcionalidades** conservadas: hover de tarjetas (zoom + elevación),
  botones con relleno deslizante, subrayado animado en el menú, menú móvil
  y aparición de secciones al hacer scroll.
- Los enlaces **"Bailá"** y **"Entradas"** abren WhatsApp (`wa.me/91131351262`).
- La barra de navegación enlaza entre las páginas locales del sitio.
  "Galería de Conciertos" apunta a `conciertos.html` (misma página que el
  sitio original).
- El degradado rojo del hero de Inicio se reproduce con CSS (el sitio
  original usa un overlay de color sobre la imagen).
