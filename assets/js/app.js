(() => {
  'use strict';

  const DADOS = window.VITALISSE_DADOS;

  const UNIDADES = {
    sudoeste: {
      nome: 'Sudoeste',
      whatsapp: '5561999713767',
      horario: { semana: ['08:00', '19:00'], sabado: ['08:00', '18:00'] },
    },
    noroeste: {
      nome: 'Noroeste',
      whatsapp: '5561998686851',
      horario: { semana: ['07:30', '19:10'], sabado: ['07:30', '18:20'] },
    },
  };

  // Especialidades mostradas na equipe, na ordem em que aparecem.
  const ESPECIALIDADES = [
    [['manicure', 'pedicure'], 'mão e pé'],
    [['gel'], 'esmaltação em gel'],
    [['banho-gel'], 'banho de gel'],
    [['alongamento'], 'fibra de vidro'],
    [['spa-pes'], 'spa dos pés'],
    [['cera-fem', 'cera-masc'], 'cera'],
    [['laser-fem', 'laser-masc'], 'laser'],
    [['linha'], 'linha'],
    [['sobrancelhas'], 'sobrancelhas'],
    [['cilios'], 'cílios'],
    [['facial'], 'estética facial'],
  ];

  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  const memoria = {
    ler(chave) { try { return localStorage.getItem(chave); } catch { return null; } },
    gravar(chave, valor) { try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ } },
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normal = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const juntar = (l) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} e ${l[l.length - 1]}`);
  const maiuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const fmtPreco = (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
  const fmtHora = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  };
  const fmtDuracao = (min) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  };
  const emMinutos = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  function linkWhatsApp(unidade, servico) {
    const nome = UNIDADES[unidade].nome;
    const texto = servico
      ? `Olá! Vim pelo site e quero agendar na unidade ${nome}: ${servico}.`
      : `Olá! Vim pelo site e quero agendar um horário na unidade ${nome}.`;
    return `https://wa.me/${UNIDADES[unidade].whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  /* Horário de funcionamento (hora de Brasília) */

  function agora() {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
    const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { dia, minuto: Number(p.hour) * 60 + Number(p.minute) };
  }

  const horarioDoDia = (u, dia) => (dia === 0 ? null : dia === 6 ? u.horario.sabado : u.horario.semana);

  function situacao(unidade) {
    const u = UNIDADES[unidade];
    const { dia, minuto } = agora();
    const hoje = horarioDoDia(u, dia);
    if (hoje && minuto >= emMinutos(hoje[0]) && minuto < emMinutos(hoje[1])) {
      return { aberto: true, texto: `Aberto agora, até ${fmtHora(hoje[1])}` };
    }
    if (hoje && minuto < emMinutos(hoje[0])) {
      return { aberto: false, texto: `Fechado agora. Abre hoje às ${fmtHora(hoje[0])}` };
    }
    for (let i = 1; i <= 7; i += 1) {
      const d = (dia + i) % 7;
      const h = horarioDoDia(u, d);
      if (h) return { aberto: false, texto: `Fechado agora. Abre ${i === 1 ? 'amanhã' : DIAS[d]} às ${fmtHora(h[0])}` };
    }
    return { aberto: false, texto: '' };
  }

  function atualizarSituacao() {
    for (const el of $$('[data-status]')) {
      const s = situacao(el.dataset.status);
      el.textContent = s.texto;
      el.classList.toggle('is-aberto', s.aberto);
    }
  }

  /* Escolha de unidade */

  const dialogo = $('[data-escolha]');

  function abrirEscolha() {
    if (!dialogo || typeof dialogo.showModal !== 'function') {
      $('#unidades')?.scrollIntoView();
      return;
    }
    dialogo.showModal();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-agendar]')) abrirEscolha();
  });

  if (dialogo) {
    $('[data-fechar]', dialogo).addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('click', (e) => {
      if (e.target !== dialogo) return;
      const r = dialogo.getBoundingClientRect();
      const fora = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (fora) dialogo.close();
    });
  }

  for (const a of $$('[data-wa]')) a.href = linkWhatsApp(a.dataset.wa);

  /* Topo e menu do celular */

  const topo = $('[data-topo]');
  const botaoMenu = $('[data-menu]');
  const menuMovel = $('[data-menu-movel]');

  // O topo fica transparente enquanto está sobre o hero, exceto com o menu do celular aberto.
  let sobreHero = Boolean($('[data-hero]'));
  let menuAberto = false;
  const atualizarTopo = () => topo.classList.toggle('topo--hero', sobreHero && !menuAberto);

  function definirMenu(abrir) {
    menuAberto = abrir;
    botaoMenu.setAttribute('aria-expanded', String(abrir));
    $('.sr', botaoMenu).textContent = abrir ? 'Fechar menu' : 'Abrir menu';
    menuMovel.classList.toggle('is-aberto', abrir);
    atualizarTopo();
  }

  botaoMenu.addEventListener('click', () => definirMenu(botaoMenu.getAttribute('aria-expanded') !== 'true'));
  menuMovel.addEventListener('click', (e) => { if (e.target.closest('a')) definirMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') definirMenu(false); });

  /* Vídeos */

  const videoHero = $('[data-video-hero]');
  const botaoPausar = $('[data-pausar]');
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const economizarDados = Boolean(navigator.connection && navigator.connection.saveData);
  let pausadoPeloUsuario = semMovimento || economizarDados;

  function marcarBotaoPausar() {
    const pausado = !videoHero || videoHero.paused;
    botaoPausar.setAttribute('aria-label', pausado ? 'Tocar vídeo' : 'Pausar vídeo');
    $('i', botaoPausar).className = pausado ? 'ph-fill ph-play' : 'ph-fill ph-pause';
  }

  if (videoHero) {
    if (pausadoPeloUsuario) {
      videoHero.removeAttribute('autoplay');
      videoHero.pause();
    }
    videoHero.addEventListener('play', marcarBotaoPausar);
    videoHero.addEventListener('pause', marcarBotaoPausar);
    botaoPausar.addEventListener('click', () => {
      pausadoPeloUsuario = !videoHero.paused;
      if (videoHero.paused) videoHero.play().catch(() => {});
      else videoHero.pause();
    });
    marcarBotaoPausar();
  }

  const tour = $('.tour');
  const videoTour = $('[data-tour]');
  if (tour && videoTour) {
    $('[data-tour-play]', tour).addEventListener('click', () => {
      tour.classList.add('is-tocando');
      videoTour.controls = true;
      videoTour.play().catch(() => {});
      if (videoHero && !videoHero.paused) videoHero.pause();
    });
    videoTour.addEventListener('ended', () => {
      tour.classList.remove('is-tocando');
      videoTour.controls = false;
    });
  }

  /* Observadores de rolagem */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entrada]) => {
      topo.classList.toggle('is-rolado', !entrada.isIntersecting);
    }).observe($('.sentinela'));

    const fimHero = $('.hero__fim');
    if (fimHero) {
      new IntersectionObserver(([entrada]) => {
        sobreHero = entrada.isIntersecting || entrada.boundingClientRect.top > 0;
        atualizarTopo();
      }).observe(fimHero);
    }

    // O vídeo do hero só roda enquanto aparece na tela.
    if (videoHero) {
      new IntersectionObserver(([entrada]) => {
        if (!entrada.isIntersecting) videoHero.pause();
        else if (!pausadoPeloUsuario && (!videoTour || videoTour.paused)) videoHero.play().catch(() => {});
      }, { threshold: 0.15 }).observe(videoHero);
    }

    const revelar = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.classList.add('is-visivel');
        revelar.unobserve(entrada.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-revelar]').forEach((el) => revelar.observe(el));

    // Barra de agendamento no celular: aparece depois do hero e some perto da chamada final.
    const barra = $('[data-barra-movel]');
    const visiveis = new Set();
    const alvos = [$('[data-hero-acoes]'), $('.chamada__painel'), $('.rodape')];
    const observarBarra = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) visiveis.add(entrada.target);
        else visiveis.delete(entrada.target);
      }
      barra.classList.toggle('is-visivel', visiveis.size === 0);
    });
    alvos.filter(Boolean).forEach((el) => observarBarra.observe(el));
  } else {
    $$('[data-revelar]').forEach((el) => el.classList.add('is-visivel'));
  }
  atualizarTopo();

  atualizarSituacao();
  setInterval(atualizarSituacao, 60 * 1000);

  /* A partir daqui tudo depende da tabela de serviços. */

  if (!DADOS) {
    const painel = $('.precos__painel');
    if (painel) {
      painel.innerHTML = '<p class="vazio">Não foi possível carregar a tabela agora. Consulte a agenda online da <a href="https://www.trinks.com/vitalisseboutique">unidade Sudoeste</a> ou da <a href="https://www.trinks.com/vitalissenoroeste">unidade Noroeste</a>.</p>';
    }
    return;
  }

  const CATEGORIAS = Object.fromEntries(DADOS.categorias.map((c) => [c.id, c]));

  const atualizado = $('[data-atualizado]');
  if (atualizado) {
    atualizado.textContent = new Date(`${DADOS.atualizadoEm}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  // Preços "a partir de" dos blocos de serviço: o menor valor entre as duas unidades.
  for (const el of $$('[data-desde]')) {
    const [cat, nome] = el.dataset.desde.split('|');
    const precos = Object.values(DADOS.unidades)
      .flatMap((u) => u.servicos[cat] || [])
      .filter((item) => item[0] === nome)
      .map((item) => item[2]);
    if (!precos.length) continue;
    const rotulo = el.textContent.split(' a partir de')[0];
    el.textContent = `${rotulo} a partir de ${fmtPreco(Math.min(...precos))}`;
  }

  /* Equipe */

  function especialidades(pessoa) {
    if (pessoa.hof) return 'Harmonização orofacial';
    const lista = ESPECIALIDADES.filter(([ids]) => ids.some((id) => pessoa.cats.includes(id))).map(([, texto]) => texto);
    return maiuscula(juntar(lista));
  }

  for (const total of $$('[data-equipe-total]')) {
    total.textContent = plural(DADOS.unidades[total.dataset.equipeTotal]?.equipe.length ?? 0, 'profissional', 'profissionais');
  }

  // No celular as listas começam fechadas para a página não ficar longa demais.
  if (window.matchMedia('(max-width: 560px)').matches) {
    $$('.equipe__unidade').forEach((d) => { d.open = false; });
  }

  for (const ul of $$('[data-equipe]')) {
    const equipe = DADOS.unidades[ul.dataset.equipe]?.equipe || [];
    ul.innerHTML = equipe.map((p) => `
      <li>
        <strong>${esc(p.nome)}</strong>
        <span>${esc(especialidades(p))}</span>
        ${p.rec >= 10 ? `<span class="rec"><i class="ph-fill ph-heart" aria-hidden="true"></i>${p.rec} recomendações</span>` : ''}
      </li>`).join('');
  }

  /* Tabela de preços */

  const estado = {
    unidade: UNIDADES[memoria.ler('vitalisse-unidade')] ? memoria.ler('vitalisse-unidade') : 'sudoeste',
    grupo: 'unhas',
    cat: null,
    busca: '',
  };

  const el = {
    segmento: $('[data-segmento]'),
    abas: $('[data-abas]'),
    painel: $('[data-painel]'),
    chips: $('[data-chips]'),
    quem: $('[data-quem]'),
    lista: $('[data-lista]'),
    busca: $('[data-busca]'),
    anuncio: $('[data-anuncio]'),
  };

  const servicosDa = (unidade) => DADOS.unidades[unidade].servicos;
  const categoriasDoGrupo = (grupo) => DADOS.categorias.filter((c) => c.grupo === grupo && servicosDa(estado.unidade)[c.id]?.length);

  function nomeParaMensagem(nome, catId) {
    const cat = CATEGORIAS[catId];
    return cat.grupo === 'depilacao' ? `${nome} (${cat.nome.toLowerCase()})` : nome;
  }

  function htmlItem([nome, minutos, preco, tipo, desc], catId) {
    const valor = tipo === 'gratis' ? 'Grátis' : fmtPreco(preco);
    const prefixo = tipo === 'apartir' ? '<small>a partir de</small>' : '';
    const unidade = UNIDADES[estado.unidade].nome;
    return `
      <li class="item">
        <div class="item__info">
          <span class="item__nome">${esc(nome)}</span>
          ${desc ? `<span class="item__desc">${esc(desc)}</span>` : ''}
          <span class="item__tempo">${fmtDuracao(minutos)}</span>
        </div>
        <span class="item__preco">${prefixo}${valor}</span>
        <a class="item__agendar" href="${linkWhatsApp(estado.unidade, nomeParaMensagem(nome, catId))}" target="_blank" rel="noopener"
           title="Agendar pelo WhatsApp" aria-label="Agendar ${esc(nome)} no ${unidade} pelo WhatsApp">
          <i class="ph-light ph-whatsapp-logo" aria-hidden="true"></i>
        </a>
      </li>`;
  }

  const NOTAS = { 'laser-fem': 'Valores por sessão.', 'laser-masc': 'Valores por sessão.' };

  function textoQuem(catId) {
    if (catId === 'adicionais') return '';
    const nomes = DADOS.unidades[estado.unidade].equipe
      .filter((p) => p.cats.includes(catId))
      .map((p) => (p.hof ? `${p.nome} (harmonização)` : p.nome));
    if (!nomes.length) return '';
    const nota = NOTAS[catId] ? ` ${NOTAS[catId]}` : '';
    return `<i class="ph-light ph-user-circle" aria-hidden="true"></i><span>No ${UNIDADES[estado.unidade].nome}, com <strong>${esc(juntar(nomes))}</strong>.${nota}</span>`;
  }

  function animarLista() {
    el.lista.classList.remove('is-trocando');
    void el.lista.offsetWidth;
    el.lista.classList.add('is-trocando');
  }

  function renderCategoria() {
    const cats = categoriasDoGrupo(estado.grupo);
    if (!cats.some((c) => c.id === estado.cat)) estado.cat = cats[0]?.id ?? null;

    el.chips.innerHTML = cats.length > 1
      ? cats.map((c) => `<button type="button" data-cat="${c.id}" aria-pressed="${c.id === estado.cat}">${esc(c.nome)}</button>`).join('')
      : '';

    const itens = estado.cat ? servicosDa(estado.unidade)[estado.cat] : [];
    el.quem.innerHTML = estado.cat ? textoQuem(estado.cat) : '';
    el.lista.innerHTML = `<ul class="itens">${itens.map((i) => htmlItem(i, estado.cat)).join('')}</ul>`;
    el.anuncio.textContent = `${plural(itens.length, 'serviço', 'serviços')} em ${CATEGORIAS[estado.cat]?.nome ?? ''}, unidade ${UNIDADES[estado.unidade].nome}.`;
  }

  function renderBusca() {
    const termo = normal(estado.busca.trim());
    const grupos = [];
    let total = 0;
    for (const [catId, itens] of Object.entries(servicosDa(estado.unidade))) {
      const cat = CATEGORIAS[catId];
      const achados = itens.filter((i) => normal(`${i[0]} ${cat.nome} ${i[4]}`).includes(termo));
      if (!achados.length) continue;
      total += achados.length;
      grupos.push(`
        <div class="lista__grupo">
          <h3 class="lista__titulo">${esc(cat.nome)}</h3>
          <ul class="itens">${achados.map((i) => htmlItem(i, catId)).join('')}</ul>
        </div>`);
    }

    el.chips.innerHTML = '';
    el.quem.innerHTML = '';
    el.lista.innerHTML = total
      ? grupos.join('')
      : `<div class="vazio"><strong>Nada encontrado para “${esc(estado.busca.trim())}”.</strong>
           Tente outro nome ou <a href="${linkWhatsApp(estado.unidade)}" target="_blank" rel="noopener">pergunte pelo WhatsApp</a>.</div>`;
    el.anuncio.textContent = total ? `${plural(total, 'serviço encontrado', 'serviços encontrados')}.` : 'Nenhum serviço encontrado.';
  }

  function render({ animar = true } = {}) {
    for (const b of $$('[data-unidade]', el.segmento)) b.setAttribute('aria-checked', String(b.dataset.unidade === estado.unidade));

    const buscando = estado.busca.trim().length >= 2;
    el.abas.classList.toggle('is-inativa', buscando);
    for (const aba of $$('[role="tab"]', el.abas)) {
      const ativa = aba.dataset.grupo === estado.grupo;
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      if (ativa) el.painel.setAttribute('aria-labelledby', aba.id);
    }

    if (buscando) renderBusca();
    else renderCategoria();
    if (animar) animarLista();
  }

  el.segmento.addEventListener('click', (e) => {
    const b = e.target.closest('[data-unidade]');
    if (!b || b.dataset.unidade === estado.unidade) return;
    estado.unidade = b.dataset.unidade;
    memoria.gravar('vitalisse-unidade', estado.unidade);
    render();
  });

  el.segmento.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const botoes = $$('[data-unidade]', el.segmento);
    const atual = botoes.findIndex((b) => b.dataset.unidade === estado.unidade);
    const prox = botoes[(atual + (e.key === 'ArrowRight' ? 1 : -1) + botoes.length) % botoes.length];
    prox.click();
    prox.focus();
  });

  function escolherGrupo(grupo) {
    estado.grupo = grupo;
    estado.cat = null;
    if (estado.busca) {
      estado.busca = '';
      el.busca.value = '';
    }
    render();
  }

  el.abas.addEventListener('click', (e) => {
    const aba = e.target.closest('[role="tab"]');
    if (aba) escolherGrupo(aba.dataset.grupo);
  });

  el.abas.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const abas = $$('[role="tab"]', el.abas);
    const atual = abas.findIndex((a) => a.dataset.grupo === estado.grupo);
    let i = atual;
    if (e.key === 'ArrowRight') i = (atual + 1) % abas.length;
    if (e.key === 'ArrowLeft') i = (atual - 1 + abas.length) % abas.length;
    if (e.key === 'Home') i = 0;
    if (e.key === 'End') i = abas.length - 1;
    escolherGrupo(abas[i].dataset.grupo);
    abas[i].focus();
  });

  el.chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b || b.dataset.cat === estado.cat) return;
    estado.cat = b.dataset.cat;
    render();
  });

  let espera;
  el.busca.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      estado.busca = el.busca.value;
      render({ animar: false });
    }, 120);
  });
  el.busca.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !el.busca.value) return;
    el.busca.value = '';
    estado.busca = '';
    render({ animar: false });
  });

  // Blocos de serviço levam direto para a área certa da tabela.
  for (const bloco of $$('[data-ir-grupo]')) {
    bloco.addEventListener('click', () => escolherGrupo(bloco.dataset.irGrupo));
  }

  render({ animar: false });
})();
