// =====================================================
// PRÓXIMOS JOGOS - SUPABASE
// =====================================================

// Este arquivo precisa ser carregado DEPOIS do:
// 1. @supabase/supabase-js
// 2. supabase client.js


// Protege os textos recebidos do banco antes de colocar no HTML
function escaparHTML(texto) {
    if (texto === null || texto === undefined) {
        return "";
    }

    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// Formata a data do Supabase
// Exemplo:
// 2026-08-07 -> 07/08/2026
function formatarData(data) {

    if (!data) {
        return "Data a definir";
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    return `${dia}/${mes}/${ano}`;
}


// Formata o horário
// Exemplo:
// 14:30:00 -> 14:30
function formatarHora(hora) {

    if (!hora) {
        return "--:--";
    }

    return hora.substring(0, 5);
}


// =====================================================
// CARREGAR PRÓXIMOS JOGOS
// =====================================================

async function carregarAgenda() {

    const container = document.getElementById("conteudo-agenda");

    // Mostra carregamento enquanto consulta o Supabase
    container.innerHTML = `
        <div class="loading">
            Carregando calendário de partidas...
        </div>
    `;

    try {

        // Busca os jogos no Supabase
        const { data, error } = await supabaseClient
            .from("proximos_jogos")
            .select("*")
            .order("data", { ascending: true })
            .order("hora", { ascending: true });


        // Caso o Supabase retorne algum erro
        if (error) {
            throw error;
        }


        // Caso não exista nenhum jogo cadastrado
        if (!data || data.length === 0) {

            container.innerHTML = `
                <div class="loading">
                    Nenhum próximo jogo agendado.
                </div>
            `;

            return;
        }


        // Começa a criar os cards
        let htmlCards = `
            <div class="grid-agenda">
        `;


        // Percorre todos os jogos retornados pelo Supabase
        data.forEach((jogo) => {

            const time1 = escaparHTML(jogo.time1 || "Time 1");
            const time2 = escaparHTML(jogo.time2 || "Time 2");

            const dia = formatarData(jogo.data);
            const hora = formatarHora(jogo.hora);

            const local = escaparHTML(
                jogo.local || "Local não informado"
            );


            // Cria o mesmo card que você já utilizava
            htmlCards += `

                <div class="card-agenda">

                    <div class="info-data">

                        <span>
                            📅 ${dia}
                        </span>

                        <span>
                            ⏰ ${hora}
                        </span>

                    </div>


                    <div class="partida-box">

                        <div class="time time-casa">
                            ${time1}
                        </div>


                        <div class="vs-badge">
                            VS
                        </div>


                        <div class="time time-fora">
                            ${time2}
                        </div>

                    </div>


                    <div class="info-local">

                        📍

                        <span>
                            ${local}
                        </span>

                    </div>

                </div>

            `;

        });


        // Fecha a div grid-agenda
        htmlCards += `
            </div>
        `;


        // Coloca os cards na página
        container.innerHTML = htmlCards;


    } catch (erro) {

        console.error(
            "Erro ao carregar próximos jogos do Supabase:",
            erro
        );


        container.innerHTML = `
            <div class="loading">
                Erro ao carregar os próximos jogos.
                Verifique a conexão com o Supabase.
            </div>
        `;

    }

}


// =====================================================
// INICIA A CONSULTA
// =====================================================

carregarAgenda();