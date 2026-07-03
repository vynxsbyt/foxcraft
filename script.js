import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";

// CONEXIÓN A FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyASY2RkmcuaK-nlVRa7Ut7Qg7TMU691Nbw",
    authDomain: "foxcraft-dac65.firebaseapp.com",
    databaseURL: "https://foxcraft-dac65-default-rtdb.firebaseio.com",
    projectId: "foxcraft-dac65",
    storageBucket: "foxcraft-dac65.firebasestorage.app",
    messagingSenderId: "695323102571",
    appId: "1:695323102571:web:c4f8af54c36659987b102e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider(); 

const addonsRef = collection(db, "addons");
const forosRef = collection(db, "foros");
const commentsRef = collection(db, "comentarios_foro");

window.addonsDB = [];
window.forosDB = [];
window.adminUser = ""; 
window.userActual = null; 
window.isVIPUser = false; // Nueva variable para controlar la cuenta exclusiva
window.editMode = false;
window.idToEdit = null;
window.filtroActualTexto = "";
window.filtroActualCat = "Todos";
window.currentForoId = null;
window.unsubscribeComments = null;

// INSIGNIA DE ADMIN MODIFICADA PARA ACEPTAR LA CUENTA VIP
function getAdminBadge(name) {
    if (name === 'Andy233' || name === 'FoxCraft' || name === 'DevVIP') {
        return ` <i class="fa-solid fa-circle-check text-blue-500 ml-1" title="Admin Verificado"></i> 🔥`;
    }
    return '';
}

// ==========================================
// 1. CINEMÁTICA Y NAVEGACIÓN
// ==========================================
window.playCinematic = function(callback) {
    const intro = document.getElementById('cinematic-intro');
    const t1 = document.getElementById('cine-text-1');
    const t2 = document.getElementById('cine-text-2');
    const glow = document.getElementById('cine-glow');

    if(!intro) return;

    intro.classList.remove('hidden');
    setTimeout(function() {
        intro.classList.remove('opacity-0');
        setTimeout(function() { t1.classList.remove('opacity-0', 'translate-y-4'); }, 500);
        setTimeout(function() { 
            t2.classList.remove('opacity-0', 'scale-90'); 
            t2.classList.add('scale-100'); 
            glow.classList.remove('opacity-0');
        }, 1500);
        
        setTimeout(function() { 
            intro.classList.add('opacity-0');
            setTimeout(function() {
                intro.classList.add('hidden');
                t1.classList.add('opacity-0', 'translate-y-4');
                t2.classList.remove('scale-100');
                t2.classList.add('opacity-0', 'scale-90');
                glow.classList.add('opacity-0');
                if(callback) callback();
            }, 1000);
        }, 4000);
    }, 50);
};

function actualizarBotonesNav(tabActiva) {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('bg-white/10', 'text-white');
        btn.classList.add('text-zinc-400');
    });
    const activeBtn = document.getElementById(tabActiva);
    if(activeBtn) {
        activeBtn.classList.remove('text-zinc-400');
        activeBtn.classList.add('bg-white/10', 'text-white');
    }
}

window.mostrarBio = function(e) { 
    if(e) e.preventDefault();
    if(document.getElementById('bio-view')) document.getElementById('bio-view').classList.remove('hidden'); 
    if(document.getElementById('addons-view')) document.getElementById('addons-view').classList.add('hidden'); 
    if(document.getElementById('repos-view')) document.getElementById('repos-view').classList.add('hidden'); 
    if(document.getElementById('admin-view')) document.getElementById('admin-view').classList.add('hidden');
    if(document.getElementById('top-nav')) document.getElementById('top-nav').classList.remove('hidden');
    if(document.getElementById('main-footer')) document.getElementById('main-footer').classList.remove('hidden');
    actualizarBotonesNav('tab-bio');
    window.scrollTo(0,0);
};

window.mostrarAddons = function(e) { 
    if(e) e.preventDefault();
    if(document.getElementById('bio-view')) document.getElementById('bio-view').classList.add('hidden'); 
    if(document.getElementById('addons-view')) document.getElementById('addons-view').classList.remove('hidden'); 
    if(document.getElementById('repos-view')) document.getElementById('repos-view').classList.add('hidden'); 
    if(document.getElementById('admin-view')) document.getElementById('admin-view').classList.add('hidden');
    if(document.getElementById('top-nav')) document.getElementById('top-nav').classList.remove('hidden');
    if(document.getElementById('main-footer')) document.getElementById('main-footer').classList.remove('hidden');
    actualizarBotonesNav('tab-addons');
    window.scrollTo(0,0);
};

window.abrirRepositorios = function(e) { 
    if(e) e.preventDefault();
    if (!window.userActual) { 
        document.getElementById('login-alert-modal').classList.remove('opacity-0', 'pointer-events-none'); 
        document.getElementById('login-alert-box').classList.remove('scale-95'); 
    } else { 
        if(document.getElementById('bio-view')) document.getElementById('bio-view').classList.add('hidden'); 
        if(document.getElementById('addons-view')) document.getElementById('addons-view').classList.add('hidden'); 
        if(document.getElementById('admin-view')) document.getElementById('admin-view').classList.add('hidden');
        if(document.getElementById('repos-view')) document.getElementById('repos-view').classList.remove('hidden'); 
        if(document.getElementById('top-nav')) document.getElementById('top-nav').classList.remove('hidden');
        if(document.getElementById('main-footer')) document.getElementById('main-footer').classList.remove('hidden');
        actualizarBotonesNav('tab-repos');
        if(window.volverAForos) window.volverAForos(); 
        window.scrollTo(0,0);
    } 
};

// ==========================================
// 2. AUTENTICACIÓN USUARIOS
// ==========================================

// Función centralizada para actualizar la UI del usuario
window.actualizarUIUsuario = function(user) {
    window.userActual = user;
    const btn = document.getElementById('nav-user-btn');
    const loggedInState = document.getElementById('logged-in-state');
    const loginFormState = document.getElementById('login-form-state');

    if (user) {
        let displayName = user.displayName || user.email.split('@')[0];
        let photo = user.photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=FF9500&color=fff`;
        
        if(btn) btn.innerHTML = `<img src="${photo}" class="w-full h-full rounded-full object-cover border border-fox border-transparent hover:border-white/20">`;
        if(loggedInState) loggedInState.classList.remove('hidden');
        if(loginFormState) loginFormState.classList.add('hidden');
        
        let adminBadge = getAdminBadge(displayName);
        
        if(document.getElementById('user-display-name')) document.getElementById('user-display-name').innerHTML = displayName + adminBadge;
        if(document.getElementById('user-email-display')) document.getElementById('user-email-display').innerText = user.email || '@' + displayName.toLowerCase();
        if(document.getElementById('user-profile-pic')) document.getElementById('user-profile-pic').src = photo;
    } else {
        if(btn) btn.innerHTML = `<i class="fa-solid fa-user"></i>`;
        if(loggedInState) loggedInState.classList.add('hidden');
        if(loginFormState) loginFormState.classList.remove('hidden');
    }
};

onAuthStateChanged(auth, function(user) {
    // Si NO estamos usando la cuenta exclusiva VIP, actualizamos con Firebase
    if (!window.isVIPUser) {
        window.actualizarUIUsuario(user);
    }
});

window.loginConGoogle = async function() {
    try {
        await signInWithPopup(auth, provider);
        window.isVIPUser = false;
        window.ocultarModalUsuario();
        window.playCinematic(function(){window.abrirRepositorios();});
    } catch (error) {
        mostrarAuthError("Error al iniciar sesión con Google");
    }
};

window.loginConCorreo = async function() { 
    const email = document.getElementById('auth-user').value.trim(); 
    const pass = document.getElementById('auth-password').value.trim(); 
    if(!email || !pass) return mostrarAuthError("Ingresa tu correo y contraseña"); 

    // === INTERCEPCIÓN DE LA CUENTA EXCLUSIVA VIP ===
    if (email.toLowerCase() === 'devvip' && pass === 'AccesoAdmin2026') {
        window.isVIPUser = true;
        // Creamos un usuario "falso" para engañar al sistema
        window.actualizarUIUsuario({
            displayName: 'DevVIP',
            email: 'devvip@foxcraft.vip',
            photoURL: 'https://ui-avatars.com/api/?name=DevVIP&background=FF9500&color=fff'
        });
        window.ocultarModalUsuario(); 
        window.playCinematic(function(){window.abrirRepositorios();}); 
        return; // Detenemos la ejecución para que no busque en Firebase
    }

    try { 
        await signInWithEmailAndPassword(auth, email, pass); 
        window.isVIPUser = false;
        window.ocultarModalUsuario(); 
        window.playCinematic(function(){window.abrirRepositorios();}); 
    } catch (e) { mostrarAuthError("Cuenta o contraseña incorrecta"); } 
};

window.registrarConCorreo = async function() { 
    const email = document.getElementById('auth-user').value.trim(); 
    const pass = document.getElementById('auth-password').value.trim(); 
    if(!email || !pass) return mostrarAuthError("Ingresa tu correo y contraseña"); 
    try { 
        await createUserWithEmailAndPassword(auth, email, pass); 
        window.isVIPUser = false;
        window.ocultarModalUsuario(); 
        window.playCinematic(function(){window.abrirRepositorios();}); 
    } catch (e) { mostrarAuthError("El correo ya está en uso o es inválido"); } 
};

window.cerrarSesionUsuario = async function() { 
    if (window.isVIPUser) {
        window.isVIPUser = false;
        window.actualizarUIUsuario(null);
    } else {
        await firebaseSignOut(auth); 
    }
    window.ocultarModalUsuario(); 
    window.mostrarBio(); 
};

function mostrarAuthError(msg) { 
    const err = document.getElementById('auth-error'); 
    if(!err) return;
    err.innerText = msg; err.classList.remove('hidden'); 
    setTimeout(function() { err.classList.add('hidden'); }, 4000); 
}

window.mostrarModalUsuario = function() { document.getElementById('user-login-modal').classList.add('active'); };
window.ocultarModalUsuario = function() { document.getElementById('user-login-modal').classList.remove('active'); };
window.cerrarAlertaRepos = function() { document.getElementById('login-alert-box').classList.add('scale-95'); document.getElementById('login-alert-modal').classList.add('opacity-0', 'pointer-events-none'); };
window.cerrarAlertaYMostrarLogin = function() { window.cerrarAlertaRepos(); window.mostrarModalUsuario(); };

// ==========================================
// 3. STAFF / EDITOR PROFESIONAL
// ==========================================
window.mostrarModalAdmin = function() {
    document.getElementById('admin-login-modal').classList.add('active');
};

window.ocultarModalAdmin = function() { 
    document.getElementById('admin-login-modal').classList.remove('active'); 
    document.getElementById('admin-error').classList.add('hidden'); 
};

window.verificarLoginAdmin = function() { 
    const userRaw = document.getElementById('admin-username').value.trim(); 
    const pass = document.getElementById('admin-password').value.trim(); 
    const userLower = userRaw.toLowerCase();

    if ((userLower === 'andy233' && pass === 'Andyy6767') || 
        (userLower === 'foxcraft' && pass === 'Fox229273') || 
        (userLower === 'devvip' && pass === 'AccesoAdmin2026')) { 
        
        let adminName = 'DevVIP';
        if(userLower === 'andy233') adminName = 'Andy233';
        if(userLower === 'foxcraft') adminName = 'FoxCraft';

        window.adminUser = adminName; 
        
        if(document.getElementById('current-admin-display')) {
            document.getElementById('current-admin-display').innerText = "Admin: " + adminName; 
        }
        
        window.ocultarModalAdmin(); 
        
        if(document.getElementById('bio-view')) document.getElementById('bio-view').classList.add('hidden'); 
        if(document.getElementById('addons-view')) document.getElementById('addons-view').classList.add('hidden'); 
        if(document.getElementById('repos-view')) document.getElementById('repos-view').classList.add('hidden'); 
        if(document.getElementById('top-nav')) document.getElementById('top-nav').classList.add('hidden');
        if(document.getElementById('main-footer')) document.getElementById('main-footer').classList.add('hidden'); 
        
        if(document.getElementById('admin-view')) document.getElementById('admin-view').classList.remove('hidden'); 
        
        window.scrollTo(0, 0); 
    } else { 
        if(document.getElementById('admin-error')) document.getElementById('admin-error').classList.remove('hidden'); 
    } 
};

window.cerrarSesionAdmin = function() { 
    window.adminUser = ""; 
    window.cancelarEdicion(); 
    if(document.getElementById('admin-view')) document.getElementById('admin-view').classList.add('hidden'); 
    if(document.getElementById('main-footer')) document.getElementById('main-footer').classList.remove('hidden'); 
    window.mostrarBio(); 
};

window.guardarAddon = async function(e) {
    e.preventDefault(); 
    const btn = document.getElementById('btn-publicar'); 
    btn.innerHTML = 'Guardando...'; btn.disabled = true;
    const datos = { 
        titulo: document.getElementById('add-titulo').value, 
        descripcion: document.getElementById('add-desc').value, 
        etiqueta: document.getElementById('add-cat').value, 
        version: document.getElementById('add-ver').value, 
        enlace: document.getElementById('add-link').value, 
        imagen: document.getElementById('add-img').value, 
        orden: document.getElementById('add-orden').value 
    };
    try { 
        if (window.editMode && window.idToEdit) { 
            await updateDoc(doc(db, "addons", window.idToEdit), datos); 
            window.cancelarEdicion(); 
        } else { 
            datos.autor = window.adminUser; 
            datos.descargas = 0; 
            datos.createdAt = serverTimestamp(); 
            await addDoc(addonsRef, datos); 
            document.getElementById('addon-form').reset(); 
            document.getElementById('image-preview-container').classList.add('hidden'); 
        } 
    } catch (e) { alert("Error al guardar."); } 
    finally { btn.innerHTML = window.editMode ? 'Guardar Cambios' : 'Subir a la web'; btn.disabled = false; }
};

window.editarAddon = function(id) { 
    let addon = null;
    for(let i=0; i<window.addonsDB.length; i++) { if(window.addonsDB[i].id === id) addon = window.addonsDB[i]; }
    if(!addon) return; 
    document.getElementById('add-titulo').value = addon.titulo; 
    document.getElementById('add-desc').value = addon.descripcion; 
    document.getElementById('add-cat').value = addon.etiqueta; 
    document.getElementById('add-ver').value = addon.version; 
    document.getElementById('add-link').value = addon.enlace; 
    document.getElementById('add-img').value = addon.imagen; 
    document.getElementById('add-orden').value = addon.orden || ''; 
    window.previewImage(addon.imagen); 
    window.editMode = true; window.idToEdit = id; 
    document.getElementById('form-title').innerText = 'EDITANDO ADDON'; 
    document.getElementById('btn-publicar').innerHTML = 'Guardar Cambios'; 
    document.getElementById('btn-cancelar-edit').classList.remove('hidden'); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
};

window.cancelarEdicion = function() { 
    window.editMode = false; window.idToEdit = null; 
    document.getElementById('addon-form').reset(); 
    document.getElementById('image-preview-container').classList.add('hidden'); 
    document.getElementById('form-title').innerText = 'PUBLICAR ADDON'; 
    document.getElementById('btn-publicar').innerHTML = 'Subir a la web'; 
    document.getElementById('btn-cancelar-edit').classList.add('hidden'); 
};

window.borrarAddon = async function(id) { if(confirm("¿Seguro que quieres borrar este addon de la web?")) await deleteDoc(doc(db, "addons", id)); };
window.previewImage = function(url) { const c = document.getElementById('image-preview-container'), i = document.getElementById('image-preview'); if(url.startsWith('http')) { i.src = url; c.classList.remove('hidden'); } else c.classList.add('hidden'); };

// ==========================================
// 4. ADDONS LECTURA
// ==========================================
onSnapshot(query(addonsRef, orderBy("createdAt", "desc")), function(snapshot) {
    window.addonsDB = snapshot.docs.map(function(doc) { return { id: doc.id, ...doc.data() }; });
    window.addonsDB.sort(function(a, b) { return ((a.orden !== undefined && a.orden !== "") ? Number(a.orden) : 999) - ((b.orden !== undefined && b.orden !== "") ? Number(b.orden) : 999); });
    if(document.getElementById('loading-spinner')) document.getElementById('loading-spinner').classList.add('hidden');
    window.renderPublicAddons(); 
    window.renderAdminAddons();
});

window.buscarPorTexto = function(texto) { window.filtroActualTexto = texto.toLowerCase(); window.renderPublicAddons(); };
window.filtrarPorCat = function(categoria) {
    window.filtroActualCat = categoria;
    document.querySelectorAll('.cat-btn').forEach(function(btn) { 
        btn.className = btn.dataset.cat === categoria ? "cat-btn flex-shrink-0 bg-white text-black font-bold px-6 py-2.5 rounded-full text-xs transition-all active:scale-95 shadow-lg" : "cat-btn flex-shrink-0 bg-white/10 text-zinc-300 font-medium px-6 py-2.5 rounded-full text-xs transition-all hover:bg-white/20 active:scale-95 border border-white/5"; 
    });
    window.renderPublicAddons();
};

window.renderPublicAddons = function() {
    const container = document.getElementById('addons-container');
    const emptyState = document.getElementById('empty-state');
    if(!container) return;
    container.innerHTML = '';
    
    let displayAddons = window.addonsDB.filter(function(addon) {
        let matchTexto = addon.titulo.toLowerCase().includes(window.filtroActualTexto) || addon.descripcion.toLowerCase().includes(window.filtroActualTexto);
        let matchCat = window.filtroActualCat === 'Todos' || addon.etiqueta === window.filtroActualCat;
        return matchTexto && matchCat;
    });

    if (displayAddons.length === 0) { if(emptyState) emptyState.classList.remove('hidden'); return; }
    if(emptyState) emptyState.classList.add('hidden');

    let topAddons = [];
    for(let i=0; i<window.addonsDB.length; i++) { if((window.addonsDB[i].descargas || 0) > 0) topAddons.push(window.addonsDB[i]); }
    topAddons.sort(function(a, b) { return (b.descargas || 0) - (a.descargas || 0); });
    
    let t1 = topAddons.length > 0 ? topAddons[0].id : null;
    let t2 = topAddons.length > 1 ? topAddons[1].id : null;
    let t3 = topAddons.length > 2 ? topAddons[2].id : null;

    displayAddons.forEach(function(addon) {
        const img = addon.imagen || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80';
        const autor = addon.autor || 'FoxCraft';
        const autorColorClass = autor === 'Andy233' || autor === 'DevVIP' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]' : 'text-fox drop-shadow-[0_0_8px_rgba(255,149,0,0.9)]';
        const descargas = addon.descargas || 0;
        
        let topBadge = '', topClass = '';
        if (addon.id === t1) { topClass = 'animate-float-card z-20 border-fox/60'; topBadge = `<div class="absolute -top-3 -left-3 z-30 bg-gradient-to-r from-red-600 to-fox text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(255,149,0,0.8)] animate-bounce border border-white/20"><i class="fa-solid fa-fire mr-1"></i> TOP #1</div>`; } 
        else if (addon.id === t2) { topClass = 'border-zinc-300/40 shadow-[0_10px_30px_-10px_rgba(228,228,231,0.2)]'; topBadge = `<div class="absolute -top-3 -left-3 z-30 bg-gradient-to-r from-zinc-400 to-zinc-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(228,228,231,0.4)] border border-white/20"><i class="fa-solid fa-medal mr-1"></i> TOP #2</div>`; } 
        else if (addon.id === t3) { topClass = 'border-amber-700/50 shadow-[0_10px_30px_-10px_rgba(180,83,9,0.2)]'; topBadge = `<div class="absolute -top-3 -left-3 z-30 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(180,83,9,0.4)] border border-white/20"><i class="fa-solid fa-medal mr-1"></i> TOP #3</div>`; }

        container.innerHTML += `
            <div class="apple-card overflow-visible group flex flex-col relative flex-shrink-0 w-[280px] sm:w-[340px] snap-center ${topClass}">
                ${topBadge}
                <div class="absolute top-4 right-4 z-20"><div class="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-2xl"><i class="fa-solid fa-crown text-[8px] text-zinc-400"></i><span class="text-[9px] text-zinc-300 font-medium">Por: <span class="${autorColorClass} animate-pulse font-bold tracking-wider">${autor} ${getAdminBadge(autor)}</span></span></div></div>
                <div class="relative h-48 overflow-hidden w-full rounded-t-[2rem]">
                    <img src="${img}" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#151517] to-transparent"></div>
                    <span class="absolute bottom-2 left-4 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-white/10">${addon.etiqueta}</span>
                </div>
                <div class="p-6 flex flex-col flex-grow relative z-10 bg-[#151517] rounded-b-[2rem]">
                    <h3 class="text-xl font-bold text-white mb-2 leading-tight">${addon.titulo}</h3>
                    <p class="text-zinc-400 text-xs mb-6 flex-grow line-clamp-2">${addon.descripcion}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-zinc-500 text-[10px] font-bold"><i class="fa-solid fa-code-branch"></i> v${addon.version}</span>
                        <div class="flex items-center gap-3">
                            <span class="text-zinc-400 text-xs font-bold flex items-center gap-1.5" title="Descargas"><i class="fa-solid fa-chart-simple text-fox"></i> ${descargas}</span>
                            <a href="${addon.enlace}" target="_blank" onclick="window.contarDescarga('${addon.id}', ${descargas})" class="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 px-4 rounded-full active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">Descargar <i class="fa-solid fa-arrow-right ml-1 text-[10px]"></i></a>
                        </div>
                    </div>
                </div>
            </div>`;
    });
};

window.renderAdminAddons = function() {
    const list = document.getElementById('admin-list');
    if(!list) return;
    list.innerHTML = window.addonsDB.length === 0 ? `<div class="p-10 text-center text-zinc-500 text-sm">No hay addons subidos.</div>` : '';
    window.addonsDB.forEach(function(addon) {
        list.innerHTML += `
            <div class="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-[1.5rem]">
                <div class="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-[10px] text-zinc-400 font-bold flex-shrink-0">${addon.orden ? `P:${addon.orden}` : '-'}</div>
                <img src="${addon.imagen}" loading="lazy" decoding="async" class="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-black border border-white/5" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=150&q=80'">
                <div class="flex-grow min-w-0"><h4 class="text-white text-sm font-bold truncate">${addon.titulo}</h4><p class="text-zinc-400 text-[10px] truncate">Por: <span class="text-white">${addon.autor || 'FoxCraft'}</span> &bull; <i class="fa-solid fa-download text-fox ml-1"></i> ${addon.descargas || 0}</p></div>
                <button onclick="window.editarAddon('${addon.id}')" class="text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all flex-shrink-0"><i class="fa-solid fa-pen text-xs"></i></button>
                <button onclick="window.borrarAddon('${addon.id}')" class="text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all flex-shrink-0"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </div>`;
    });
};

window.contarDescarga = async function(id, descargasActuales) { try { await updateDoc(doc(db, "addons", id), { descargas: (descargasActuales || 0) + 1 }); } catch (e) {} };

// ==========================================
// 8. FOROS DE LA COMUNIDAD
// ==========================================
onSnapshot(query(forosRef, orderBy("createdAt", "desc")), function(snapshot) {
    window.forosDB = snapshot.docs.map(function(doc) { return { id: doc.id, ...doc.data() }; });
    window.renderForos();
});

window.renderForos = function() {
    const list = document.getElementById('foros-list-view');
    if(!list) return;
    list.innerHTML = '';
    if(window.forosDB.length === 0) { list.innerHTML = `<div class="col-span-full text-center py-10 text-zinc-500">No hay foros creados. Sé el primero.</div>`; return; }
    window.forosDB.forEach(function(f) {
        const tituloLimpio = f.titulo.replace(/'/g, "\\'"); const descLimpia = f.descripcion.replace(/'/g, "\\'");
        list.innerHTML += `
        <div class="apple-card p-5 cursor-pointer hover:bg-white/5 transition-colors border border-white/5 shadow-lg" onclick="window.abrirChatForo('${f.id}', '${tituloLimpio}', '${descLimpia}')">
            <div class="flex items-start gap-4"><div class="w-12 h-12 rounded-full bg-fox/10 flex items-center justify-center text-fox flex-shrink-0 border border-fox/20"><i class="fa-solid fa-hashtag text-xl"></i></div><div><h3 class="text-white font-bold text-lg leading-tight mb-1">${f.titulo}</h3><p class="text-zinc-400 text-xs line-clamp-2 mb-3">${f.descripcion}</p><span class="bg-white/5 text-zinc-500 px-2 py-1 rounded text-[10px]"><i class="fa-solid fa-user text-[8px] mr-1"></i> Por: ${f.autor} ${getAdminBadge(f.autor)}</span></div></div>
        </div>`;
    });
};

window.mostrarModalCrearForo = function() { document.getElementById('crear-foro-modal').classList.remove('opacity-0', 'pointer-events-none'); document.getElementById('crear-foro-box').classList.remove('scale-95'); };
window.ocultarModalCrearForo = function() { document.getElementById('crear-foro-box').classList.add('scale-95'); document.getElementById('crear-foro-modal').classList.add('opacity-0', 'pointer-events-none'); };

window.guardarNuevoForo = async function(e) { 
    e.preventDefault(); if(!window.userActual) return; 
    const tit = document.getElementById('nuevo-foro-titulo').value.trim(); 
    const desc = document.getElementById('nuevo-foro-desc').value.trim(); 
    if(!tit || !desc) return; 
    
    let autorNombre = window.userActual.displayName || window.userActual.email.split('@')[0];
    
    try { 
        await addDoc(forosRef, { titulo: tit, descripcion: desc, autor: autorNombre, createdAt: serverTimestamp() }); 
        document.getElementById('nuevo-foro-titulo').value = ''; document.getElementById('nuevo-foro-desc').value = ''; 
        window.ocultarModalCrearForo(); 
    } catch(err) { alert("Error al crear foro."); } 
};

window.abrirChatForo = function(id, titulo, desc) { 
    document.getElementById('foros-list-view').classList.add('hidden'); 
    const btnCrear = document.getElementById('btn-crear-foro-view');
    if(btnCrear) btnCrear.classList.add('hidden'); 
    
    const chatView = document.getElementById('foro-chat-view'); 
    chatView.classList.remove('hidden'); chatView.classList.add('flex'); 
    document.getElementById('chat-foro-titulo').innerHTML = `<i class="fa-solid fa-hashtag text-zinc-500"></i> ${titulo}`; 
    document.getElementById('chat-foro-desc').innerText = desc; 
    window.currentForoId = id; window.cargarComentariosForo(id); 
};

window.volverAForos = function() { 
    window.currentForoId = null; 
    if(window.unsubscribeComments) window.unsubscribeComments(); 
    document.getElementById('foro-chat-view').classList.add('hidden'); document.getElementById('foro-chat-view').classList.remove('flex'); 
    document.getElementById('foros-list-view').classList.remove('hidden'); 
    const btnCrear = document.getElementById('btn-crear-foro-view');
    if(window.userActual && btnCrear) btnCrear.classList.remove('hidden'); 
};

window.cargarComentariosForo = function(foroId) {
    if(window.unsubscribeComments) window.unsubscribeComments();
    const q = query(commentsRef, where("foroId", "==", foroId));
    window.unsubscribeComments = onSnapshot(q, function(snapshot) {
        let comments = snapshot.docs.map(function(doc) { return { id: doc.id, ...doc.data() }; });
        comments.sort(function(a,b) { let tA = a.createdAt ? a.createdAt.toMillis() : 0; let tB = b.createdAt ? b.createdAt.toMillis() : 0; return tA - tB; });
        const container = document.getElementById('comments-container'); container.innerHTML = '';
        if(comments.length === 0) { container.innerHTML = '<div class="text-center py-10 text-zinc-500 text-sm">Nadie ha comentado en este foro. Sé el primero.</div>'; return; }
        
        comments.forEach(function(data) {
            const date = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';
            let fotoUser = data.foto || `https://ui-avatars.com/api/?name=${data.autor}&background=FF9500&color=fff`;
            container.innerHTML += `<div class="chat-bubble flex gap-3 border border-white/5"><img src="${fotoUser}" loading="lazy" class="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0 bg-black"><div><div class="flex items-baseline gap-2 mb-1"><span class="text-white font-bold text-sm">${data.autor} ${getAdminBadge(data.autor)}</span><span class="text-zinc-500 text-[10px]">${date}</span></div><p class="text-zinc-300 text-sm leading-relaxed">${data.texto}</p></div></div>`;
        });
        
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
    });
};

window.enviarComentarioForo = async function(e) { 
    e.preventDefault(); if(!window.userActual || !window.currentForoId) return; 
    const input = document.getElementById('repo-comment-input'); const txt = input.value.trim(); if(!txt) return; 
    
    let autorNombre = window.userActual.displayName || window.userActual.email.split('@')[0]; 
    let fotoUser = window.userActual.photoURL || `https://ui-avatars.com/api/?name=${autorNombre}&background=FF9500&color=fff`;
    
    if(window.adminUser) {
        autorNombre = window.adminUser; 
        fotoUser = `https://ui-avatars.com/api/?name=${autorNombre}&background=FF9500&color=fff`;
    }
    
    try { 
        await addDoc(commentsRef, { 
            foroId: window.currentForoId, 
            texto: txt, 
            autor: autorNombre, 
            foto: fotoUser, 
            createdAt: serverTimestamp() 
        }); 
        input.value = ''; 
    } catch (error) { console.error(error); } 
};
