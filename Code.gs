/**
 * ==========================================================================
 * DOCENTECH BACKEND - GOOGLE APPS SCRIPT (Code.gs)
 * ==========================================================================
 * Este script se aloja en Google Apps Script y se ejecuta bajo tu cuenta.
 * Es el encargado de leer tus correos de Gmail, extraer los enlaces a los
 * Google Docs de tus alumnos, consolidar la información en un solo documento
 * de Google Drive y conectarse con Gemini (API) de forma gratuita.
 */

function doPost(e) {
  try {
    // 1. Validación estricta del payload de entrada
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "error",
          message: "No se recibieron datos en la petición."
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Parsing seguro de la configuración enviada desde el Frontend
    const config = JSON.parse(e.postData.contents);
    
    // 3. Orquestación del Core del Negocio (Procesamiento de los TPs)
    const result = processAssignments(config);
    
    // 4. Retorno exitoso estandarizado
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        data: result
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 5. Captura global de excepciones (Graceful Degradation)
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Maneja la petición preflight (OPTIONS) necesaria para la política de CORS de navegadores modernos
 */
function doOptions(e) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(corsHeaders);
}

/**
 * Procesa la recopilación y análisis automatizado de trabajos prácticos
 */
function processAssignments(config) {
  // 1. Buscar los correos electrónicos en Gmail
  // Filtramos por asunto exacto y receptor (para evitar procesar correos ajenos)
  const searchQuery = `subject:"${config.subject}" to:(${config.teacherEmail})`;
  const threads = GmailApp.search(searchQuery);
  const deadlineDate = new Date(config.deadline);
  
  let processedCount = 0;
  let allTextForReport = "";
  let consignaText = "";
  let consignaWarning = null;

  try {
    consignaText = resolveConsignaText(config);
  } catch (e) {
    consignaWarning = e.toString();
    consignaText = "";
  }

  const consignaPromptBlock = buildConsignaPromptBlock(consignaText);

  // 2. Crear Documento de Recopilación (Libro de Trabajos)
  const libroDoc = DocumentApp.create(`Libro Automático de Trabajos - ${config.subject}`);
  const libroBody = libroDoc.getBody();
  
  // Dar formato inicial al Libro de Trabajos
  libroBody.clear();
  const titleParagraph = libroBody.appendParagraph(`Recopilación de Trabajos: ${config.subject}`);
  titleParagraph.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  libroBody.appendParagraph(`Generado automáticamente por DocenTech el ${new Date().toLocaleDateString('es-ES')}`).setItalic(true);
  libroBody.appendParagraph(`Fecha límite establecida: ${deadlineDate.toLocaleDateString('es-ES')}`).setBold(true);
  libroBody.appendHorizontalRule();

  // Procesar cada hilo de correo
  threads.forEach(thread => {
    // Tomamos el último mensaje del hilo (entrega más reciente)
    const messages = thread.getMessages();
    if (messages.length === 0) return;
    
    const msg = messages[messages.length - 1];
    const senderRaw = msg.getFrom();
    const studentEmail = extractEmail(senderRaw);
    const dateSent = msg.getDate();
    const bodyText = msg.getBody();
    const attachments = msg.getAttachments();
    
    let isLate = dateSent > deadlineDate;
    let studentText = "";
    let statusLabel = isLate ? "⚠️ FUERA DE TÉRMINO (Atrasado)" : "✅ Entrega a tiempo";

    // A. Buscar links a Google Docs compartidos por el alumno
    const docUrlRegex = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/;
    const match = bodyText.match(docUrlRegex);
    
    if (match) {
      const docId = match[1];
      try {
        // Intentar abrir y extraer texto del Google Doc compartido
        const studentDoc = DocumentApp.openById(docId);
        studentText = studentDoc.getBody().getText().trim();
      } catch (err) {
        studentText = `[Error de Lectura: El alumno envió el enlace a su Google Doc, pero no otorgó permisos de lectura o edición al correo del docente. Por favor, solicítale permisos para acceder].`;
      }
    }

    // B. Procesar adjuntos Word / PDF si están habilitados
    if (attachments.length > 0) {
      if (!config.allowDocs) {
        studentText += `\n[Alerta de Sistema: El alumno adjuntó archivos físicos (${attachments.length}), pero tu configuración actual tiene bloqueado recibir adjuntos (Solo Google Docs). El texto de estos archivos no pudo recopilarse].`;
      } else {
        // En Google Apps Script nativo, parsear PDF/Word directamente requiere librerías complejas.
        // Damos una alerta amigable sobre la conversión.
        studentText += `\n[Alerta de Sistema: El alumno envió ${attachments.length} archivo(s) adjunto(s). Para extraer el texto de estos Word/PDF, te recomendamos convertirlos a Google Docs directamente haciendo clic derecho sobre el archivo en tu Google Drive].`;
      }
    }

    // Si encontramos texto del alumno o se detectó actividad de entrega, procesar
    if (studentText !== "" || match || attachments.length > 0) {
      processedCount++;
      
      // Agregar al Libro de Trabajos Prácticos
      const studentHeader = libroBody.appendParagraph(`Alumno: ${senderRaw}`);
      studentHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      
      libroBody.appendParagraph(`Fecha de Recepción: ${dateSent.toLocaleString('es-ES')} | Estado: ${statusLabel}`);
      const textSection = libroBody.appendParagraph(studentText || "[El cuerpo del trabajo está vacío o falló su extracción]");
      textSection.setIndentStart(20);
      libroBody.appendHorizontalRule();
      
      // Acumular textos grupales para el reporte pedagógico de IA
      if (studentText && !studentText.includes("[Error de Lectura")) {
        allTextForReport += `--- TRABAJO DE: ${senderRaw} ---\n${studentText}\n\n`;
      }

      // C. Feedback individualizado con Gemini IA
      if (config.autoFeedback && config.geminiKey && studentText && !studentText.includes("[Error de Lectura")) {
        try {
          const promptFeedback = `
            Eres un profesor experto y empático. Escribe un comentario de retroalimentación constructivo, amigable y muy breve (máximo 3 líneas) dirigido directamente al estudiante basándote en su trabajo práctico.

            ${consignaPromptBlock}
            
            TRABAJO DEL ESTUDIANTE:
            "${studentText.substring(0, 1500)}"
            
            Escribe exclusivamente tu comentario pedagógico directo, sin preámbulos ni introducciones.
          `;
          
          const feedbackIA = llamarGemini(config.geminiKey, promptFeedback);
          
          // Escribir el feedback en el Libro de Trabajos también
          const feedbackParaDoc = libroBody.appendParagraph(`🤖 Feedback IA preliminar: "${feedbackIA}"`);
          feedbackParaDoc.setItalic(true);
          feedbackParaDoc.setIndentStart(20);
          
          // Enviar correo automático de recepción con el feedback al alumno
          if (config.autoEmail) {
            const emailSubject = `Recepción TP: ${config.subject}`;
            const emailBody = `Hola,\n\nHemos recibido correctamente tu entrega para "${config.subject}".\n\nEstado de la entrega: ${statusLabel}\nFecha de recepción: ${dateSent.toLocaleString('es-ES')}\n\nAquí tienes un feedback preliminar automatizado:\n"${feedbackIA}"\n\nSaludos,\nTu profesor/a.`;
            
            GmailApp.sendEmail(studentEmail, emailSubject, emailBody);
          }
        } catch (iaError) {
          Logger.log("Error generando feedback IA para " + studentEmail + ": " + iaError.toString());
        }
      } else if (config.autoEmail) {
        // Enviar email de recepción simple sin feedback
        const emailSubject = `Recepción TP: ${config.subject}`;
        const emailBody = `Hola,\n\nHemos recibido correctamente tu entrega para "${config.subject}".\n\nEstado de la entrega: ${statusLabel}\nFecha de recepción: ${dateSent.toLocaleString('es-ES')}\n\nSaludos,\nTu profesor/a.`;
        
        GmailApp.sendEmail(studentEmail, emailSubject, emailBody);
      }
    }
  });

  // ==========================================
  // BLOQUE CRÍTICO: GENERACIÓN DEL REPORTE CON IA (ROBUSTO)
  // ==========================================
  let reporteUrl = "";
  let reporteErrorLog = null;
  
  if (config.teacherReport && config.geminiKey) {
    try {
      if (!allTextForReport || allTextForReport.trim() === "") {
        throw new Error("No se extrajo texto válido de los trabajos de los alumnos para analizar.");
      }

      const promptPedagogico =
        "Actúa como un asesor pedagógico experto. Analiza el siguiente documento que consolida los Trabajos Prácticos de los alumnos bajo el asunto '" +
        config.subject +
        "'. Genera un reporte ejecutivo para el docente que incluya: 1- Errores conceptuales recurrentes encontrados, 2- Alumnos que requieren apoyo urgente, 3- Sugerencias metodológicas para la próxima clase.\n" +
        consignaPromptBlock +
        "\nAquí está el contenido consolidado:\n" +
        allTextForReport;
      
      // 2. Llamada a la API de Gemini (modelos 2.5 / 3.5 con fallback)
      const analisisIA = llamarGemini(config.geminiKey, promptPedagogico);
      
      // 3. Crear el documento físico del reporte exitoso
      const docReporte = DocumentApp.create("Reporte Analítico IA - " + config.subject);
      docReporte.getBody().setText(analisisIA);
      docReporte.saveAndClose();
      
      reporteUrl = docReporte.getUrl();
      
    } catch (errorIA) {
      reporteErrorLog = errorIA.toString();
    }
  }

  return {
    processedCount: processedCount,
    libroUrl: libroDoc.getUrl(),
    reporteUrl: reporteUrl,
    reporteError: reporteErrorLog,
    consignaUsada: !!(consignaText && consignaText.trim()),
    consignaWarning: consignaWarning
  };
}

/** Modelos vigentes (1.5 está dado de baja). Se prueba en orden hasta uno disponible. */
var GEMINI_MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];

/**
 * Llama a la API de Gemini (generateContent) con fallback entre modelos.
 */
function llamarGemini(apiKey, prompt) {
  var lastError = null;

  for (var i = 0; i < GEMINI_MODEL_FALLBACKS.length; i++) {
    try {
      return llamarGeminiConModelo(apiKey, prompt, GEMINI_MODEL_FALLBACKS[i]);
    } catch (err) {
      lastError = err;
      var msg = err.toString();
      var isModelNotFound = msg.indexOf('404') !== -1 || msg.indexOf('NOT_FOUND') !== -1;
      if (!isModelNotFound) {
        throw err;
      }
    }
  }

  throw lastError || new Error('No hay ningún modelo Gemini disponible para tu API Key.');
}

function llamarGeminiConModelo(apiKey, prompt, modelId) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent?key=' + apiKey;
  var payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var responseCode = response.getResponseCode();
  var contentText = response.getContentText();
  var json;

  try {
    json = JSON.parse(contentText);
  } catch (parseErr) {
    throw new Error('Respuesta no válida de Gemini (' + modelId + '): ' + contentText);
  }

  if (responseCode !== 200) {
    throw new Error('API de Gemini [' + modelId + '] error (' + responseCode + '): ' + contentText);
  }

  try {
    return json.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error('Estructura de respuesta inválida de Gemini (' + modelId + '): ' + contentText);
  }
}

/**
 * Utilidad para extraer únicamente la dirección de correo limpia
 * Ej: "Juan Pérez <juan.perez@gmail.com>" -> "juan.perez@gmail.com"
 */
function extractEmail(string) {
  const match = string.match(/<(.+)>/);
  return match ? match[1] : string;
}

function resolveConsignaText(config) {
  var parts = [];

  if (config && config.consignaDocUrl) {
    var url = String(config.consignaDocUrl).trim();
    if (url) {
      parts.push(extractTextFromGoogleDocUrl(url));
    }
  }

  if (config && config.consignaText) {
    var raw = String(config.consignaText).trim();
    if (raw) parts.push(raw);
  }

  return parts.join('\n\n').trim();
}

function extractTextFromGoogleDocUrl(url) {
  var match = String(url).match(/https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('URL de consigna inválida. Debe ser un Google Doc (docs.google.com/document/d/...).');
  }

  var docId = match[1];
  var doc = DocumentApp.openById(docId);
  return doc.getBody().getText().trim();
}

function buildConsignaPromptBlock(consignaText) {
  var txt = String(consignaText || '').trim();
  if (!txt) return '';

  return (
    '\n\nCONSIGNA OFICIAL DEL TRABAJO:\n"""' +
    txt.substring(0, 8000) +
    '"""\nEvalúa cada entrega en relación directa con esta consigna.\n'
  );
}
