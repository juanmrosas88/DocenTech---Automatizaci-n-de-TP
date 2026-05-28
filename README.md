# DocenTech - Automatización de Trabajos Prácticos

## Descripción del Proyecto
DocenTech es un sistema web de automatización pedagógica diseñado para docentes. Combina una interfaz moderna y privada con un backend en Google Apps Script para procesar entregas de trabajos prácticos desde Gmail, generar libros de trabajo consolidados en Google Drive y crear reportes analíticos usando Gemini IA.

Este repositorio demuestra habilidades completas en:
- Desarrollo frontend responsivo con HTML5, CSS y JavaScript moderno.
- Diseño UI/UX con foco en claridad, accesibilidad y experiencia de usuario.
- Integración de servicios de Google: Gmail, Google Drive, Google Docs y Apps Script.
- Orquestación de automatizaciones educativas y análisis asistido por IA.
- Manejo de configuración local, simulación de flujo y persistencia segura en navegador.

---

## Estructura del Proyecto

- `index.html` — Interfaz principal de la aplicación.
- `style.css` — Estilos del sistema con diseño glassmorphism y estética profesional.
- `app.js` — Lógica cliente, simulador local, control de UI y llamadas al backend.
- `Code.gs` — Script de Google Apps Script que actúa como backend real.
- `README.md` — Documentación del proyecto.

---

## Funcionalidades clave

### Frontend
- Panel de ayuda desplegable con instrucciones paso a paso.
- Formulario de configuración para correo receptor, asunto, fecha límite, llaves Gemini y URL de Apps Script.
- Dashboard de métricas locales y registro de historial de ejecuciones.
- Botón de simulación local que permite probar el sistema sin configurar Apps Script.
- Feedback visual con consola de logs y barra de progreso.
- Modal interactivo para mostrar y copiar el código `Code.gs` directamente al portapapeles.

### Backend / Google Apps Script
- Recepción de solicitudes HTTP POST desde el frontend.
- Soporte CORS para integrarse con la aplicación web.
- Búsqueda de correos en Gmail según asunto y receptor.
- Lectura de textos desde enlaces compartidos de Google Docs.
- Creación de documentos de trabajo y reportes en Google Drive.
- Envío opcional de feedback automático por email.
- Integración con Gemini (2.5 Flash y respaldos) para feedback individual y reporte grupal.

### Privacidad y seguridad
- La aplicación no guarda datos de estudiantes en servidores externos.
- Los datos sensibles se procesan en el navegador y en la cuenta de Google del usuario.
- `localStorage` solo se usa para preferencias y estadísticas locales.
- El código `Code.gs` se puede copiar desde la app y usar directamente en Google Apps Script.

---

## Cómo usar el proyecto

### 1. Abrir la aplicación localmente
1. Abre `index.html` en tu navegador.
2. Completa el formulario con tu correo, asunto, fecha límite y llave de Gemini.
3. Si no tienes la URL de Apps Script, haz clic en "Probar con Simulación Local".
4. Si ya tienes la URL, pégala en el campo correspondiente y haz clic en "Iniciar Procesamiento".

### 2. Crear el backend en Google Apps Script
1. Entra a <https://script.google.com> con tu cuenta de Google.
2. Crea un nuevo proyecto.
3. Pega el código de `Code.gs` en el editor.
4. Guarda el proyecto.
5. Implementa como "Aplicación Web" con:
   - Ejecutar como: Tu cuenta.
   - Quién tiene acceso: Cualquier persona.
6. Copia la URL generada y pégala en el campo "URL de tu Aplicación Web de Google Apps Script".

### 3. Configuración de Gemini IA
1. Ve a <https://aistudio.google.com/app/apikey>.
2. Genera tu API Key gratuita.
3. Pega la llave en el campo `Gemini API Key`.
4. Activa o desactiva las opciones de feedback, envío de email y reporte docente según necesites.

---

## Tecnologías y habilidades demostradas

- HTML5 semántico y estructura accesible.
- CSS moderno con efectos glassmorphism, gradientes y animaciones fluidas.
- JavaScript ES6+ para DOM, eventos, localStorage y fetch.
- Arquitectura de UI con separación clara de componentes y estado.
- Experiencia en diseño de producto educativo y flujo de onboarding.
- Integración de APIs de Google y automatizaciones sin backend privado.
- Manejo de CORS y validaciones de requests en Google Apps Script.
- Escritura de documentación técnica profesional y orientada al usuario.

---

## Casos de uso

- Docentes que reciben trabajos prácticos por correo y necesitan organizar entregas.
- Profesores que desean automatizar la extracción de contenido desde Google Docs.
- Equipos educativos que quieren generar reportes de desempeño con IA.
- Proyectos de automatización pedagógica que requieren privacidad y uso de recursos propios.

---

## Qué incluye este sistema

- Interfaz interactiva para configurar y ejecutar el proceso.
- Guía de ayuda integrada en la propia aplicación.
- Simulación local para demostraciones sin configurar Google Apps Script.
- Control visual de estado y errores.
- Código listo para desplegar en Google Apps Script.
- Soporte para payload real y flujo de producción.

---

## Recomendaciones para desplegar en producción

- Usa una cuenta de Google con Gmail y Google Drive activos.
- Verifica permisos de lectura de Google Docs para los alumnos.
- Ajusta el alcance de acceso en Apps Script según tus necesidades de seguridad.
- Prueba primero en modo simulación antes de ejecutar con correos reales.

---

## Conclusión
Este proyecto es un ejemplo completo de una automatización educativa moderna y práctica. Está diseñado para demostrar habilidad técnica en frontend, integración con Google, desarrollo de servicios serverless y experiencia de usuario dirigida a docentes.

Si quieres, también puedo generar una versión de este README en inglés y con marca personal más orientada a portafolio profesional.

