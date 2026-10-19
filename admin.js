let times = [];

const posicoes = [
    "goleiro",
    "fixo",
    "ala_direito",
    "ala_esquerdo",
    "pivo",
    "reserva1",
    "reserva2",
    "reserva3",
    "reserva4",
    "reserva5"
];

async function carregarTimes() {
    const { data, error } = await supabaseClient
        .from("jogadores")
        .select("*")
        .order("time", { ascending: true });

    if (error) {
        console.error("Erro ao carregar times:", error);
        return;
    }

    times = data || [];

    const selects = [
        "time1",
        "time2",
        "proximo_time1",
        "proximo_time2",
        "time_jogador",
        "grupo_time"
    ];

    selects.forEach(id => {
        const select = document.getElementById(id);

        if (!select) return;

        select.innerHTML = '<option value="">Selecione o time</option>';

        times.forEach(time => {
            const option = document.createElement("option");
            option.value = time.time;
            option.textContent = time.time;
            select.appendChild(option);
        });
    });
}

async function preencherArtilheiros(nomeTime, ids) {
    ids.forEach(id => {
        const select = document.getElementById(id);

        if (select) {
            select.innerHTML = '<option value="">Carregando...</option>';
        }
    });

    if (!nomeTime) {
        ids.forEach(id => {
            const select = document.getElementById(id);

            if (select) {
                select.innerHTML = '<option value="">Selecione o jogador</option>';
            }
        });

        return;
    }

    const { data, error } = await supabaseClient
        .from("jogadores")
        .select("*")
        .eq("time", nomeTime)
        .single();

    if (error) {
        console.error("Erro ao carregar jogadores:", error);

        ids.forEach(id => {
            const select = document.getElementById(id);

            if (select) {
                select.innerHTML = '<option value="">Erro ao carregar</option>';
            }
        });

        return;
    }

    const jogadores = posicoes
        .map(posicao => data[posicao])
        .filter(jogador => jogador && jogador.trim() !== "");

    ids.forEach(id => {
        const select = document.getElementById(id);

        if (!select) return;

        select.innerHTML = '<option value="">Selecione o jogador</option>';

        jogadores.forEach(jogador => {
            const option = document.createElement("option");
            option.value = jogador;
            option.textContent = jogador;
            select.appendChild(option);
        });
    });
}

document.getElementById("time1").addEventListener("change", function() {
    preencherArtilheiros(this.value, ["gol1", "gol2"]);
});

document.getElementById("time2").addEventListener("change", function() {
    preencherArtilheiros(this.value, ["gol3", "gol4"]);
});

document.getElementById("form-cadastro").addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const mensagem = document.getElementById("mensagem-cadastro");

    const pegarNumero = id => {
        const valor = document.getElementById(id).value;
        return valor === "" ? null : Number(valor);
    };

    const pegarTexto = id => {
        const valor = document.getElementById(id).value;
        return valor === "" ? null : valor;
    };

    const novoJogo = {
        time1: pegarTexto("time1"),
        time2: pegarTexto("time2"),
        gols_time1: pegarNumero("gols_time1"),
        gols_time2: pegarNumero("gols_time2"),
        gols_time1_f: pegarNumero("gols_time1_f"),
        gols_time2_f: pegarNumero("gols_time2_f"),
        gol1: pegarTexto("gol1"),
        gol2: pegarTexto("gol2"),
        gol3: pegarTexto("gol3"),
        gol4: pegarTexto("gol4")
    };

    if (novoJogo.time1 === novoJogo.time2) {
        mensagem.textContent = "Os times precisam ser diferentes.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Enviando...";
    mensagem.className = "";

    const { error } = await supabaseClient
        .from("resultados")
        .insert([novoJogo]);

    if (error) {
        console.error("Erro ao cadastrar resultado:", error);
        mensagem.textContent = "Erro ao cadastrar o resultado.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Resultado cadastrado com sucesso!";
    mensagem.className = "sucesso";

    this.reset();

    preencherArtilheiros("", ["gol1", "gol2"]);
    preencherArtilheiros("", ["gol3", "gol4"]);

    if (typeof carregarResultados === "function") {
        carregarResultados();
    }
});

document.getElementById("form-proximo-jogo").addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const mensagem = document.getElementById("mensagem-proximo-jogo");

    const novoJogo = {
        time1: document.getElementById("proximo_time1").value,
        time2: document.getElementById("proximo_time2").value,
        data: document.getElementById("proximo_data").value,
        hora: document.getElementById("proximo_hora").value,
        local: document.getElementById("proximo_local").value.trim()
    };

    if (novoJogo.time1 === novoJogo.time2) {
        mensagem.textContent = "Os times precisam ser diferentes.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Enviando...";
    mensagem.className = "";

    const { error } = await supabaseClient
        .from("proximos_jogos")
        .insert([novoJogo]);

    if (error) {
        console.error("Erro ao cadastrar próximo jogo:", error);
        mensagem.textContent = "Erro ao cadastrar o próximo jogo.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Próximo jogo cadastrado com sucesso!";
    mensagem.className = "sucesso";

    this.reset();
});

document.getElementById("form-jogador").addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const nome = document.getElementById("nome_jogador").value.trim();
    const nomeTime = document.getElementById("time_jogador").value;
    const posicao = document.getElementById("posicao_jogador").value;
    const mensagem = document.getElementById("mensagem-jogador");

    if (!nome || !nomeTime || !posicao) {
        mensagem.textContent = "Preencha todos os campos.";
        mensagem.className = "erro";
        return;
    }

    const time = times.find(item => item.time === nomeTime);

    if (!time) {
        mensagem.textContent = "Time não encontrado.";
        mensagem.className = "erro";
        return;
    }

    if (time[posicao]) {
        mensagem.textContent = `Essa posição já está ocupada por ${time[posicao]}.`;
        mensagem.className = "erro";
        return;
    }

    const jogadoresDoTime = posicoes
        .map(pos => time[pos])
        .filter(jogador => jogador);

    const jogadorExiste = jogadoresDoTime.some(jogador =>
        jogador.toLowerCase() === nome.toLowerCase()
    );

    if (jogadorExiste) {
        mensagem.textContent = "Esse jogador já está cadastrado nesse time.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Adicionando...";
    mensagem.className = "";

    const atualizacao = {};
    atualizacao[posicao] = nome;

    const { error } = await supabaseClient
        .from("jogadores")
        .update(atualizacao)
        .eq("id", time.id);

    if (error) {
        console.error("Erro ao adicionar jogador:", error);
        mensagem.textContent = "Erro ao adicionar jogador.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Jogador adicionado com sucesso!";
    mensagem.className = "sucesso";

    this.reset();

    await carregarTimes();
});

// =====================================================
// CADASTRAR TIME (todos os campos da tabela "jogadores")
// =====================================================
document.getElementById("form-time").addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const mensagem = document.getElementById("mensagem-time");

    const nome = document.getElementById("novo_time_nome").value.trim();
    const grupo = document.getElementById("novo_time_grupo").value;

    if (!nome) {
        mensagem.textContent = "Informe o nome do time.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Verificando time...";
    mensagem.className = "";

    // O nome precisa ser único (é ele que liga o time à classificação)
    const { data: existente, error: erroBusca } = await supabaseClient
        .from("jogadores")
        .select("id")
        .eq("time", nome)
        .maybeSingle();

    if (erroBusca) {
        console.error("Erro ao verificar o time:", erroBusca);
        mensagem.textContent = "Erro ao verificar o time.";
        mensagem.className = "erro";
        return;
    }

    if (existente) {
        mensagem.textContent = "Já existe um time com esse nome.";
        mensagem.className = "erro";
        return;
    }

    const jogadoresPreenchidos = posicoes
        .map(posicao => document.getElementById(`pos_${posicao}`).value.trim())
        .filter(valor => valor !== "");

    const jogadorRepetido = jogadoresPreenchidos.some((nome1, i) =>
        jogadoresPreenchidos.some((nome2, j) =>
            i !== j && nome1.toLowerCase() === nome2.toLowerCase()
        )
    );

    if (jogadorRepetido) {
        mensagem.textContent = "Tem jogador repetido nos campos do time.";
        mensagem.className = "erro";
        return;
    }

    const novoTime = { time: nome, grupo: grupo };

    posicoes.forEach(posicao => {
        const valor = document.getElementById(`pos_${posicao}`).value.trim();

        if (valor) {
            novoTime[posicao] = valor;
        }
    });

    mensagem.textContent = "Cadastrando time...";
    mensagem.className = "";

    const { error } = await supabaseClient
        .from("jogadores")
        .insert([novoTime]);

    if (error) {
        console.error("Erro ao cadastrar o time:", error);
        mensagem.textContent = "Erro ao cadastrar o time. Se o erro for de permissão (RLS), rode o bloco 6 do atualizacao-supabase.sql.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Time cadastrado com sucesso! Ele já aparece na classificação.";
    mensagem.className = "sucesso";

    this.reset();

    await carregarTimes();
});

// =====================================================
// ATUALIZAR GRUPO DO TIME
// =====================================================
document.getElementById("form-grupo").addEventListener("submit", async function(evento) {
    evento.preventDefault();

    const mensagem = document.getElementById("mensagem-grupo");

    const nomeTime = document.getElementById("grupo_time").value;
    const grupo = document.getElementById("grupo_novo").value;

    if (!nomeTime || !grupo) {
        mensagem.textContent = "Selecione o time e o grupo.";
        mensagem.className = "erro";
        return;
    }

    const time = times.find(item => item.time === nomeTime);

    if (!time) {
        mensagem.textContent = "Time não encontrado.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Atualizando grupo...";
    mensagem.className = "";

    const { error } = await supabaseClient
        .from("jogadores")
        .update({ grupo: grupo })
        .eq("id", time.id);

    if (error) {
        console.error("Erro ao atualizar o grupo:", error);
        mensagem.textContent = "Erro ao atualizar o grupo.";
        mensagem.className = "erro";
        return;
    }

    mensagem.textContent = "Grupo atualizado com sucesso!";
    mensagem.className = "sucesso";

    this.reset();

    await carregarTimes();
});

carregarTimes();