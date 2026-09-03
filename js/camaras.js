let faceStream = null;
let qrStream = null;

// Abrir modal
document.getElementById("selectCamsBtn").onclick = async () => {
  document.getElementById("camModal").style.display = "flex";
  await populateCameraOptions();
};

// Cerrar modal
document.getElementById("closeCamModal").onclick = () => {
  document.getElementById("camModal").style.display = "none";
};

// Guardar selección
document.getElementById("saveCamSelection").onclick = async () => {
  const faceCamId = document.getElementById("faceCamSelect").value;
  const qrCamId = document.getElementById("qrCamSelect").value;

  // Detener streams previos
  if (faceStream) faceStream.getTracks().forEach((t) => t.stop());
  if (qrStream) qrStream.getTracks().forEach((t) => t.stop());

  // Iniciar cámara rostros
  faceStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: faceCamId },
  });
  document.getElementById("video").srcObject = faceStream;

  // Iniciar cámara QR
  qrStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: qrCamId },
  });
  document.getElementById("qrVideo").srcObject = qrStream;

  document.getElementById("camModal").style.display = "none";
};
