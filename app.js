// ==========================================================================
// DOCENTECH WORKSPACE - CLIENT LOGIC & SIMULATOR
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Config Form
    const form = document.getElementById('configForm');
    const startBtn = document.getElementById('startBtn');
    const simulationBtn = document.getElementById('simulationBtn');
    const appsScriptUrlInput = document.getElementById('appsScriptUrl');
    const teacherEmailInput = document.getElementById('teacherEmail');
    const subjectInput = document.getElementById('subject');
    const deadlineInput = document.getElementById('deadline');
    const allowDocsInput = document.getElementById('allowDocs');
    const autoFeedbackInput = document.getElementById('autoFeedback');
    const autoEmailInput = document.getElementById('autoEmail');
    const teacherReportInput = document.getElementById('teacherReport');
    const geminiKeyInput = document.getElementById('geminiKey');
    const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');

    // DOM Elements - Console & Logs
    const consoleUI = document.getElementById('executionConsole');
    const logsContainer = document.getElementById('logsContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressStepName = document.getElementById('progressStepName');
    const closeConsoleBtn = document.getElementById('closeConsoleBtn');
    const consoleSpinner = document.getElementById('consoleSpinner');

    // DOM Elements - Help Drawer
    const openHelpBtn = document.getElementById('openHelpBtn');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const helpDrawer = document.getElementById('helpDrawer');
    const helpOverlay = document.getElementById('helpOverlay');

    // DOM Elements - Local Usage Dashboard
    const metricExecutions = document.getElementById('metricExecutions');
    const metricProcessed = document.getElementById('metricProcessed');
    const metricEmails = document.getElementById('metricEmails');
    const metricPunctuality = document.getElementById('metricPunctuality');
    const historyList = document.getElementById('historyList');
    const noHistoryRow = document.getElementById('noHistoryRow');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // State Variables
    let isProcessing = false;

    // Code.gs modal
    const codeGsDialog = document.getElementById('codeGsDialog');
    const codeGsSource = document.getElementById('codeGsSource');
    if (codeGsSource && window.DOCENTECH_CODE_GS) {
        codeGsSource.value = window.DOCENTECH_CODE_GS;
    }

    loadSavedSettings();
    renderDashboard();
    setupEventListeners();

    // ==========================================================================
    // Event Listeners Setup
    // ==========================================================================
    function setupEventListeners() {
        // Toggle Gemini Key Visibility
        toggleKeyVisibilityBtn.addEventListener('click', () => {
            if (geminiKeyInput.type === 'password') {
                geminiKeyInput.type = 'text';
                toggleKeyVisibilityBtn.innerText = '🙈';
            } else {
                geminiKeyInput.type = 'password';
                toggleKeyVisibilityBtn.innerText = '👁️';
            }
        });

        // Open & Close Help Drawer
        openHelpBtn.addEventListener('click', openHelp);
        closeHelpBtn.addEventListener('click', closeHelp);
        helpOverlay.addEventListener('click', closeHelp);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !codeGsDialog?.open) {
                closeHelp();
            }
        });

        // Form Submit (Production run to Google Apps Script or auto-sim fallback)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isProcessing) return;

            saveSettings();
            const appsScriptUrl = appsScriptUrlInput.value.trim();

            if (appsScriptUrl === "") {
                // If no URL is set, notify and execute simulation
                alert("No has configurado una URL de Google Apps Script. Iniciaremos el 'Modo Simulación' con datos educativos locales y simulados para que pruebes la interfaz.");
                runLocalSimulation();
            } else {
                // If URL is set, run real integration
                runProductionRequest(appsScriptUrl);
            }
        });

        // Explicit Simulation Button Click
        simulationBtn.addEventListener('click', () => {
            if (isProcessing) return;
            saveSettings();
            runLocalSimulation();
        });

        // Clear History Logs
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm("¿Estás seguro de que deseas borrar por completo tu historial de estadísticas local? Esta acción no se puede deshacer.")) {
                localStorage.removeItem('docentech_history');
                renderDashboard();
            }
        });

        // Close Console Card manually
        closeConsoleBtn.addEventListener('click', () => {
            if (isProcessing) {
                if (!confirm("El procesamiento está activo. ¿Estás seguro de cerrar la consola? Esto no cancelará la ejecución en segundo plano.")) {
                    return;
                }
            }
            consoleUI.classList.add('hidden');
        });

        const openCodeGsBtn = document.getElementById('openCodeGsBtn');
        const closeCodeGsModalBtn = document.getElementById('closeCodeGsModal');
        const copyCodeBtn = document.getElementById('copyCodeBtn');

        openCodeGsBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            codeGsDialog?.showModal();
        });

        closeCodeGsModalBtn?.addEventListener('click', () => codeGsDialog?.close());

        copyCodeBtn?.addEventListener('click', async () => {
            const text = codeGsSource?.value || window.DOCENTECH_CODE_GS || '';
            if (!text) {
                alert('No hay código para copiar.');
                return;
            }
            try {
                await navigator.clipboard.writeText(text);
                const label = copyCodeBtn.textContent;
                copyCodeBtn.textContent = '¡Copiado!';
                copyCodeBtn.classList.add('copied');
                setTimeout(() => {
                    copyCodeBtn.textContent = label;
                    copyCodeBtn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                codeGsSource?.select();
                alert('Seleccioná el texto y usá Ctrl+C para copiar.');
            }
        });
    }

    function getFormConfig() {
        return {
            geminiKey: geminiKeyInput.value,
            teacherEmail: teacherEmailInput.value,
            subject: subjectInput.value,
            deadline: deadlineInput.value,
            allowDocs: allowDocsInput.checked,
            autoFeedback: autoFeedbackInput.checked,
            autoEmail: autoEmailInput.checked,
            teacherReport: teacherReportInput.checked
        };
    }

    // ==========================================================================
    // Help Drawer Control (Heurística #10 de Nielsen)
    // ==========================================================================
    function openHelp() {
        helpDrawer.classList.add('open');
        helpOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Lock background scroll
    }

    function closeHelp() {
        helpDrawer.classList.remove('open');
        helpOverlay.classList.remove('open');
        document.body.style.overflow = 'auto'; // Restore background scroll
    }

    // ==========================================================================
    // Local Storage - Persistencia de Configuración
    // ==========================================================================
    function saveSettings() {
        const config = {
            teacherEmail: teacherEmailInput.value,
            subject: subjectInput.value,
            deadline: deadlineInput.value,
            allowDocs: allowDocsInput.checked,
            autoFeedback: autoFeedbackInput.checked,
            autoEmail: autoEmailInput.checked,
            teacherReport: teacherReportInput.checked,
            geminiKey: geminiKeyInput.value,
            appsScriptUrl: appsScriptUrlInput.value
        };
        localStorage.setItem('docentech_settings', JSON.stringify(config));
    }

    function loadSavedSettings() {
        const saved = localStorage.getItem('docentech_settings');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                teacherEmailInput.value = config.teacherEmail || "";
                subjectInput.value = config.subject || "";
                deadlineInput.value = config.deadline || "";
                allowDocsInput.checked = config.allowDocs !== false;
                autoFeedbackInput.checked = config.autoFeedback !== false;
                autoEmailInput.checked = config.autoEmail !== false;
                teacherReportInput.checked = config.teacherReport !== false;
                geminiKeyInput.value = config.geminiKey || "";
                appsScriptUrlInput.value = config.appsScriptUrl || "";
            } catch (err) {
                console.error("Error loading saved settings:", err);
            }
        } else {
            // Set default date as one week from today
            const oneWeekLater = new Date();
            oneWeekLater.setDate(oneWeekLater.getDate() + 7);
            const dateStr = oneWeekLater.toISOString().split('T')[0];
            deadlineInput.value = dateStr;
        }
    }

    // ==========================================================================
    // Usage Dashboard System (Private & Local Telemetry)
    // ==========================================================================
    function getHistory() {
        const historyData = localStorage.getItem('docentech_history');
        if (historyData) {
            try {
                return JSON.parse(historyData);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    function saveHistoryRecord(record) {
        const history = getHistory();
        history.unshift(record); // Add to beginning
        localStorage.setItem('docentech_history', JSON.stringify(history));
        renderDashboard();
    }

    function renderDashboard() {
        const history = getHistory();

        // Calculate Metrics
        const totalExecutions = history.length;
        let totalProcessed = 0;
        let totalEmails = 0;
        let punctualCount = 0;
        let totalDeliveriesCheckedForPunctuality = 0;

        history.forEach(run => {
            if (run.status === 'Éxito') {
                totalProcessed += (run.processedCount || 0);
                totalEmails += (run.emailsSent || 0);

                if (run.deliveries) {
                    run.deliveries.forEach(del => {
                        totalDeliveriesCheckedForPunctuality++;
                        if (del.punctual) punctualCount++;
                    });
                }
            }
        });

        const punctualityRate = totalDeliveriesCheckedForPunctuality > 0
            ? Math.round((punctualCount / totalDeliveriesCheckedForPunctuality) * 100)
            : 0;

        // Render Metric Values
        metricExecutions.innerText = totalExecutions;
        metricProcessed.innerText = totalProcessed;
        metricEmails.innerText = totalEmails;
        metricPunctuality.innerText = `${punctualityRate}%`;

        // Render Table List
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.appendChild(noHistoryRow);
            return;
        }

        history.forEach(run => {
            const tr = document.createElement('tr');

            const tdDate = document.createElement('td');
            tdDate.innerText = new Date(run.timestamp).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            const tdSubject = document.createElement('td');
            tdSubject.innerText = run.subject;

            const tdMode = document.createElement('td');
            const modeBadge = document.createElement('span');
            modeBadge.className = `badge-mode ${run.mode.toLowerCase()}`;
            modeBadge.innerText = run.mode;
            tdMode.appendChild(modeBadge);

            const tdCount = document.createElement('td');
            tdCount.innerText = run.status === 'Éxito' ? `${run.processedCount} trabajos` : '0';

            const tdDocs = document.createElement('td');
            if (run.status === 'Éxito') {
                const linksContainer = document.createElement('div');
                linksContainer.style.display = 'flex';
                linksContainer.style.flexDirection = 'column';
                linksContainer.style.gap = '0.2rem';

                const aLibro = document.createElement('a');
                aLibro.href = run.libroUrl;
                aLibro.target = '_blank';
                aLibro.className = 'link-doc';
                aLibro.innerText = '📁 Libro de TPs';
                linksContainer.appendChild(aLibro);

                if (isHttpUrl(run.reporteUrl)) {
                    const aReporte = document.createElement('a');
                    aReporte.href = run.reporteUrl;
                    aReporte.target = '_blank';
                    aReporte.className = 'link-doc';
                    aReporte.innerText = '📊 Reporte IA';
                    linksContainer.appendChild(aReporte);
                }
                tdDocs.appendChild(linksContainer);
            } else {
                tdDocs.innerText = '-';
            }

            const tdStatus = document.createElement('td');
            const statusBadge = document.createElement('span');
            statusBadge.className = `badge-status ${run.status === 'Éxito' ? 'exito' : 'fallo'}`;
            statusBadge.innerText = run.status;
            tdStatus.appendChild(statusBadge);

            tr.appendChild(tdDate);
            tr.appendChild(tdSubject);
            tr.appendChild(tdMode);
            tr.appendChild(tdCount);
            tr.appendChild(tdDocs);
            tr.appendChild(tdStatus);

            historyList.appendChild(tr);
        });
    }

    // ==========================================================================
    // Real Production Request to Google Apps Script
    // ==========================================================================
    async function runProductionRequest(url) {
        setUIStateProcessing(true);
        clearLogs();
        addLog("Iniciando conexión segura con tu Google Apps Script...", "system");

        const config = getFormConfig();

        // UI progress animation
        let progressVal = 10;
        progressBar.style.width = `${progressVal}%`;
        progressPercentage.innerText = `${progressVal}%`;
        progressStepName.innerText = "Buscando entregas en tu Gmail...";
        addLog(`Escaneando correos con destinatario: "${config.teacherEmail}" y asunto: "${config.subject}"`);

        const progressInterval = setInterval(() => {
            if (progressVal < 80) {
                progressVal += Math.floor(Math.random() * 5) + 2;
                progressBar.style.width = `${progressVal}%`;
                progressPercentage.innerText = `${progressVal}%`;
                if (progressVal > 40 && progressVal < 60) {
                    progressStepName.innerText = "Extrayendo textos y procesando adjuntos...";
                } else if (progressVal >= 60) {
                    progressStepName.innerText = "Llamando a Gemini 1.5 Flash (Análisis de IA)...";
                }
            }
        }, 1200);

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(config),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8' // Avoid CORS preflight OPTIONS in GAS
                }
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error(`Código de estado HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                progressBar.style.width = "100%";
                progressPercentage.innerText = "100%";
                progressStepName.innerText = "Procesamiento finalizado";

                addLog(">> Conexión finalizada con éxito.", "success");
                addLog(`Trabajos prácticos procesados con éxito: ${result.data.processedCount}`, "success");
                addLog(`Enlace al Libro de Trabajos Consolidados: ${result.data.libroUrl}`, "success");
                logReporteResult(result.data, config);

                const emailsSentCount = config.autoEmail && config.autoFeedback ? result.data.processedCount : 0;

                saveHistoryRecord({
                    timestamp: new Date().getTime(),
                    subject: config.subject,
                    mode: 'Producción',
                    processedCount: result.data.processedCount,
                    emailsSent: emailsSentCount,
                    libroUrl: result.data.libroUrl,
                    reporteUrl: isHttpUrl(result.data.reporteUrl) ? result.data.reporteUrl : '',
                    reporteError: result.data.reporteError || '',
                    status: 'Éxito',
                    deliveries: Array.from({ length: result.data.processedCount }, () => ({ punctual: true })) // assume punctual for simple stats
                });

            } else {
                progressBar.style.width = "100%";
                progressBar.style.backgroundColor = "#ef4444";
                progressPercentage.innerText = "Error";
                progressStepName.innerText = "Error en el servidor";
                addLog(`Error retornado por Google Apps Script: ${result.message}`, "error");

                saveHistoryRecord({
                    timestamp: new Date().getTime(),
                    subject: config.subject,
                    mode: 'Producción',
                    processedCount: 0,
                    emailsSent: 0,
                    status: 'Fallo'
                });
            }

        } catch (error) {
            clearInterval(progressInterval);
            progressBar.style.width = "100%";
            progressBar.style.backgroundColor = "#ef4444";
            progressPercentage.innerText = "Error";
            progressStepName.innerText = "Fallo de conexión";

            addLog(`Error de Red/Conexión: ${error.message}`, "error");
            addLog("Por favor, asegúrate de haber copiado la URL correcta de Apps Script y haberla publicado como 'Aplicación Web' accesible para 'Cualquier persona'.", "system");

            saveHistoryRecord({
                timestamp: new Date().getTime(),
                subject: config.subject,
                mode: 'Producción',
                processedCount: 0,
                emailsSent: 0,
                status: 'Fallo'
            });
        } finally {
            setUIStateProcessing(false);
        }
    }

    // ==========================================================================
    // Advanced Local Simulator Pipeline (Edu-Demo for teachers)
    // ==========================================================================
    function runLocalSimulation() {
        setUIStateProcessing(true);
        clearLogs();
        addLog("⚙️ Iniciando modo simulación educativa local...", "system");

        const base = getFormConfig();
        const config = {
            ...base,
            teacherEmail: base.teacherEmail || "profesor.ejemplo@escuela.edu",
            subject: base.subject || "TP1 Revolucion de Mayo",
            hasGemini: base.geminiKey.trim() !== ""
        };

        // Animated Sequence Timings
        let step = 0;
        progressBar.style.width = "0%";
        progressPercentage.innerText = "0%";

        const steps = [
            {
                pct: 10,
                name: "Conectando con Gmail API...",
                log: `Conectándose al Buzón de Correo de: ${config.teacherEmail}...`,
                type: "system"
            },
            {
                pct: 20,
                name: "Escaneando correos...",
                log: `Buscando en Gmail hilos con asunto: "[${config.subject}]"...`,
                type: "normal"
            },
            {
                pct: 35,
                name: "Entregas detectadas...",
                log: `¡Se encontraron 5 correos con entregas estudiantiles de "${config.subject}"!`,
                type: "success"
            },
            {
                pct: 50,
                name: "Consolidando textos de alumnos...",
                log: "Iniciando compilación en documento único: 'Libro de Trabajos Prácticos'...",
                type: "system"
            },
            // Student processing steps (loops inside the interval logic)
            { pct: 55, name: "Procesando: Juan Manuel Pérez...", log: "Extrayendo Google Doc de Juan Manuel Pérez... ✅ Entrega a tiempo. Texto extraído con éxito (112 palabras).", type: "normal" },
            { pct: 60, name: "Procesando: Lucía Fernández...", log: "Extrayendo Google Doc de Lucía Fernández... ✅ Entrega a tiempo. Texto extraído con éxito (98 palabras).", type: "normal" },
            { pct: 65, name: "Procesando: Martín Gómez...", log: "Extrayendo Google Doc de Martín Gómez... ⚠️ FUERA DE TÉRMINO (Entrega atrasada). Texto extraído con éxito (64 palabras).", type: "normal" },
            { pct: 70, name: "Procesando: Sofía Rodríguez...", log: "Extrayendo Google Doc de Sofía Rodríguez... ✅ Entrega a tiempo. Texto extraído con éxito (125 palabras).", type: "normal" },
            { pct: 75, name: "Procesando: Mateo Bianchi...", log: "Extrayendo enlace de Mateo Bianchi... ❌ Error de lectura: Por favor, cambia los permisos de tu Google Doc.", type: "error" },
            // IA Analysis
            {
                pct: 85,
                name: "Consultando con la Inteligencia Artificial...",
                log: config.hasGemini
                    ? "🤖 Conexión establecida con Gemini 1.5 Flash usando tu API Key propia."
                    : "🤖 Iniciando análisis heurístico con simulación de IA (Gemini gratuito sin clave)...",
                type: "ai"
            },
            {
                pct: 90,
                name: "Generando reportes...",
                log: "IA analizando textos grupales... Detectando palabras clave frecuentes: 'Primera Junta, Cabildo Abierto, Cisneros'. Creando Reporte Docente.",
                type: "ai"
            },
            {
                pct: 95,
                name: "Enviando notificaciones...",
                log: config.autoEmail && config.autoFeedback
                    ? "✉️ Emails de feedback pedagógico individualizados y automáticos enviados por Gmail a los alumnos."
                    : "⚙️ Los correos automáticos están desactivados en tu configuración.",
                type: "system"
            },
            {
                pct: 100,
                name: "Finalizado",
                log: "🎉 ¡Simulación completada con éxito! Se han generado tus documentos simulados.",
                type: "success"
            }
        ];

        const simInterval = setInterval(() => {
            if (step < steps.length) {
                const curStep = steps[step];
                progressBar.style.width = `${curStep.pct}%`;
                progressPercentage.innerText = `${curStep.pct}%`;
                progressStepName.innerText = curStep.name;
                addLog(curStep.log, curStep.type);

                // Sub-logs for IA feedback simulation
                if (curStep.pct === 85 && config.autoFeedback) {
                    setTimeout(() => {
                        addLog("🤖 [IA] Juan Manuel Pérez -> Comentario: 'Excelente trabajo, Juan. Mencionas muy bien el rol de la Primera Junta y su impacto inmediato...'", "ai");
                        addLog("🤖 [IA] Lucía Fernández -> Comentario: 'Muy buen análisis de las causas externas e internas. Logras estructurar con claridad los dos planos...'", "ai");
                        addLog("🤖 [IA] Martín Gómez -> Comentario: 'Tu TP es correcto en los miembros nombrados, pero te sugiero extender la redacción de sus biografías...'", "ai");
                        addLog("🤖 [IA] Sofía Rodríguez -> Comentario: '¡Brillante! Identificas la metáfora de la Máscara de Fernando VII con gran criterio histórico...'", "ai");
                    }, 500);
                }

                step++;
            } else {
                clearInterval(simInterval);
                setUIStateProcessing(false);

                // Display interactive demo links at the end
                const dummyLibroUrl = "https://docs.google.com/document/d/1XexampleLibroTPsDemoDoc/edit";
                const dummyReporteUrl = "https://docs.google.com/document/d/1XexampleReporteIADemoDoc/edit";

                addLog(` >> Libro de Trabajos Consolidados (Simulado): ${dummyLibroUrl}`, "success");
                if (config.teacherReport) {
                    addLog(` >> Reporte de Análisis Grupal de IA (Simulado): ${dummyReporteUrl}`, "success");
                }

                // Add simulated run details to usage history
                saveHistoryRecord({
                    timestamp: new Date().getTime(),
                    subject: config.subject,
                    mode: 'Simulado',
                    processedCount: 4,
                    emailsSent: config.autoEmail && config.autoFeedback ? 4 : 0,
                    libroUrl: dummyLibroUrl,
                    reporteUrl: config.teacherReport ? dummyReporteUrl : '',
                    status: 'Éxito',
                    deliveries: [
                        { punctual: true },
                        { punctual: true },
                        { punctual: false }, // Martín Gómez was late
                        { punctual: true }
                    ]
                });
            }
        }, 1500);
    }

    // ==========================================================================
    // UI Helpers & Styling Changes during run
    // ==========================================================================
    function setUIStateProcessing(processing) {
        isProcessing = processing;
        if (processing) {
            startBtn.disabled = true;
            startBtn.querySelector('.btn-label').innerText = "Procesando trabajos...";
            simulationBtn.disabled = true;
            statusText.innerText = "Procesando...";
            statusBadge.style.borderColor = "rgba(245, 158, 11, 0.4)";
            statusBadge.querySelector('.status-indicator').style.backgroundColor = "var(--warning)";
            statusBadge.querySelector('.status-indicator').style.boxShadow = "0 0 10px var(--warning)";

            consoleUI.classList.remove('hidden');
            consoleSpinner.style.display = "block";
            scrollToConsole();

            // Reset Progress UI
            progressBar.style.width = "0%";
            progressBar.style.backgroundColor = ""; // reset error coloring
            progressPercentage.innerText = "0%";
            progressStepName.innerText = "Iniciando...";
        } else {
            startBtn.disabled = false;
            startBtn.querySelector('.btn-label').innerText = "Iniciar Procesamiento";
            simulationBtn.disabled = false;
            statusText.innerText = "Listo para procesar";
            statusBadge.style.borderColor = "var(--border-color)";
            statusBadge.querySelector('.status-indicator').style.backgroundColor = "var(--success)";
            statusBadge.querySelector('.status-indicator').style.boxShadow = "0 0 10px var(--success)";
            consoleSpinner.style.display = "none";
        }
    }

    function clearLogs() {
        logsContainer.innerHTML = '';
    }

    function isHttpUrl(url) {
        return typeof url === 'string' && url.startsWith('http');
    }

    function scrollToConsole() {
        requestAnimationFrame(() => {
            consoleUI.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function logReporteResult(data, config) {
        if (!config.teacherReport) return;

        if (data.reporteError) {
            addLog('❌ El reporte analítico pedagógico con IA no pudo ser generado.', 'error');
            addLog(`⚠️ Detalle técnico del fallo: "${data.reporteError}"`, 'warning');
            addLog('📧 Por favor, ponte en contacto con soporte técnico escribiendo a profejuanrosas@gmail.com adjuntando el detalle anterior.', 'info');
        } else if (isHttpUrl(data.reporteUrl)) {
            addLog(`Enlace al Reporte Analítico del Docente (IA): ${data.reporteUrl}`, 'success');
        } else if (!config.geminiKey || !config.geminiKey.trim()) {
            addLog('ℹ️ El reporte con IA no se generó: configurá tu API Key de Gemini en el formulario.', 'info');
        } else {
            addLog('ℹ️ No se generó reporte de IA en esta ejecución (sin texto válido para analizar o sin entregas).', 'warning');
        }
    }

    function addLog(message, type = "normal") {
        const p = document.createElement('p');
        p.className = `log-line ${type}`;

        // Add time timestamp
        const time = new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Formulate printable string
        p.innerText = `[${time}] ${message}`;
        logsContainer.appendChild(p);

        // Auto scroll terminal to the bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
});

