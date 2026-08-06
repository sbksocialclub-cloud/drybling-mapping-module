# DRYBLING — Mapping Module

Módulo audiovisual cinematográfico independiente, diseñado para integrarse en la web oficial del campeonato **DRYBLING**.

## Descripción

Experiencia web audiovisual autocontenida basada en Canvas 2D API y Web Audio API:

- Pantalla inicial con botón «ENTRAR».
- Audio procedural activado por gesto del usuario (cumple la política de autoplay de los navegadores).
- Emblema central, barrido de luz y reacción reactiva a graves, medios y agudos.
- Grietas luminosas, pared dividida que se abre y efecto de cámara que avanza.
- Escenario interior con túnel de perspectiva, partículas y anillos reactivos.
- Sin modelos 3D, imágenes ni archivos de audio externos.
- Optimizado para móvil, tablet y escritorio.

## Tecnologías

| Tecnología       | Uso                                              |
|------------------|--------------------------------------------------|
| Canvas 2D API    | Renderizado cinematográfico en tiempo real       |
| Web Audio API    | Síntesis procedural + análisis de espectro       |
| Vite 5           | Bundler y servidor de desarrollo                 |
| JavaScript ESM   | Módulos nativos sin frameworks                   |

## Requisitos

- Node.js 18 o superior.
- npm.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` en el navegador.

## Build de producción

```bash
npm run build
npm run preview
```

La carpeta `dist/` contiene la versión optimizada lista para desplegar.

## Despliegue en Vercel

El proyecto incluye `vercel.json` con la configuración de despliegue. Conecta el repositorio GitHub en Vercel y el despliegue es automático.

## Integración como módulo

Este proyecto es un módulo independiente. Para integrarlo en la web oficial de DRYBLING:

1. Importa el módulo como un `<iframe>` o copia los archivos `src/app.js` y `src/audioManager.js` en el proyecto principal.
2. El módulo no depende de ningún framework externo.
3. Para sustituir el audio procedural por una pista real, reemplaza la lógica en `src/audioManager.js` manteniendo el mismo `AnalyserNode` para la sincronización audiovisual.

## Estructura del proyecto

```
drybling-mapping-module/
├── src/
│   ├── app.js           # Motor de renderizado Canvas 2D
│   ├── audioManager.js  # Motor de audio procedural Web Audio API
│   └── styles.css       # Estilos responsivos
├── public/
│   └── assets/          # Recursos estáticos (vacío en esta versión)
├── index.html           # Punto de entrada HTML
├── vite.config.js       # Configuración de Vite
├── vercel.json          # Configuración de despliegue Vercel
└── package.json         # Dependencias y scripts
```
