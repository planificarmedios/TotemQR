// ======================================================
// TOTEM QR
// APP.JS
// ======================================================
//
// FLUJO:
//
// 1. index.html muestra intro.mp4
// 2. Esperar QR
// 3. Leer número de mesa
// 4. Ir a bienvenida.html?mesa=XX
// 5. bienvenida.html carga videos/mesa-XX.mp4
// 6. bienvenida.html utiliza mesaVideo.css
// 7. Al terminar -> volver a index.html
// 8. index.html vuelve a mostrar intro.mp4 y lector QR
//
// IMPORTANTE:
//
// El video de mesa YA NO se maneja desde index.html.
//
// La posición, tamaño, escala, rotación y filtros del
// video de mesa vienen exclusivamente de:
//
//     mesaVideo.css
//
// generado desde:
//
//
// ======================================================

// ======================================================
// CONFIGURACIÓN DE RUTAS
// ======================================================

const ROOT_PATH = window.location.hostname.includes("github.io")
  ? "/qrApiClient/"
  : "/";

function asset(path) {
  return ROOT_PATH + path.replace(/^\/+/, "");
}

// ======================================================
// ELEMENTOS DEL INDEX
// ======================================================

const standbyVideo = document.getElementById("standbyVideo");

const qrScannerOverlay = document.getElementById("qrScannerOverlay");

const qrResult = document.getElementById("qrResult");

// ======================================================
// VARIABLES DEL SCANNER
// ======================================================

let qrScanner = null;

let qrLock = false;

// ======================================================
// CÁMARA QR SELECCIONADA
// ======================================================

const CAMERA_STORAGE_KEY = "totemqr_camera_id";

// ======================================================
// INFORMACIÓN DE INICIO
// ======================================================

console.log("==============================================");
console.log("🚀 INICIANDO TOTEMQR");
console.log("==============================================");

console.log("🌐 URL:", window.location.href);

console.log("📁 ROOT_PATH:", ROOT_PATH);

console.log("🎬 Video de fondo:", standbyVideo);

console.log("📷 Lector QR:", qrScannerOverlay);

console.log("🎨 Video de mesa: bienvenida.html");
console.log("🎨 Configuración: mesaVideo.css");

// ======================================================
// VIDEO DE STANDBY
// ======================================================
//
// intro.mp4 permanece siempre en index.html.
//
// Cuando se vuelve desde bienvenida.html, index.html
// comienza nuevamente con intro.mp4.
//

function mostrarStandby() {
  if (!standbyVideo) {
    return;
  }

  standbyVideo.style.display = "block";

  // El sistema de INTRO múltiple
  // se encarga de cargar y reproducir el video.
}

// ======================================================
// VIDEO DE RECHAZO
// ======================================================

async function reproducirRechazo() {
  if (!standbyVideo) {
    return;
  }

  // Bloquear nuevas lecturas
  qrLock = true;

  // Detener scanner
  if (qrScanner) {
    try {
      await qrScanner.stop();
    } catch (error) {
      // El scanner puede estar ya detenido
    }

    qrScanner = null;
  }

  // Cambiar intro por video de rechazo
  standbyVideo.src = asset("videos/rechazar.mp4");

  standbyVideo.style.display = "block";

  standbyVideo.loop = false;

  standbyVideo.currentTime = 0;

  try {
    await standbyVideo.play();
  } catch (error) {
    console.error("Error reproduciendo rechazar.mp4:", error);

    volverAlStandby();
    return;
  }

  // Cuando termina, volver al inicio
  standbyVideo.onended = () => {
    volverAlStandby();
  };
}

// ======================================================
// VOLVER AL STANDBY
// ======================================================

async function volverAlStandby() {
  standbyVideo.onended = null;

  standbyVideo.src = asset("videos/INTRO/intro-1.mp4");

  standbyVideo.loop = true;

  standbyVideo.currentTime = 0;

  try {
    await standbyVideo.play();
  } catch (error) {
    console.error("Error reproduciendo intro.mp4:", error);
  }

  qrLock = false;

  await startQrScanner();
}

// ======================================================
// IR A BIENVENIDA
// ======================================================
//
// Recibe el número de mesa y abre:
//
// bienvenida.html?mesa=XX
//
// Ejemplo:
//
// Mesa 7
// ↓
// bienvenida.html?mesa=7
//
// ======================================================

async function irABienvenida(mesa) {
  const numeroMesa = parseInt(mesa, 10);

  if (!Number.isInteger(numeroMesa) || numeroMesa < 1) {
    reproducirRechazo();
    return;
  }

  const videoMesa = asset(`videos/mesa-${numeroMesa}.mp4`);

  try {
    const respuesta = await fetch(videoMesa, {
      method: "HEAD",
      cache: "no-store",
    });

    if (!respuesta.ok) {
      reproducirRechazo();
      return;
    }

    window.location.replace(asset(`ajuste.html?mesa=${numeroMesa}`));
  } catch (error) {
    reproducirRechazo();
  }
}

// ======================================================
// EFECTO VISUAL QR DETECTADO
// ======================================================

function qrDetectadoVisualmente() {
  if (!qrScannerOverlay) {
    return;
  }

  qrScannerOverlay.classList.add("detected");

  setTimeout(() => {
    qrScannerOverlay.classList.remove("detected");
  }, 700);
}

// ======================================================
// MODAL DE CÁMARAS
// ======================================================

const selectCamsBtn = document.getElementById("selectCamsBtn");

const camModal = document.getElementById("camModal");

const closeCamModal = document.getElementById("closeCamModal");

const saveCamSelection = document.getElementById("saveCamSelection");

// ======================================================
// ABRIR MODAL
// ======================================================

if (selectCamsBtn) {
  selectCamsBtn.onclick = async () => {
    if (camModal) {
      camModal.style.display = "flex";
    }

    await populateCameraOptions();
  };
}

// ======================================================
// CERRAR MODAL
// ======================================================

if (closeCamModal) {
  closeCamModal.onclick = () => {
    if (camModal) {
      camModal.style.display = "none";
    }
  };
}

// ======================================================
// LISTAR CÁMARAS
// ======================================================

async function populateCameraOptions() {
  try {
    console.log("📷 Solicitando permiso para listar cámaras disponibles...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    // --------------------------------------------------
    // Detener stream temporal
    // --------------------------------------------------

    stream.getTracks().forEach((track) => track.stop());

    // --------------------------------------------------
    // Listar dispositivos
    // --------------------------------------------------

    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput",
    );

    console.log("📷 Cámaras encontradas:", videoDevices.length);

    videoDevices.forEach((device, index) => {
      console.log(`📷 Cámara ${index + 1}:`, {
        deviceId: device.deviceId,
        label: device.label,
      });
    });

    // --------------------------------------------------
    // Cargar select
    // --------------------------------------------------

    const qrSelect = document.getElementById("qrCamSelect");

    if (!qrSelect) {
      return;
    }

    qrSelect.innerHTML = "";

    videoDevices.forEach((device, index) => {
      if (!device.deviceId) {
        return;
      }

      const option = document.createElement("option");

      option.value = device.deviceId;

      option.text = device.label || `Cámara ${index + 1}`;

      qrSelect.appendChild(option);
    });

    // --------------------------------------------------
    // Recuperar cámara guardada
    // --------------------------------------------------

    const camaraGuardada = localStorage.getItem(CAMERA_STORAGE_KEY);

    if (
      camaraGuardada &&
      videoDevices.some((device) => device.deviceId === camaraGuardada)
    ) {
      qrSelect.value = camaraGuardada;

      console.log("📷 Cámara guardada recuperada:", camaraGuardada);
    } else {
      console.log("📷 No hay cámara guardada válida.");

      // Seleccionar primera disponible
      const primeraCamara = videoDevices.find((device) => device.deviceId);

      if (primeraCamara) {
        qrSelect.value = primeraCamara.deviceId;
      }
    }
  } catch (error) {
    console.error("❌ Error obteniendo cámaras:", error);

    if (qrResult) {
      qrResult.style.color = "red";

      qrResult.textContent = "❌ No se pudo acceder a la cámara";
    }
  }
}

// ======================================================
// GUARDAR CÁMARA SELECCIONADA
// ======================================================

if (saveCamSelection) {
  saveCamSelection.onclick = async () => {
    const qrSelect = document.getElementById("qrCamSelect");

    if (!qrSelect) {
      return;
    }

    const qrCamId = qrSelect.value;

    // ------------------------------------------------
    // Guardar cámara seleccionada
    // ------------------------------------------------

    localStorage.setItem(CAMERA_STORAGE_KEY, qrCamId);

    console.log("💾 Cámara QR guardada:", qrCamId);

    // ------------------------------------------------
    // Detener scanner anterior
    // ------------------------------------------------

    if (qrScanner) {
      try {
        await qrScanner.stop();
      } catch (error) {
        console.warn("⚠️ No se pudo detener scanner anterior:", error);
      }

      qrScanner = null;
    }

    // ------------------------------------------------
    // Iniciar nueva cámara
    // ------------------------------------------------

    try {
      await startQrScanner(qrCamId);

      if (camModal) {
        camModal.style.display = "none";
      }
    } catch (error) {
      console.error("❌ Error iniciando cámara QR:", error);
    }
  };
}

// ======================================================
// INICIAR LECTOR QR
// ======================================================

async function startQrScanner(qrCamId = null) {
  console.log("📷 Iniciando lector QR...");

  // ------------------------------------------------------
  // Detener scanner anterior
  // ------------------------------------------------------

  if (qrScanner) {
    try {
      await qrScanner.stop();
    } catch (error) {
      console.warn("⚠️ No se pudo detener scanner anterior:", error);
    }

    qrScanner = null;
  }

  // ======================================================
  // SOLICITAR PERMISO DE CÁMARA
  // ======================================================

  try {
    console.log("📷 Solicitando acceso a la cámara...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });

    console.log("✅ Acceso a cámara concedido.");

    stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    console.error("❌ No se pudo acceder a la cámara:", error);

    if (qrResult) {
      qrResult.style.color = "red";

      qrResult.textContent = "❌ No se pudo activar la cámara";
    }

    return;
  }

  // ======================================================
  // OBTENER CÁMARAS
  // ======================================================

  let videoDevices = [];

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    videoDevices = devices.filter((device) => device.kind === "videoinput");

    console.log("📷 Cámaras encontradas:", videoDevices.length);

    videoDevices.forEach((device, index) => {
      console.log(`📷 Cámara ${index + 1}:`, {
        deviceId: device.deviceId,

        label: device.label,
      });
    });
  } catch (error) {
    console.error("❌ Error obteniendo cámaras:", error);

    return;
  }

  // ------------------------------------------------------
  // Verificar cámaras
  // ------------------------------------------------------

  if (videoDevices.length === 0) {
    console.error("❌ No se encontró ninguna cámara.");

    if (qrResult) {
      qrResult.style.color = "red";

      qrResult.textContent = "❌ No se encontró ninguna cámara";
    }

    return;
  }

  // ======================================================
  // DETERMINAR CAMERA ID
  // ======================================================

  let cameraId = qrCamId;

  // ==================================================
  // SI NO SE PASÓ UNA CÁMARA,
  // RECUPERAR LA CÁMARA GUARDADA
  // ==================================================

  if (!cameraId) {
    const camaraGuardada = localStorage.getItem(CAMERA_STORAGE_KEY);

    if (
      camaraGuardada &&
      videoDevices.some((device) => device.deviceId === camaraGuardada)
    ) {
      cameraId = camaraGuardada;

      const camaraEncontrada = videoDevices.find(
        (device) => device.deviceId === camaraGuardada,
      );

      console.log(
        "📷 Utilizando cámara guardada:",
        camaraEncontrada?.label || "Cámara",
      );
    } else {
      // ==============================================
      // FALLBACK:
      // SI NO HAY CÁMARA GUARDADA,
      // USAR LA PRIMERA DISPONIBLE
      // ==============================================

      const primeraCamara = videoDevices.find((device) => device.deviceId);

      if (primeraCamara) {
        cameraId = primeraCamara.deviceId;

        console.log(
          "📷 No hay cámara guardada. Utilizando primera cámara:",
          primeraCamara.label || "Cámara",
        );

        // Guardarla también
        localStorage.setItem(CAMERA_STORAGE_KEY, cameraId);
      }
    }
  }

  if (!cameraId) {
    console.error("❌ La cámara existe pero no tiene deviceId.");

    if (qrResult) {
      qrResult.style.color = "red";

      qrResult.textContent = "❌ No se pudo identificar la cámara";
    }

    return;
  }

  console.log("📷 Device ID seleccionado:", cameraId);

  // ======================================================
  // CREAR SCANNER
  // ======================================================

  qrScanner = new Html5Qrcode("qrVideo");

  // ======================================================
  // PROCESAMIENTO DEL QR
  // ======================================================

  const onScanSuccess = (qrCodeMessage) => {
    // --------------------------------------------------
    // Evitar múltiples lecturas
    // --------------------------------------------------

    if (qrLock) {
      return;
    }

    console.log("📱 QR detectado:", qrCodeMessage);

    // --------------------------------------------------
    // Efecto visual
    // --------------------------------------------------

    qrDetectadoVisualmente();

    // --------------------------------------------------
    // Bloquear nuevas lecturas
    // --------------------------------------------------

    qrLock = true;

    // ==================================================
    // VERIFICAR FORMATO
    // ==================================================

    if (!qrCodeMessage.includes(" | ")) {
      reproducirRechazo();
      return;
    }

    // ==================================================
    // SEPARAR QR
    // ==================================================

    const partes = qrCodeMessage.split(" | ");

    const mensaje = partes[0];

    const codigo = partes[1];

    console.log("📝 Mensaje:", mensaje);

    console.log("🔑 Código:", codigo);

    // ==================================================
    // OBTENER NÚMERO DE MESA
    // ==================================================

    let nroMesa = 0;

    if (codigo) {
      const codigoPartes = codigo.split("-");

      nroMesa = parseInt(codigoPartes[1], 10) || 0;
    }

    console.log("🍽️ Mesa detectada:", nroMesa);

    // ==================================================
    // VALIDAR MESA
    // ==================================================

    if (!Number.isInteger(nroMesa) || nroMesa < 1) {
      reproducirRechazo();
      return;
    }

    // ==================================================
    // MOSTRAR RESULTADO
    // ==================================================

    if (qrResult) {
      qrResult.textContent = "✅ Mesa " + nroMesa;

      qrResult.style.color = "lime";
    }

    // ==================================================
    // IR A BIENVENIDA
    // ======================================================

    irABienvenida(nroMesa);
  };

  // ======================================================
  // INICIAR HTML5 QR CODE
  // ======================================================

  try {
    console.log("📷 Iniciando Html5Qrcode con deviceId...");

    await qrScanner.start(
      {
        deviceId: {
          exact: cameraId,
        },
      },

      {
        fps: 10,

        qrbox: 250,
      },

      onScanSuccess,

      () => {
        // No mostramos los errores
        // normales mientras busca QR.
      },
    );

    console.log("✅ Cámara QR iniciada correctamente.");

    if (qrResult) {
      qrResult.style.color = "#fef9f9ff";

      qrResult.textContent = "📷 Cámara activada, apunta tu QR";
    }
  } catch (error) {
    console.error("❌ Error iniciando lector QR:", error);

    if (qrResult) {
      qrResult.style.color = "red";

      qrResult.textContent = "❌ Error iniciando lector QR";
    }
  }
}

// ======================================================
// INICIO DEL TOTEM
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOM cargado.");

  // --------------------------------------------------
  // Mostrar intro
  // --------------------------------------------------

  mostrarStandby();

  // --------------------------------------------------
  // Iniciar lector QR automáticamente
  // --------------------------------------------------

  await startQrScanner();

  console.log("==============================================");

  console.log("✅ TotemQR listo.");

  console.log("🎬 intro.mp4 + lector QR");

  console.log("📱 Esperando QR...");

  console.log("==============================================");
});

// ======================================================
// LIMPIEZA DE LOTTIE
// ======================================================

const lottieBackground = document.getElementById("lottie-background");

const celebration = document.getElementById("celebration");

const botContainer = document.getElementById("bot");

const botText = document.getElementById("botText");

if (lottieBackground) {
  lottieBackground.style.display = "none";
}

if (celebration) {
  celebration.style.display = "none";
}

if (botContainer) {
  botContainer.style.display = "none";
}

if (botText) {
  botText.style.display = "none";
}

// ======================================================
// LIMPIEZA DEL CONFETTI
// ======================================================

const confettiCanvas = document.getElementById("confettiCanvas");

if (confettiCanvas) {
  confettiCanvas.style.display = "none";
}

// ======================================================
// VOZ DESACTIVADA
// ======================================================

console.log("🔇 Voz desactivada.");

// ======================================================
// FIN APP.JS
// ======================================================

console.log("==============================================");

console.log("✅ APP.JS cargado correctamente.");

console.log("==============================================");
