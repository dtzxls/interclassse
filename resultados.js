// Este arquivo depende de supabaseClient.js (inclua-o ANTES deste no HTML)

async function carregarResultados() {
    const container = document.getElementById('conteudo-resultados');

    try {
        const { data, error } = await supabaseClient
            .from('resultados')
            .select('*')
            .order('criado_em', { ascending: false }); // mais recentes primeiro

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<div class='loading'>Nenhum jogo cadastrado na tabela de resultados ainda.</div>";
            return;
        }

        let htmlCards = '<div class="grid-resultados">';

        data.forEach((jogo) => {
            // Time 1 fica sempre à esquerda e Time 2 à direita
            const time1 = jogo.time1;
            const time2 = jogo.time2;
            const golsTime1 = jogo.gols_time1 ?? 0;
            const golsTime2 = jogo.gols_time2 ?? 0;
            const golsTime1f = jogo.gols_time1_f;
            const golsTime2f = jogo.gols_time2_f;
            // Faltas (placar-f): aparece quando o jogo tiver —
            // basta um lado preenchido (o outro mostra 0)
            const temFaltas = (golsTime1f !== null && golsTime1f !== undefined)
                || (golsTime2f !== null && golsTime2f !== undefined);

            // Time 1: gol1/gol2 | Time 2: gol3/gol4
            const artilheirosTime1 = [jogo.gol1, jogo.gol2].filter(Boolean).join('<br>');
            const artilheirosTime2 = [jogo.gol3, jogo.gol4].filter(Boolean).join('<br>');
            const temArtilheiros = artilheirosTime1 !== '' || artilheirosTime2 !== '';

            const venceu1 = golsTime1 > golsTime2;
            const venceu2 = golsTime2 > golsTime1;
            const empate = !venceu1 && !venceu2;

            // Classes de cor (venceu/perdeu/empate) sem trocar a posição no grid
            const corLado1 = venceu1 ? ' venceu' : (venceu2 ? ' perdeu' : ' empate');
            const corLado2 = venceu2 ? ' venceu' : (venceu1 ? ' perdeu' : ' empate');

            htmlCards += `
            <div class="card-placar">
                <div class="confronto">
                    <div class="time-box time-vencedor${corLado1}">${time1}</div>
                    <div class="placar-numeros">${golsTime1} - ${golsTime2}</div>
                    <div class="time-box time-perdedor${corLado2}">${time2}</div>

                    <div class="tabelaart tabelaart-vencedor">${temArtilheiros ? artilheirosTime1 : '&nbsp;'}</div>
                    <div class="placar-f">${temFaltas ? `<span class="rotulo-f">Faltas</span>${golsTime1f ?? 0} - ${golsTime2f ?? 0}` : '&nbsp;'}</div>
                    <div class="tabelaart tabelaart-perdedor">${temArtilheiros ? artilheirosTime2 : '&nbsp;'}</div>
                </div>
                <div class="status-partida">${empate ? 'Empate' : 'Fim de jogo'}</div>
            </div>
            `;
        });

        htmlCards += '</div>';
        container.innerHTML = htmlCards;

    } catch (erro) {
        console.error("Erro ao carregar resultados do Supabase:", erro);
        container.innerHTML = "<div class='loading'>Erro ao carregar os resultados. Verifique a conexão com o Supabase (URL/chave em supabaseClient.js e as políticas de RLS).</div>";
    }
}

carregarResultados();