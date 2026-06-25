# A de F Villa Ortúzar — Estudio de Baile

Versión estática (HTML/CSS/JS, sin framework ni build) de la página
**Estudio de Baile** de la Asociación de Fomento Villa Ortúzar, portada
desde el sitio original de Wix para alojar en GitHub Pages.

## Estructura

```
adef-villa-ortuzar/
├── index.html        # Página principal
├── styles.css        # Estilos, paleta, hovers y transiciones
├── script.js         # Menú móvil + animaciones al hacer scroll
├── images/           # Imágenes (descargadas del sitio original)
│   ├── heels-arte-fluido.jpg
│   ├── ballet-tela-rosa.jpg
│   └── ballet-bokeh.jpg
└── README.md
```

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
- Los enlaces **"Bailá"** abren WhatsApp (`wa.me/91131351262`).
- Los enlaces del menú hacia otras secciones (Inicio, Clases, Conciertos,
  Nuestro Espacio, Galería) apuntan por ahora al sitio Wix original;
  reemplazalos cuando portes esas páginas.
