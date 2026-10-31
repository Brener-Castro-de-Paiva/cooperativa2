/* ============================================================
   COJURIS — ADAPTADOR FIREBASE: SESSÃO

   Reaproveita a mesma instância criada em firebase-config.js,
   então o login é compartilhado com as páginas já existentes.
   ============================================================ */

import { auth } from "../../firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


function converter(usuario) {

    return usuario
        ? { uid: usuario.uid, email: usuario.email || "" }
        : null;
}


export function criar() {

    return {

        observar(aoMudar) {
            return onAuthStateChanged(auth, (usuario) =>
                aoMudar(converter(usuario))
            );
        },

        atual: () => converter(auth.currentUser),

        // Usado por provedores externos (ex.: Supabase)
        // que aceitam o login do Firebase.
        obterToken: () => auth.currentUser?.getIdToken() ?? null,

        sair: () => signOut(auth)
    };
}
