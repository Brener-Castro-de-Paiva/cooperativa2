/* ============================================================
   COJURIS — ÁREA DE COMENTÁRIOS REUTILIZÁVEL

   ARQUIVO: portal/js/recursos/comentarios.js

   Uso em qualquer cartão:

   import { criarAreaComentarios } from "./recursos/comentarios.js";
   cartao.append(criarAreaComentarios(`comunicados/${id}`));

   Os comentários só são buscados quando a pessoa abre a área,
   para não multiplicar leituras no banco.

   Quem comenta: administradores e profissionais verificados.
   Quem lê: todos com acesso ao portal.
   Quem exclui: o autor do comentário ou a administração.
   ============================================================ */

import {
    obterDados,
    permissoes,
    mensagemDeErro
} from "../dados/index.js";

import { el, botao, formatarData, iniciais } from "./ui.js";


// ------------------------------------------------------------
// Contexto do usuário (consultado uma vez por página)
// ------------------------------------------------------------

let contextoEmCache = null;

async function contextoAtual() {

    const dados = await obterDados();

    const usuario = dados.sessao.atual();

    if (!usuario) {
        return { dados, usuario: null, perfil: "sem_sessao", nome: "" };
    }

    if (contextoEmCache?.uid !== usuario.uid) {
        contextoEmCache = {
            uid: usuario.uid,
            promessa: dados.perfil(usuario)
        };
    }

    const { perfil, nome } = await contextoEmCache.promessa;

    return { dados, usuario, perfil, nome };
}


// ------------------------------------------------------------
// Componente
// ------------------------------------------------------------

export function criarAreaComentarios(alvo, opcoes = {}) {

    const raiz = el("section", "cj-comentarios");

    const alternar = botao("Comentários", "cj-comentarios-alternar");

    alternar.setAttribute("aria-expanded", "false");

    const corpo = el("div", "cj-comentarios-corpo");

    corpo.hidden = true;

    const lista = el("ol", "cj-comentarios-lista");

    const mais = botao("Ver mais comentários", "cj-link");

    mais.hidden = true;

    const status = el("p", "cj-status");

    status.setAttribute("role", "status");

    status.setAttribute("aria-live", "polite");

    corpo.append(lista, mais, status);

    raiz.append(alternar, corpo);


    let carregado = false;
    let cursor = null;
    let ctx = null;


    // ---- Carregar ----

    async function carregar(reiniciar) {

        mais.disabled = true;

        if (reiniciar) {
            cursor = null;
            lista.replaceChildren();
        }

        status.textContent = "Carregando comentários...";

        try {

            const pagina = await ctx.dados.comentarios.listar(alvo, { cursor });

            pagina.itens.forEach((c) => lista.append(itemComentario(c)));

            cursor = pagina.cursor;

            mais.hidden = !cursor;

            status.textContent = lista.children.length
                ? ""
                : "Nenhum comentário ainda.";

        } catch (erro) {
            status.textContent = mensagemDeErro(erro);
        } finally {
            mais.disabled = false;
        }
    }


    function itemComentario(c) {

        const item = el("li", "cj-comentario");

        item.dataset.id = c.id;

        const avatar = el("span", "cj-avatar", iniciais(c.autorNome));

        avatar.setAttribute("aria-hidden", "true");

        const conteudo = el("div", "cj-comentario-conteudo");

        const topo = el("div", "cj-comentario-topo");

        const data = el("time", "cj-data", formatarData(c.criadoEm));

        if (c.criadoEm) data.dateTime = c.criadoEm.toISOString();

        topo.append(el("strong", "", c.autorNome || "Cooperado"), data);

        conteudo.append(topo, el("p", "cj-comentario-texto", c.texto));

        if (permissoes.excluirItem(ctx.perfil, ctx.usuario.uid, c)) {

            const excluir = botao("Excluir", "cj-link cj-link-perigo", async () => {

                if (!confirm("Excluir este comentário?")) return;

                excluir.disabled = true;

                try {
                    await ctx.dados.comentarios.excluir(alvo, c.id);
                    item.remove();
                    if (!lista.children.length) {
                        status.textContent = "Nenhum comentário ainda.";
                    }
                } catch (erro) {
                    excluir.disabled = false;
                    status.textContent = mensagemDeErro(erro);
                }
            });

            conteudo.append(excluir);
        }

        item.append(avatar, conteudo);

        return item;
    }


    // ---- Formulário ----

    function montarFormulario() {

        if (!permissoes.participar(ctx.perfil)) {

            corpo.append(el(
                "p",
                "cj-aviso",
                "Comentários ficam disponíveis após a verificação profissional do seu cadastro."
            ));

            return;
        }

        const form = el("form", "cj-comentario-form");

        const campo = el("textarea", "cj-campo");

        campo.name = "texto";
        campo.rows = 2;
        campo.maxLength = 2000;
        campo.required = true;
        campo.placeholder = "Escreva um comentário";
        campo.setAttribute("aria-label", "Seu comentário");

        const enviar = el("button", "cj-botao", "Comentar");

        enviar.type = "submit";

        form.append(campo, enviar);

        form.addEventListener("submit", async (evento) => {

            evento.preventDefault();

            if (enviar.disabled) return;

            enviar.disabled = true;

            try {

                const texto = campo.value;

                const id = await ctx.dados.comentarios.criar(alvo, texto, {
                    uid: ctx.usuario.uid,
                    nome: ctx.nome
                });

                lista.append(itemComentario({
                    id,
                    texto: texto.trim(),
                    autorUid: ctx.usuario.uid,
                    autorNome: ctx.nome,
                    criadoEm: new Date()
                }));

                campo.value = "";

                status.textContent = "";

                opcoes.aoComentar?.();

            } catch (erro) {
                status.textContent = mensagemDeErro(erro);
            } finally {
                enviar.disabled = false;
            }
        });

        corpo.append(form);
    }


    // ---- Abrir / fechar ----

    alternar.addEventListener("click", async () => {

        const abrir = corpo.hidden;

        corpo.hidden = !abrir;

        alternar.setAttribute("aria-expanded", String(abrir));

        if (!abrir || carregado) return;

        carregado = true;

        try {
            ctx = await contextoAtual();
            montarFormulario();
            await carregar(true);
        } catch (erro) {
            carregado = false;
            status.textContent = mensagemDeErro(erro);
        }
    });

    mais.addEventListener("click", () => carregar(false));

    if (opcoes.abertoInicialmente) {
        alternar.click();
    }

    return raiz;
}
