/* ============================================================
   COJURIS — ADAPTADOR FIREBASE: BANCO (FIRESTORE)

   Caminhos lógicos usados pela fachada, iguais aos do Firestore:

   comunicados/{id}/comentarios
   mural
   mural/{id}/comentarios
   documentos_pessoais/{uid}/itens
   biblioteca
   ============================================================ */

import { db } from "../../firebase-config.js";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    startAfter
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


function converter(documento) {

    const dados = documento.data();

    return {
        ...dados,
        id: documento.id,
        criadoEm: dados.criadoEm?.toDate?.() ?? null
    };
}


export function criar() {

    return {

        async lerAdministrador(uid) {
            const r = await getDoc(doc(db, "administradores", uid));
            return r.exists() ? r.data() : null;
        },


        async lerInteressado(uid) {
            const r = await getDoc(doc(db, "interessados", uid));
            return r.exists() ? r.data() : null;
        },


        async listarInteressados() {

            const r = await getDocs(collection(db, "interessados"));

            return r.docs
                .map((d) => ({
                    uid: d.id,
                    nome: d.data().nome || "",
                    email: d.data().email || "",
                    status: d.data().status || ""
                }))
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        },


        // O cursor devolvido é o último documento da página.
        // A fachada o trata como um valor opaco.

        async listar(caminho, { limite, cursor, direcao }) {

            const partes = [
                orderBy("criadoEm", direcao === "asc" ? "asc" : "desc")
            ];

            if (cursor) {
                partes.push(startAfter(cursor));
            }

            partes.push(limit(limite));

            const r = await getDocs(
                query(collection(db, caminho), ...partes)
            );

            return {
                itens: r.docs.map(converter),
                cursor: r.docs.length === limite
                    ? r.docs[r.docs.length - 1]
                    : null
            };
        },


        async criar(caminho, dados) {

            const r = await addDoc(collection(db, caminho), {
                ...dados,
                criadoEm: serverTimestamp()
            });

            return r.id;
        },


        excluir: (caminho, id) => deleteDoc(doc(db, caminho, id))
    };
}
