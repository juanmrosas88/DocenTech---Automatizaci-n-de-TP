/**
 * ==========================================================================
 * DOCENTECH BACKEND - GOOGLE APPS SCRIPT (Code.gs)
 * ==========================================================================
 * Este script se aloja en Google Apps Script y se ejecuta bajo tu cuenta.
 * Es el encargado de leer tus correos de Gmail, extraer los enlaces a los
 * Google Docs de tus alumnos, consolidar la información en un solo documento
 * de Google Drive y conectarse con Gemini 1.5 Flash de forma gratuita.
 */

/**
 * Función principal que procesa la petición HTTP POST enviada desde el frontend
 */
function doPost(e) {
  // CORS Header para permitir llamadas externas
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  
  try {
    // Validar contenido recibido
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No se recibieron datos en la petición."
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(corsHeaders);
    }

    const config = JSON.parse(e.postData.contents);
    
    // Ejecutar procesamiento principal
    const result = processAssignments(config);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: result
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(corsHeaders);
    
  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Error interno del servidor de Google: " + error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(corsHeaders);
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

      // C. Feedback individualizado usando la Inteligencia Artificial (Gemini 1.5 Flash)
      if (config.autoFeedback && config.geminiKey && studentText && !studentText.includes("[Error de Lectura")) {
        try {
          const promptFeedback = `
            Eres un profesor experto y empático. Escribe un comentario de retroalimentación constructivo, amigable y muy breve (máximo 3 líneas) dirigido directamente al estudiante basándote en su trabajo práctico.
            
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

  // 3. Generar el Reporte Docente IA Completo
  let reporteUrl = "";
  if (config.teacherReport && config.geminiKey && processedCount > 0 && allTextForReport !== "") {
    try {
      const promptReporte = `
        Actúa como un experto analista pedagógico de educación. Analiza los siguientes textos correspondientes a los trabajos prácticos entregados por el grupo de alumnos para la materia/tema "${config.subject}".
        
        TRABAJOS DEL GRUPO:
        ${allTextForReport.substring(0, 25000)}
        
        Genera un reporte estructurado y profesional que ayude al docente a entender el desempeño del grupo. Tu respuesta debe redactarse en español y contener las siguientes secciones estructuradas con títulos claros:
        
        1. RESUMEN PEDAGÓGICO GENERAL: Breve análisis cualitativo del nivel de comprensión general del grupo.
        2. ANÁLISIS DE CONCEPTOS COMPRENDIDOS: Identifica las ideas fuertes y bien asimiladas por la mayoría de los estudiantes.
        3. DIFICULTADES Y ERRORES FRECUENTES: Señala las confusiones conceptuales, vacíos o malentendidos recurrentes en los trabajos.
        4. RECOMENDACIONES Y ACCIONABLES PARA LA CLASE: Brinda 3 sugerencias específicas sobre qué temas debería reforzar el docente en la próxima clase o actividades futuras.
        5. LISTADO CONCEPTUAL DE COMPRENSIÓN: Un breve ranking de los temas con mayor nivel de acierto frente a los de mayor confusión.
        
        Utiliza un lenguaje profesional, constructivo y claro.
      `;
      
      const analisisIA = llamarGemini(config.geminiKey, promptReporte);
      
      // Crear el documento de Reporte en Drive
      const reporteDoc = DocumentApp.create(`Reporte IA Analítico - ${config.subject}`);
      const reporteBody = reporteDoc.getBody();
      reporteBody.clear();
      
      reporteBody.appendParagraph(`Reporte Pedagógico de IA: ${config.subject}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      reporteBody.appendParagraph(`Generado automáticamente por DocenTech el ${new Date().toLocaleDateString('es-ES')}`).setItalic(true);
      reporteBody.appendParagraph(`Este reporte consolida el análisis cualitativo del grupo de estudiantes basado en ${processedCount} trabajos procesados exitosamente.`).setBold(true);
      reporteBody.appendHorizontalRule();
      
      reporteBody.appendParagraph(analisisIA);
      
      reporteUrl = reporteDoc.getUrl();
    } catch (reporteError) {
      Logger.log("Error generando reporte general con Gemini: " + reporteError.toString());
    }
  }

  // Devolver resultados consolidados
  return {
    processedCount: processedCount,
    libroUrl: libroDoc.getUrl(),
    reporteUrl: reporteUrl
  };
}

/**
 * Conexión directa y simplificada con la API oficial de Gemini 1.5 Flash
 */
function llamarGemini(apiKey, prompt) {
  // Endpoint de Gemini 1.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Estructura del cuerpo de petición requerido por la API de Google
  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const contentText = response.getContentText();
  const json = JSON.parse(contentText);
  
  if (responseCode !== 200) {
    throw new Error(`API de Gemini retornó error (Código ${responseCode}): ${contentText}`);
  }
  
  try {
    return json.candidates[0].content.parts[0].text;
  } catch (e) {
    throw new Error("Estructura de respuesta inválida de Gemini: " + contentText);
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
