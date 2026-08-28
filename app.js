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
// VIDEOS DEL TOTEM
// ======================================================

const standbyVideo = document.getElementById("standbyVideo");
const mesaVideo = document.getElementById("mesaVideo");

// ======================================================
// MOSTRAR VIDEO DE STANDBY
// ======================================================

function mostrarStandby() {
  if (!standbyVideo || !mesaVideo) {
    console.warn("⚠️ No se encontraron los videos del tótem.");
    return;
  }

  // --------------------------------------------------
  // Detener video de mesa
  // --------------------------------------------------

  mesaVideo.pause();
  mesaVideo.currentTime = 0;
  mesaVideo.style.display = "none";

  // --------------------------------------------------
  // Mostrar standby
  // --------------------------------------------------

  standbyVideo.style.display = "block";

  standbyVideo.currentTime = 0;

  standbyVideo.play().catch((err) => {
    console.warn("⚠️ No se pudo reproducir video standby:", err);
  });
}

// ======================================================
// MOSTRAR VIDEO DE MESA
// ======================================================

function mostrarVideoMesa() {
  if (!standbyVideo || !mesaVideo) {
    return;
  }

  // --------------------------------------------------
  // Detener standby
  // --------------------------------------------------

  standbyVideo.pause();
  standbyVideo.currentTime = 0;
  standbyVideo.style.display = "none";

  // --------------------------------------------------
  // Mostrar video mesa
  // --------------------------------------------------

  mesaVideo.style.display = "block";

  mesaVideo.currentTime = 0;

  mesaVideo.play().catch((err) => {
    console.warn("⚠️ No se pudo reproducir video de mesa:", err);
  });
}

// ======================================================
// CUANDO TERMINA EL VIDEO DE LA MESA
// VOLVER AL STANDBY
// ======================================================

if (mesaVideo) {
  mesaVideo.addEventListener("ended", () => {
    console.log("🎬 Video de mesa terminado.");

    mostrarStandby();
  });
}

// ======================================================
// INICIO DEL TOTEM
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Iniciando TotemQR...");

  mostrarStandby();
});

// ======================================================
// VARIABLES QR
// ======================================================

let qrScanner = null;

let qrLock = false;

// ======================================================
// ELEMENTOS QR
// ======================================================

const qrScannerOverlay = document.getElementById("qrScannerOverlay");

const qrResult = document.getElementById("qrResult");

// ======================================================
// EFECTO VISUAL DEL ESCÁNER QR
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

if (selectCamsBtn) {
  selectCamsBtn.onclick = async () => {
    camModal.style.display = "flex";

    await populateCameraOptions();
  };
}

if (closeCamModal) {
  closeCamModal.onclick = () => {
    camModal.style.display = "none";
  };
}

// ======================================================
// LISTAR CÁMARAS
// ======================================================

async function populateCameraOptions() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput",
    );

    const qrSelect = document.getElementById("qrCamSelect");

    if (!qrSelect) {
      return;
    }

    qrSelect.innerHTML = "";

    videoDevices.forEach((device, index) => {
      const option = document.createElement("option");

      option.value = device.deviceId;

      option.text = device.label || `Cámara ${index + 1}`;

      qrSelect.appendChild(option);
    });
  } catch (error) {
    console.error("❌ Error obteniendo cámaras:", error);
  }
}

// ======================================================
// GUARDAR CÁMARA SELECCIONADA
// ======================================================

if (saveCamSelection) {
  saveCamSelection.onclick = async () => {
    const qrCamId = document.getElementById("qrCamSelect").value;

    // --------------------------------------------------
    // Detener scanner anterior
    // --------------------------------------------------

    if (qrScanner) {
      try {
        await qrScanner.stop();
      } catch (error) {
        console.warn("⚠️ No se pudo detener scanner anterior:", error);
      }
    }

    // --------------------------------------------------
    // Iniciar nueva cámara
    // --------------------------------------------------

    try {
      await startQrScanner(qrCamId);

      camModal.style.display = "none";
    } catch (error) {
      console.error("❌ Error iniciando cámara QR:", error);
    }
  };
}

// ======================================================
// QR SCANNER
// ======================================================

async function startQrScanner(qrCamId) {
  // --------------------------------------------------
  // Crear scanner
  // --------------------------------------------------

  qrScanner = new Html5Qrcode("qrVideo");

  // ==================================================
  // FUNCIÓN INTERNA PARA INICIAR CÁMARA
  // ==================================================

  async function iniciar(constraints) {
    await qrScanner.start(
      constraints,

      {
        fps: 10,

        qrbox: 250,
      },

      // ==============================================
      // QR DETECTADO
      // ==============================================

      (qrCodeMessage) => {
        // ------------------------------------------------
        // Evitar múltiples lecturas
        // ------------------------------------------------

        if (qrLock) {
          return;
        }

        // ------------------------------------------------
        // Efecto visual
        // ------------------------------------------------

        qrDetectadoVisualmente();

        // ------------------------------------------------
        // Bloquear nuevas lecturas
        // ------------------------------------------------

        qrLock = true;

        // ------------------------------------------------
        // Verificar formato
        // ------------------------------------------------

        if (!qrCodeMessage.includes(" | ")) {
          console.warn("⚠️ QR detectado pero formato inválido:", qrCodeMessage);

          qrLock = false;

          return;
        }

        // =================================================
        // PROCESAR QR
        // =================================================

        const partes = qrCodeMessage.split(" | ");

        const mensaje = partes[0];

        const codigo = partes[1];

        // =================================================
        // OBTENER NÚMERO DE MESA
        // =================================================

        let nroMesa = 0;

        if (codigo) {
          const codigoPartes = codigo.split("-");

          nroMesa = parseInt(codigoPartes[1]) || 0;
        }

        console.log("📱 QR leído:", qrCodeMessage);

        console.log("🍽️ Mesa detectada:", nroMesa);

        // =================================================
        // MOSTRAR RESULTADO
        // =================================================

        if (qrResult) {
          qrResult.textContent = "✅ Mesa " + nroMesa;

          qrResult.style.color = "lime";
        }

        // =================================================
        // REPRODUCIR VIDEO DE MESA
        // =================================================

        mostrarVideoMesa();

        // =================================================
        // IMPORTANTE:
        // NO HACER:
        //
        // speakBot()
        // launchConfetti()
        // loadBotAnimation()
        //
        // ESTA VERSIÓN NO UTILIZA NADA DE ESO.
        // =================================================

        // =================================================
        // DESBLOQUEAR QR
        // =================================================

        // El QR permanece bloqueado mientras
        // se reproduce el video.
        //
        // El desbloqueo se realiza cuando
        // termina mesa-1.mp4.
      },

      // ==============================================
      // ERRORES DE ESCANEO
      // ==============================================

      (errorMessage) => {
        // No hacemos nada.
        //
        // html5-qrcode genera constantemente
        // mensajes mientras busca QR.
        //
        // No queremos llenar la consola.
      },
    );

    // ==================================================
    // CÁMARA ACTIVADA
    // ==================================================

    if (qrResult) {
      qrResult.style.color = "#fef9f9ff";

      qrResult.textContent = "📷 Cámara activada, apunta tu QR";
    }
  }

  // ==================================================
  // INTENTAR CÁMARA SELECCIONADA
  // ==================================================

  try {
    await iniciar({
      deviceId: {
        exact: qrCamId,
      },
    });
  } catch (err) {
    // ==================================================
    // FALLBACK
    // ==================================================

    console.warn(
      "⚠️ Error con deviceId exacto.",
      "Probando cámara automática...",
    );

    try {
      await iniciar({
        facingMode: "environment",
      });
    } catch (err2) {
      console.error("❌ Error iniciando lector QR:", err2);

      if (qrResult) {
        qrResult.style.color = "red";

        qrResult.textContent = "❌ Error iniciando lector QR";
      }
    }
  }
}

// ======================================================
// DESBLOQUEAR QR CUANDO TERMINA EL VIDEO
// ======================================================

if (mesaVideo) {
  mesaVideo.addEventListener("ended", () => {
    // --------------------------------------------------
    // Volvemos a standby
    // --------------------------------------------------

    mostrarStandby();

    // --------------------------------------------------
    // Mostrar estado de cámara
    // --------------------------------------------------

    if (qrResult) {
      qrResult.textContent = "📷 Cámara activada, apunta a un QR";

      qrResult.style.color = "#fef9f9ff";
    }

    // --------------------------------------------------
    // Permitir nuevo QR
    // --------------------------------------------------

    qrLock = false;

    console.log("🔓 Scanner QR desbloqueado.");
  });
}

// ======================================================
// LIMPIEZA DE LOTTIE
// ======================================================
//
// Esta versión ya NO utiliza Lottie.
//
// Si quedaron animaciones creadas por versiones
// anteriores, las ocultamos explícitamente.
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
// VOZ
// ======================================================
//
// IMPORTANTE:
//
// Ya NO cargamos meSpeak.
// Ya NO llamamos a speakBot().
// Ya NO reproducimos ninguna voz.
//
// El panel de configuración puede seguir
// existiendo en el HTML, pero esta versión
// no utiliza la voz.
// ======================================================

console.log("🔇 Voz desactivada.");

// ======================================================
// FIN APP.JS
// ======================================================

console.log("✅ TotemQR listo: modo VIDEO.");
