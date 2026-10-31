/* ============================================================
   COJURIS — UTILITÁRIOS DE INTERFACE DOS NOVOS RECURSOS

   ARQUIVO: portal/js/recursos/ui.js

   01 — Criação segura de elementos (sem innerHTML)
   02 — Formatação
   03 — Controle de acesso das páginas
   ============================================================ */

import { obterDados, permissoes, mensagemDeErro } from "../dados/index.js";


// ============================================================
// 01 — CRIAÇÃO SEGURA DE ELEMENTOS
//
// Todo texto vindo do banco entra como textContent,
// nunca como HTML.
// ============================================================

export function el(tag, classe = "", texto = "") {

    const elemento = document.createElement(tag);

    if (classe) elemento.className = classe;

    if (texto !== "" && texto !== null && texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}


export function botao(texto, classe, aoClicar) {

    const b = el("button", classe, texto);

    b.type = "button";

    if (aoClicar) b.addEventListener("click", aoClicar);

    return b;
}


// ============================================================
// 02 — FORMATAÇÃO
// ============================================================

const formatoData = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
});

export function formatarData(data) {

    return data instanceof Date && !isNaN(data)
        ? formatoData.format(data)
        : "agora";
}


export function formatarTamanho(bytes) {

    if (!bytes) return "";

    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

    return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}


export function iniciais(nome) {

    return String(nome || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || "")
        .join("") || "?";
}


// ============================================================
// 03 — CONTROLE DE ACESSO DAS PÁGINAS
//
// Segue o mesmo padrão de comunicados.html:
// #tela-acesso aparece até a verificação terminar;
// #aplicacao só é exibida a quem tem permissão de leitura.
// ============================================================

const MENSAGENS_BLOQUEIO = {
    sem_cadastro: "Não encontramos seu cadastro na COJURIS.",
    rejeitado: "Seu cadastro não foi aprovado para acessar esta área.",
    sem_permissao: "Sua conta ainda não tem acesso a esta área."
};


export async function iniciarPagina(aoLiberar) {

    const telaAcesso = document.getElementById("tela-acesso");
    const mensagem = document.getElementById("mensagem-acesso");
    const aplicacao = document.getElementById("aplicacao");

    const bloquear = (texto) => {
        aplicacao.hidden = true;
        telaAcesso.hidden = false;
        mensagem.textContent = texto;
    };

    let dados;

    try {
        dados = await obterDados();
    } catch (erro) {
        console.error(erro);
        bloquear("Não foi possível iniciar o portal. Tente novamente.");
        return;
    }

    if (dados.demonstracao) {
        document.body.dataset.demonstracao = "sim";
    }

    let sessaoAtual = 0;

    dados.sessao.observar(async (usuario) => {

        const sessao = ++sessaoAtual;

        if (!usuario) {
            location.replace("./index.html");
            return;
        }

        bloquear("Verificando sua autorização...");

        try {

            const { perfil, nome } = await dados.perfil(usuario);

            if (sessao !== sessaoAtual) return;

            if (!permissoes.ler(perfil)) {
                bloquear(
                    MENSAGENS_BLOQUEIO[perfil] ||
                    MENSAGENS_BLOQUEIO.sem_permissao
                );
                return;
            }

            telaAcesso.hidden = true;
            aplicacao.hidden = false;

            const nomesPerfil = {
                administrador: "Administração",
                participante: "Profissional verificado",
                leitor: "Acesso de leitura"
            };

            const rotulo = document.getElementById("perfil-acesso");

            if (rotulo) rotulo.textContent = nomesPerfil[perfil];

            const linkAdmin = document.getElementById("link-administracao");

            if (linkAdmin) linkAdmin.hidden = perfil !== "administrador";

            await aoLiberar({ dados, usuario, perfil, nome });

        } catch (erro) {
            bloquear(mensagemDeErro(erro));
        }
    });
}
