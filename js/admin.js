// Importa la función para inicializar la app de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Importa funciones necesarias de Firebase Realtime Database
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Configuración del proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAtk_GeNUEOzBQnPQvJsUEdQVEGaQRExg8",
  databaseURL: "https://traslado-almacen-default-rtdb.firebaseio.com/",
  projectId: "traslado-almacen",
};

// Inicializa Firebase con la configuración indicada
const app = initializeApp(firebaseConfig);

// Obtiene la instancia de la base de datos en tiempo real
const db = getDatabase(app);

// Referencias a elementos del DOM para mensajes y selección de lector
const msg = document.getElementById("msg");
const lectorSeleccionado = document.getElementById("lectorSeleccionado");
const uidActual = document.getElementById("uidActual");
const detalleEscaneo = document.getElementById("detalleEscaneo");

// Referencias a pestañas y tarjetas visuales del panel
const tabAutor = document.getElementById("tabAutor");
const tabLote = document.getElementById("tabLote");
const cardAutor = document.getElementById("cardAutor");
const cardLote = document.getElementById("cardLote");

// Referencias a indicadores de modo de edición
const modoAutor = document.getElementById("modoAutor");
const modoLote = document.getElementById("modoLote");

// Referencias a campos del formulario de autorizadores
const a_uid = document.getElementById("a_uid");
const a_nombre = document.getElementById("a_nombre");
const a_rol = document.getElementById("a_rol");
const a_almacen = document.getElementById("a_almacen");
const a_activo = document.getElementById("a_activo");

// Referencias a campos del formulario de lotes
const l_uid = document.getElementById("l_uid");
const l_nombre = document.getElementById("l_nombre");
const l_ubicacion = document.getElementById("l_ubicacion");
const l_ultimo = document.getElementById("l_ultimo");
const l_desc = document.getElementById("l_desc");

// Referencias a las tablas donde se listan autorizadores y lotes
const tablaAutorizadores = document.getElementById("tablaAutorizadores");
const tablaLotes = document.getElementById("tablaLotes");

// Guarda la información del último escaneo detectado
let ultimoTomado = { uid: "", lector: "", timestamp: "" };

// Indican si actualmente se está editando un autorizador o un lote
let editandoAutor = false;
let editandoLote = false;

// Muestra un mensaje temporal en pantalla
// tipo puede ser "ok" o "err"
function showMsg(texto, tipo = "ok") {
  msg.textContent = texto;
  msg.className = `msg ${tipo}`;
  setTimeout(() => (msg.className = "msg"), 3000);
}

// Activa visualmente la pestaña indicada y muestra su tarjeta correspondiente
function activarTab(tipo) {
  tabAutor.classList.remove("active");
  tabLote.classList.remove("active");
  cardAutor.classList.remove("active");
  cardLote.classList.remove("active");

  if (tipo === "autor") {
    tabAutor.classList.add("active");
    cardAutor.classList.add("active");
  } else {
    tabLote.classList.add("active");
    cardLote.classList.add("active");
  }
}

// Eventos para cambiar manualmente entre pestañas
tabAutor.addEventListener("click", () => activarTab("autor"));
tabLote.addEventListener("click", () => activarTab("lote"));

// Define si el formulario de autorizadores está en modo edición o nuevo registro
function setModoAutorEditando(valor) {
  editandoAutor = valor;
  modoAutor.textContent = valor ? "Modo: edición" : "Modo: nuevo registro";
}

// Define si el formulario de lotes está en modo edición o nuevo registro
function setModoLoteEditando(valor) {
  editandoLote = valor;
  modoLote.textContent = valor ? "Modo: edición" : "Modo: nuevo registro";
}

// Obtiene el último escaneo desde Firebase según el lector seleccionado
async function obtenerUltimoEscaneo() {
  const lector = lectorSeleccionado.value;

  // Si se selecciona "CUALQUIERA", compara ambos lectores y toma el más reciente
  if (lector === "CUALQUIERA") {
    const [snapA, snapB] = await Promise.all([
      get(ref(db, "escaneos/ESP_ALMACEN_A/ultimo")),
      get(ref(db, "escaneos/ESP_ALMACEN_B/ultimo")),
    ]);

    const a = snapA.exists() ? snapA.val() : null;
    const b = snapB.exists() ? snapB.val() : null;

    if (!a && !b) return null;
    if (a && !b) return a;
    if (!a && b) return b;

    return (a.millis || 0) >= (b.millis || 0) ? a : b;
  } else {
    // Si se selecciona un lector específico, lee solo ese nodo
    const snap = await get(ref(db, `escaneos/${lector}/ultimo`));
    return snap.exists() ? snap.val() : null;
  }
}

// Refresca en pantalla la información del último escaneo
async function refrescarEscaneo() {
  const data = await obtenerUltimoEscaneo();

  // Si no hay datos, limpia el texto visual
  if (!data || !data.uid) {
    uidActual.textContent = "Esperando escaneo...";
    detalleEscaneo.textContent = "";
    return;
  }

  // Detecta si hubo un cambio real con respecto al último escaneo mostrado
  const cambio =
    data.uid !== ultimoTomado.uid ||
    data.lector !== ultimoTomado.lector ||
    data.timestamp !== ultimoTomado.timestamp;

  // Actualiza el área visual del último UID escaneado
  uidActual.textContent = data.uid;
  detalleEscaneo.textContent = `Lector: ${data.lector || "-"} | Hora: ${data.timestamp || "-"}`;

  // Si hubo cambio, llena automáticamente los UID en formularios
  // excepto si el usuario está editando alguno de ellos
  if (cambio) {
    if (!editandoAutor) a_uid.value = data.uid;
    if (!editandoLote) l_uid.value = data.uid;
    ultimoTomado = data;
  }
}

// Refresca el último escaneo cada segundo
setInterval(refrescarEscaneo, 1000);

// También refresca al cambiar el lector seleccionado
lectorSeleccionado.addEventListener("change", refrescarEscaneo);

// Primera carga visual del escaneo al iniciar
refrescarEscaneo();

// Evento para guardar o actualizar un autorizador
document.getElementById("guardarAutor").addEventListener("click", async () => {
  const uid = a_uid.value.trim();

  // Valida que exista un UID
  if (!uid) return showMsg("Primero escanea una tarjeta o selecciona un registro.", "err");

  // Valida campos obligatorios
  if (!a_nombre.value.trim() || !a_rol.value.trim()) {
    return showMsg("Completa los campos.", "err");
  }

  // Lee el registro actual para conservar fecha_registro si ya existía
  const snapActual = await get(ref(db, `autorizadores/${uid}`));
  const anterior = snapActual.exists() ? snapActual.val() : {};

  // Guarda el autorizador en Firebase
  await set(ref(db, `autorizadores/${uid}`), {
    uid,
    nombre: a_nombre.value.trim(),
    rol: a_rol.value.trim(),
    almacen: a_almacen.value,
    activo: a_activo.value === "true",
    fecha_registro: anterior.fecha_registro || new Date().toLocaleString(),
  });

  // Muestra mensaje según si era edición o nuevo registro
  showMsg(editandoAutor ? "Autorizador actualizado." : "Autorizador guardado.");
  limpiarFormularioAutor();
});

// Evento para guardar o actualizar un lote
document.getElementById("guardarLote").addEventListener("click", async () => {
  const uid = l_uid.value.trim();

  // Valida que exista un UID
  if (!uid) return showMsg("Primero escanea una tarjeta o selecciona un registro.", "err");

  // Valida que el nombre del lote no esté vacío
  if (!l_nombre.value.trim()) {
    return showMsg("Completa el nombre del lote.", "err");
  }

  // Lee el registro anterior para conservar fecha_registro si ya existía
  const snapActual = await get(ref(db, `lotes/${uid}`));
  const anterior = snapActual.exists() ? snapActual.val() : {};

  // Guarda el lote en Firebase
  await set(ref(db, `lotes/${uid}`), {
    uid,
    nombre_lote: l_nombre.value.trim(),
    ubicacion: l_ubicacion.value,
    ultimo_almacen: l_ultimo.value,
    descripcion: l_desc.value.trim(),
    fecha_registro: anterior.fecha_registro || new Date().toLocaleString(),
  });

  // Muestra mensaje según si era edición o nuevo registro
  showMsg(editandoLote ? "Lote actualizado." : "Lote guardado.");
  limpiarFormularioLote();
});

// Limpia el formulario de autorizadores y lo deja en modo nuevo registro
function limpiarFormularioAutor() {
  a_uid.value = "";
  a_nombre.value = "";
  a_rol.value = "";
  a_almacen.value = "A";
  a_activo.value = "true";
  setModoAutorEditando(false);
}

// Limpia el formulario de lotes y lo deja en modo nuevo registro
function limpiarFormularioLote() {
  l_uid.value = "";
  l_nombre.value = "";
  l_ubicacion.value = "A";
  l_ultimo.value = "";
  l_desc.value = "";
  setModoLoteEditando(false);
}

// Evento para limpiar manualmente el formulario de autorizadores
document.getElementById("limpiarAutor").addEventListener("click", () => {
  limpiarFormularioAutor();
});

// Evento para limpiar manualmente el formulario de lotes
document.getElementById("limpiarLote").addEventListener("click", () => {
  limpiarFormularioLote();
});

// Escucha en tiempo real los autorizadores y llena la tabla
onValue(ref(db, "autorizadores"), (snapshot) => {
  const data = snapshot.val();
  tablaAutorizadores.innerHTML = "";
  if (!data) return;

  Object.keys(data).forEach((uid) => {
    const item = data[uid];
    const tr = document.createElement("tr");
    tr.className = "editable-row";

    // Renderiza la fila del autorizador
    tr.innerHTML = `
      <td>${uid}</td>
      <td>${item.nombre || ""}</td>
      <td>${item.rol || ""}</td>
      <td>${item.almacen || ""}</td>
      <td>${item.activo ? "Sí" : "No"}</td>
    `;

    // Al hacer clic en una fila, carga ese autorizador en el formulario para edición
    tr.addEventListener("click", () => {
      activarTab("autor");
      a_uid.value = uid;
      a_nombre.value = item.nombre || "";
      a_rol.value = item.rol || "";
      a_almacen.value = item.almacen || "A";
      a_activo.value = item.activo ? "true" : "false";
      setModoAutorEditando(true);
      showMsg("Autorizador cargado para edición.");
    });

    tablaAutorizadores.appendChild(tr);
  });
});

// Escucha en tiempo real los lotes y llena la tabla
onValue(ref(db, "lotes"), (snapshot) => {
  const data = snapshot.val();
  tablaLotes.innerHTML = "";
  if (!data) return;

  Object.keys(data).forEach((uid) => {
    const item = data[uid];
    const tr = document.createElement("tr");
    tr.className = "editable-row";

    // Renderiza la fila del lote
    tr.innerHTML = `
      <td>${uid}</td>
      <td>${item.nombre_lote || ""}</td>
      <td>${item.ubicacion || ""}</td>
      <td>${item.ultimo_almacen || ""}</td>
      <td>${item.descripcion || ""}</td>
    `;

    // Al hacer clic en una fila, carga ese lote en el formulario para edición
    tr.addEventListener("click", () => {
      activarTab("lote");
      l_uid.value = uid;
      l_nombre.value = item.nombre_lote || "";
      l_ubicacion.value = item.ubicacion || "A";
      l_ultimo.value = item.ultimo_almacen || "";
      l_desc.value = item.descripcion || "";
      setModoLoteEditando(true);
      showMsg("Lote cargado para edición.");
    });

    tablaLotes.appendChild(tr);
  });
});