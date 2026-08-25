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
// VOZ BOT
// ======================================================

window.addEventListener("load", () => {
  meSpeak.loadConfig("mespeak/mespeak_config.json");

  meSpeak.loadVoice("mespeak/es-la.json", (success, message) => {
    if (success) {
      console.log("✅ Voz latinoamericana cargada:", message);
    } else {
      console.error("❌ Error cargando voz:", message);
    }
  });
});

function speakBot(text) {
  const amplitude = parseInt(localStorage.getItem("voiceAmplitude")) || 80;

  const pitch = parseInt(localStorage.getItem("voicePitch")) || 15;

  const speed = parseInt(localStorage.getItem("voiceSpeed")) || 130;

  const variant = localStorage.getItem("voiceVariant") || "m1";

  meSpeak.speak(text, {
    amplitude: amplitude,
    pitch: pitch,
    speed: speed,
    wordgap: 5,

    variant: variant,
  });
}

// ======================================================
// ESCALADO LOTTIE
// ======================================================

function fixLottieScaling() {
  document
    .querySelectorAll("#lottie-background svg, #celebration svg")
    .forEach((svg) => {
      svg.style.width = "100vw";
      svg.style.height = "100vh";
      svg.style.objectFit = "cover";
      svg.style.background = "rgba(132, 125, 125, 0.4)";
    });
}

window.addEventListener("resize", fixLottieScaling);
window.addEventListener("orientationchange", fixLottieScaling);

setTimeout(fixLottieScaling, 1500);

// ======================================================
// BOT LOTTIE
// ======================================================

const botContainer = document.getElementById("bot");
const botText = document.getElementById("botText");

let botAnim = null;

function showBotText(text) {
  botText.textContent = text;

  botText.classList.remove("bounce");

  void botText.offsetWidth;

  botText.classList.add("bounce");

  botText.style.opacity = "1";

  if (!text.startsWith("✅")) {
    setTimeout(() => {
      botText.style.opacity = "0";
    }, 3000);
  }
}

function loadBotAnimation(animPath) {
  if (botAnim) {
    botAnim.destroy();
  }

  botAnim = lottie.loadAnimation({
    container: botContainer,

    renderer: "svg",

    loop: true,

    autoplay: true,

    path: asset(animPath),
  });

  botContainer.style.width = "120%";
  botContainer.style.height = "120%";

  botContainer.style.transform = "translate(-10%, -10%)";
}

// ======================================================
// ANIMACIONES POR MESA
// ======================================================

const animacionesPorRango = [
  {
    min: 1,
    max: 5,
    animPath: "lottie/Robot-Bot3D.json",
  },

  {
    min: 6,
    max: 10,
    animPath: "lottie/RobotHello.json",
  },

  {
    min: 11,
    max: 15,
    animPath: "lottie/Robot-Bot3D.json",
  },

  {
    min: 16,
    max: 30,
    animPath: "lottie/RobotAssistant.json",
  },
];

function getAnimacionPorMesa(mesa) {
  for (const rango of animacionesPorRango) {
    if (mesa >= rango.min && mesa <= rango.max) {
      return rango.animPath;
    }
  }

  return "lottie/Pink-Robot-Animated.json";
}

// Animación inicial

loadBotAnimation("lottie/Pink-Robot-Animated.json");

// ======================================================
// VARIABLES QR
// ======================================================

let qrScanner = null;

let qrLock = false;

// ======================================================
// EFECTO VISUAL DEL ESCÁNER QR
// ======================================================

const qrScannerOverlay = document.getElementById("qrScannerOverlay");

function qrDetectadoVisualmente() {
  if (!qrScannerOverlay) return;

  qrScannerOverlay.classList.add("detected");

  setTimeout(() => {
    qrScannerOverlay.classList.remove("detected");
  }, 700);
}

const qrResult = document.getElementById("qrResult");

// ======================================================
// MODAL CAMARAS
// ======================================================

document.getElementById("selectCamsBtn").onclick = async () => {
  document.getElementById("camModal").style.display = "flex";

  await populateCameraOptions();
};

document.getElementById("closeCamModal").onclick = () => {
  document.getElementById("camModal").style.display = "none";
};

async function populateCameraOptions() {
  const devices = await navigator.mediaDevices.enumerateDevices();

  const videoDevices = devices.filter((d) => d.kind === "videoinput");

  const qrSelect = document.getElementById("qrCamSelect");

  qrSelect.innerHTML = "";

  videoDevices.forEach((d, i) => {
    const opt = document.createElement("option");

    opt.value = d.deviceId;

    opt.text = d.label || `Cámara ${i + 1}`;

    qrSelect.appendChild(opt);
  });
}

document.getElementById("saveCamSelection").onclick = async () => {
  const qrCamId = document.getElementById("qrCamSelect").value;

  if (qrScanner) {
    await qrScanner.stop().catch(() => {});
  }

  try {
    startQrScanner(qrCamId);

    document.getElementById("camModal").style.display = "none";
  } catch (err) {
    console.error("❌ Error iniciando cámara QR:", err);
  }
};

// ======================================================
// EFECTOS VISUALES
// ======================================================

const confettiCanvas = document.getElementById("confettiCanvas");

let lastEffect = 0;

function launchConfetti() {
  const now = Date.now();

  if (now - lastEffect < 2000) {
    return;
  }

  lastEffect = now;

  if (!confettiCanvas) {
    return;
  }

  const myConfetti = confetti.create(confettiCanvas, {
    resize: true,
    useWorker: true,
  });

  myConfetti({
    particleCount: 200,

    spread: 120,

    startVelocity: 40,

    gravity: 0.6,

    ticks: 200,

    origin: {
      y: 0.3,
    },

    colors: ["#ff0a54", "#ff477e", "#ff7096", "#ff85a1", "#fbb1b1", "#f9bec7"],
  });
}

// ======================================================
// QR SCANNER
// ======================================================

async function startQrScanner(qrCamId) {
  qrScanner = new Html5Qrcode("qrVideo");

  async function iniciar(constraints) {
    await qrScanner.start(
      constraints,

      {
        fps: 10,
        qrbox: 250,
      },

      (qrCodeMessage) => {
        if (qrLock) return;

        // 🎯 Efecto visual de QR detectado
        qrDetectadoVisualmente();

        qrLock = true;

        qrResult.style.color = "lime";

        let mensajeFinal = "QR inválido";

        let nroMesa = 0;

        if (qrCodeMessage.includes(" | ")) {
          const partes = qrCodeMessage.split(" | ");

          const mensaje = partes[0];

          const codigo = partes[1];

          nroMesa = parseInt(codigo.split("-")[1]) || 0;

          mensajeFinal = `${mensaje} ${nroMesa}`;

          // ------------------------------------------
          // ANIMACIÓN PENSANDO
          // ------------------------------------------

          loadBotAnimation("lottie/Counter.json");

          setTimeout(() => {
            // ----------------------------------------
            // ANIMACIÓN SEGÚN MESA
            // ----------------------------------------

            const animPath = getAnimacionPorMesa(nroMesa);

            loadBotAnimation(animPath);

            // ----------------------------------------
            // VOZ
            // ----------------------------------------

            speakBot(mensajeFinal);

            // ----------------------------------------
            // MENSAJE PANTALLA
            // ----------------------------------------

            qrResult.textContent = "✅ " + mensajeFinal;

            showBotText("✅ " + mensajeFinal);

            // ----------------------------------------
            // CONFETTI
            // ----------------------------------------

            launchConfetti();

            // ----------------------------------------
            // RESET
            // ----------------------------------------

            setTimeout(() => {
              qrResult.textContent = "📷 Cámara activada, apunta a un QR";

              qrResult.style.color = "#fef9f9ff";

              loadBotAnimation("lottie/Live_chatbot.json");

              showBotText(" ");

              qrLock = false;
            }, 5000);
          }, 4000);
        }
      },

      (errorMessage) => {
        // No hacemos nada.
        // Evitamos llenar la consola.
      },
    );

    qrResult.style.color = "#fef9f9ff";

    qrResult.textContent = "📷 Cámara activada, apunta tu QR";
  }

  try {
    await iniciar({
      deviceId: {
        exact: qrCamId,
      },
    });
  } catch (err) {
    console.warn("⚠️ Error con deviceId exacto, probando fallback:", err);

    try {
      await iniciar({
        facingMode: "environment",
      });
    } catch (err2) {
      console.error("❌ Error iniciando lector QR:", err2);

      qrResult.style.color = "red";

      qrResult.textContent = "❌ Error iniciando lector QR: " + err2;
    }
  }
}

// ======================================================
// CONFIGURACIÓN DE VOZ
// ======================================================

const voiceSpeed = document.getElementById("voiceSpeed");

const voicePitch = document.getElementById("voicePitch");

const voiceAmplitude = document.getElementById("voiceAmplitude");

const voiceVariant = document.getElementById("voiceVariant");

const voiceSpeedValue = document.getElementById("voiceSpeedValue");

const voicePitchValue = document.getElementById("voicePitchValue");

const voiceAmplitudeValue = document.getElementById("voiceAmplitudeValue");

const testVoiceBtn = document.getElementById("testVoiceBtn");

// ======================================================
// CARGAR CONFIGURACIÓN GUARDADA
// ======================================================

function loadVoiceConfig() {
  const savedSpeed = localStorage.getItem("voiceSpeed") || 130;

  const savedPitch = localStorage.getItem("voicePitch") || 15;

  const savedAmplitude = localStorage.getItem("voiceAmplitude") || 80;

  const savedVariant = localStorage.getItem("voiceVariant") || "m1";

  voiceSpeed.value = savedSpeed;

  voicePitch.value = savedPitch;

  voiceAmplitude.value = savedAmplitude;

  voiceVariant.value = savedVariant;

  voiceSpeedValue.textContent = savedSpeed;

  voicePitchValue.textContent = savedPitch;

  voiceAmplitudeValue.textContent = savedAmplitude;
}

// ======================================================
// LISTENER VELOCIDAD
// ======================================================

voiceSpeed.addEventListener("input", () => {
  const value = voiceSpeed.value;

  voiceSpeedValue.textContent = value;

  localStorage.setItem("voiceSpeed", value);
});

// ======================================================
// LISTENER TONO
// ======================================================

voicePitch.addEventListener("input", () => {
  const value = voicePitch.value;

  voicePitchValue.textContent = value;

  localStorage.setItem("voicePitch", value);
});

// ======================================================
// LISTENER VOLUMEN
// ======================================================

voiceAmplitude.addEventListener("input", () => {
  const value = voiceAmplitude.value;

  voiceAmplitudeValue.textContent = value;

  localStorage.setItem("voiceAmplitude", value);
});

// ======================================================
// LISTENER VARIANTE DE VOZ
// ======================================================

voiceVariant.addEventListener("change", () => {
  const value = voiceVariant.value;

  localStorage.setItem("voiceVariant", value);
});

// ======================================================
// PRUEBA DE VOZ EN LOOP
// ======================================================

let voiceTestRunning = false;

let voiceTestId = 0;

const voiceTestText =
  "Aaaaa. Eeeee. Iiiii. Ooooo. Uuuuu. " +
  "Mmmm. Nnnn. Ssss. Rrrr. Llll. " +
  "Hola. Atención. Bienvenidos. Fiesta. Mesa. " +
  "Uno. Dos. Tres. Cuatro. Cinco. Seis. Siete. Ocho. Nueve.";

testVoiceBtn.addEventListener("click", () => {
  // ----------------------------------------------
  // DETENER
  // ----------------------------------------------

  if (voiceTestRunning) {
    voiceTestRunning = false;

    voiceTestId++;

    meSpeak.stop();

    testVoiceBtn.textContent = "▶ Probar voz";

    return;
  }

  // ----------------------------------------------
  // INICIAR
  // ----------------------------------------------

  voiceTestRunning = true;

  const currentTestId = ++voiceTestId;

  testVoiceBtn.textContent = "⏹ Detener";

  function reproducirPrueba() {
    if (!voiceTestRunning) {
      return;
    }

    if (currentTestId !== voiceTestId) {
      return;
    }

    const amplitude = parseInt(localStorage.getItem("voiceAmplitude")) || 80;

    const pitch = parseInt(localStorage.getItem("voicePitch")) || 15;

    const speed = parseInt(localStorage.getItem("voiceSpeed")) || 130;

    const variant = localStorage.getItem("voiceVariant") || "m1";

    meSpeak.speak(
      voiceTestText,

      {
        amplitude: amplitude,

        pitch: pitch,

        speed: speed,

        wordgap: 5,

        variant: variant,

        callback: function () {
          if (!voiceTestRunning) {
            return;
          }

          if (currentTestId !== voiceTestId) {
            return;
          }

          setTimeout(() => {
            if (!voiceTestRunning) {
              return;
            }

            if (currentTestId !== voiceTestId) {
              return;
            }

            reproducirPrueba();
          }, 500);
        },
      },
    );
  }

  reproducirPrueba();
});

// ======================================================
// INICIALIZAR CONFIGURACIÓN DE VOZ
// ======================================================

loadVoiceConfig();
