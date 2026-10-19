// =====================================================
// MATA-MATA - ADMIN parte 1: gerar chave automaticamente
// =====================================================

function nomeFasePorTamanho(qtd, indiceFase, totalFases) {
    const jogos = qtd / Math.pow(2, indiceFase + 1);
    if (totalFases === 1) return 'Final';
    if (indiceFase === totalFases - 1) return 'Final';
    if (indiceFase === totalFases - 2) return 'Semifinal';
    if (jogos === 4) return 'Quartas de final';
    if (jogos === 8) return 'Oitavas de final';
    return 'Fase ' + (indiceFase + 1);
}

function embaralhar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}

async function buscarTimesParaSorteio(origem, intercalar) {
    if (origem === 'classificacao') {
        const res = await supabaseClient.from('classificacao').select('time, grupo');
        if (res.error) throw res.error;
        const dados = res.data || [];
        if (!intercalar) return dados.map(function (x) { return x.time; });
        const porG = {};
        dados.forEach(function (x) {
            if (!porG[x.grupo]) porG[x.grupo] = [];
            porG[x.grupo].push(x.time);
        });
        const chaves = Object.keys(porG).sort();
        const lista = [];
        let i = 0, tem = true;
        while (tem) {
            tem = false;
            chaves.forEach(function (g) {
                if (porG[g][i] !== undefined) { lista.push(porG[g][i]); tem = true; }
            });
            i++;
        }
        return lista;
    }
    const res2 = await supabaseClient.from('jogadores').select('time').order('time');
    if (res2.error) throw res2.error;
    return (res2.data || []).map(function (x) { return x.time; });
}


document.getElementById('form-mata-mata-gerar').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const msg = document.getElementById('mensagem-mata-mata-gerar');
    const qtd = parseInt(document.getElementById('mm_qtd').value, 10);
    const origem = document.getElementById('mm_origem').value;
    const sortear = document.getElementById('mm_sortear').checked;
    const intercalar = document.getElementById('mm_mesclar_grupos').checked;
    const limpar = document.getElementById('mm_limpar').checked;
    try {
        msg.textContent = 'Buscando times...';
        msg.className = '';
        let lista = await buscarTimesParaSorteio(origem, intercalar);
        lista = lista.filter(Boolean);
        if (lista.length < qtd) {
            msg.textContent = 'So ha ' + lista.length + ' time(s). Cadastre mais ou escolha chave menor.';
            msg.className = 'erro';
            return;
        }
        let sel = lista.slice(0, qtd);
        if (sortear) sel = embaralhar(sel);
        const totalFases = Math.log2(qtd);
        const linhas = [];
        for (let f = 0; f < totalFases; f++) {
            const jogosN = qtd / Math.pow(2, f + 1);
            const fase = nomeFasePorTamanho(qtd, f, totalFases);
            for (let p = 1; p <= jogosN; p++) {
                const linha = { fase: fase, fase_ordem: f, posicao: p, status: 'agendado' };
                if (f === 0) {
                    linha.time1 = sel[(p - 1) * 2];
                    linha.time2 = sel[(p - 1) * 2 + 1];
                }
                linhas.push(linha);
            }
        }
        msg.textContent = 'Salvando chave...';
        if (limpar) {
            const del = await supabaseClient.from('mata_mata').delete().neq('id', 0);
            if (del.error) throw del.error;
        }
        const ins = await supabaseClient.from('mata_mata').insert(linhas);
        if (ins.error) throw ins.error;
        msg.textContent = 'Chave de ' + qtd + ' times gerada!';
        msg.className = 'sucesso';
        await carregarMataMataAdmin();
    } catch (e) {
        console.error(e);
        msg.textContent = 'Erro ao gerar. Execute o mata-mata-supabase.sql no Supabase.';
        msg.className = 'erro';
    }
});

// MATA-MATA ADMIN parte 2: editar jogo a jogo
async function carregarMataMataAdmin() {
    const box = document.getElementById('conteudo-mata-mata-admin');
    if (!box) return;
    box.innerHTML = "<div class='loading'>Carregando chave...</div>";
    try {
        const res = await supabaseClient.from('mata_mata').select('*')
            .order('fase_ordem', { ascending: true }).order('posicao', { ascending: true });
        if (res.error) throw res.error;
        const data = res.data || [];
        if (!data.length) {
            box.innerHTML = "<div class='loading'>Nenhuma chave gerada ainda.</div>";
            return;
        }
        let nomes = [];
        try { nomes = await buscarTimesParaSorteio('classificacao', false); } catch (e) { nomes = []; }
        if (!nomes.length && typeof times !== 'undefined') nomes = times.map(function (t) { return t.time; });
        const opts = function (sel) {
            let h = '<option value="">A definir</option>';
            nomes.forEach(function (n) {
                h += '<option value="' + n + '"' + (n === sel ? ' selected' : '') + '>' + n + '</option>';
            });
            return h;
        };
        let html = '<div class="grid-resultados">';
        data.forEach(function (j) {
            html += mmCardHTML(j, opts);
        });
        html += '</div>';
        box.innerHTML = html;
    } catch (e) {
        console.error(e);
        box.innerHTML = "<div class='loading'>Erro ao carregar. Execute o mata-mata-supabase.sql.</div>";
    }
}

function mmCardHTML(j, opts) {
    const st = function (v, t) {
        return '<option value="' + v + '"' + (j.status === v ? ' selected' : '') + '>' + t + '</option>';
    };
    return '<div class="card-placar" data-mm-id="' + j.id + '">'
        + '<strong>' + (j.fase || '') + ' - Jogo ' + j.posicao + '</strong>'
        + '<div class="campo-duplo" style="margin-top:12px">'
        + '<div class="campo"><label>Time 1</label><select data-campo="time1">' + opts(j.time1) + '</select></div>'
        + '<div class="campo"><label>Time 2</label><select data-campo="time2">' + opts(j.time2) + '</select></div>'
        + '</div>'
        + '<div class="campo-duplo">'
        + '<div class="campo"><label>Gols T1</label><input type="number" min="0" data-campo="gols_time1" value="' + (j.gols_time1 ?? '') + '"></div>'
        + '<div class="campo"><label>Gols T2</label><input type="number" min="0" data-campo="gols_time2" value="' + (j.gols_time2 ?? '') + '"></div>'
        + '</div>'
        + '<div class="campo-duplo">'
        + '<div class="campo"><label>Data</label><input type="date" data-campo="data" value="' + (j.data || '') + '"></div>'
        + '<div class="campo"><label>Hora</label><input type="time" data-campo="hora" value="' + (j.hora || '') + '"></div>'
        + '</div>'
        + '<div class="campo-duplo">'
        + '<div class="campo"><label>Local</label><input type="text" data-campo="local" value="' + (j.local || '') + '"></div>'
        + '<div class="campo"><label>Status</label><select data-campo="status">'
        + st('agendado', 'Agendado') + st('andamento', 'Em andamento') + st('finalizado', 'Finalizado')
        + '</select></div>'
        + '</div>'
        + '<div class="campo-duplo">'
        + '<div class="campo"><label>Fase</label><input type="text" data-campo="fase" value="' + (j.fase || '') + '"></div>'
        + '<div class="campo"><label>Posicao</label><input type="number" min="1" data-campo="posicao" value="' + (j.posicao ?? 1) + '"></div>'
        + '</div>'
        + '<button type="button" onclick="salvarJogoMataMata(' + j.id + ', this)">Salvar</button>'
        + '<button type="button" onclick="excluirJogoMataMata(' + j.id + ')" style="margin-top:8px;background:#991b1b;border-color:#7f1d1d">Excluir</button>'
        + '<div class="mm-msg" id="mm-msg-' + j.id + '"></div>'
        + '</div>';
}
async function salvarJogoMataMata(id, btn) {
    const card = document.querySelector('[data-mm-id="' + id + '"]');
    const msg = document.getElementById('mm-msg-' + id);
    const ler = function (c) {
        const el = card.querySelector('[data-campo="' + c + '"]');
        const v = el ? el.value : '';
        if (c === 'gols_time1' || c === 'gols_time2' || c === 'posicao') return v === '' ? null : Number(v);
        if (c === 'data' || c === 'hora') return v === '' ? null : v;
        return v === '' ? null : v;
    };
    const t1 = ler('time1'), t2 = ler('time2');
    if (t1 && t2 && t1 === t2) {
        msg.textContent = 'Times precisam ser diferentes.';
        msg.className = 'mm-msg erro';
        return;
    }
    msg.textContent = 'Salvando...'; msg.className = 'mm-msg';
    if (btn) btn.disabled = true;
    const payload = {
        time1: t1, time2: t2, gols_time1: ler('gols_time1'), gols_time2: ler('gols_time2'),
        data: ler('data'), hora: ler('hora'), local: ler('local'),
        status: ler('status') || 'agendado', fase: ler('fase') || 'Fase', posicao: ler('posicao') ?? 1
    };
    const up = await supabaseClient.from('mata_mata').update(payload).eq('id', id);
    if (btn) btn.disabled = false;
    if (up.error) { msg.textContent = 'Erro ao salvar.'; msg.className = 'mm-msg erro'; return; }
    msg.textContent = 'Salvo!'; msg.className = 'mm-msg sucesso';
}

async function excluirJogoMataMata(id) {
    if (!confirm('Excluir este confronto?')) return;
    await supabaseClient.from('mata_mata').delete().eq('id', id);
    await carregarMataMataAdmin();
}
document.getElementById('btn-avancar-vencedores').addEventListener('click', async function () {
    const msg = document.getElementById('mensagem-mata-mata-avancar');
    msg.textContent = 'Avancando vencedores...'; msg.className = '';
    try {
        const res = await supabaseClient.from('mata_mata').select('*')
            .order('fase_ordem', { ascending: true }).order('posicao', { ascending: true });
        if (res.error) throw res.error;
        const data = res.data || [];
        if (!data.length) { msg.textContent = 'Nenhuma chave.'; msg.className = 'erro'; return; }
        const ordens = [...new Set(data.map(function (j) { return j.fase_ordem; }))].sort(function (a, b) { return a - b; });
        for (let i = 0; i < ordens.length - 1; i++) {
            const atual = data.filter(function (j) { return j.fase_ordem === ordens[i]; });
            const prox = data.filter(function (j) { return j.fase_ordem === ordens[i + 1]; });
            atual.forEach(function (jogo, idx) {
                if (jogo.status !== 'finalizado') return;
                if (jogo.gols_time1 === null || jogo.gols_time2 === null) return;
                if (jogo.gols_time1 === undefined || jogo.gols_time2 === undefined) return;
                if (!jogo.time1 || !jogo.time2) return;
                if (jogo.gols_time1 === jogo.gols_time2) return;
                const venc = jogo.gols_time1 > jogo.gols_time2 ? jogo.time1 : jogo.time2;
                const dest = prox[Math.floor(idx / 2)];
                if (!dest) return;
                if (idx % 2 === 0) dest.time1 = venc; else dest.time2 = venc;
            });
            for (const j of prox) {
                await supabaseClient.from('mata_mata')
                    .update({ time1: j.time1 || null, time2: j.time2 || null }).eq('id', j.id);
            }
        }
        msg.textContent = 'Vencedores avancados! Confira abaixo.';
        msg.className = 'sucesso';
        await carregarMataMataAdmin();
    } catch (e) {
        console.error(e);
        msg.textContent = 'Erro ao avancar.';
        msg.className = 'erro';
    }
});

document.getElementById('btn-limpar-mata-mata').addEventListener('click', async function () {
    if (!confirm('Apagar TODA a chave?')) return;
    const msg = document.getElementById('mensagem-mata-mata-avancar');
    await supabaseClient.from('mata_mata').delete().neq('id', 0);
    msg.textContent = 'Chave apagada.'; msg.className = 'sucesso';
    await carregarMataMataAdmin();
});

carregarMataMataAdmin();
