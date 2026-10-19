function escaparHTML(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function carregarArtilheiros() {
    const container = document.getElementById('conteudo-artilheiros');

    try {
        const { data, error } = await supabaseClient
            .from('resultados')
            .select('gol1, gol2, gol3, gol4');

        if (error) throw error;

        const golsPorJogador = new Map();

        (data || []).forEach((jogo) => {
            ['gol1', 'gol2', 'gol3', 'gol4'].forEach((campo) => {
                const nome = String(jogo[campo] ?? '').trim();
                if (!nome) return;

                const chave = nome.toLocaleLowerCase('pt-BR');
                const jogador = golsPorJogador.get(chave) || { nome, gols: 0 };
                jogador.gols += 1;
                golsPorJogador.set(chave, jogador);
            });
        });

        const artilheiros = [...golsPorJogador.values()]
            .sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome, 'pt-BR'))
            .slice(0, 10);

        if (artilheiros.length === 0) {
            container.innerHTML = '<div class="loading">Nenhum gol cadastrado ainda.</div>';
            return;
        }

        container.innerHTML = `
            <section class="lista-artilheiros" aria-label="Os 10 maiores artilheiros">
                <div class="lista-cabecalho">
                    <span>Posição</span>
                    <span>Jogador</span>
                    <span>Gols</span>
                </div>
                ${artilheiros.map((jogador, indice) => `
                    <div class="artilheiro-item ${indice < 3 ? 'destaque' : ''}">
                        <span class="posicao">${indice + 1}º</span>
                        <span class="nome">${escaparHTML(jogador.nome)}</span>
                        <span class="gols">${jogador.gols}</span>
                    </div>
                `).join('')}
            </section>
        `;
    } catch (erro) {
        console.error('Erro ao carregar os artilheiros:', erro);
        container.innerHTML = '<div class="loading">Erro ao carregar os artilheiros. Verifique a conexão com o Supabase.</div>';
    }
}

carregarArtilheiros();
