// app.js (listo para GitHub Pages / <script type="module">)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/** Firebase config (TU PROYECTO) */
const firebaseConfig = {
  apiKey: "AIzaSyDFnHYel4vaE_TWxQQPmJERDJP58FDMYuc",
  authDomain: "controlfinance-ef04a.firebaseapp.com",
  projectId: "controlfinance-ef04a",
  storageBucket: "controlfinance-ef04a.firebasestorage.app",
  messagingSenderId: "885645336724",
  appId: "1:885645336724:web:2cc7df80dc67a2b9df1481",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/** UI */
const profileSelect = document.getElementById("profileSelect");
const btnNewProfile = document.getElementById("btnNewProfile");
const btnEditProfile = document.getElementById("btnEditProfile");
const btnDeleteProfile = document.getElementById("btnDeleteProfile");
const profileMsg = document.getElementById("profileMsg");

const typeEl = document.getElementById("type");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const descEl = document.getElementById("description");
const btnAdd = document.getElementById("btnAdd");
const txMsg = document.getElementById("txMsg");

const sumIncome = document.getElementById("sumIncome");
const sumExpense = document.getElementById("sumExpense");
const sumBalance = document.getElementById("sumBalance");

const txList = document.getElementById("txList");
const btnExport = document.getElementById("btnExport");

/** Modal perfil */
const profileDialog = document.getElementById("profileDialog");
const modalTitle = document.getElementById("modalTitle");
const profileName = document.getElementById("profileName");
const btnSaveProfile = document.getElementById("btnSaveProfile");
const modalMsg = document.getElementById("modalMsg");

let currentProfileId = null;
let unsubTx = null;
let editModeProfileId = null;

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-SV", { style: "currency", currency: "USD" });

function setMsg(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
}

function renderTotals(income, expense) {
  sumIncome.textContent = money(income);
  sumExpense.textContent = money(expense);
  sumBalance.textContent = money(income - expense);
}

function renderTx(items) {
  txList.innerHTML = "";

  if (!items.length) {
    txList.innerHTML = `<div class="item"><div class="muted">No hay movimientos para este perfil.</div></div>`;
    renderTotals(0, 0);
    return;
  }

  let inc = 0,
    exp = 0;

  for (const { id, data } of items) {
    const amt = Number(data.amount || 0);
    if (data.type === "income") inc += amt;
    else exp += amt;

    const created = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    const createdTxt = created
      ? created.toLocaleString("es-SV", { dateStyle: "medium", timeStyle: "short" })
      : "—";

    const badgeTxt = data.type === "income" ? "Ingreso" : "Gasto";

    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <span class="badge">${badgeTxt}</span>
          <strong>${money(amt)}</strong>
          <span class="muted">• ${data.category || "General"}</span>
        </div>
        <div class="muted small" style="margin-top:6px;">${data.description || ""}</div>
        <div class="muted small" style="margin-top:6px;">Guardado: ${createdTxt}</div>
      </div>
      <div class="actions">
        <button class="secondary" data-del="${id}">Eliminar</button>
      </div>
    `;
    txList.appendChild(row);
  }

  renderTotals(inc, exp);

  // bind delete buttons
  txList.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      try {
        await deleteDoc(doc(db, "transactions", id));
      } catch (err) {
        console.error(err);
        setMsg(txMsg, "Error al eliminar: " + (err?.message || err));
      }
    });
  });
}

function subscribeTransactions(profileId) {
  if (unsubTx) unsubTx();

  const q = query(
    collection(db, "transactions"),
    where("profileId", "==", profileId),
    orderBy("createdAt", "desc")
  );

  unsubTx = onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      renderTx(items);
    },
    (err) => {
      console.error(err);
      setMsg(txMsg, "Error al leer datos: " + (err?.message || err));
    }
  );
}

function loadProfiles() {
  const q = query(collection(db, "profiles"), orderBy("createdAt", "asc"));

  onSnapshot(
    q,
    (snap) => {
      const profiles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      profileSelect.innerHTML = "";
      for (const p of profiles) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name || "(Sin nombre)";
        profileSelect.appendChild(opt);
      }

      if (!profiles.length) {
        currentProfileId = null;
        if (unsubTx) unsubTx();
        txList.innerHTML = `<div class="item"><div class="muted">Crea un perfil para empezar.</div></div>`;
        renderTotals(0, 0);
        return;
      }

      // Mantener selección si existe
      const exists = profiles.some((p) => p.id === currentProfileId);
      currentProfileId = exists ? currentProfileId : profiles[0].id;
      profileSelect.value = currentProfileId;

      subscribeTransactions(currentProfileId);
    },
    (err) => {
      console.error(err);
      setMsg(profileMsg, "Error al cargar perfiles: " + (err?.message || err));
    }
  );
}

/** Perfil: modal */
btnNewProfile?.addEventListener("click", () => {
  editModeProfileId = null;
  modalTitle.textContent = "Nuevo perfil";
  profileName.value = "";
  setMsg(modalMsg, "");
  profileDialog.showModal();
});

btnEditProfile?.addEventListener("click", () => {
  const id = profileSelect.value;
  if (!id) return;

  editModeProfileId = id;
  modalTitle.textContent = "Editar perfil";
  profileName.value = profileSelect.options[profileSelect.selectedIndex].textContent;
  setMsg(modalMsg, "");
  profileDialog.showModal();
});

btnSaveProfile?.addEventListener("click", async (e) => {
  // dialog method="dialog" cerrará solo; prevenimos para guardar primero
  e.preventDefault();

  const name = profileName.value.trim();
  if (!name) return setMsg(modalMsg, "Escribe un nombre.");

  btnSaveProfile.disabled = true;

  try {
    if (!editModeProfileId) {
      await addDoc(collection(db, "profiles"), {
        name,
        createdAt: serverTimestamp(),
      });
      setMsg(profileMsg, "Perfil creado ✅");
    } else {
      await updateDoc(doc(db, "profiles", editModeProfileId), { name });
      setMsg(profileMsg, "Perfil actualizado ✅");
    }
    profileDialog.close();
  } catch (err) {
    console.error(err);
    setMsg(modalMsg, "Error: " + (err?.message || err));
  } finally {
    btnSaveProfile.disabled = false;
  }
});

btnDeleteProfile?.addEventListener("click", async () => {
  const id = profileSelect.value;
  if (!id) return;

  const ok = confirm("¿Eliminar este perfil? También eliminará sus movimientos.");
  if (!ok) return;

  try {
    // 1) borrar transacciones del perfil
    const q = query(collection(db, "transactions"), where("profileId", "==", id));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await deleteDoc(doc(db, "transactions", d.id));
    }

    // 2) borrar perfil
    await deleteDoc(doc(db, "profiles", id));
    setMsg(profileMsg, "Perfil eliminado ✅");
  } catch (err) {
    console.error(err);
    setMsg(profileMsg, "Error al eliminar: " + (err?.message || err));
  }
});

/** Cambio de perfil */
profileSelect?.addEventListener("change", () => {
  currentProfileId = profileSelect.value;
  if (currentProfileId) subscribeTransactions(currentProfileId);
});

/** Agregar movimiento */
btnAdd?.addEventListener("click", async () => {
  setMsg(txMsg, "");

  if (!currentProfileId) return setMsg(txMsg, "Primero crea o selecciona un perfil.");

  const type = typeEl.value;
  const amount = Number(amountEl.value);
  const category = categoryEl.value.trim() || "General";
  const description = descEl.value.trim();

  if (!amount || amount <= 0) return setMsg(txMsg, "El monto debe ser mayor que 0.");

  btnAdd.disabled = true;

  try {
    await addDoc(collection(db, "transactions"), {
      profileId: currentProfileId,
      type,
      amount,
      category,
      description,
      createdAt: serverTimestamp(), // hora/día automático (servidor)
    });

    amountEl.value = "";
    categoryEl.value = "";
    descEl.value = "";
    setMsg(txMsg, "Guardado ✅");
  } catch (err) {
    console.error(err);
    setMsg(txMsg, "Error: " + (err?.message || err));
  } finally {
    btnAdd.disabled = false;
  }
});

/** Export CSV del perfil actual */
btnExport?.addEventListener("click", async () => {
  if (!currentProfileId) return;

  try {
    const q = query(
      collection(db, "transactions"),
      where("profileId", "==", currentProfileId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const rows = [["type", "amount", "category", "description", "createdAt"]];

    snap.forEach((d) => {
      const x = d.data();
      const dt = x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : "";
      rows.push([x.type, x.amount, x.category || "", x.description || "", dt]);
    });

    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `perfil_${currentProfileId}_movimientos.csv`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    setMsg(txMsg, "Error exportando: " + (err?.message || err));
  }
});

/** Init */
loadProfiles();function renderTotals(income, expense) {
  sumIncome.textContent = money(income);
  sumExpense.textContent = money(expense);
  sumBalance.textContent = money(income - expense);
}

function renderTx(items) {
  txList.innerHTML = "";
  if (!items.length) {
    txList.innerHTML = `<div class="item"><div class="muted">No hay movimientos para este perfil.</div></div>`;
    renderTotals(0, 0);
    return;
  }

  let inc = 0, exp = 0;

  for (const { id, data } of items) {
    const amt = Number(data.amount || 0);
    if (data.type === "income") inc += amt; else exp += amt;

    const created = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    const createdTxt = created
      ? created.toLocaleString("es-SV", { dateStyle: "medium", timeStyle: "short" })
      : "—";

    const badgeTxt = data.type === "income" ? "Ingreso" : "Gasto";

    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <span class="badge">${badgeTxt}</span>
          <strong>${money(amt)}</strong>
          <span class="muted">• ${data.category || "General"}</span>
        </div>
        <div class="muted small" style="margin-top:6px;">${data.description || ""}</div>
        <div class="muted small" style="margin-top:6px;">Guardado: ${createdTxt}</div>
      </div>
      <div class="actions">
        <button class="secondary" data-del="${id}">Eliminar</button>
      </div>
    `;
    txList.appendChild(row);
  }

  renderTotals(inc, exp);

  txList.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      await deleteDoc(doc(db, "transactions", id));
    });
  });
}

function subscribeTransactions(profileId) {
  if (unsubTx) unsubTx();

  const q = query(
    collection(db, "transactions"),
    where("profileId", "==", profileId),
    orderBy("createdAt", "desc")
  );

  unsubTx = onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    renderTx(items);
  });
}

function loadProfiles() {
  const q = query(collection(db, "profiles"), orderBy("createdAt", "asc"));
  onSnapshot(q, (snap) => {
    const profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    profileSelect.innerHTML = "";
    for (const p of profiles) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name || "(Sin nombre)";
      profileSelect.appendChild(opt);
    }

    if (!profiles.length) {
      currentProfileId = null;
      if (unsubTx) unsubTx();
      txList.innerHTML = `<div class="item"><div class="muted">Crea un perfil para empezar.</div></div>`;
      renderTotals(0, 0);
      return;
    }

    // Mantener selección actual si existe
    const exists = profiles.some(p => p.id === currentProfileId);
    currentProfileId = exists ? currentProfileId : profiles[0].id;
    profileSelect.value = currentProfileId;
    subscribeTransactions(currentProfileId);
  });
}

/** Perfil: modal */
btnNewProfile.addEventListener("click", () => {
  editModeProfileId = null;
  modalTitle.textContent = "Nuevo perfil";
  profileName.value = "";
  setMsg(modalMsg, "");
  profileDialog.showModal();
});

btnEditProfile.addEventListener("click", async () => {
  const id = profileSelect.value;
  if (!id) return;

  editModeProfileId = id;
  modalTitle.textContent = "Editar perfil";

  // Obtener nombre actual desde el select (simple)
  profileName.value = profileSelect.options[profileSelect.selectedIndex].textContent;
  setMsg(modalMsg, "");
  profileDialog.showModal();
});

btnSaveProfile.addEventListener("click", async (e) => {
  // dialog con method="dialog" cerrará automáticamente; prevenimos para guardar antes:
  e.preventDefault();

  const name = profileName.value.trim();
  if (!name) return setMsg(modalMsg, "Escribe un nombre.");

  btnSaveProfile.disabled = true;

  try {
    if (!editModeProfileId) {
      await addDoc(collection(db, "profiles"), { name, createdAt: serverTimestamp() });
      setMsg(profileMsg, "Perfil creado ✅");
    } else {
      await updateDoc(doc(db, "profiles", editModeProfileId), { name });
      setMsg(profileMsg, "Perfil actualizado ✅");
    }
    profileDialog.close();
  } catch (err) {
    setMsg(modalMsg, "Error: " + err.message);
  } finally {
    btnSaveProfile.disabled = false;
  }
});

btnDeleteProfile.addEventListener("click", async () => {
  const id = profileSelect.value;
  if (!id) return;

  const ok = confirm("¿Eliminar este perfil? También eliminará sus movimientos (te lo borro ahora).");
  if (!ok) return;

  // 1) borrar transacciones del perfil
  const q = query(collection(db, "transactions"), where("profileId", "==", id));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "transactions", d.id));
  }

  // 2) borrar perfil
  await deleteDoc(doc(db, "profiles", id));
  setMsg(profileMsg, "Perfil eliminado ✅");
});

/** cambio de perfil */
profileSelect.addEventListener("change", () => {
  currentProfileId = profileSelect.value;
  if (currentProfileId) subscribeTransactions(currentProfileId);
});

/** Agregar movimiento */
btnAdd.addEventListener("click", async () => {
  setMsg(txMsg, "");
  if (!currentProfileId) return setMsg(txMsg, "Primero crea o selecciona un perfil.");

  const type = typeEl.value;
  const amount = Number(amountEl.value);
  const category = categoryEl.value.trim() || "General";
  const description = descEl.value.trim();

  if (!amount || amount <= 0) return setMsg(txMsg, "El monto debe ser mayor que 0.");

  btnAdd.disabled = true;

  try {
    await addDoc(collection(db, "transactions"), {
      profileId: currentProfileId,
      type,
      amount,
      category,
      description,
      createdAt: serverTimestamp(), // hora y día automáticos del servidor
    });

    amountEl.value = "";
    categoryEl.value = "";
    descEl.value = "";
    setMsg(txMsg, "Guardado ✅");
  } catch (err) {
    setMsg(txMsg, "Error: " + err.message);
  } finally {
    btnAdd.disabled = false;
  }
});

/** Export CSV del perfil actual */
btnExport.addEventListener("click", async () => {
  if (!currentProfileId) return;

  const q = query(
    collection(db, "transactions"),
    where("profileId", "==", currentProfileId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  const rows = [["type","amount","category","description","createdAt"]];

  snap.forEach((d) => {
    const x = d.data();
    const dt = x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : "";
    rows.push([x.type, x.amount, x.category || "", x.description || "", dt]);
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `perfil_${currentProfileId}_movimientos.csv`;
  a.click();

  URL.revokeObjectURL(url);
});

/** init */
loadProfiles();
