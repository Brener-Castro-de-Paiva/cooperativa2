/* ============================================================
   COJURIS — DOCUMENTOS

   ARQUIVO: portal/js/documentos.js

   01 — Inicialização e abas
   02 — Gerenciador de uma pasta (lista + envio)
   03 — Pasta pessoal (com seletor para a administração)
   04 — Biblioteca

   Todo o acesso a dados passa por ./dados/index.js.
   ============================================================ */

import { CONFIG } from "./dados/config.js";
import { permissoes, mensagemDeErro } from "./dados/index.js";
import { el, botao, formatarData, formatarTamanho, iniciarPagina } from "./recursos/ui.js";


// ============================================================
// 01 — INICIALIZAÇÃO E ABAS
// ============================================================

iniciarPagina(async (ctx) => {

    configurarAbas();

    montarPastaPessoal(ctx);

    montarBiblioteca(ctx);
});


function configurarAbas() {

    const abas = [...document.querySelectorAll(".cj-aba")];

    const selecionar = (aba) => {

        abas.forEach((a) => {
            const ativa = a === aba;
            a.setAttribute("aria-selected", String(ativa));
            a.tabIndex = ativa ? 0 : -1;
            document.getElementById(
                a.getAttribute("aria-controls")
            ).hidden = !ativa;
        });

        aba.focus();
    };

    abas.forEach((aba, i) => {

        aba.addEventListener("click", () => selecionar(aba));

        aba.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") selecionar(abas[(i + 1) % abas.length]);
            if (e.key === "ArrowLeft") selecionar(abas[(i - 1 + abas.length) % abas.length]);
        });
    });

    if (location.hash === "#biblioteca") {
        selecionar(document.getElementById("aba-biblioteca"));
    }
}


// ============================================================
// 02 — GERENCIADOR DE UMA PASTA
// ============================================================

function iconeDoArquivo(nome = "") {

    const ext = (nome.split(".").pop() || "").toLowerCase();

    if (ext === "pdf") return "PDF";
    if (["doc", "docx", "odt"].includes(ext)) return "DOC";
    if (["xls", "xlsx"].includes(ext)) return "XLS";
    if (["jpg", "jpeg", "png"].includes(ext)) return "IMG";
    return "ARQ";
}


function baixar(url, nome) {

    const a = document.createElement("a");

    a.href = url;
    a.download = nome || "";
    a.target = "_blank";
    a.rel = "noopener";

    document.body.append(a);
    a.click();
    a.remove();
}


function criarGerenciador({ ctx, container, pastaAtual, podeEnviar, comDescricao, textoVazio }) {

    container.replaceChildren();

    const status = el("p", "mensagem-listagem");

    status.setAttribute("role", "status");

    status.setAttribute("aria-live", "polite");

    const lista = el("ul", "cj-documentos");


    // ---------- Formulário de envio ----------

    if (podeEnviar) {

        const form = el("form", "cj-envio");

        const zona = el("label", "cj-zona");

        const entrada = el("input");

        entrada.type = "file";
        entrada.name = "arquivo";
        entrada.accept = CONFIG.extensoesAceitas.join(",");
        entrada.className = "cj-zona-entrada";

        const textoZona = el("span", "cj-zona-texto", "Toque para escolher um arquivo ou arraste-o até aqui");

        const nomeEscolhido = el("span", "cj-zona-arquivo");

        zona.append(entrada, el("span", "cj-zona-icone", "⇪"), textoZona, nomeEscolhido);

        const campoTitulo = el("div", "campo");
        const rotuloTitulo = el("label", "", "Título (opcional)");
        const titulo = el("input", "cj-campo");
        const idTitulo = `titulo-${container.id}`;
        rotuloTitulo.htmlFor = idTitulo;
        titulo.id = idTitulo;
        titulo.maxLength = 150;
        titulo.placeholder = "Usa o nome do arquivo se ficar em branco";
        campoTitulo.append(rotuloTitulo, titulo);

        form.append(zona, campoTitulo);

        let descricao = null;

        if (comDescricao) {
            const campo = el("div", "campo");
            const rotulo = el("label", "", "Descrição (opcional)");
            descricao = el("textarea", "cj-campo");
            const idDesc = `descricao-${container.id}`;
            rotulo.htmlFor = idDesc;
            descricao.id = idDesc;
            descricao.rows = 2;
            descricao.maxLength = 500;
            campo.append(rotulo, descricao);
            form.append(campo);
        }

        const progresso = el("progress", "cj-progresso");

        progresso.max = 1;
        progresso.value = 0;
        progresso.hidden = true;

        const enviar = el("button", "botao-primario", "Enviar arquivo");

        enviar.type = "submit";

        const acoes = el("div", "acoes-formulario");

        acoes.append(enviar);

        form.append(progresso, acoes);

        container.append(form);


        const mostrarEscolha = () => {
            const f = entrada.files[0];
            nomeEscolhido.textContent = f
                ? `${f.name} · ${formatarTamanho(f.size)}`
                : "";
            zona.classList.toggle("cj-zona-preenchida", !!f);
        };

        entrada.addEventListener("change", mostrarEscolha);

        ["dragenter", "dragover"].forEach((t) =>
            zona.addEventListener(t, (e) => {
                e.preventDefault();
                zona.classList.add("cj-zona-ativa");
            })
        );

        ["dragleave", "drop"].forEach((t) =>
            zona.addEventListener(t, () => zona.classList.remove("cj-zona-ativa"))
        );

        zona.addEventListener("drop", (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) {
                entrada.files = e.dataTransfer.files;
                mostrarEscolha();
            }
        });


        form.addEventListener("submit", async (evento) => {

            evento.preventDefault();

            if (enviar.disabled) return;

            const pasta = pastaAtual();

            if (!pasta) {
                status.textContent = "Escolha antes a pasta de destino.";
                return;
            }

            enviar.disabled = true;
            enviar.textContent = "Enviando...";
            progresso.hidden = false;
            progresso.value = 0;
            status.textContent = "";

            try {

                await ctx.dados.documentos.enviar(
                    pasta,
                    entrada.files[0],
                    {
                        titulo: titulo.value,
                        descricao: descricao?.value
                    },
                    { uid: ctx.usuario.uid, nome: ctx.nome },
                    (fracao) => { progresso.value = fracao; }
                );

                form.reset();
                mostrarEscolha();

                status.textContent = "Arquivo enviado.";

                await recarregar();

            } catch (erro) {
                status.textContent = mensagemDeErro(erro);
            } finally {
                enviar.disabled = false;
                enviar.textContent = "Enviar arquivo";
                progresso.hidden = true;
            }
        });
    }

    container.append(status, lista);


    // ---------- Lista ----------

    function itemDocumento(pasta, d) {

        const item = el("li", "cj-documento");

        const icone = el("span", "cj-documento-icone", iconeDoArquivo(d.nomeArquivo));

        icone.setAttribute("aria-hidden", "true");

        const info = el("div", "cj-documento-info");

        info.append(el("strong", "cj-documento-titulo", d.titulo || d.nomeArquivo));

        if (d.descricao) {
            info.append(el("p", "cj-documento-descricao", d.descricao));
        }

        const meta = [
            formatarTamanho(d.tamanho),
            formatarData(d.criadoEm),
            d.autorUid !== ctx.usuario.uid && d.autorNome
                ? `enviado por ${d.autorNome}`
                : ""
        ].filter(Boolean).join(" · ");

        info.append(el("span", "cj-documento-meta", meta));

        const acoes = el("div", "cj-documento-acoes");

        const botaoBaixar = botao("Baixar", "botao-secundario", async () => {

            botaoBaixar.disabled = true;

            try {
                baixar(await ctx.dados.documentos.link(d), d.nomeArquivo);
            } catch (erro) {
                status.textContent = mensagemDeErro(erro);
            } finally {
                botaoBaixar.disabled = false;
            }
        });

        botaoBaixar.setAttribute("aria-label", `Baixar ${d.titulo || d.nomeArquivo}`);

        acoes.append(botaoBaixar);

        if (permissoes.excluirItem(ctx.perfil, ctx.usuario.uid, d)) {

            const botaoExcluir = botao("Excluir", "botao-excluir", async () => {

                if (!confirm(`Excluir "${d.titulo || d.nomeArquivo}"?`)) return;

                botaoExcluir.disabled = true;

                try {
                    await ctx.dados.documentos.excluir(pasta, d);
                    item.remove();
                    if (!lista.children.length) status.textContent = textoVazio;
                } catch (erro) {
                    botaoExcluir.disabled = false;
                    status.textContent = mensagemDeErro(erro);
                }
            });

            botaoExcluir.setAttribute("aria-label", `Excluir ${d.titulo || d.nomeArquivo}`);

            acoes.append(botaoExcluir);
        }

        item.append(icone, info, acoes);

        return item;
    }


    let versao = 0;

    async function recarregar() {

        const minhaVersao = ++versao;

        const pasta = pastaAtual();

        lista.replaceChildren();

        if (!pasta) {
            status.textContent = "Selecione um cooperado para ver a pasta.";
            return;
        }

        status.textContent = "Carregando documentos...";

        try {

            const { itens } = await ctx.dados.documentos.listar(pasta);

            if (minhaVersao !== versao) return;

            itens.forEach((d) => lista.append(itemDocumento(pasta, d)));

            status.textContent = itens.length ? "" : textoVazio;

        } catch (erro) {
            if (minhaVersao === versao) status.textContent = mensagemDeErro(erro);
        }
    }

    recarregar();

    return { recarregar };
}


// ============================================================
// 03 — PASTA PESSOAL
//
// Cooperado: vê e envia para a própria pasta.
// Administração: escolhe de qual cooperado é a pasta.
// ============================================================

async function montarPastaPessoal(ctx) {

    const container = document.getElementById("conteudo-pessoal");

    const admin = permissoes.administrar(ctx.perfil);

    if (!admin) {

        criarGerenciador({
            ctx,
            container,
            pastaAtual: () => ({ tipo: "pessoal", uid: ctx.usuario.uid }),
            podeEnviar: true,
            comDescricao: false,
            textoVazio: "Você ainda não enviou documentos."
        });

        return;
    }

    // Administração

    document.getElementById("titulo-pessoal").textContent = "Pastas dos cooperados";

    document.getElementById("ajuda-pessoal").textContent =
        "Consulte os documentos enviados por cada cooperado ou envie um arquivo para a pasta dele.";

    document.getElementById("aba-pessoal").textContent = "Pastas dos cooperados";

    const seletorArea = document.getElementById("seletor-cooperado");

    const seletor = document.getElementById("cooperado");

    seletorArea.hidden = false;

    const vazio = el("option", "", "Selecione um cooperado");

    vazio.value = "";

    seletor.append(vazio);

    try {

        const cooperados = await ctx.dados.cooperados.listar();

        cooperados.forEach((c) => {
            const opcao = el("option", "", c.nome || c.email);
            opcao.value = c.uid;
            if (c.status && c.status !== "aprovado") {
                opcao.textContent += ` (${c.status})`;
            }
            seletor.append(opcao);
        });

    } catch (erro) {
        container.append(el("p", "mensagem-listagem", mensagemDeErro(erro)));
        return;
    }

    const gerenciador = criarGerenciador({
        ctx,
        container,
        pastaAtual: () => seletor.value
            ? { tipo: "pessoal", uid: seletor.value }
            : null,
        podeEnviar: true,
        comDescricao: false,
        textoVazio: "Este cooperado ainda não tem documentos."
    });

    seletor.addEventListener("change", () => gerenciador.recarregar());
}


// ============================================================
// 04 — BIBLIOTECA
// ============================================================

function montarBiblioteca(ctx) {

    criarGerenciador({
        ctx,
        container: document.getElementById("conteudo-biblioteca"),
        pastaAtual: () => ({ tipo: "biblioteca" }),
        podeEnviar: permissoes.administrar(ctx.perfil),
        comDescricao: true,
        textoVazio: "Nenhum material publicado ainda."
    });
}
