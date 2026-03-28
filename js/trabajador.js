// Importa la inicialización de Firebase App desde el CDN oficial
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Importa funciones de Firebase Realtime Database
import {
  getDatabase,
  ref,
  onValue,
  get,
  update,
  push,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuración del proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtk_GeNUEOzBQnPQvJsUEdQVEGaQRExg8",
  databaseURL: "https://traslado-almacen-default-rtdb.firebaseio.com/",
  projectId: "traslado-almacen",
};

// Inicializa la app de Firebase
const app = initializeApp(firebaseConfig);

// Obtiene la instancia de la base de datos en tiempo real
const db = getDatabase(app);

// Referencias a elementos del DOM relacionados con selección de lector y almacén detectado
const lectorSeleccionado = document.getElementById("lectorSeleccionado");
const almacenDetectado = document.getElementById("almacenDetectado");

// Referencias a elementos del DOM para mostrar el último UID escaneado
const uidActual = document.getElementById("uidActual");
const detalleEscaneo = document.getElementById("detalleEscaneo");

// Referencias a elementos del DOM para mensajes de estado de la operación
const notice = document.getElementById("notice");
const estadoOperacion = document.getElementById("estadoOperacion");
const subEstado = document.getElementById("subEstado");

// Referencias a elementos del DOM para mostrar información del lote detectado
const infoUidLote = document.getElementById("infoUidLote");
const infoLote = document.getElementById("infoLote");
const infoProducto = document.getElementById("infoProducto");
const infoCantidad = document.getElementById("infoCantidad");
const infoUbicacionLote = document.getElementById("infoUbicacionLote");
const infoUltimoAlmacen = document.getElementById("infoUltimoAlmacen");
const infoTipoMovimiento = document.getElementById("infoTipoMovimiento");

// Referencias a elementos del DOM para mostrar información del autorizador detectado
const infoUidAutor = document.getElementById("infoUidAutor");
const infoNombreAutor = document.getElementById("infoNombreAutor");
const infoRolAutor = document.getElementById("infoRolAutor");
const infoAlmacenAutor = document.getElementById("infoAlmacenAutor");
const infoActivoAutor = document.getElementById("infoActivoAutor");

// Referencia a la tabla donde se mostrarán los movimientos recientes
const tablaMovimientos = document.getElementById("tablaMovimientos");

// Variables de control del flujo de escaneo
let paso = 1; // 1 = esperando lote, 2 = esperando autorizador, 3 = procesando
let ultimoProcesado = ""; // Guarda una huella del último escaneo procesado para evitar duplicados
let loteActual = null; // Datos del lote actual
let autorizadorActual = null; // Datos del autorizador actual
let uidLoteActual = ""; // UID del lote actual
let uidAutorizadorActual = ""; // UID del autorizador actual
let tipoMovimientoActual = ""; // Puede ser "ENTRADA" o "SALIDA"
let bloqueado = false; // Evita que se procese otro escaneo mientras se registra un movimiento

// Devuelve el almacén asociado al lector seleccionado
function obtenerAlmacenDesdeLector(lector) {
  if (lector === "ESP_ALMACEN_A") return "A";
  if (lector === "ESP_ALMACEN_B") return "B";
  return "";
}

// Actualiza el campo visual del almacén detectado según el lector seleccionado
function refrescarAlmacenDetectado() {
  almacenDetectado.value = obtenerAlmacenDesdeLector(
    lectorSeleccionado.value,
  );
}

// Muestra un aviso visual en la interfaz
// tipo puede ser: "info", "ok", "err"
function setNotice(texto, tipo = "info") {
  notice.textContent = texto;
  notice.className = `notice ${tipo}`;
}

// Limpia la información visual del lote en la interfaz
function limpiarLoteUI() {
  infoUidLote.textContent = "-";
  infoLote.textContent = "-";
  infoProducto.textContent = "-";
  infoCantidad.textContent = "-";
  infoUbicacionLote.textContent = "-";
  infoUltimoAlmacen.textContent = "-";
  infoTipoMovimiento.textContent = "-";
}

// Limpia la información visual del autorizador en la interfaz
function limpiarAutorUI() {
  infoUidAutor.textContent = "-";
  infoNombreAutor.textContent = "-";
  infoRolAutor.textContent = "-";
  infoAlmacenAutor.textContent = "-";
  infoActivoAutor.textContent = "-";
}

// Elimina de Firebase el último escaneo del lector seleccionado
// También reinicia la visualización del UID actual
async function limpiarUltimoEscaneo() {
  try {
    const lector = lectorSeleccionado.value;
    await remove(ref(db, `escaneos/${lector}/ultimo`));
    uidActual.textContent = "Esperando escaneo...";
    detalleEscaneo.textContent = "";
  } catch (e) {
    console.error("No se pudo limpiar ultimo escaneo:", e);
  }
}

// Reinicia toda la operación al estado inicial
function resetOperacion() {
  paso = 1;
  ultimoProcesado = "";
  loteActual = null;
  autorizadorActual = null;
  uidLoteActual = "";
  uidAutorizadorActual = "";
  tipoMovimientoActual = "";
  bloqueado = false;

  limpiarLoteUI();
  limpiarAutorUI();

  estadoOperacion.textContent = "Esperando lote";
  subEstado.textContent = "La primera tarjeta se tomará como lote.";
  setNotice("Escanee la tarjeta del lote.", "info");
}

// Obtiene desde Firebase el último escaneo del lector seleccionado
async function obtenerEscaneoLector() {
  const lector = lectorSeleccionado.value;
  const snap = await get(ref(db, `escaneos/${lector}/ultimo`));
  return snap.exists() ? snap.val() : null;
}

// Refresca en la interfaz el último UID escaneado
// Si no hay datos, deja el estado como "Esperando escaneo..."
async function refrescarUltimoEscaneo() {
  const data = await obtenerEscaneoLector();

  if (!data || !data.uid) {
    uidActual.textContent = "Esperando escaneo...";
    detalleEscaneo.textContent = "";
    return null;
  }

  uidActual.textContent = data.uid;
  detalleEscaneo.textContent = `Lector: ${data.lector || "-"} | Hora: ${data.timestamp || "-"}`;
  return data;
}

// Función principal que revisa si hay un nuevo escaneo y decide qué hacer según el paso actual
async function procesarEscaneo() {
  if (bloqueado) return;

  const data = await refrescarUltimoEscaneo();
  if (!data) return;

  // Se crea una huella única del escaneo para no procesarlo dos veces
  const hash = `${data.uid}|${data.timestamp}|${data.lector}`;
  if (hash === ultimoProcesado) return;

  ultimoProcesado = hash;

  // Paso 1: esperar un lote
  if (paso === 1) {
    await manejarLote(data.uid);
    return;
  }

  // Paso 2: esperar un autorizador
  if (paso === 2) {
    await manejarAutorizador(data.uid);
  }
}

// Procesa una tarjeta escaneada como lote
async function manejarLote(uid) {
  const snap = await get(ref(db, `lotes/${uid}`));

  // Si el UID no existe en la colección de lotes, se marca como inválido
  if (!snap.exists()) {
    setNotice("Tarjeta no enlazada al sistema.", "err");
    estadoOperacion.textContent = "Lote inválido";
    subEstado.textContent = "Escanee un lote válido.";
    await limpiarUltimoEscaneo();
    return;
  }

  // Guarda la información del lote encontrado
  loteActual = snap.val();
  uidLoteActual = uid;

  const almacen = obtenerAlmacenDesdeLector(lectorSeleccionado.value);
  const ubicacionActual = loteActual.ubicacion || "";
  const ultimoAlmacen = loteActual.ultimo_almacen || "";

  // Determina automáticamente si el movimiento será entrada o salida
  if (ubicacionActual === almacen) {
    tipoMovimientoActual = "SALIDA";
  } else if (ubicacionActual === "TRANSITO") {
    if (ultimoAlmacen === almacen) {
      setNotice("No puede regresar al mismo almacén.", "err");
      estadoOperacion.textContent = "Operación bloqueada";
      subEstado.textContent = "Este lote salió de este mismo almacén.";
      await limpiarUltimoEscaneo();
      return;
    }
    tipoMovimientoActual = "ENTRADA";
  } else {
    setNotice("No pertenece a este almacén.", "err");
    estadoOperacion.textContent = "Operación bloqueada";
    subEstado.textContent =
      "El lote no puede operarse desde este lector.";
    await limpiarUltimoEscaneo();
    return;
  }

  // Muestra la información del lote en pantalla
  infoUidLote.textContent = uid;
  infoLote.textContent = loteActual.lote || "-";
  infoProducto.textContent = loteActual.producto || "-";
  infoCantidad.textContent = loteActual.cantidad ?? "-";
  infoUbicacionLote.textContent = loteActual.ubicacion || "-";
  infoUltimoAlmacen.textContent = loteActual.ultimo_almacen || "-";
  infoTipoMovimiento.textContent = tipoMovimientoActual;

  // Cambia al paso 2: esperar autorizador
  paso = 2;
  estadoOperacion.textContent = `Esperando autorizador (${tipoMovimientoActual})`;
  subEstado.textContent = `Movimiento detectado automáticamente: ${tipoMovimientoActual}`;
  setNotice(
    "Ahora escanee la tarjeta de quien autoriza esta operación.",
    "info",
  );

  await limpiarUltimoEscaneo();
}

// Procesa una tarjeta escaneada como autorizador
async function manejarAutorizador(uid) {
  // Evita que se use la misma tarjeta del lote como autorizador
  if (uid === uidLoteActual) {
    setNotice(
      "La tarjeta del autorizador no puede ser la misma del lote.",
      "err",
    );
    estadoOperacion.textContent = "Autorizador inválido";
    subEstado.textContent = "Escanee una tarjeta autorizadora distinta.";
    await limpiarUltimoEscaneo();
    return;
  }

  const snap = await get(ref(db, `autorizadores/${uid}`));

  // Si el UID no existe como autorizador, se rechaza
  if (!snap.exists()) {
    setNotice("Ese UID no está registrado como autorizador.", "err");
    estadoOperacion.textContent = "Autorizador inválido";
    subEstado.textContent = "Escanee una tarjeta autorizadora válida.";
    await limpiarUltimoEscaneo();
    return;
  }

  const autor = snap.val();

  // Si el autorizador está inactivo, se rechaza
  if (!autor.activo) {
    setNotice("El autorizador está inactivo.", "err");
    estadoOperacion.textContent = "Autorizador inactivo";
    subEstado.textContent = "Escanee otra tarjeta autorizadora.";
    await limpiarUltimoEscaneo();
    return;
  }

  // Guarda la información del autorizador válido
  autorizadorActual = autor;
  uidAutorizadorActual = uid;

  // Muestra información del autorizador en pantalla
  infoUidAutor.textContent = uid;
  infoNombreAutor.textContent = autor.nombre || "-";
  infoRolAutor.textContent = autor.rol || "-";
  infoAlmacenAutor.textContent = autor.almacen || "-";
  infoActivoAutor.textContent = autor.activo ? "Sí" : "No";

  // Cambia al paso 3: registrar movimiento
  paso = 3;
  bloqueado = true;

  estadoOperacion.textContent = "Procesando movimiento";
  subEstado.textContent = `${tipoMovimientoActual} autorizada. Registrando automáticamente...`;
  setNotice("Autorización válida. Registrando movimiento...", "ok");

  await limpiarUltimoEscaneo();
  await registrarMovimientoAutomatico();
}

// Registra automáticamente el movimiento en Firebase y actualiza el estado del lote
async function registrarMovimientoAutomatico() {
  try {
    // Verifica que todos los datos necesarios estén presentes
    if (
      !loteActual ||
      !autorizadorActual ||
      !uidLoteActual ||
      !uidAutorizadorActual ||
      !tipoMovimientoActual
    ) {
      throw new Error("Faltan datos para registrar el movimiento.");
    }

    const uidLote = uidLoteActual;
    const uidAutor = uidAutorizadorActual;
    const almacen = obtenerAlmacenDesdeLector(lectorSeleccionado.value);

    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10);
    const hora = ahora.toTimeString().slice(0, 8);

    // Si es salida, el lote pasa a TRANSITO y guarda el último almacén
    if (tipoMovimientoActual === "SALIDA") {
      await update(ref(db, `lotes/${uidLote}`), {
        ubicacion: "TRANSITO",
        ultimo_almacen: almacen,
      });
    } else if (tipoMovimientoActual === "ENTRADA") {
      // Si es entrada, el lote pasa al almacén actual
      await update(ref(db, `lotes/${uidLote}`), {
        ubicacion: almacen,
      });
    }

    // Registra el movimiento en la colección "movimientos"
    await push(ref(db, "movimientos"), {
      uid_producto: uidLote,
      tipo: tipoMovimientoActual,
      almacen: almacen,
      fecha: fecha,
      hora: hora,
      uid_autorizador: uidAutor,
      lector: lectorSeleccionado.value,
    });

    setNotice(`${tipoMovimientoActual} registrada correctamente.`, "ok");
    estadoOperacion.textContent = `${tipoMovimientoActual} completada`;
    subEstado.textContent = `Lote ${uidLote} procesado correctamente.`;

    // Reinicia el flujo después de un pequeño tiempo
    setTimeout(() => {
      resetOperacion();
    }, 2200);
  } catch (error) {
    // Manejo de errores durante el registro del movimiento
    setNotice(`Error al registrar movimiento: ${error.message}`, "err");
    estadoOperacion.textContent = "Error en operación";
    subEstado.textContent = "Reiniciando flujo...";

    setTimeout(() => {
      resetOperacion();
    }, 2500);
  }
}

// Listener en tiempo real para mostrar los movimientos recientes
onValue(ref(db, "movimientos"), (snapshot) => {
  const data = snapshot.val();
  tablaMovimientos.innerHTML = "";
  if (!data) return;

  // Convierte el objeto en arreglo y lo invierte para mostrar lo más reciente primero
  const entries = Object.entries(data).reverse();

  // Muestra solo los últimos 30 movimientos
  entries.slice(0, 30).forEach(([key, item]) => {
    const tr = document.createElement("tr");

    // Formatea visualmente el tipo de movimiento con badges
    let tipoHtml = item.tipo || "";
    if (item.tipo === "ENTRADA") {
      tipoHtml = `<span class="badge entrada">ENTRADA</span>`;
    } else if (item.tipo === "SALIDA") {
      tipoHtml = `<span class="badge salida">SALIDA</span>`;
    }

    tr.innerHTML = `
          <td>${item.uid_producto || ""}</td>
          <td>${tipoHtml}</td>
          <td>${item.almacen || ""}</td>
          <td>${item.uid_autorizador || ""}</td>
          <td>${item.fecha || ""}</td>
          <td>${item.hora || ""}</td>
          <td>${item.lector || ""}</td>
        `;

    tablaMovimientos.appendChild(tr);
  });
});

// Cuando cambia el lector:
// 1. Actualiza el almacén detectado
// 2. Limpia la marca del último escaneo procesado
// 3. Refresca visualmente el último escaneo
// 4. Reinicia la operación
lectorSeleccionado.addEventListener("change", async () => {
  refrescarAlmacenDetectado();
  ultimoProcesado = "";
  await refrescarUltimoEscaneo();
  resetOperacion();
});

// Inicialización de la interfaz al cargar la página
refrescarAlmacenDetectado();
resetOperacion();
setInterval(procesarEscaneo, 1000);
refrescarUltimoEscaneo();