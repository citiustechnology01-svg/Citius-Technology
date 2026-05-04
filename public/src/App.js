import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://msrxntdyrftbmolxqwtm.supabase.co";
const SUPABASE_KEY = "sb_publishable_uTA7Og21ZK7g33cjum77Hg_UZF3X5OV";

const db = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const COLORS = { red: "#E1251B", black: "#000000", gray: "#BBBCBB" };
const ETAPAS = ["Cotización", "Instalación", "Entrega", "Facturación", "Soporte"];
const ETAPA_COLORS = {
  Cotización: "#3b82f6", Instalación: "#f59e0b", Entrega: "#8b5cf6",
  Facturación: "#E1251B", Soporte: "#10b981",
};
const ESTADO_FACTURA = ["Pendiente", "Facturado", "Cobrado"];
const TIPO_TRABAJO = ["CCTV", "Alarmas", "CCTV + Alarmas", "Mantenimiento", "Otro"];
const ESTADO_CLIENTE = ["Prospecto", "Cliente Activo", "Cliente Recurrente"];

const Badge = ({ text, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{text}</span>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px #00000033" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box", ...props.style }} />
);

const Sel = ({ children, ...props }) => (
  <select {...props} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}>{children}</select>
);

const Textarea = (props) => (
  <textarea {...props} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box", minHeight: 72, resize: "vertical" }} />
);

const Btn = ({ children, onClick, color = COLORS.black, outline = false, small = false, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: small ? "5px 12px" : "8px 18px", background: outline ? "#fff" : disabled ? "#ccc" : color, color: outline ? color : "#fff", border: `2px solid ${disabled ? "#ccc" : color}`, borderRadius: 6, fontWeight: 600, fontSize: small ? 12 : 13, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
    <div style={{ width: 36, height: 36, border: "4px solid #eee", borderTop: `4px solid ${COLORS.red}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [view, setView] = useState("lista");
  const [clientes, setClientes] = useState([]);
  const [trabajos, setTrab] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [filterEtapa, setFilterEtapa] = useState("Todas");
  const [filterFactura, setFilterFactura] = useState("Todas");
  const [search, setSearch] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, t, h] = await Promise.all([
        db("clientes?order=created_at.desc"),
        db("trabajos?order=created_at.desc"),
        db("historial_trabajos?order=created_at.asc"),
      ]);
      setClientes(c); setTrab(t); setHistorial(h);
    } catch {
      setError("Error al conectar con la base de datos. Verifica que las tablas estén creadas en Supabase.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const closeModal = () => { setModal(null); setSelected(null); setForm({}); };

  const sinFacturar = trabajos.filter(t => (t.etapa === "Entrega" || t.etapa === "Soporte") && t.estado_factura === "Pendiente");
  const activos = trabajos.filter(t => !(t.etapa === "Soporte" && t.estado_factura === "Cobrado"));
  const completados = trabajos.filter(t => t.etapa === "Soporte" && t.estado_factura === "Cobrado");

  const trabajosFiltrados = trabajos.filter(t => {
    const c = clientes.find(c => c.id === t.cliente_id);
    const matchSearch = !search || t.titulo?.toLowerCase().includes(search.toLowerCase()) || c?.nombre?.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filterEtapa === "Todas" || t.etapa === filterEtapa) && (filterFactura === "Todas" || t.estado_factura === filterFactura);
  });

  const historialDeTrabajo = (id) => historial.filter(h => h.trabajo_id === id);

  const saveCliente = async () => {
    if (!form.nombre) return;
    setSaving(true);
    try {
      const payload = { nombre: form.nombre, ruc: form.ruc, contacto: form.contacto, telefono: form.telefono, email: form.email, direccion: form.direccion, estado: form.estado || "Prospecto", notas: form.notas };
      if (selected) await db(`clientes?id=eq.${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await db("clientes", { method: "POST", body: JSON.stringify(payload) });
      await loadAll(); closeModal();
    } catch { setError("Error al guardar cliente."); }
    setSaving(false);
  };

  const saveTrabajo = async () => {
    if (!form.titulo || !form.cliente_id) return;
    setSaving(true);
    try {
      const payload = { titulo: form.titulo, cliente_id: parseInt(form.cliente_id), tipo: form.tipo, tecnico: form.tecnico, fecha_inicio: form.fecha_inicio || null, fecha_entrega: form.fecha_entrega || null, etapa: form.etapa || "Cotización", estado_factura: form.estado_factura || "Pendiente", numero_factura: form.numero_factura, monto: form.monto ? parseFloat(form.monto) : null, observaciones: form.observaciones };
      if (selected) {
        await db(`trabajos?id=eq.${selected.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        const [nuevo] = await db("trabajos", { method: "POST", body: JSON.stringify(payload) });
        await db("historial_trabajos", { method: "POST", body: JSON.stringify({ trabajo_id: nuevo.id, etapa: payload.etapa, fecha: new Date().toISOString().split("T")[0], responsable: "Ricardo", nota: "Registro inicial" }) });
      }
      await loadAll(); closeModal();
    } catch (e) { setError("Error al guardar trabajo: " + e.message); }
    setSaving(false);
  };

  const avanzarEtapa = async (t) => {
    const idx = ETAPAS.indexOf(t.etapa);
    if (idx >= ETAPAS.length - 1) return;
    const nuevaEtapa = ETAPAS[idx + 1];
    setSaving(true);
    try {
      await db(`trabajos?id=eq.${t.id}`, { method: "PATCH", body: JSON.stringify({ etapa: nuevaEtapa }) });
      await db("historial_trabajos", { method: "POST", body: JSON.stringify({ trabajo_id: t.id, etapa: nuevaEtapa, fecha: new Date().toISOString().split("T")[0], responsable: "Ricardo", nota: "" }) });
      await loadAll();
      if (selected?.id === t.id) setSelected(s => ({ ...s, etapa: nuevaEtapa }));
    } catch { setError("Error al avanzar etapa."); }
    setSaving(false);
  };

  const openNuevoTrabajo = () => {
    setForm({ titulo: "", cliente_id: clientes[0]?.id || "", tipo: "CCTV", tecnico: "", fecha_inicio: new Date().toISOString().split("T")[0], fecha_entrega: "", etapa: "Cotización", estado_factura: "Pendiente", numero_factura: "", monto: "", observaciones: "" });
    setModal("nuevo_trabajo");
  };

  const openNuevoCliente = () => {
    setForm({ nombre: "", ruc: "", contacto: "", telefono: "", email: "", direccion: "", estado: "Prospecto", notas: "" });
    setModal("nuevo_cliente");
  };

  const openDetalle = (item, type) => { setSelected(item); setForm({ ...item }); setModal(type); };

  const TabBtn = ({ id, label, icon }) => (
    <button onClick={() => setTab(id)} style={{ padding: "10px 18px", background: tab === id ? COLORS.red : "transparent", color: tab === id ? "#fff" : "#333", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
      <span>{icon}</span>{label}
    </button>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: COLORS.black, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: COLORS.red, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 14 }}>CT</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>CITIUS Technology</div>
          <div style={{ color: COLORS.gray, fontSize: 11 }}>Gestión de Proyectos</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <span style={{ color: COLORS.gray, fontSize: 12 }}>Guardando...</span>}
          <button onClick={loadAll} style={{ background: "none", border: "1px solid #444", borderRadius: 6, color: "#aaa", padding: "4px 10px", fontSize: 12, cursor: "pointer" }}>↻ Actualizar</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: "#fff", padding: "8px 16px", borderBottom: "1px solid #eee", display: "flex", gap: 4, overflowX: "auto" }}>
        <TabBtn id="dashboard" label="Dashboard" icon="📊" />
        <TabBtn id="trabajos" label="Trabajos" icon="🔧" />
        <TabBtn id="clientes" label="Clientes" icon="👥" />
      </div>

      {error && (
        <div style={{ background: "#fff5f5", borderBottom: `1px solid ${COLORS.red}44`, color: COLORS.red, padding: "10px 20px", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.red }}>✕</button>
        </div>
      )}

      <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
        {loading ? <Spinner /> : (
          <>
            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Trabajos Activos", value: activos.length, color: "#3b82f6", icon: "🔧" },
                    { label: "Completados", value: completados.length, color: "#10b981", icon: "✅" },
                    { label: "Sin Facturar", value: sinFacturar.length, color: COLORS.red, icon: "⚠️" },
                    { label: "Clientes", value: clientes.filter(c => c.estado !== "Prospecto").length, color: "#8b5cf6", icon: "👥" },
                    { label: "Prospectos", value: clientes.filter(c => c.estado === "Prospecto").length, color: "#f59e0b", icon: "🎯" },
                  ].map((kpi, i) => (
                    <div key={i} style={{ background: "#fff", borderRadius: 10, padding: 16, borderLeft: `4px solid ${kpi.color}`, boxShadow: "0 1px 4px #0001" }}>
                      <div style={{ fontSize: 22 }}>{kpi.icon}</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                      <div style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {sinFacturar.length > 0 && (
                  <div style={{ background: "#fff5f5", border: `2px solid ${COLORS.red}44`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, color: COLORS.red, marginBottom: 10, fontSize: 14 }}>⚠️ Trabajos completados SIN FACTURAR ({sinFacturar.length})</div>
                    {sinFacturar.map(t => {
                      const c = clientes.find(cl => cl.id === t.cliente_id);
                      return (
                        <div key={t.id} onClick={() => openDetalle(t, "detalle_trabajo")} style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: "1px solid #fecaca" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{t.titulo}</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{c?.nombre} • Etapa: {t.etapa}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Badge text="Sin Facturar" color={COLORS.red} />
                            {t.monto && <span style={{ fontWeight: 700, fontSize: 13 }}>${parseFloat(t.monto).toLocaleString()}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 4px #0001" }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Trabajos por Etapa</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ETAPAS.map(e => {
                      const count = trabajos.filter(t => t.etapa === e).length;
                      return (
                        <div key={e} style={{ flex: 1, minWidth: 90, background: ETAPA_COLORS[e] + "15", border: `1px solid ${ETAPA_COLORS[e]}44`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: ETAPA_COLORS[e] }}>{count}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{e}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TRABAJOS */}
            {tab === "trabajos" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Trabajos ({trabajosFiltrados.length})</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setView("lista")} style={{ padding: "6px 12px", background: view === "lista" ? COLORS.black : "#fff", color: view === "lista" ? "#fff" : "#333", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📋 Lista</button>
                    <button onClick={() => setView("kanban")} style={{ padding: "6px 12px", background: view === "kanban" ? COLORS.black : "#fff", color: view === "kanban" ? "#fff" : "#333", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🗂️ Kanban</button>
                    <Btn onClick={openNuevoTrabajo} color={COLORS.red} small>+ Nuevo Trabajo</Btn>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <Input placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220, padding: "7px 10px" }} />
                  <Sel value={filterEtapa} onChange={e => setFilterEtapa(e.target.value)} style={{ maxWidth: 160 }}>
                    <option value="Todas">Todas las etapas</option>
                    {ETAPAS.map(e => <option key={e}>{e}</option>)}
                  </Sel>
                  <Sel value={filterFactura} onChange={e => setFilterFactura(e.target.value)} style={{ maxWidth: 160 }}>
                    <option value="Todas">Facturación</option>
                    {ESTADO_FACTURA.map(e => <option key={e}>{e}</option>)}
                  </Sel>
                  <Btn onClick={() => setFilterFactura("Pendiente")} color={COLORS.red} outline small>⚠️ Sin Facturar</Btn>
                </div>

                {view === "lista" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {trabajosFiltrados.length === 0 && <div style={{ textAlign: "center", color: "#aaa", padding: 40 }}>No hay trabajos registrados aún</div>}
                    {trabajosFiltrados.map(t => {
                      const c = clientes.find(cl => cl.id === t.cliente_id);
                      const sinFact = (t.etapa === "Entrega" || t.etapa === "Soporte") && t.estado_factura === "Pendiente";
                      return (
                        <div key={t.id} onClick={() => openDetalle(t, "detalle_trabajo")} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", boxShadow: "0 1px 4px #0001", cursor: "pointer", border: sinFact ? `2px solid ${COLORS.red}55` : "2px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{t.titulo}</div>
                            <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{c?.nombre} • {t.tipo}{t.tecnico ? ` • ${t.tecnico}` : ""}</div>
                            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{t.fecha_inicio && `Inicio: ${t.fecha_inicio}`}{t.fecha_entrega && ` • Entrega: ${t.fecha_entrega}`}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <Badge text={t.etapa} color={ETAPA_COLORS[t.etapa]} />
                            <Badge text={t.estado_factura} color={t.estado_factura === "Cobrado" ? "#10b981" : t.estado_factura === "Facturado" ? "#3b82f6" : COLORS.red} />
                            {t.monto && <span style={{ fontWeight: 700, fontSize: 13 }}>${parseFloat(t.monto).toLocaleString()}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {view === "kanban" && (
                  <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                    {ETAPAS.map(etapa => {
                      const items = trabajosFiltrados.filter(t => t.etapa === etapa);
                      return (
                        <div key={etapa} style={{ minWidth: 200, flex: "0 0 200px" }}>
                          <div style={{ background: ETAPA_COLORS[etapa], color: "#fff", borderRadius: "8px 8px 0 0", padding: "8px 12px", fontWeight: 700, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                            <span>{etapa}</span>
                            <span style={{ background: "#ffffff44", borderRadius: 10, padding: "0 7px" }}>{items.length}</span>
                          </div>
                          <div style={{ background: "#f8f8f8", borderRadius: "0 0 8px 8px", padding: 8, minHeight: 80, display: "flex", flexDirection: "column", gap: 6 }}>
                            {items.map(t => {
                              const c = clientes.find(cl => cl.id === t.cliente_id);
                              const sinFact = (t.etapa === "Entrega" || t.etapa === "Soporte") && t.estado_factura === "Pendiente";
                              return (
                                <div key={t.id} onClick={() => openDetalle(t, "detalle_trabajo")} style={{ background: "#fff", borderRadius: 7, padding: "8px 10px", cursor: "pointer", border: sinFact ? `2px solid ${COLORS.red}` : "1px solid #eee", boxShadow: "0 1px 3px #0001" }}>
                                  <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{t.titulo}</div>
                                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{c?.nombre}</div>
                                  {t.monto && <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>${parseFloat(t.monto).toLocaleString()}</div>}
                                  {sinFact && <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 700, marginTop: 3 }}>⚠️ Sin facturar</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CLIENTES */}
            {tab === "clientes" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Clientes y Prospectos ({clientes.length})</div>
                  <Btn onClick={openNuevoCliente} color={COLORS.red} small>+ Nuevo Cliente</Btn>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {clientes.length === 0 && <div style={{ color: "#aaa", padding: 40, textAlign: "center", gridColumn: "1/-1" }}>No hay clientes registrados aún</div>}
                  {clientes.map(c => {
                    const tc = trabajos.filter(t => t.cliente_id === c.id);
                    const sf = tc.filter(t => (t.etapa === "Entrega" || t.etapa === "Soporte") && t.estado_factura === "Pendiente").length;
                    return (
                      <div key={c.id} onClick={() => openDetalle(c, "detalle_cliente")} style={{ background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 1px 4px #0001", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, flex: 1, lineHeight: 1.3 }}>{c.nombre}</div>
                          <Badge text={c.estado} color={c.estado === "Cliente Recurrente" ? "#10b981" : c.estado === "Cliente Activo" ? "#3b82f6" : "#f59e0b"} />
                        </div>
                        {c.contacto && <div style={{ fontSize: 12, color: "#777", marginBottom: 3 }}>👤 {c.contacto}</div>}
                        {c.telefono && <div style={{ fontSize: 12, color: "#777", marginBottom: 3 }}>📞 {c.telefono}</div>}
                        {c.direccion && <div style={{ fontSize: 12, color: "#777", marginBottom: 8 }}>📍 {c.direccion}</div>}
                        <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#999", borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                          <span>🔧 {tc.length} trabajos</span>
                          {sf > 0 && <span style={{ color: COLORS.red, fontWeight: 700 }}>⚠️ {sf} sin facturar</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL CLIENTE */}
      {(modal === "nuevo_cliente" || modal === "detalle_cliente") && (
        <Modal title={modal === "nuevo_cliente" ? "Nuevo Cliente" : "Editar Cliente"} onClose={closeModal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}><Field label="Nombre / Razón Social *"><Input value={form.nombre || ""} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Field></div>
            <Field label="RUC / Cédula"><Input value={form.ruc || ""} onChange={e => setForm({ ...form, ruc: e.target.value })} /></Field>
            <Field label="Estado"><Sel value={form.estado || "Prospecto"} onChange={e => setForm({ ...form, estado: e.target.value })}>{ESTADO_CLIENTE.map(s => <option key={s}>{s}</option>)}</Sel></Field>
            <Field label="Contacto Principal"><Input value={form.contacto || ""} onChange={e => setForm({ ...form, contacto: e.target.value })} /></Field>
            <Field label="Teléfono"><Input value={form.telefono || ""} onChange={e => setForm({ ...form, telefono: e.target.value })} /></Field>
            <div style={{ gridColumn: "1/-1" }}><Field label="Email"><Input value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></Field></div>
            <div style={{ gridColumn: "1/-1" }}><Field label="Dirección"><Input value={form.direccion || ""} onChange={e => setForm({ ...form, direccion: e.target.value })} /></Field></div>
            <div style={{ gridColumn: "1/-1" }}><Field label="Notas comerciales"><Textarea value={form.notas || ""} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
          </div>
          {modal === "detalle_cliente" && selected && (
            <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Trabajos del cliente</div>
              {trabajos.filter(t => t.cliente_id === selected.id).map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}>
                  <span>{t.titulo}</span>
                  <Badge text={t.etapa} color={ETAPA_COLORS[t.etapa]} />
                </div>
              ))}
              {trabajos.filter(t => t.cliente_id === selected.id).length === 0 && <div style={{ color: "#aaa", fontSize: 12 }}>Sin trabajos registrados</div>}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn onClick={closeModal} color="#888" outline>Cancelar</Btn>
            <Btn onClick={saveCliente} color={COLORS.red} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </Modal>
      )}

      {/* MODAL TRABAJO */}
      {(modal === "nuevo_trabajo" || modal === "detalle_trabajo") && (
        <Modal title={modal === "nuevo_trabajo" ? "Nuevo Trabajo" : selected?.titulo || "Editar Trabajo"} onClose={closeModal}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ gridColumn: "1/-1" }}><Field label="Título del trabajo *"><Input value={form.titulo || ""} onChange={e => setForm({ ...form, titulo: e.target.value })} /></Field></div>
            <Field label="Cliente *">
              <Sel value={form.cliente_id || ""} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Sel>
            </Field>
            <Field label="Tipo de trabajo"><Sel value={form.tipo || "CCTV"} onChange={e => setForm({ ...form, tipo: e.target.value })}>{TIPO_TRABAJO.map(t => <option key={t}>{t}</option>)}</Sel></Field>
            <Field label="Técnico asignado"><Input value={form.tecnico || ""} onChange={e => setForm({ ...form, tecnico: e.target.value })} /></Field>
            <Field label="Etapa"><Sel value={form.etapa || "Cotización"} onChange={e => setForm({ ...form, etapa: e.target.value })}>{ETAPAS.map(e => <option key={e}>{e}</option>)}</Sel></Field>
            <Field label="Fecha de inicio"><Input type="date" value={form.fecha_inicio || ""} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} /></Field>
            <Field label="Fecha de entrega"><Input type="date" value={form.fecha_entrega || ""} onChange={e => setForm({ ...form, fecha_entrega: e.target.value })} /></Field>
            <Field label="Monto ($)"><Input type="number" value={form.monto || ""} onChange={e => setForm({ ...form, monto: e.target.value })} /></Field>
            <Field label="Estado de factura"><Sel value={form.estado_factura || "Pendiente"} onChange={e => setForm({ ...form, estado_factura: e.target.value })}>{ESTADO_FACTURA.map(s => <option key={s}>{s}</option>)}</Sel></Field>
            <div style={{ gridColumn: "1/-1" }}><Field label="N° de Factura"><Input value={form.numero_factura || ""} onChange={e => setForm({ ...form, numero_factura: e.target.value })} /></Field></div>
            <div style={{ gridColumn: "1/-1" }}><Field label="Observaciones"><Textarea value={form.observaciones || ""} onChange={e => setForm({ ...form, observaciones: e.target.value })} /></Field></div>
          </div>

          {modal === "detalle_trabajo" && selected && (
            <>
              <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Avanzar etapa</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge text={selected.etapa} color={ETAPA_COLORS[selected.etapa]} />
                  {ETAPAS.indexOf(selected.etapa) < ETAPAS.length - 1 && (
                    <Btn onClick={() => avanzarEtapa(selected)} color={COLORS.red} small disabled={saving}>
                      → {ETAPAS[ETAPAS.indexOf(selected.etapa) + 1]}
                    </Btn>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>Historial de trazabilidad</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {historialDeTrabajo(selected.id).map((h, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: ETAPA_COLORS[h.etapa] || "#ccc", marginTop: 3, flexShrink: 0 }} />
                      <div>
                        <span style={{ fontWeight: 700, color: ETAPA_COLORS[h.etapa] || "#333" }}>{h.etapa}</span>
                        <span style={{ color: "#888" }}> — {h.fecha} — {h.responsable}</span>
                        {h.nota && <div style={{ color: "#555", marginTop: 1 }}>{h.nota}</div>}
                      </div>
                    </div>
                  ))}
                  {historialDeTrabajo(selected.id).length === 0 && <div style={{ color: "#aaa", fontSize: 12 }}>Sin historial aún</div>}
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Btn onClick={closeModal} color="#888" outline>Cancelar</Btn>
            <Btn onClick={saveTrabajo} color={COLORS.red} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
