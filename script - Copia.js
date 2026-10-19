const SPREADSHEET_ID = '1FDwr9XhrdbMkPKEv5a4qA2Sr0kMUVAe-ZpcEeaNB4CM';

// URL protegida contra travamentos de CORS
const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=pontos`;

// URL da aba de jogadores
const urlJogadores = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=jogadores`;

let elencos = {}; // vai guardar { "nome do time": [{posicao, nome}, ...] }

async function carregarJogadores() {
    try {
        const resposta = await fetch(urlJogadores);
        if (!resposta.ok) throw new Error('Erro ao acessar a planilha de jogadores.');

        const csvTexto = await resposta.text();
        const linhas = csvTexto.split('\n');

        // Pega o cabeçalho (posições) da primeira linha
        const separador = linhas[0].includes(';') ? ';' : ',';
        const cabecalho = linhas[0].split(separador).map(c => c.replace(/^"|"$/g, '').trim());

        linhas.slice(1).forEach((linha) => {
            if (!linha.trim()) return;

            const colunas = linha.split(separador).map(c => c.replace(/^"|"$/g, '').trim());
            const nomeTime = colunas[0];
            if (!nomeTime) return;

            const jogadoresDoTime = [];
            for (let i = 1; i < cabecalho.length; i++) {
                if (colunas[i]) {
                    jogadoresDoTime.push({
                        posicao: cabecalho[i],
                        nome: colunas[i]
                    });
                }
            }

            elencos[nomeTime.toLowerCase()] = jogadoresDoTime;
        });

    } catch (erro) {
        console.error("Erro ao carregar jogadores:", erro);
    }
}

// Abre o modal com os jogadores do time clicado
function mostrarJogadores(nomeTime) {
    const jogadores = elencos[nomeTime.toLowerCase()];
    const modal = document.getElementById('modal-jogadores');
    const corpoModal = document.getElementById('modal-corpo');
    const tituloModal = document.getElementById('modal-titulo');

    tituloModal.textContent = nomeTime;

    if (!jogadores || jogadores.length === 0) {
        corpoModal.innerHTML = '<p>Nenhum jogador cadastrado ainda.</p>';
    } else {
        corpoModal.innerHTML = jogadores.map(j => `
            <div class="jogador-item">
                <span class="jogador-posicao">${j.posicao}</span>
                <span class="jogador-nome">${j.nome}</span>
            </div>
        `).join('');
    }

    modal.classList.add('aberto');
}

function fecharModal() {
    document.getElementById('modal-jogadores').classList.remove('aberto');
}

async function carregarCampeonato() {
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error('Erro ao acessar a planilha.');
        
        const csvTexto = await resposta.text();
        const linhas = csvTexto.split('\n');

        let grupoAtual = "";
        let dadosGrupos = { "Grupo 1": [], "Grupo 2": [] };

        // 1. LEITURA DOS DADOS DA PLANILHA
        linhas.forEach((linha) => {
            const separador = linha.includes(';') ? ';' : ',';
            const colunas = linha.split(separador).map(celula => celula.replace(/^"|"$/g, '').trim());
            
            if (!colunas[0]) return; 
            
            const primeiraCelula = colunas[0].toLowerCase();

            // Detecta em qual grupo os times abaixo pertencem
            if (primeiraCelula.includes("grupo 1")) {
                grupoAtual = "Grupo 1";
                return;
            } else if (primeiraCelula.includes("grupo 2")) {
                grupoAtual = "Grupo 2";
                return;
            }

            // Pula a linha que serve apenas de cabeçalho na planilha
            if (primeiraCelula === "times" || primeiraCelula === "") return;

            const formatarNumero = (valor) => valor && !isNaN(valor) ? parseInt(valor) : 0;

            if (grupoAtual) {
                dadosGrupos[grupoAtual].push({
                    time: colunas[0],
                    pj: formatarNumero(colunas[1]),
                    pts: formatarNumero(colunas[2]),
                    v: formatarNumero(colunas[3]),
                    e: formatarNumero(colunas[4]),
                    d: formatarNumero(colunas[5]),
                    gp: formatarNumero(colunas[6]),
                    gc: formatarNumero(colunas[7]),
                    sg: formatarNumero(colunas[8])
                });
            }
        });

        // 2. A SUA LÓGICA DE ORDENAÇÃO APLICADA NOS DADOS REAIS
        // Organiza por Pontos (PTS) e usa o Saldo de Gols (SG) como critério de desempate
        for (let grupo in dadosGrupos) {
            dadosGrupos[grupo].sort((a, b) => {
                if (b.pts !== a.pts) {
                    return b.pts - a.pts; // Maior pontuação fica em cima
                }
                return b.sg - a.sg; // Se empatar em pontos, desempata pelo Saldo de Gols
            });
        }

        // 3. RENDERIZAÇÃO DO HTML NA TELA
        let htmlFinal = '';

        for (let grupo in dadosGrupos) {
            if (dadosGrupos[grupo].length === 0) continue;

            htmlFinal += `<h2>${grupo}</h2>`;
            htmlFinal += `
                <div class="tabela-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th class="time">Times</th>
                                <th>PJ</th>
                                <th>PTS</th>
                                <th>V</th>
                                <th>E</th>
                                <th>D</th>
                                <th>GP</th>
                                <th>GC</th>
                                <th>SG</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Adiciona a posição automática (i + 1) igual ao seu código original
            dadosGrupos[grupo].forEach((item, i) => {
                htmlFinal += `
                    <tr>
                        <td>${i + 1}°</td>
                        <td class="time" onclick="mostrarJogadores('${item.time}')">${item.time}</td>
                        <td>${item.pj}</td>
                        <td><strong>${item.pts}</strong></td>
                        <td>${item.v}</td>
                        <td>${item.e}</td>
                        <td>${item.d}</td>
                        <td>${item.gp}</td>
                        <td>${item.gc}</td>
                        <td>${item.sg}</td>
                    </tr>
                `;
            });

            htmlFinal += `</tbody></table></div>`;
        }

        document.getElementById('campeonato-conteudo').innerHTML = htmlFinal;

    } catch (erro) {
        console.error("Erro:", erro);
        document.getElementById('campeonato-conteudo').innerHTML = "<div class='loading'>Erro ao carregar a classificação. Verifique a conexão.</div>";
    }
}

// Inicializa a tabela
carregarCampeonato();
carregarJogadores();