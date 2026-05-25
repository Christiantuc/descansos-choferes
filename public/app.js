const STORAGE_KEY_LEGACY = "descansos-choferes";
const SESSION_KEY = "descansos-usuario-sesion";

const USUARIOS_HABILITADOS = [
  "Christian",
  "Ariel",
  "Yamil",
  "Jorge",
  "Sebastian",
  "Dario",
  "Invitado",
];

let sesionMemoria = null;
let appInicializada = false;
let solicitudesCache = [];
let idsProximos = new Set();

let loginScreen;
let appScreen;
let loginForm;
let loginMessage;
let nombreUsuarioInput;
let usuarioActivoEl;
let btnCerrarSesion;
let alertasSection;
let alertasLista;
let form;
let formMessage;
let solicitudesBody;
let emptyState;
let tableWrapper;
let totalCount;
let fechaSolicitudInput;
let btnExportarExcel;
let btnExportarPdf;

function normalizarNombre(nombre) {
  return String(nombre)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buscarUsuarioHabilitado(nombre) {
  const normalizado = normalizarNombre(nombre);
  if (!normalizado) return null;
  return (
    USUARIOS_HABILITADOS.find((u) => normalizarNombre(u) === normalizado) ||
    null
  );
}

function getSesion() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || sesionMemoria;
  } catch {
    return sesionMemoria;
  }
}

function setSesion(nombre) {
  sesionMemoria = nombre;
  try {
    sessionStorage.setItem(SESSION_KEY, nombre);
  } catch {
    /* ignorar */
  }
}

function clearSesion() {
  sesionMemoria = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const usuario = getSesion();
  if (usuario) {
    headers["X-Usuario"] = usuario;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    const error = new Error(data?.error || "Error en la solicitud.");
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return data;
}

function showLoginMessage(text) {
  if (!loginMessage) return;
  loginMessage.textContent = text;
  loginMessage.className = "form-message login-message error";
}

function clearLoginMessage() {
  if (!loginMessage) return;
  loginMessage.textContent = "";
  loginMessage.className = "form-message login-message";
}

function mostrarPantalla(pantalla) {
  if (loginScreen) {
    loginScreen.classList.toggle("is-hidden", pantalla !== "login");
  }
  if (appScreen) {
    appScreen.classList.toggle("is-hidden", pantalla !== "app");
  }
}

function mostrarLogin() {
  mostrarPantalla("login");
  if (loginForm) loginForm.reset();
  clearLoginMessage();
  if (nombreUsuarioInput) nombreUsuarioInput.focus();
}

function formatDate(isoDate) {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function textoDiasRestantes(dias) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias < 0) return `vencido hace ${Math.abs(dias)} días`;
  return `en ${dias} días`;
}

function showMessage(text, type = "success") {
  if (!formMessage) return;
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  if (text) {
    setTimeout(() => {
      if (formMessage.textContent === text) {
        formMessage.textContent = "";
        formMessage.className = "form-message";
      }
    }, 4000);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function migrarDatosLocales() {
  let locales = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY);
    locales = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(locales) || locales.length === 0) return;
  } catch {
    return;
  }

  const existentes = await apiFetch("/api/solicitudes");
  if (existentes.length > 0) {
    localStorage.removeItem(STORAGE_KEY_LEGACY);
    return;
  }

  for (const solicitud of locales) {
    await apiFetch("/api/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        nombreChofer: solicitud.nombreChofer,
        fechaSolicitud: solicitud.fechaSolicitud,
        fechaDescanso: solicitud.fechaDescanso,
        motivo: solicitud.motivo,
      }),
    });
  }

  localStorage.removeItem(STORAGE_KEY_LEGACY);
  showMessage("Se importaron solicitudes guardadas anteriormente en este navegador.", "success");
}

async function cargarSolicitudes() {
  solicitudesCache = await apiFetch("/api/solicitudes");
  return solicitudesCache;
}

async function cargarAlertas() {
  const alertas = await apiFetch("/api/alertas/proximas");
  idsProximos = new Set(alertas.solicitudes.map((s) => s.id));
  renderAlertas(alertas);
}

function renderAlertas(alertas) {
  if (!alertasSection || !alertasLista) return;

  const items = alertas.solicitudes || [];
  alertasSection.classList.toggle("is-hidden", items.length === 0);

  if (items.length === 0) {
    alertasLista.innerHTML = "";
    return;
  }

  alertasLista.innerHTML = items
    .map((s) => {
      const diasTexto = textoDiasRestantes(s.diasRestantes);
      const urgenteClass = s.urgente ? "alerta-urgente" : "";
      const urgenteBadge = s.urgente ? '<span class="badge-urgente">¡URGENTE!</span>' : '';
      return `<li class="${urgenteClass}">
        ${urgenteBadge}
        <strong>${escapeHtml(s.nombreChofer)}</strong> —
        descanso ${formatDate(s.fechaDescanso)} (${diasTexto})
      </li>`;
    })
    .join("");
}

function renderSolicitudes() {
  if (!solicitudesBody) return;

  const solicitudes = solicitudesCache;
  const count = solicitudes.length;

  if (totalCount) totalCount.textContent = String(count);
  if (emptyState) emptyState.classList.toggle("is-hidden", count > 0);
  if (tableWrapper) tableWrapper.classList.toggle("is-hidden", count === 0);

  solicitudesBody.innerHTML = solicitudes
    .map((s) => {
      const proxima = idsProximos.has(s.id) ? "fila-proxima" : "";
      const cumplidaClass = s.cumplida ? "fila-cumplida" : "";
      const cumplidaBadge = s.cumplida ? '<span class="badge-cumplida">Cumplida</span>' : '';
      return `
      <tr data-id="${s.id}" class="${proxima} ${cumplidaClass}">
        <td>${escapeHtml(s.nombreChofer)} ${cumplidaBadge}</td>
        <td>${formatDate(s.fechaSolicitud)}</td>
        <td>${formatDate(s.fechaDescanso)}</td>
        <td class="motivo-cell">${escapeHtml(s.motivo)}</td>
        <td>
          ${!s.cumplida ? `<button type="button" class="btn btn-secondary btn-sm btn-cumplir" data-id="${s.id}">
            Marcar cumplida
          </button>` : `<button type="button" class="btn btn-secondary btn-sm btn-reactivar" data-id="${s.id}">
            Reactivar
          </button>`}
          <button type="button" class="btn btn-danger btn-eliminar" data-id="${s.id}">
            Eliminar
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  solicitudesBody.querySelectorAll(".btn-eliminar").forEach((btn) => {
    btn.addEventListener("click", () => eliminarSolicitud(btn.dataset.id));
  });

  solicitudesBody.querySelectorAll(".btn-cumplir").forEach((btn) => {
    btn.addEventListener("click", () => marcarComoCumplida(btn.dataset.id, true));
  });

  solicitudesBody.querySelectorAll(".btn-reactivar").forEach((btn) => {
    btn.addEventListener("click", () => marcarComoCumplida(btn.dataset.id, false));
  });
}

async function refrescarVista() {
  await cargarSolicitudes();
  await cargarAlertas();
  renderSolicitudes();
}

async function eliminarSolicitud(id) {
  await apiFetch(`/api/solicitudes/${id}`, { method: "DELETE" });
  await refrescarVista();
}

async function marcarComoCumplida(id, cumplida) {
  await apiFetch(`/api/solicitudes/${id}/cumplida`, {
    method: "PATCH",
    body: JSON.stringify({ cumplida }),
  });
  await refrescarVista();
}

async function onSolicitudSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const nombreChofer = String(formData.get("nombreChofer") || "").trim();
  const fechaSolicitud = formData.get("fechaSolicitud");
  const fechaDescanso = formData.get("fechaDescanso");
  const motivo = String(formData.get("motivo") || "").trim();

  if (!nombreChofer || !fechaSolicitud || !fechaDescanso) {
    showMessage("Complete todos los campos obligatorios.", "error");
    return;
  }

  try {
    await apiFetch("/api/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        nombreChofer,
        fechaSolicitud,
        fechaDescanso,
        motivo,
      }),
    });

    form.reset();
    setDefaultFechaSolicitud();
    await refrescarVista();
    showMessage("Solicitud registrada correctamente.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function setDefaultFechaSolicitud() {
  if (!fechaSolicitudInput) return;
  const today = new Date().toISOString().slice(0, 10);
  fechaSolicitudInput.value = today;
}

function inicializarApp() {
  if (appInicializada || !form) return;
  form.addEventListener("submit", onSolicitudSubmit);
  appInicializada = true;
}

async function mostrarApp(nombreUsuario) {
  mostrarPantalla("app");
  if (usuarioActivoEl) usuarioActivoEl.textContent = nombreUsuario;
  inicializarApp();
  setDefaultFechaSolicitud();

  try {
    await migrarDatosLocales();
    await refrescarVista();
  } catch (error) {
    showMessage(
      error.message || "No se pudo conectar con el servidor.",
      "error"
    );
  }
}

async function iniciarSesion(nombreIngresado) {
  const usuario = buscarUsuarioHabilitado(nombreIngresado);

  if (!usuario) {
    showLoginMessage("No es un usuario habilitado.");
    return;
  }

  try {
    await apiFetch("/api/auth/validar", {
      method: "POST",
      body: JSON.stringify({ nombre: usuario }),
    });

    setSesion(usuario);
    await mostrarApp(usuario);
  } catch (error) {
    if (error.status === 401) {
      showLoginMessage("No es un usuario habilitado.");
      return;
    }

    showLoginMessage(
      "No se pudo conectar con el servidor. Ejecute: npm start"
    );
  }
}

async function onLoginSubmit(event) {
  event.preventDefault();

  const nombre =
    nombreUsuarioInput?.value?.trim() ||
    new FormData(loginForm).get("nombreUsuario")?.toString().trim() ||
    "";

  if (!nombre) {
    showLoginMessage("Ingrese su nombre para continuar.");
    return;
  }

  await iniciarSesion(nombre);
}

function onCerrarSesion() {
  clearSesion();
  solicitudesCache = [];
  idsProximos = new Set();
  mostrarLogin();
}

async function exportarExcel() {
  if (solicitudesCache.length === 0) {
    showMessage("No hay solicitudes para exportar.", "error");
    return;
  }

  try {
    if (typeof XLSX === 'undefined') {
      showMessage("Librería XLSX no cargada. Recargue la página.", "error");
      return;
    }

    const datos = solicitudesCache.map(s => ({
      "Chofer": s.nombreChofer,
      "Fecha Solicitud": formatDate(s.fechaSolicitud),
      "Fecha Descanso": formatDate(s.fechaDescanso),
      "Motivo": s.motivo,
      "Cumplida": s.cumplida ? "Sí" : "No",
      "Registrado Por": s.registradoPor,
      "Fecha Registro": new Date(s.creadoEn).toLocaleString('es-AR')
    }));

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");

    const fechaHoy = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `descansos_${fechaHoy}.xlsx`);

    showMessage("Archivo Excel exportado correctamente.", "success");
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    showMessage("Error al exportar Excel. Intente nuevamente.", "error");
  }
}

async function exportarPdf() {
  if (solicitudesCache.length === 0) {
    showMessage("No hay solicitudes para exportar.", "error");
    return;
  }

  try {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
      showMessage("Librería jsPDF no cargada. Recargue la página.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Solicitudes de Descanso", 14, 22);

    doc.setFontSize(11);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);
    doc.text(`Total de solicitudes: ${solicitudesCache.length}`, 14, 37);

    const datos = solicitudesCache.map(s => [
      s.nombreChofer,
      formatDate(s.fechaSolicitud),
      formatDate(s.fechaDescanso),
      s.motivo,
      s.cumplida ? "Sí" : "No",
      s.registradoPor
    ]);

    doc.autoTable({
      startY: 45,
      head: [["Chofer", "Fecha Solicitud", "Fecha Descanso", "Motivo", "Cumplida", "Registrado Por"]],
      body: datos,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    const fechaHoy = new Date().toISOString().slice(0, 10);
    doc.save(`descansos_${fechaHoy}.pdf`);

    showMessage("Archivo PDF exportado correctamente.", "success");
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    showMessage("Error al exportar PDF. Intente nuevamente.", "error");
  }
}

function enlazarElementos() {
  loginScreen = document.getElementById("login-screen");
  appScreen = document.getElementById("app-screen");
  loginForm = document.getElementById("login-form");
  loginMessage = document.getElementById("login-message");
  nombreUsuarioInput = document.getElementById("nombre-usuario");
  usuarioActivoEl = document.getElementById("usuario-activo");
  btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
  alertasSection = document.getElementById("alertas-section");
  alertasLista = document.getElementById("alertas-lista");
  form = document.getElementById("solicitud-form");
  formMessage = document.getElementById("form-message");
  solicitudesBody = document.getElementById("solicitudes-body");
  emptyState = document.getElementById("empty-state");
  tableWrapper = document.getElementById("table-wrapper");
  totalCount = document.getElementById("total-count");
  fechaSolicitudInput = document.getElementById("fecha-solicitud");
  btnExportarExcel = document.getElementById("btn-exportar-excel");
  btnExportarPdf = document.getElementById("btn-exportar-pdf");
}

async function iniciar() {
  enlazarElementos();

  if (!loginForm) {
    console.error("No se encontró el formulario de login.");
    return;
  }

  loginForm.addEventListener("submit", onLoginSubmit);
  btnCerrarSesion?.addEventListener("click", onCerrarSesion);
  btnExportarExcel?.addEventListener("click", exportarExcel);
  btnExportarPdf?.addEventListener("click", exportarPdf);

  const sesionActiva = getSesion();
  const usuarioValido = sesionActiva
    ? buscarUsuarioHabilitado(sesionActiva)
    : null;

  if (usuarioValido) {
    setSesion(usuarioValido);
    await mostrarApp(usuarioValido);
  } else {
    clearSesion();
    mostrarLogin();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
