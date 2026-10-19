// =====================================================
// MATA-MATA - LEITURA PÚBLICA DA CHAVE (Supabase)
// Mostra quem joga contra quem em formato de chave.
// Gerenciado pelo painel adm.html (tabela "mata_mata").
// =====================================================

function escaparHTML(texto) {
    return String(texto ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatarData(data) {
    if (!data) return '';
    const partes = String(data).split('-');
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHora(hora) {
    if (!hora) return '';
    return String(hora).substring(0, 5);
}

function vencedorDoJogo(jogo) {
    const g1 = jogo.gols_time1;
    const g2 = jogo.gols_time2;
    if (g1 === null || g1 === undefined || g2 === null || g2 === undefined) return null;
    if (!jogo.time1 || !jogo.time2) return null;
    if (g1 > g2) return jogo.time1;
    if (g2 > g1) return jogo.time2;
    return null; // empate não define vencedor sozinho
}

async function carregarMataMata() {
    const container = document.getElementById('conteudo-mata-mata');
    if (!container) return;

    try {
        const { data, error } = await supabaseClient
            .from('mata_mata')
            .select('*')
            .order('fase_ordem', { ascending: true })
            .order('posicao', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<div class='loading'>A chave do mata-mata ainda não foi gerada. Volte em breve!</div>";
            return;
        }

        // Agrupa por fase mantendo a ordem
        const fases = [];
        const mapa = new Map();
        data.forEach((jogo) => {
            const chave = `${jogo.fase_ordem}||${jogo.fase}`;
            if (!mapa.has(chave)) {
                const grupo = { fase: jogo.fase, ordem: jogo.fase_ordem, jogos: [] };
                mapa.set(chave, grupo);
                fases.push(grupo);
            }
            mapa.get(chave).jogos.push(jogo);
        });
        fases.sort((a, b) => a.ordem - b.ordem);

        let html = '';

        // Se a última fase (final) já tem vencedor, mostra o campeão
        const ultimaFase = fases[fases.length - 1];
        const jogoFinal = ultimaFase && ultimaFase.jogos.length === 1 ? ultimaFase.jogos[0] : null;
        const campeao = jogoFinal ? vencedorDoJogo(jogoFinal) : null;
        if (campeao && jogoFinal.status === 'finalizado') {
            html += `<div class="campeao-banner">🏆 Campeão: ${escaparHTML(campeao)}</div>`;
        }

        html += '<div class="chave-container">';

        fases.forEach((grupo) => {
            html += `<section class="fase-coluna">
                <h2 class="fase-titulo">${escaparHTML(grupo.fase)}</h2>
                <div class="fase-jogos">`;

            grupo.jogos.forEach((jogo, idx) => {
                const vencedor = vencedorDoJogo(jogo);
                const t1 = jogo.time1 ? escaparHTML(jogo.time1) : 'A definir';
                const t2 = jogo.time2 ? escaparHTML(jogo.time2) : 'A definir';
                const g1 = (jogo.gols_time1 !== null && jogo.gols_time1 !== undefined) ? jogo.gols_time1 : '-';
                const g2 = (jogo.gols_time2 !== null && jogo.gols_time2 !== undefined) ? jogo.gols_time2 : '-';
                const cls1 = !jogo.time1 ? 'a-definir' : (vencedor === jogo.time1 ? 'vencedor' : '');
                const cls2 = !jogo.time2 ? 'a-definir' : (vencedor === jogo.time2 ? 'vencedor' : '');
                const status = jogo.status || 'agendado';
                const statusRotulo = status === 'finalizado' ? 'Finalizado' : (status === 'andamento' ? 'Em andamento' : 'Agendado');

                let info = 'Confronto ' + (idx + 1);
                const partes = [];
                if (jogo.data) partes.push('📅 ' + formatarData(jogo.data));
                if (jogo.hora) partes.push('⏰ ' + formatarHora(jogo.hora));
                if (jogo.local) partes.push('📍 ' + escaparHTML(jogo.local));
                if (partes.length) info = partes.join(' &nbsp;•&nbsp; ');

                html += `
                <article class="jogo-chave">
                    <div class="jogo-topo">
                        <span>Jogo ${jogo.posicao}</span>
                        <span class="status status-${escaparHTML(status)}">${escaparHTML(statusRotulo)}</span>
                    </div>
                    <div class="time-linha ${cls1}">
                        <span class="nome">${t1}</span>
                        <span class="gols">${g1}</span>
                    </div>
                    <div class="time-linha ${cls2}">
                        <span class="nome">${t2}</span>
                        <span class="gols">${g2}</span>
                    </div>
                    <div class="jogo-rodape">${info}</div>
                </article>`;
            });

            html += '</div></section>';
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (erro) {
        console.error('Erro ao carregar o mata-mata:', erro);
        container.innerHTML = "<div class='loading'>Erro ao carregar a chave. Verifique se o arquivo mata-mata-supabase.sql já foi executado no Supabase.</div>";
    }
}

// Atualização ao vivo quando o admin mexe na chave
try {
    supabaseClient
        .channel('atualizacao-mata-mata')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mata_mata' }, () => {
            carregarMataMata();
        })
        .subscribe();
} catch (erro) {
    console.warn('Atualização ao vivo do mata-mata indisponível:', erro);
}

carregarMataMata();
