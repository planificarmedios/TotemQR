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

if (!fs.existsSync(videosPath)) {
  fs.mkdirSync(videosPath, { recursive: true });
}

/* =====================================================
   MIDDLEWARE
   ===================================================== */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/* =====================================================
   MULTER
   ===================================================== */

/*
 * El archivo se recibe primero como "temp".
 *
 * Después nosotros decidimos el nombre definitivo.
 *
 * Esto es importante porque Fernando puede subir:
 *
 * video.mp4
 * animador.mp4
 * mesa01.mp4
 * cumpleaños.mp4
 *
 * y nosotros lo transformamos en:
 *
 * intro.mp4
 * mesa-1.mp4
 * mesa-2.mp4
 * etc.
 */

const tempPath = path.join(videosPath, "_temp");

if (!fs.existsSync(tempPath)) {
  fs.mkdirSync(tempPath, { recursive: true });
}

const upload = multer({
  dest: tempPath,

  limits: {
    /*
     * 500 MB máximo
     */

    fileSize: 500 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (extension !== ".mp4") {
      return cb(new Error("Solamente se permiten archivos MP4."));
    }

    cb(null, true);
  },
});

/* =====================================================
   ARCHIVOS ESTÁTICOS
   ===================================================== */

app.use(express.static(basePath));

/* =====================================================
   LISTAR VIDEOS
   ===================================================== */

app.get("/api/videos", (req, res) => {
  try {
    const files = fs.readdirSync(videosPath);

    /* ---------------------------------------------
         INTRO
         --------------------------------------------- */

    const intro = files.some((file) => file.toLowerCase() === "intro.mp4");

    /* ---------------------------------------------
         MESAS
         --------------------------------------------- */

    const mesas = files
      .map((file) => {
        const match = file.match(/^mesa-(\d+)\.mp4$/i);

        if (!match) {
          return null;
        }

        return Number(match[1]);
      })
      .filter((numero) => numero !== null)
      .sort((a, b) => a - b);

    res.json({
      intro,

      mesas,
    });
  } catch (error) {
    console.error("Error leyendo videos:", error);

    res.status(500).json({
      error: "No se pudo leer la carpeta de videos.",
    });
  }
});

/* =====================================================
   SUBIR VIDEO
   ===================================================== */

app.post("/api/videos/upload", upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió ningún video.",
      });
    }

    const tipo = String(req.body.tipo || "").toLowerCase();

    let nombreFinal;

    /* =============================================
         INTRO
         ============================================= */

    if (tipo === "intro") {
      nombreFinal = "intro.mp4";
    } else if (tipo === "mesa") {
      /* =============================================
         MESA
         ============================================= */
      const numero = String(req.body.mesa || "").trim();

      /*
       * Permitimos:
       *
       * 1
       * 01
       * 001
       * 15
       *
       * y lo normalizamos.
       */

      if (!/^\d+$/.test(numero)) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          error: "Número de mesa inválido.",
        });
      }

      const numeroNormalizado = parseInt(numero, 10);

      if (numeroNormalizado < 1) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          error: "El número de mesa debe ser mayor a 0.",
        });
      }

      nombreFinal = `mesa-${numeroNormalizado}.mp4`;
    } else {
      /* =============================================
         TIPO INVÁLIDO
         ============================================= */
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        error: "Tipo de video inválido.",
      });
    }

    /* =============================================
         RUTA FINAL
         ============================================= */

    const destino = path.join(videosPath, nombreFinal);

    /* =============================================
         REEMPLAZAR VIDEO EXISTENTE
         ============================================= */

    if (fs.existsSync(destino)) {
      fs.unlinkSync(destino);
    }

    /* =============================================
         MOVER ARCHIVO
         ============================================= */

    fs.renameSync(req.file.path, destino);

    console.log(`Video guardado: ${destino}`);

    res.json({
      ok: true,

      nombre: nombreFinal,

      mensaje: "Video cargado correctamente.",
    });
  } catch (error) {
    console.error("Error subiendo video:", error);

    /*
     * Intentar limpiar archivo temporal
     */

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }

    res.status(500).json({
      error: error.message || "No se pudo subir el video.",
    });
  }
});

/* =====================================================
   ELIMINAR VIDEO
   ===================================================== */

app.post("/api/videos/delete", (req, res) => {
  try {
    const nombre = req.body.nombre;

    if (typeof nombre !== "string") {
      return res.status(400).json({
        error: "Nombre de archivo inválido.",
      });
    }

    /* ---------------------------------------------
         VALIDAR NOMBRE
         --------------------------------------------- */

    const valido =
      /^intro\.mp4$/i.test(nombre) || /^mesa-\d+\.mp4$/i.test(nombre);

    if (!valido) {
      return res.status(400).json({
        error: "Nombre de archivo no permitido.",
      });
    }

    const filePath = path.join(videosPath, nombre);

    /* ---------------------------------------------
         COMPROBAR EXISTENCIA
         --------------------------------------------- */

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "El video no existe.",
      });
    }

    /* ---------------------------------------------
         ELIMINAR
         --------------------------------------------- */

    fs.unlinkSync(filePath);

    console.log(`Video eliminado: ${filePath}`);

    res.json({
      ok: true,

      nombre,
    });
  } catch (error) {
    console.error("Error eliminando video:", error);

    res.status(500).json({
      error: "No se pudo eliminar el video.",
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
      error: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      error: error.message || "Error procesando el video.",
    });
  }

  next();
});

/* =====================================================
   INICIAR SERVIDOR
   ===================================================== */

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/index.html`;

  console.log(`TotemQR corriendo en ${url}`);

  exec(`start "" "${url}"`);
});
