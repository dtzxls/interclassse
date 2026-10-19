// =====================================================
// CLASSIFICAÇÃO - 100% SUPABASE (sem planilhas)
// =====================================================
// A tabela lê a VISÃO "classificacao" do Supabase, que calcula
// sozinha PJ, PTS, V, E, D, GP, GC e SG a partir de cada jogo
// cadastrado na tabela "resultados" pelo admin.html.
// Cadastrou um jogo? Os pontos mudam sozinhos.

const posicoesJogadores = [
    { chave: 'goleiro', rotulo: 'Goleiro' },
    { chave: 'fixo', rotulo: 'Fixo' },
    { chave: 'ala_direito', rotulo: 'Ala direito' },
    { chave: 'ala_esquerdo', rotulo: 'Ala esquerdo' },
    { chave: 'pivo', rotulo: 'Pivô' },
    { chave: 'reserva1', rotulo: 'Reserva 1' },
    { chave: 'reserva2', rotulo: 'Reserva 2' },
    { chave: 'reserva3', rotulo: 'Reserva 3' },
    { chave: 'reserva4', rotulo: 'Reserva 4' },
    { chave: 'reserva5', rotulo: 'Reserva 5' }
];

let elencos = {}; // guarda { "nome do time": [{posicao, nome}, ...] }

function escaparHTML(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function carregarElencos() {
    try {
        const { data, error } = await supabaseClient
            .from('jogadores')
            .select('*');

        if (error) throw error;

        elencos = {};

        (data || []).forEach((time) => {
            const jogadoresDoTime = [];

            posicoesJogadores.forEach(({ chave, rotulo }) => {
                const nome = time[chave];

                if (nome && String(nome).trim() !== '') {
                    jogadoresDoTime.push({ posicao: rotulo, nome: nome });
                }
            });

            elencos[String(time.time).toLowerCase()] = jogadoresDoTime;
        });

    } catch (erro) {
        console.error('Erro ao carregar os elencos do Supabase:', erro);
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
                <span class="jogador-nome">${escaparHTML(j.nome)}</span>
            </div>
        `).join('');
    }

    modal.classList.add('aberto');
}

function fecharModal() {
    document.getElementById('modal-jogadores').classList.remove('aberto');
}

async function carregarCampeonato() {
    const container = document.getElementById('campeonato-conteudo');

    try {
        // A ordem já vem correta do banco: grupo, pontos, saldo e gols pró
        const { data, error } = await supabaseClient
            .from('classificacao')
            .select('*')
            .order('grupo', { ascending: true })
            .order('pts', { ascending: false })
            .order('sg', { ascending: false })
            .order('gp', { ascending: false })
            .order('time', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<div class='loading'>Nenhum time cadastrado ainda. Adicione os times (1 linha por time) na tabela 'jogadores' do Supabase.</div>";
            return;
        }

        // Agrupa os times por grupo preservando a ordem vinda do banco
        const grupos = {};
        data.forEach((item) => {
            const nomeGrupo = item.grupo || 'Classificação';
            if (!grupos[nomeGrupo]) grupos[nomeGrupo] = [];
            grupos[nomeGrupo].push(item);
        });

        // RENDERIZAÇÃO DO HTML NA TELA
        let htmlFinal = '';

        for (let grupo in grupos) {
            htmlFinal += `<h2>${escaparHTML(grupo)}</h2>`;
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

            grupos[grupo].forEach((item, i) => {
                htmlFinal += `
                    <tr>
                        <td>${i + 1}°</td>
                        <td class="time" onclick="mostrarJogadores(this.textContent)">${escaparHTML(item.time)}</td>
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

        container.innerHTML = htmlFinal;

    } catch (erro) {
        console.error('Erro:', erro);
        container.innerHTML = "<div class='loading'>Erro ao carregar a classificação. Verifique a conexão e se o arquivo atualizacao-supabase.sql já foi executado no Supabase.</div>";
    }
}

// Atualização ao vivo: quando o admin cadastra, edita ou apaga um
// jogo em "resultados", a tabela se recarrega sozinha.
// (Depende do SQL: ALTER PUBLICATION supabase_realtime ADD TABLE resultados;)
try {
    supabaseClient
        .channel('atualizacao-classificacao')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'resultados' }, () => {
            carregarCampeonato();
        })
        .subscribe();
} catch (erro) {
    console.warn('Atualização ao vivo indisponível:', erro);
}

// Inicializa a tabela
carregarCampeonato();
carregarElencos();