// Popula (ou repopula, com RESET=1) o escritório de demonstração usado por
// /demo (Etapa 9) com dados realistas: petições-base, petições em várias
// fases do board, prazos, agenda, atualizações do Diário e um contrato já
// analisado. NÃO é um script de teste efêmero - os dados ficam de verdade
// no banco, é isso que faz o /demo mostrar algo além de tela vazia.
//
// Rodar de novo sem RESET=1 não duplica (aborta se já existe um
// escritório is_demo=true). RESET=1 apaga o escritório demo existente
// (cascade) e recria do zero - útil pra "resetar" antes de uma
// apresentação depois que alguém mexeu nos dados testando.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { PDFDocument, StandardFonts } = require("pdf-lib");

function carregarEnv() {
  const conteudo = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  const env = {};
  for (const linha of conteudo.split("\n")) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = carregarEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function diasAPartirDeHoje(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function gerarPdfContrato() {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pagina = pdf.addPage([595, 842]);
  let y = 790;
  function linha(texto, opts = {}) {
    pagina.drawText(texto, { x: 50, y, size: opts.tamanho || 11, font: opts.negrito ? negrito : fonte });
    y -= opts.pulo || 18;
  }
  linha("CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA EM TI", { tamanho: 13, negrito: true, pulo: 28 });
  linha("CONTRATANTE: TechSul Soluções em TI Ltda, CNPJ 22.333.444/0001-55, com sede em São Paulo/SP.");
  linha("CONTRATADA: Vetor Consultoria e Sistemas Ltda, CNPJ 33.444.555/0001-66, com sede em Campinas/SP.", { pulo: 26 });
  linha("CLÁUSULA 1ª - DO OBJETO", { negrito: true, pulo: 20 });
  linha("Prestação de serviços de consultoria em infraestrutura de tecnologia da informação,");
  linha("incluindo diagnóstico, plano de migração para nuvem e suporte técnico especializado.", { pulo: 26 });
  linha("CLÁUSULA 2ª - DA VIGÊNCIA", { negrito: true, pulo: 20 });
  linha("O presente contrato vigora por 12 (doze) meses a partir da assinatura, renovável");
  linha("automaticamente por períodos iguais, salvo manifestação em contrário de qualquer", { pulo: 16 });
  linha("das partes com 30 (trinta) dias de antecedência.", { pulo: 26 });
  linha("CLÁUSULA 3ª - DO REAJUSTE", { negrito: true, pulo: 20 });
  linha("Os valores serão reajustados anualmente conforme índice a ser definido entre as partes.", { pulo: 26 });
  linha("CLÁUSULA 4ª - DA MULTA E RESCISÃO", { negrito: true, pulo: 20 });
  linha("O descumprimento de qualquer cláusula por parte da CONTRATADA sujeita-a a multa de");
  linha("10% (dez por cento) sobre o valor total do contrato. A rescisão antecipada exige", { pulo: 16 });
  linha("aviso prévio de 30 dias. Não há previsão de multa para atraso no pagamento pela", { pulo: 16 });
  linha("CONTRATANTE.", { pulo: 26 });
  linha("CLÁUSULA 5ª - DO FORO", { negrito: true, pulo: 20 });
  linha("Fica eleito o foro da comarca de Ribeirão Preto/SP para dirimir quaisquer controvérsias.");
  return pdf.save();
}

// Mesmo conteúdo desenhado no PDF acima, em texto puro - "Analisar de
// novo" (reanalisarContrato) usa texto_extraido, não reabre o arquivo.
// Um texto_extraido placeholder (era só "(texto de exemplo...)" antes)
// fazia a IA sempre devolver "Falha ao analisar" nesse contrato de
// exemplo - só dava pra ver a análise ORIGINAL gravada no insert abaixo,
// nunca reanalisar de verdade.
const TEXTO_CONTRATO_EXEMPLO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA EM TI

CONTRATANTE: TechSul Soluções em TI Ltda, CNPJ 22.333.444/0001-55, com sede em São Paulo/SP.
CONTRATADA: Vetor Consultoria e Sistemas Ltda, CNPJ 33.444.555/0001-66, com sede em Campinas/SP.

CLÁUSULA 1ª - DO OBJETO
Prestação de serviços de consultoria em infraestrutura de tecnologia da informação, incluindo diagnóstico, plano de migração para nuvem e suporte técnico especializado.

CLÁUSULA 2ª - DA VIGÊNCIA
O presente contrato vigora por 12 (doze) meses a partir da assinatura, renovável automaticamente por períodos iguais, salvo manifestação em contrário de qualquer das partes com 30 (trinta) dias de antecedência.

CLÁUSULA 3ª - DO REAJUSTE
Os valores serão reajustados anualmente conforme índice a ser definido entre as partes.

CLÁUSULA 4ª - DA MULTA E RESCISÃO
O descumprimento de qualquer cláusula por parte da CONTRATADA sujeita-a a multa de 10% (dez por cento) sobre o valor total do contrato. A rescisão antecipada exige aviso prévio de 30 dias. Não há previsão de multa para atraso no pagamento pela CONTRATANTE.

CLÁUSULA 5ª - DO FORO
Fica eleito o foro da comarca de Ribeirão Preto/SP para dirimir quaisquer controvérsias.`;

async function main() {
  const resetar = process.env.RESET === "1";

  const { data: existente } = await admin.from("escritorios").select("id, nome").eq("is_demo", true).maybeSingle();

  if (existente && !resetar) {
    console.log(`Já existe um escritório demo: "${existente.nome}" (${existente.id}). Rode com RESET=1 pra recriar.`);
    return;
  }

  if (existente && resetar) {
    console.log(`RESET=1 - apagando escritório demo existente (${existente.id}) antes de recriar…`);
    const { data: advogadosAntigos } = await admin.from("advogados").select("id").eq("escritorio_id", existente.id);
    for (const a of advogadosAntigos || []) {
      await admin.auth.admin.deleteUser(a.id).catch(() => {});
    }
    // Storage não é apagado em cascade pelo Postgres - remove os objetos
    // do escritório antigo manualmente antes do delete.
    const { data: arquivos } = await admin.storage.from("contratos").list(existente.id);
    if (arquivos?.length) {
      await admin.storage.from("contratos").remove(arquivos.map((f) => `${existente.id}/${f.name}`));
    }
    await admin.from("escritorios").delete().eq("id", existente.id); // cascade cuida do resto
  }

  console.log("Criando escritório demo…");
  const { data: escritorio, error: erroEsc } = await admin
    .from("escritorios")
    .insert({ nome: "Almeida & Rocha Advogados Associados", is_demo: true })
    .select("id")
    .single();
  if (erroEsc) throw erroEsc;

  await admin.from("configuracoes_notificacao").insert({ escritorio_id: escritorio.id, canal_email: true, canal_whatsapp: false });

  console.log("Criando advogados (Camila Almeida, Rafael Rocha)…");
  async function criarAdvogado(nome, email, oab) {
    const { data: userData, error } = await admin.auth.admin.createUser({
      email,
      password: `Demo${Math.random().toString(36).slice(2, 10)}!Aa1`,
      email_confirm: true,
    });
    if (error) throw error;
    await admin.from("advogados").insert({ id: userData.user.id, escritorio_id: escritorio.id, nome, email, precisa_trocar_senha: true });
    if (oab) {
      await admin.from("oabs").insert({ advogado_id: userData.user.id, numero: oab.numero, estado_uf: oab.uf, principal: true });
    }
    return userData.user.id;
  }

  const camilaId = await criarAdvogado("Camila Almeida", "camila.almeida@almeidarocha.demo", { numero: "185432", uf: "SP" });
  const rafaelId = await criarAdvogado("Rafael Rocha", "rafael.rocha@almeidarocha.demo", { numero: "98765", uf: "SP" });

  console.log("Criando petições-base…");
  await admin.from("peticoes_base").insert([
    {
      escritorio_id: escritorio.id,
      criado_por: camilaId,
      area_direito: "Cível",
      titulo: "Petição Inicial - Indenização por Danos Morais",
      conteudo: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ___ VARA CÍVEL DA COMARCA DE SÃO PAULO/SP

[NOME DO AUTOR], já qualificado nos autos, por seu advogado que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência, propor a presente

AÇÃO DE INDENIZAÇÃO POR DANOS MORAIS

em face de [NOME DO RÉU], pelos fatos e fundamentos a seguir expostos.

DOS FATOS

O Autor firmou relação contratual com o Réu, que, por conduta negligente, causou-lhe prejuízo de ordem extrapatrimonial, conforme documentos anexos.

DO DIREITO

Nos termos do artigo 186 c/c artigo 927 do Código Civil, aquele que, por ação ou omissão voluntária, negligência ou imprudência, violar direito e causar dano a outrem, ainda que exclusivamente moral, comete ato ilícito e fica obrigado a repará-lo.

DOS PEDIDOS

Ante o exposto, requer-se a citação do Réu e, ao final, a procedência do pedido para condená-lo ao pagamento de indenização por danos morais em valor a ser arbitrado por este Juízo, além das custas processuais e honorários advocatícios.

Termos em que pede deferimento.`,
    },
    {
      escritorio_id: escritorio.id,
      criado_por: rafaelId,
      area_direito: "Trabalhista",
      titulo: "Petição Inicial - Reclamação Trabalhista",
      conteudo: `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DO TRABALHO DA ___ VARA DO TRABALHO DE SÃO PAULO/SP

[NOME DO RECLAMANTE], já qualificado, por seu advogado, vem propor

RECLAMAÇÃO TRABALHISTA

em face de [NOME DA RECLAMADA], pelos fatos e fundamentos que passa a expor.

DOS FATOS

O Reclamante foi admitido pela Reclamada e, ao término do contrato de trabalho, não recebeu a integralidade das verbas rescisórias devidas, conforme demonstrativo anexo.

DO DIREITO

Aplicam-se à espécie os artigos pertinentes da Consolidação das Leis do Trabalho referentes ao pagamento de verbas rescisórias, aviso prévio, férias proporcionais e décimo terceiro salário proporcional.

DOS PEDIDOS

Requer-se a condenação da Reclamada ao pagamento das verbas rescisórias em aberto, com os devidos consectários legais.

Termos em que pede deferimento.`,
    },
  ]);

  console.log("Criando petições em várias fases do board…");
  const { data: peticoes, error: erroPeticoes } = await admin
    .from("peticoes")
    .insert([
      {
        escritorio_id: escritorio.id,
        advogado_id: camilaId,
        area_direito: "Cível",
        titulo: "Ação de Cobrança - Contrato de Prestação de Serviços",
        nome_cliente: "Construtora Horizonte Ltda",
        conteudo: "Minuta de ação de cobrança referente a valores não pagos decorrentes de contrato de prestação de serviços de engenharia consultiva, com pedido de correção monetária e juros de mora desde o vencimento.",
        status: "finalizada",
        numero_processo: "1002345-67.2025.8.26.0100",
        fase_kanban: "protocolo",
      },
      {
        escritorio_id: escritorio.id,
        advogado_id: rafaelId,
        area_direito: "Trabalhista",
        titulo: "Reclamação Trabalhista - Verbas Rescisórias",
        nome_cliente: "Maria Fernanda Oliveira",
        conteudo: "Minuta de reclamação trabalhista pleiteando verbas rescisórias em aberto (aviso prévio, férias proporcionais e décimo terceiro), com pedido de multa do art. 477 da CLT pelo atraso no pagamento.",
        status: "rascunho",
        fase_kanban: "revisao",
        responsavel_revisao_id: camilaId,
      },
      {
        escritorio_id: escritorio.id,
        advogado_id: camilaId,
        area_direito: "Empresarial",
        titulo: "Petição Inicial - Rescisão Contratual c/c Indenização",
        nome_cliente: "TechSul Soluções em TI Ltda",
        conteudo: "Minuta de ação de rescisão contratual cumulada com indenização por descumprimento de cláusulas de nível de serviço (SLA) por parte da contratada.",
        status: "rascunho",
        fase_kanban: "criacao",
      },
      {
        escritorio_id: escritorio.id,
        advogado_id: rafaelId,
        area_direito: "Cível",
        titulo: "Contestação - Ação de Cobrança Indevida",
        nome_cliente: "João Pedro Santos",
        conteudo: "Minuta de contestação alegando pagamento já quitado e requerendo, em pedido contraposto, indenização por cobrança indevida nos termos do art. 940 do Código Civil.",
        status: "rascunho",
        fase_kanban: "revisao",
        responsavel_revisao_id: rafaelId,
      },
      {
        escritorio_id: escritorio.id,
        advogado_id: rafaelId,
        area_direito: "Trabalhista",
        titulo: "Recurso Ordinário - Reforma de Sentença",
        nome_cliente: "Maria Fernanda Oliveira",
        conteudo: "Minuta de recurso ordinário requerendo a reforma parcial da sentença quanto ao indeferimento das horas extras pleiteadas na inicial.",
        status: "finalizada",
        fase_kanban: "protocolo",
        responsavel_protocolo_id: rafaelId,
      },
    ])
    .select("id, titulo, fase_kanban");
  if (erroPeticoes) throw erroPeticoes;

  const peticaoTrabalhista = peticoes.find((p) => p.titulo.includes("Verbas Rescisórias"));
  const peticaoContestacao = peticoes.find((p) => p.titulo.includes("Contestação"));
  const peticaoRescisaoContratual = peticoes.find((p) => p.titulo.includes("Rescisão Contratual"));

  console.log("Criando prazos + eventos de agenda…");
  const prazosParaCriar = [
    {
      peticao: peticaoTrabalhista,
      despacho: "Vista à parte reclamante para réplica à contestação apresentada, no prazo legal.",
      descricao: "Réplica à contestação",
      dataLimite: diasAPartirDeHoje(5),
      criadoPor: rafaelId,
    },
    {
      peticao: peticaoContestacao,
      despacho: "Manifeste-se a parte sobre os documentos juntados pela parte contrária, em 5 dias.",
      descricao: "Manifestação sobre documentos juntados",
      dataLimite: diasAPartirDeHoje(3),
      criadoPor: rafaelId,
    },
  ];

  for (const p of prazosParaCriar) {
    if (!p.peticao) continue;
    const hoje = diasAPartirDeHoje(0);
    const { data: prazo } = await admin
      .from("prazos")
      .insert({
        escritorio_id: escritorio.id,
        peticao_id: p.peticao.id,
        despacho_texto: p.despacho,
        descricao_prazo: p.descricao,
        data_despacho: hoje,
        data_limite: p.dataLimite,
        criado_por: p.criadoPor,
      })
      .select("id")
      .single();
    await admin.from("eventos_agenda").insert({
      escritorio_id: escritorio.id,
      advogado_id: p.criadoPor,
      tipo: "prazo",
      titulo: p.descricao,
      data: p.dataLimite,
      peticao_id: p.peticao.id,
      prazo_id: prazo.id,
    });
  }

  if (peticaoRescisaoContratual) {
    await admin.from("eventos_agenda").insert({
      escritorio_id: escritorio.id,
      advogado_id: camilaId,
      tipo: "reuniao",
      titulo: "Reunião com cliente - alinhamento estratégico",
      data: diasAPartirDeHoje(2),
      peticao_id: peticaoRescisaoContratual.id,
    });
  }

  console.log("Criando atualizações de exemplo do Diário Oficial…");
  const { data: oabCamila } = await admin.from("oabs").select("id").eq("advogado_id", camilaId).single();
  await admin.from("atualizacoes_diario").insert([
    {
      escritorio_id: escritorio.id,
      oab_id: oabCamila.id,
      id_comunicacao_djen: 999000001,
      tribunal: "TJSP",
      orgao: "2ª Vara Cível de São Paulo",
      tipo_comunicacao: "Intimação",
      texto: "Fica a parte autora intimada para manifestação sobre a contestação apresentada, no prazo legal.",
      data_disponibilizacao: diasAPartirDeHoje(-1),
      lida: false,
    },
    {
      escritorio_id: escritorio.id,
      oab_id: oabCamila.id,
      id_comunicacao_djen: 999000002,
      tribunal: "TRT-2",
      orgao: "15ª Vara do Trabalho de São Paulo",
      tipo_comunicacao: "Publicação",
      texto: "Designada audiência de instrução para os autos, devendo as partes comparecerem acompanhadas de suas testemunhas.",
      data_disponibilizacao: diasAPartirDeHoje(-4),
      lida: true,
    },
  ]);

  console.log("Gerando e enviando contrato de exemplo já analisado…");
  const pdfBytes = await gerarPdfContrato();
  const caminhoPdf = `${escritorio.id}/seed-contrato-consultoria-ti.pdf`;
  await admin.storage.from("contratos").upload(caminhoPdf, pdfBytes, { contentType: "application/pdf", upsert: true });

  await admin.from("contratos").insert({
    escritorio_id: escritorio.id,
    advogado_id: camilaId,
    nome_arquivo: "contrato-consultoria-ti-techsul.pdf",
    tipo_arquivo: "pdf",
    caminho_armazenamento: caminhoPdf,
    tamanho_bytes: pdfBytes.length,
    status: "concluido",
    texto_extraido: TEXTO_CONTRATO_EXEMPLO,
    partes: [
      { nome: "TechSul Soluções em TI Ltda", papel: "contratante" },
      { nome: "Vetor Consultoria e Sistemas Ltda", papel: "contratada" },
    ],
    objeto: "Prestação de serviços de consultoria em infraestrutura de TI, incluindo diagnóstico, plano de migração para nuvem e suporte técnico especializado.",
    vigencia: "12 (doze) meses a partir da assinatura, renovável automaticamente por períodos iguais, salvo manifestação em contrário com 30 dias de antecedência.",
    clausula_multa_rescisao: "Multa de 10% sobre o valor total do contrato em caso de descumprimento pela contratada. Rescisão antecipada exige aviso prévio de 30 dias.",
    pontos_atencao: [
      "Cláusula de reajuste anual não especifica qual índice será utilizado - fica em aberto, sujeito a divergência futura.",
      "A multa contratual só está prevista para descumprimento pela CONTRATADA - não há penalidade equivalente para atraso no pagamento pela CONTRATANTE, criando assimetria entre as partes.",
      "Foro de eleição (Ribeirão Preto/SP) não corresponde ao domicílio de nenhuma das partes contratantes (São Paulo/SP e Campinas/SP), o que pode dificultar o acesso à justiça em caso de litígio.",
    ],
  });

  console.log(`\nPronto. Escritório demo: "${escritorio.id}" - Almeida & Rocha Advogados Associados.`);
  console.log("Advogados seed (não pra uso real, só autoria dos dados de exemplo):");
  console.log(`  Camila Almeida <camila.almeida@almeidarocha.demo>`);
  console.log(`  Rafael Rocha <rafael.rocha@almeidarocha.demo>`);
  console.log("Novos acessos via /demo entram como advogados extras nesse mesmo escritório.");
}

main().catch((err) => {
  console.error("ERRO:", err);
  process.exitCode = 1;
});
