/* ============================================================
   COJURIS — ADAPTADOR FIREBASE: ARQUIVOS (STORAGE)

   Requer o Firebase Storage ativado no projeto
   (Console → Storage → Começar). Projetos novos precisam
   do plano Blaze, que tem cota gratuita mas pede cartão.
   ============================================================ */

import { getApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import "../../firebase-config.js";

import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref,
    uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";


export function criar() {

    const storage = getStorage(getApp());

    return {

        enviar(caminho, arquivo, aoProgredir) {

            const tarefa = uploadBytesResumable(
                ref(storage, caminho),
                arquivo,
                {
                    contentType: arquivo.type || "application/octet-stream",
                    contentDisposition:
                        `attachment; filename*=UTF-8''${encodeURIComponent(arquivo.name)}`
                }
            );

            return new Promise((resolver, rejeitar) => {

                tarefa.on(
                    "state_changed",
                    (s) => aoProgredir?.(
                        s.totalBytes ? s.bytesTransferred / s.totalBytes : 0
                    ),
                    rejeitar,
                    () => resolver(caminho)
                );
            });
        },


        obterLink: (caminho) => getDownloadURL(ref(storage, caminho)),


        excluir: (caminho) => deleteObject(ref(storage, caminho))
    };
}
