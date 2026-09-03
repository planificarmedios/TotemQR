const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { exec } = require("child_process");

const app = express();
const PORT = 8080;

/* =====================================================
   RUTA BASE
   ===================================================== */

const basePath = process.pkg ? path.dirname(process.execPath) : __dirname;

/* =====================================================
   CARPETA DE VIDEOS
   ===================================================== */

const videosPath = path.join(basePath, "videos");

/* =====================================================
   CARPETA DE VIDEOS INTRO
   ===================================================== */

const introPath = path.join(videosPath, "INTRO");

/* =====================================================
   CREAR CARPETAS SI NO EXISTEN
   ===================================================== */

if (!fs.existsSync(videosPath)) {
  fs.mkdirSync(videosPath, { recursive: true });
}

if (!fs.existsSync(introPath)) {
  fs.mkdirSync(introPath, { recursive: true });
}

/* =====================================================
   CARPETA TEMPORAL PARA SUBIDAS
   ===================================================== */

const tempPath = path.join(videosPath, "_temp");

if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true });
}

/* =====================================================
   EXPRESS
   ===================================================== */

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/* =====================================================
   ARCHIVOS ESTÁTICOS
   ===================================================== */

app.use(express.static(basePath));

/* =====================================================
   MULTER
   ===================================================== */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempPath);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname) || ".mp4";

    const nombreTemporal = `upload-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}${extension}`;

    cb(null, nombreTemporal);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  fileFilter: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    const mime = (file.mimetype || "").toLowerCase();

    if (
      extension === ".mp4" ||
      mime === "video/mp4" ||
      mime.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de video MP4."));
    }
  },
});

/* =====================================================
   OBTENER PRIMER NÚMERO INTRO LIBRE
   ===================================================== */

function obtenerPrimerNumeroIntroLibre() {
  const archivos = fs.readdirSync(introPath);

  const numeros = archivos
    .map((nombre) => {
      const match = nombre.match(/^intro-(\d+)\.mp4$/i);

      return match ? Number(match[1]) : null;
    })
    .filter((numero) => Number.isInteger(numero));

  let numero = 1;

  while (numeros.includes(numero)) {
    numero++;
  }

  return numero;
}

function generarListaVideos() {
  try {
    // ================================
    // INTRO
    // ================================
    const intros = fs
      .readdirSync(introPath)
      .filter((nombre) => /^intro-\d+\.mp4$/i.test(nombre))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

    // ================================
    // MESAS
    // ================================
    const mesas = fs
      .readdirSync(videosPath)
      .filter((nombre) => /^mesa-\d+\.mp4$/i.test(nombre))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

    // ================================
    // RECHAZAR
    // ================================
    const rechazar = fs.existsSync(path.join(videosPath, "rechazar.mp4"));

    // ================================
    // GENERAR JSON
    // ================================
    const lista = {
      intros,
      mesas,
      rechazar,
    };

    const listaPath = path.join(videosPath, "lista.json");

    fs.writeFileSync(listaPath, JSON.stringify(lista, null, 2), "utf8");

    console.log("📝 lista.json actualizado:");
    console.log("   🎞️ INTRO:", intros);
    console.log("   🪑 MESAS:", mesas);
    console.log("   ❌ RECHAZAR:", rechazar);
  } catch (error) {
    console.error("❌ Error generando lista.json:", error);
  }
}

/* =====================================================
   API - LISTAR VIDEOS
   ===================================================== */

app.get("/api/videos", (req, res) => {
  try {
    /* -------------------------------------------------
       INTRO
       ------------------------------------------------- */

    const intros = fs
      .readdirSync(introPath)
      .filter((nombre) => /^intro-\d+\.mp4$/i.test(nombre))
      .sort((a, b) => {
        const numeroA = Number(a.match(/\d+/)[0]);

        const numeroB = Number(b.match(/\d+/)[0]);

        return numeroA - numeroB;
      });

    /* -------------------------------------------------
       MESAS
       ------------------------------------------------- */

    const mesas = fs
      .readdirSync(videosPath)
      .filter((nombre) => /^mesa-\d+\.mp4$/i.test(nombre))
      .sort((a, b) => {
        const numeroA = Number(a.match(/\d+/)[0]);

        const numeroB = Number(b.match(/\d+/)[0]);

        return numeroA - numeroB;
      });

    /* -------------------------------------------------
       VIDEO RECHAZAR
       ------------------------------------------------- */

    const rechazarPath = path.join(videosPath, "rechazar.mp4");

    const rechazar = fs.existsSync(rechazarPath);

    /* -------------------------------------------------
       LOG
       ------------------------------------------------- */

    console.log("");
    console.log("==============================================");
    console.log("🎬 API /api/videos");
    console.log("🎞️ INTRO:", intros);
    console.log("🪑 MESAS:", mesas);
    console.log("❌ RECHAZAR:", rechazar);
    console.log("==============================================");
    console.log("");

    /* -------------------------------------------------
       RESPUESTA
       ------------------------------------------------- */

    res.json({
      intros,
      mesas,
      rechazar,
    });
  } catch (error) {
    console.error("❌ Error obteniendo videos:", error);

    res.status(500).json({
      error: "No se pudo obtener la lista de videos.",
    });
  }
});

/* =====================================================
   API - SUBIR VIDEO
   ===================================================== */

app.post("/api/videos/upload", upload.single("video"), async (req, res) => {
  let archivoTemporal = null;

  try {
    /* -------------------------------------------------
         VALIDAR ARCHIVO
         ------------------------------------------------- */

    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió ningún video.",
      });
    }

    archivoTemporal = req.file.path;

    /* -------------------------------------------------
         DATOS
         ------------------------------------------------- */

    const tipo = String(req.body.tipo || "")
      .trim()
      .toLowerCase();

    /* =================================================
         INTRO NUEVO
         ================================================= */

    if (tipo === "intro") {
      const numero = obtenerPrimerNumeroIntroLibre();

      const nombre = `intro-${numero}.mp4`;

      const destino = path.join(introPath, nombre);

      fs.renameSync(archivoTemporal, destino);

      archivoTemporal = null;

      console.log(`🎞️ INTRO agregado: ${nombre}`);

      generarListaVideos();

      return res.json({
        ok: true,
        tipo: "intro",
        nombre,
      });
    }

    /* =================================================
         INTRO EXISTENTE - REEMPLAZAR
         ================================================= */

    if (tipo === "intro-update") {
      const nombre = String(req.body.nombre || "").trim();

      /* ---------------------------------------------
           Seguridad
           --------------------------------------------- */

      if (!/^intro-\d+\.mp4$/i.test(nombre)) {
        return res.status(400).json({
          error: "Nombre de INTRO inválido.",
        });
      }

      const destino = path.join(introPath, nombre);

      /* ---------------------------------------------
           Reemplazar archivo
           --------------------------------------------- */

      fs.renameSync(archivoTemporal, destino);

      archivoTemporal = null;

      console.log(`🔄 INTRO reemplazado: ${nombre}`);

      return res.json({
        ok: true,
        tipo: "intro-update",
        nombre,
      });
    }

    /* =================================================
         RECHAZAR
         ================================================= */

    if (tipo === "rechazar") {
      const nombre = "rechazar.mp4";

      const destino = path.join(videosPath, nombre);

      /* ---------------------------------------------
           Si existe, eliminarlo
           --------------------------------------------- */

      if (fs.existsSync(destino)) {
        fs.unlinkSync(destino);
      }

      /* ---------------------------------------------
           Guardar nuevo
           --------------------------------------------- */

      fs.renameSync(archivoTemporal, destino);

      archivoTemporal = null;

      console.log("❌ Video RECHAZAR actualizado.");

      generarListaVideos();

      return res.json({
        ok: true,
        tipo: "rechazar",
        nombre,
      });
    }

    /* =================================================
         VIDEO DE MESA
         ================================================= */

    if (tipo === "mesa") {
      const numeroMesa = Number(req.body.mesa);

      /* ---------------------------------------------
           Validar número
           --------------------------------------------- */

      if (!Number.isInteger(numeroMesa) || numeroMesa < 1) {
        return res.status(400).json({
          error: "Número de mesa inválido.",
        });
      }

      const nombre = `mesa-${numeroMesa}.mp4`;

      const destino = path.join(videosPath, nombre);

      /* ---------------------------------------------
           Si existe, reemplazar
           --------------------------------------------- */

      if (fs.existsSync(destino)) {
        fs.unlinkSync(destino);
      }

      /* ---------------------------------------------
           Guardar
           --------------------------------------------- */

      fs.renameSync(archivoTemporal, destino);

      archivoTemporal = null;

      console.log(`🪑 Video de mesa guardado: ${nombre}`);

      generarListaVideos();

      return res.json({
        ok: true,
        tipo: "mesa",
        mesa: numeroMesa,
        nombre,
      });
    }

    /* =================================================
         TIPO DESCONOCIDO
         ================================================= */

    return res.status(400).json({
      error: "Tipo de video no válido.",
    });
  } catch (error) {
    console.error("❌ Error subiendo video:", error);

    /* -----------------------------------------------
         Eliminar temporal si quedó
         ----------------------------------------------- */

    if (archivoTemporal && fs.existsSync(archivoTemporal)) {
      try {
        fs.unlinkSync(archivoTemporal);
      } catch (e) {
        console.error("No se pudo eliminar temporal:", e);
      }
    }

    return res.status(500).json({
      error: error.message || "No se pudo subir el video.",
    });
  }
});

/* =====================================================
   API - ELIMINAR VIDEO
   ===================================================== */

app.post("/api/videos/delete", (req, res) => {
  try {
    const nombre = String(req.body.nombre || "").trim();

    /* -------------------------------------------------
         VALIDAR NOMBRE
         ------------------------------------------------- */

    let archivo = null;

    /* =================================================
         INTRO
         ================================================= */

    if (/^intro-\d+\.mp4$/i.test(nombre)) {
      archivo = path.join(introPath, nombre);
    } else if (/^mesa-\d+\.mp4$/i.test(nombre)) {
      /* =================================================
         MESA
         ================================================= */
      archivo = path.join(videosPath, nombre);
    } else if (nombre.toLowerCase() === "rechazar.mp4") {
      /* =================================================
         RECHAZAR
         ================================================= */
      archivo = path.join(videosPath, "rechazar.mp4");
    } else {
      /* =================================================
         NOMBRE INVÁLIDO
         ================================================= */
      return res.status(400).json({
        error: "Nombre de video inválido.",
      });
    }

    /* -------------------------------------------------
         VERIFICAR EXISTENCIA
         ------------------------------------------------- */

    if (!fs.existsSync(archivo)) {
      return res.status(404).json({
        error: "El video no existe.",
      });
    }

    /* -------------------------------------------------
         ELIMINAR
         ------------------------------------------------- */

    fs.unlinkSync(archivo);

    console.log(`🗑️ Video eliminado: ${nombre}`);

    generarListaVideos();

    res.json({
      ok: true,
      nombre,
    });
  } catch (error) {
    console.error("❌ Error eliminando video:", error);

    res.status(500).json({
      error: error.message || "No se pudo eliminar el video.",
    });
  }
});

/* =====================================================
   MANEJO DE ERRORES DE MULTER
   ===================================================== */

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "El video supera el tamaño máximo permitido de 500 MB.",
      });
    }

    return res.status(400).json({
      error: error.message || "Error al subir el archivo.",
    });
  }

  if (error) {
    return res.status(400).json({
      error: error.message || "Error procesando el archivo.",
    });
  }

  next();
});

/* =====================================================
   RUTA PRINCIPAL
   ===================================================== */

app.get("/", (req, res) => {
  res.sendFile(path.join(basePath, "index.html"));
});

/* =====================================================
   INICIAR SERVIDOR
   ===================================================== */

generarListaVideos();

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("==============================================");
  console.log("🚀 TOTEM QR");
  console.log("==============================================");
  console.log(`🌐 Servidor: http://localhost:${PORT}`);
  console.log(`📁 Base: ${basePath}`);
  console.log(`🎞️ INTRO: ${introPath}`);
  console.log(`🎬 VIDEOS: ${videosPath}`);
  console.log("==============================================");
  console.log("");
});
