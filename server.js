const express = require("express");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 8080;

// Carpeta real donde está TotemQR.exe
const basePath = path.dirname(process.execPath);

// Servir los archivos desde la carpeta del ejecutable
app.use(express.static(basePath));

// Iniciar el servidor
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/index.html`;
  console.log(`TotemQR corriendo en ${url}`);

  // Abrir el navegador automáticamente
  exec(`start "" "${url}"`);
});
