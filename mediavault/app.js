'use strict';

// ── CONFIGURAÇÕES GLOBAIS ─────────────────────
// Você pode preencher diretamente aqui ou via interface no botão de engrenagem
const EMBEDDED_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_KEY: 'YOUR_SUPABASE_ANON_KEY',
};

// ── SUPABASE CLIENT & CREDENTIALS ─────────────
let _supabase = null;

function getSupabaseCredentials() {
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_key');

  const url = (localUrl && localUrl.trim()) || (EMBEDDED_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL' ? EMBEDDED_CONFIG.SUPABASE_URL : '');
  const key = (localKey && localKey.trim()) || (EMBEDDED_CONFIG.SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY' ? EMBEDDED_CONFIG.SUPABASE_KEY : '');
  return { url, key };
}

function initSupabase() {
  const { url, key } = getSupabaseCredentials();
  if (url && key) {
    try {
      _supabase = window.supabase.createClient(url, key);
      $('supabase-banner').classList.remove('show');
      return true;
    } catch(e) {
      console.error('[Supabase] Erro ao inicializar:', e);
      _supabase = null;
    }
  }
  $('supabase-banner').classList.add('show');
  return false;
}

// ── SUPABASE DATA LAYER (FONTE ÚNICA DA VERDADE) ─────────────
async function checkSupabaseReady() {
  if (!_supabase) {
    initSupabase();
    if (!_supabase) {
      openConfig();
      throw new Error('Supabase não conectado. Configure a URL e a Anon Key.');
    }
  }
}

async function dbGetAll() {
  await checkSupabaseReady();
  const { data, error } = await _supabase
    .from('games')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function dbInsert(game) {
  await checkSupabaseReady();
  const { data, error } = await _supabase
    .from('games')
    .insert([game])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbUpdate(id, updates) {
  await checkSupabaseReady();
  const { data, error } = await _supabase
    .from('games')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function dbDelete(id) {
  await checkSupabaseReady();
  const { error } = await _supabase
    .from('games')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function dbBatchOrder(ids) {
  await checkSupabaseReady();
  for (let i = 0; i < ids.length; i++) {
    const { error } = await _supabase
      .from('games')
      .update({ sort_order: i })
      .eq('id', ids[i]);
    if (error) throw error;
  }
}

// ── SETTINGS DO SUPABASE (Chave Gemini AI, etc) ─────────────
async function dbGetSetting(key) {
  if (!_supabase) return null;
  try {
    const { data, error } = await _supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.warn(`[Supabase] Erro ao ler setting '${key}':`, error.message);
      return null;
    }
    return data ? data.value : null;
  } catch(e) {
    console.warn('[Supabase] Exceção ao ler setting:', e);
    return null;
  }
}

async function dbSetSetting(key, value) {
  await checkSupabaseReady();
  const { data, error } = await _supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── SEED INICIAL NO SUPABASE (Caso banco esteja vazio) ───────
const SEED = [
  { title:'Resident Evil 4 Remake', genre:'Survival Horror', platform:'PS5',
    cover_url:'https://image.api.playstation.com/vulcan/ap/rnd/202211/2722/BqqHzjwQfCOzBO6LNqCTMOcd.png',
    status:'playing', is_focus:true, weight:'heavy', sort_order:0, tags:['horror','survival','third-person','action'], notes:'' },
  { title:'Celeste', genre:'Platform', platform:'Nintendo Switch',
    cover_url:'https://upload.wikimedia.org/wikipedia/commons/0/0f/Celeste_box_art_full.png',
    status:'playing', is_focus:true, weight:'light', sort_order:1, tags:['platform','indie','precision','casual'], notes:'' },
  { title:'Elden Ring', genre:'RPG', platform:'PC',
    cover_url:'https://upload.wikimedia.org/wikipedia/en/b/b9/Elden_Ring_Box_art.jpg',
    status:'backlog', is_focus:false, weight:'heavy', sort_order:2, tags:['rpg','open-world','soulslike','fantasy'], notes:'Comprei na promoção.' },
  { title:'Stardew Valley', genre:'Simulation', platform:'PC',
    cover_url:'https://upload.wikimedia.org/wikipedia/en/f/fd/Logo_of_Stardew_Valley.png',
    status:'backlog', is_focus:false, weight:'light', sort_order:3, tags:['simulation','farming','casual','indie'], notes:'' },
  { title:'Alan Wake 2', genre:'Survival Horror', platform:'PC',
    cover_url:'https://upload.wikimedia.org/wikipedia/en/1/17/Alan_Wake_2_cover_art.jpg',
    status:'backlog', is_focus:false, weight:'heavy', sort_order:4, tags:['horror','psychological','mystery'], notes:'' },
  { title:'Hollow Knight', genre:'Metroidvania', platform:'Nintendo Switch',
    cover_url:'https://upload.wikimedia.org/wikipedia/en/5/5a/Hollow_Knight_first_cover.jpg',
    status:'backlog', is_focus:false, weight:'heavy', sort_order:5, tags:['metroidvania','indie','dark','adventure'], notes:'' },
  { title:'Hades', genre:'Roguelike', platform:'PC',
    cover_url:'https://upload.wikimedia.org/wikipedia/en/c/cc/Hades_cover_art.jpg',
    status:'completed', is_focus:false, weight:'medium', sort_order:6, tags:['roguelike','action','mythology'], notes:'Incrível. Platinado no Switch.' },
];

// ── STATE DA APLICAÇÃO ────────────────────────
let S = {
  games: [],
  view: 'backlog',
  query: '',
  libFilter: 'all',
  pendingPair: null,
  editId: null,
  tags: [],
  aiOrder: null,
  geminiApiKey: '',
};

// ── DOM REFS ──────────────────────────────────
const $ = id => document.getElementById(id);
const focusGrid    = $('focus-grid');
const genreSects   = $('genre-sections');
const libraryGrid  = $('library-grid');

// ── UTILS ─────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function statusLabel(s) {
  return {backlog:'Backlog',playing:'Jogando',completed:'Completado',platinum:'Platinado (100%)',dropped:'Abandonado'}[s]||s;
}

function toast(msg, type='info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type==='success'?'fa-circle-check':type==='error'?'fa-circle-xmark':'fa-circle-info';
  t.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
  $('toast-container').appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 3500);
}

function openModal(id)  { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// ── RENDER: FOCUS (2 JOGOS CONTRASTANTES) ─────
function renderFocus() {
  const focused = S.games.filter(g => g.is_focus && (g.status==='playing'||g.status==='backlog'));
  if (!focused.length) {
    focusGrid.innerHTML = `
      <div class="focus-empty">
        <i class="fa-solid fa-dice-two"></i>
        <h3>Sem Foco Definido</h3>
        <p>Clique em "Trocar Sugestões" para escolher 2 jogos contrastantes (1 pesado e 1 leve).</p>
        <button class="btn btn-accent" onclick="openPickTwo()">
          <i class="fa-solid fa-shuffle"></i> Escolher Agora
        </button>
      </div>`;
    return;
  }
  focusGrid.innerHTML = focused.map(g => {
    const isHeavy = (g.weight||'medium') === 'heavy';
    const badgeCls = isHeavy ? 'heavy' : 'light';
    const badgeLbl = isHeavy
      ? '<i class="fa-solid fa-skull"></i> PESADO'
      : '<i class="fa-solid fa-sun"></i> LEVE';
    const cover = g.cover_url
      ? `<img class="focus-card-cover" src="${esc(g.cover_url)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="focus-card-cover-placeholder" style="display:none"><i class="fa-solid fa-gamepad"></i></div>`
      : `<div class="focus-card-cover-placeholder"><i class="fa-solid fa-gamepad"></i></div>`;
    return `
      <div class="focus-card" data-id="${g.id}" tabindex="0" role="button">
        ${cover}
        <div class="focus-card-body">
          <span class="focus-badge ${badgeCls}">${badgeLbl}</span>
          <div class="focus-card-title">${esc(g.title)}</div>
          <div class="focus-card-genre">${esc(g.genre)}</div>
          ${g.platform?`<div class="focus-card-platform"><i class="fa-solid fa-desktop"></i> ${esc(g.platform)}</div>`:''}
        </div>
      </div>`;
  }).join('');
  focusGrid.querySelectorAll('.focus-card').forEach(c => {
    c.addEventListener('click', () => openDetail(c.dataset.id));
    c.addEventListener('keydown', e => { if(e.key==='Enter') openDetail(c.dataset.id); });
  });
}

// ── RENDER: GENRE SECTIONS ────────────────────
function renderGenres() {
  const q = S.query.toLowerCase().trim();
  const pool = S.games.filter(g => g.status==='backlog'||g.status==='playing');
  const filtered = q ? pool.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.genre.toLowerCase().includes(q) ||
    (g.tags||[]).some(t=>t.toLowerCase().includes(q))
  ) : pool;
  const grid = filtered.filter(g => !g.is_focus);

  $('empty-state').style.display = pool.length===0 ? 'block' : 'none';
  genreSects.style.display = pool.length===0 ? 'none' : 'block';

  if (filtered.length===0 && q) {
    $('no-results').style.display='block';
    $('no-results-query').textContent=q;
    genreSects.innerHTML='';
    return;
  }
  $('no-results').style.display='none';

  const map = {};
  grid.forEach(g => { if(!map[g.genre]) map[g.genre]=[]; map[g.genre].push(g); });

  genreSects.innerHTML = Object.entries(map).map(([genre, games]) => `
    <section class="genre-section">
      <div class="genre-header">
        <div class="genre-title-block">${esc(genre)}</div>
        <span class="genre-count">${games.length} JOGO${games.length!==1?'S':''}</span>
      </div>
      <div class="games-grid">${games.map(gameCardHTML).join('')}</div>
    </section>`).join('');

  attachCards(genreSects);
}

// ── RENDER: LIBRARY ───────────────────────────
function renderLibrary() {
  const f = S.libFilter;
  const list = f==='all' ? S.games : S.games.filter(g=>g.status===f);
  if (!list.length) {
    libraryGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-box-open"></i><h3>Nenhum Jogo</h3><p>Sem jogos cadastrados com esse filtro.</p></div>`;
    return;
  }
  libraryGrid.innerHTML = list.map(gameCardHTML).join('');
  attachCards(libraryGrid);
}

function renderAll() { renderFocus(); renderGenres(); renderLibrary(); }

// ── GAME CARD HTML ────────────────────────────
function gameCardHTML(g) {
  const cover = g.cover_url
    ? `<img class="game-card-cover" src="${esc(g.cover_url)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/><div class="game-card-cover-placeholder" style="display:none"><i class="fa-solid fa-gamepad"></i></div>`
    : `<div class="game-card-cover-placeholder"><i class="fa-solid fa-gamepad"></i></div>`;
  return `
    <article class="game-card${g.status==='playing'?' is-playing':''}" data-id="${g.id}" tabindex="0" role="button">
      <div class="game-card-cover-wrap">
        ${cover}
        <div class="game-card-status-dot dot-${g.status||'backlog'}" title="${statusLabel(g.status)}"></div>
      </div>
      <div class="game-card-body">
        <div class="game-card-title">${esc(g.title)}</div>
        <div class="game-card-platform">${esc(g.platform||'—')}</div>
      </div>
    </article>`;
}

function attachCards(container) {
  container.querySelectorAll('.game-card').forEach(c => {
    c.addEventListener('click', () => openDetail(c.dataset.id));
    c.addEventListener('keydown', e => { if(e.key==='Enter') openDetail(c.dataset.id); });
  });
}

// ── ADD / EDIT GAME ───────────────────────────
function openAdd(game=null) {
  S.editId = game?.id || null;
  S.tags   = game ? [...(game.tags||[])] : [];
  $('add-modal-title').textContent = game ? 'EDITAR JOGO' : 'NOVO JOGO';
  $('form-title').value    = game?.title    || '';
  $('form-genre').value    = game?.genre    || '';
  $('form-platform').value = game?.platform || '';
  $('form-cover').value    = game?.cover_url|| '';
  $('form-weight').value   = game?.weight   || 'medium';
  $('form-status').value   = game?.status   || 'backlog';
  $('form-notes').value    = game?.notes    || '';
  renderTagsUI();
  previewCover($('form-cover').value);
  openModal('add-modal-overlay');
  setTimeout(() => $('form-title').focus(), 100);
}

function renderTagsUI() {
  const wrap = $('tags-wrap');
  const input = $('tag-input');
  wrap.innerHTML = '';
  S.tags.forEach((tag, i) => {
    const chip = document.createElement('div');
    chip.className = 'tag-chip';
    chip.innerHTML = `${esc(tag)} <button type="button" aria-label="Remover">&times;</button>`;
    chip.querySelector('button').onclick = () => { S.tags.splice(i,1); renderTagsUI(); };
    wrap.appendChild(chip);
  });
  wrap.appendChild(input);
  input.value = '';
  input.onkeydown = e => {
    if ((e.key==='Enter'||e.key===',') && input.value.trim()) {
      e.preventDefault();
      const t = input.value.trim().toLowerCase().replace(/,/g,'');
      if (t && !S.tags.includes(t)) { S.tags.push(t); renderTagsUI(); $('tag-input').focus(); }
    }
    if (e.key==='Backspace' && !input.value && S.tags.length) { S.tags.pop(); renderTagsUI(); }
  };
  wrap.onclick = () => input.focus();
}

function previewCover(url) {
  const img = $('cover-preview-img');
  if (url && url.startsWith('http')) { img.src=url; img.style.display='block'; img.onerror=()=>{img.style.display='none';}; }
  else img.style.display='none';
}
$('form-cover').addEventListener('input', () => previewCover($('form-cover').value));

$('add-game-form').addEventListener('submit', async e => {
  e.preventDefault();
  const title    = $('form-title').value.trim();
  const genre    = $('form-genre').value.trim();
  const platform = $('form-platform').value.trim();
  const cover    = $('form-cover').value.trim();
  const weight   = $('form-weight').value;
  const status   = $('form-status').value;
  const notes    = $('form-notes').value.trim();
  if (!title||!genre) { toast('Preencha título e gênero.','error'); return; }
  
  const btn = $('save-game-btn');
  btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Salvando no Supabase...';
  try {
    if (S.editId) {
      const upd = await dbUpdate(S.editId, {title,genre,platform,cover_url:cover,weight,status,notes,tags:S.tags});
      const i = S.games.findIndex(g=>g.id===S.editId);
      if (i>=0) S.games[i]={...S.games[i],...upd};
      toast('Jogo atualizado no Supabase!','success');
    } else {
      const maxOrder = S.games.reduce((m,g)=>Math.max(m,g.sort_order||0),0);
      const ng = await dbInsert({title,genre,platform,cover_url:cover,weight,status,notes,tags:S.tags,is_focus:false,sort_order:maxOrder+1});
      S.games.push(ng);
      toast('Jogo cadastrado no Supabase!','success');
    }
    closeModal('add-modal-overlay');
    renderAll();
  } catch(err) {
    console.error(err);
    toast(`Erro no Supabase: ${err.message || 'Falha ao salvar'}`, 'error');
  } finally {
    btn.disabled=false;
    btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Salvar no Supabase';
  }
});

// ── DETAIL MODAL ──────────────────────────────
let detailId = null;
function openDetail(id) {
  const g = S.games.find(x=>x.id===id);
  if (!g) return;
  detailId = id;
  $('detail-title').textContent = g.title;
  const img = $('detail-cover-img');
  const ph  = $('detail-cover-placeholder');
  if (g.cover_url) { img.src=g.cover_url; img.style.display='block'; ph.style.display='none'; img.onerror=()=>{img.style.display='none';ph.style.display='flex';}; }
  else { img.style.display='none'; ph.style.display='flex'; }
  const meta = [
    g.genre    && `<span class="meta-tag">${esc(g.genre)}</span>`,
    g.platform && `<span class="meta-tag"><i class="fa-solid fa-desktop"></i> ${esc(g.platform)}</span>`,
    g.weight   && `<span class="meta-tag">${{heavy:'PESADO',light:'LEVE',medium:'MÉDIO'}[g.weight]||''}</span>`,
    ...(g.tags||[]).map(t=>`<span class="meta-tag" style="opacity:0.7">${esc(t)}</span>`)
  ].filter(Boolean).join('');
  $('detail-meta').innerHTML = meta;
  const notesWrap = $('detail-notes-wrap');
  if (g.notes) { $('detail-notes').textContent=g.notes; notesWrap.style.display='block'; }
  else notesWrap.style.display='none';
  document.querySelectorAll('.status-btn').forEach(b => b.classList.toggle('active', b.dataset.status===g.status));
  $('detail-set-focus-btn').innerHTML = g.is_focus
    ? '<i class="fa-solid fa-crosshairs"></i> Remover do Foco'
    : '<i class="fa-solid fa-crosshairs"></i> Colocar em Foco';
  openModal('detail-modal-overlay');
}

document.querySelectorAll('.status-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!detailId) return;
    try {
      const upd = await dbUpdate(detailId, {status:btn.dataset.status});
      const i = S.games.findIndex(g=>g.id===detailId);
      if (i>=0) S.games[i]={...S.games[i],...upd};
      document.querySelectorAll('.status-btn').forEach(b=>b.classList.toggle('active',b===btn));
      renderAll();
      toast(`Status salvo no Supabase: ${statusLabel(btn.dataset.status)}`,'success');
    } catch(err) {
      toast(`Erro ao atualizar status: ${err.message}`,'error');
    }
  });
});

$('detail-set-focus-btn').addEventListener('click', async () => {
  if (!detailId) return;
  const g = S.games.find(x=>x.id===detailId);
  if (!g) return;
  try {
    if (g.is_focus) {
      await dbUpdate(detailId, {is_focus:false});
      g.is_focus=false;
      toast('Removido do foco no Supabase.','info');
    } else {
      const focused = S.games.filter(x=>x.is_focus&&x.id!==detailId);
      if (focused.length>=2) {
        await dbUpdate(focused[0].id,{is_focus:false});
        focused[0].is_focus=false;
      }
      await dbUpdate(detailId, {is_focus:true,status:'playing'});
      g.is_focus=true; g.status='playing';
      toast('Foco atualizado no Supabase!','success');
    }
    closeModal('detail-modal-overlay');
    renderAll();
  } catch(err) {
    toast(`Erro ao alterar foco no Supabase: ${err.message}`,'error');
  }
});

$('detail-edit-btn').addEventListener('click', () => {
  const g = S.games.find(x=>x.id===detailId);
  closeModal('detail-modal-overlay');
  openAdd(g);
});

$('detail-delete-btn').addEventListener('click', async () => {
  const g = S.games.find(x=>x.id===detailId);
  if (!confirm(`Excluir definitivamente "${g?.title}" do Supabase?`)) return;
  try {
    await dbDelete(detailId);
    S.games = S.games.filter(x=>x.id!==detailId);
    closeModal('detail-modal-overlay');
    renderAll();
    toast('Jogo excluído do Supabase.','info');
  } catch(err) {
    toast(`Erro ao excluir: ${err.message}`,'error');
  }
});

// ── PICK TWO MODAL ────────────────────────────
const HEAVY_G = ['Survival Horror','Horror','RPG','Soulslike','Strategy','JRPG','FPS','Action','Metroidvania','Roguelike'];
const LIGHT_G = ['Platform','Simulation','Puzzle','Visual Novel','Sports','Casual'];

function classify(g) {
  if (g.weight==='heavy') return 'heavy';
  if (g.weight==='light') return 'light';
  const genre = (g.genre||'').toLowerCase();
  const tags = (g.tags||[]).map(t=>t.toLowerCase());
  const isLight = LIGHT_G.some(l=>genre.includes(l.toLowerCase())) || tags.some(t=>['casual','farming','puzzle','simulation'].includes(t));
  return isLight ? 'light' : 'heavy';
}

function pickPair(exclude=[]) {
  const pool = S.games.filter(g=>(g.status==='backlog'||g.status==='playing')&&!exclude.includes(g.id));
  if (pool.length < 2) return null;
  const heavy = pool.filter(g=>classify(g)==='heavy');
  const light = pool.filter(g=>classify(g)==='light');
  const hPool = heavy.length ? heavy : pool;
  const h = hPool[Math.floor(Math.random()*hPool.length)];
  const lPool = (light.length ? light : pool).filter(x=>x.id!==h.id);
  if (!lPool.length) return null;
  const l = lPool[Math.floor(Math.random()*lPool.length)];
  return {heavy:h, light:l};
}

let pickExclude = [];

function openPickTwo(reset=true) {
  if (reset) pickExclude=[];
  const pair = pickPair(pickExclude);
  if (!pair) { toast('Cadastre ao menos 2 jogos no Supabase.','info'); return; }
  S.pendingPair = pair;
  renderPickGrid(pair);
  openModal('pick-modal-overlay');
}

function renderPickGrid({heavy, light}) {
  function card(g, type) {
    const badge = type==='heavy'
      ? `<span style="background:var(--accent-2);color:#fff;padding:2px 8px;font-size:0.65rem;font-weight:700;border:2px solid var(--border);border-radius:2px;display:inline-flex;gap:4px;align-items:center;"><i class="fa-solid fa-skull"></i> PESADO</span>`
      : `<span style="background:var(--accent-3);padding:2px 8px;font-size:0.65rem;font-weight:700;border:2px solid var(--border);border-radius:2px;display:inline-flex;gap:4px;align-items:center;"><i class="fa-solid fa-sun"></i> LEVE</span>`;
    const cover = g.cover_url
      ? `<img class="pick-card-cover" src="${esc(g.cover_url)}" alt="" onerror="this.style.display='none'"/>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--text-muted)"><i class="fa-solid fa-gamepad"></i></div>`;
    return `
      <div>
        <div style="margin-bottom:8px">${badge}</div>
        <div class="pick-card" data-id="${g.id}">
          <div class="pick-card-cover-wrap">${cover}</div>
          <div class="pick-card-label">${esc(g.title)}</div>
        </div>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;text-align:center">${esc(g.genre)}</div>
      </div>`;
  }
  $('pick-two-grid').innerHTML = `${card(heavy,'heavy')}<div class="vs-divider">VS</div>${card(light,'light')}`;
}

$('pick-modal-shuffle').addEventListener('click', () => {
  if (S.pendingPair) pickExclude=[S.pendingPair.heavy.id, S.pendingPair.light.id];
  const pair = pickPair(pickExclude);
  if (!pair) {
    pickExclude=[];
    const p2=pickPair([]);
    if(!p2){toast('Sem mais combinações.','info');return;}
    S.pendingPair=p2;
    renderPickGrid(p2);
    return;
  }
  S.pendingPair=pair;
  renderPickGrid(pair);
});

$('pick-modal-confirm').addEventListener('click', async () => {
  if (!S.pendingPair) return;
  const {heavy,light} = S.pendingPair;
  try {
    for (const g of S.games.filter(x=>x.is_focus)) {
      await dbUpdate(g.id,{is_focus:false});
      g.is_focus=false;
    }
    for (const [g, w] of [[heavy,'heavy'],[light,'light']]) {
      await dbUpdate(g.id,{is_focus:true,weight:w,status:'playing'});
      const idx=S.games.findIndex(x=>x.id===g.id);
      if(idx>=0){S.games[idx].is_focus=true;S.games[idx].weight=w;S.games[idx].status='playing';}
    }
    closeModal('pick-modal-overlay');
    renderAll();
    toast('Dupla salva no Supabase! Bora jogar!','success');
  } catch(err) {
    toast(`Erro ao sincronizar foco: ${err.message}`,'error');
  }
});

// ── AI SORT MODAL (GEMINI INTEGRADO COM SUPABASE) ──
async function openAi() {
  $('ai-idle-state').style.display='block';
  $('ai-thinking-state').style.display='none';
  $('ai-result-state').style.display='none';

  // Tenta carregar do Supabase se ainda não carregado
  if (!S.geminiApiKey && _supabase) {
    try {
      const saved = await dbGetSetting('gemini_api_key');
      if (saved) S.geminiApiKey = saved;
    } catch(e) {}
  }
  $('ai-key-input').value = S.geminiApiKey || '';
  openModal('ai-modal-overlay');
}

$('ai-run-btn').addEventListener('click', async () => {
  const key = $('ai-key-input').value.trim();
  if (!key) { toast('Insira sua Gemini API Key.','error'); return; }

  // Salva a chave no Supabase e no state
  S.geminiApiKey = key;
  try {
    await dbSetSetting('gemini_api_key', key);
  } catch(e) {
    console.warn('[Settings] Aviso ao salvar chave no Supabase:', e);
  }

  const pool = S.games.filter(g=>g.status==='backlog'||g.status==='playing');
  if (pool.length<2) { toast('Adicione ao menos 2 jogos no Supabase.','info'); return; }

  $('ai-idle-state').style.display='none';
  $('ai-thinking-state').style.display='flex';

  const list = pool.map((g,i)=>`${i+1}. "${g.title}" — Gênero: ${g.genre}, Tags: ${(g.tags||[]).join(', ')||'nenhuma'}`).join('\n');
  const prompt = `Você é um especialista em videogames. Aqui está minha lista de backlog:\n\n${list}\n\nReorganize agrupando jogos com temas e estilos similares próximos uns dos outros (survival horror juntos, RPGs juntos, jogos casuais juntos, etc.).\nResponda SOMENTE com JSON válido: {"order": [lista de números na nova ordem]}\nExemplo: {"order": [3, 1, 5, 2, 4]}`;
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.3,maxOutputTokens:512} })
    });
    if (!res.ok) {
      const e=await res.json();
      throw new Error(e?.error?.message||`HTTP ${res.status}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Resposta de IA inválida.');
    const {order} = JSON.parse(m[0]);
    if (!Array.isArray(order)) throw new Error('Formato de resposta inválido.');

    S.aiOrder = order.map(n=>pool[n-1]).filter(Boolean);
    $('ai-thinking-state').style.display='none';
    $('ai-result-state').style.display='block';
    $('ai-result-list').innerHTML = S.aiOrder.map((g,i)=>`
      <li class="ai-result-item">
        <span class="rank">${i+1}</span>
        <span>${esc(g.title)} <span style="color:var(--text-muted);font-size:0.75rem">— ${esc(g.genre)}</span></span>
      </li>`).join('');
  } catch(err) {
    $('ai-thinking-state').style.display='none';
    $('ai-idle-state').style.display='block';
    toast(`Erro IA: ${err.message}`,'error');
  }
});

$('ai-apply-btn').addEventListener('click', async () => {
  if (!S.aiOrder) return;
  const btn = $('ai-apply-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando no Supabase...';

  try {
    const ids = S.aiOrder.map(g=>g.id);
    await dbBatchOrder(ids);

    ids.forEach((id,i)=>{ const g=S.games.find(x=>x.id===id); if(g) g.sort_order=i; });
    S.games.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));

    closeModal('ai-modal-overlay');
    renderAll();
    toast('Ordem do backlog salva no Supabase!','success');

    setTimeout(()=>{
      document.querySelectorAll('.game-card').forEach((c,i)=>{
        setTimeout(()=>c.classList.add('reorder-anim'),i*40);
        setTimeout(()=>c.classList.remove('reorder-anim'),i*40+500);
      });
    },100);
  } catch(err) {
    toast(`Erro ao salvar ordem no Supabase: ${err.message}`,'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Salvar Ordem no Supabase';
  }
});

$('ai-result-cancel').addEventListener('click', () => {
  $('ai-result-state').style.display='none';
  $('ai-idle-state').style.display='block';
});

// ── CONFIGURAÇÕES MODAL ───────────────────────
function openConfig() {
  const { url, key } = getSupabaseCredentials();
  $('cfg-supabase-url').value = url || '';
  $('cfg-supabase-key').value = key || '';
  $('cfg-gemini-key').value   = S.geminiApiKey || '';
  openModal('config-modal-overlay');
}

$('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = $('cfg-supabase-url').value.trim();
  const key = $('cfg-supabase-key').value.trim();
  const gemini = $('cfg-gemini-key').value.trim();

  if (!url || !key) {
    toast('Preencha a URL e a Anon Key do Supabase.', 'error');
    return;
  }

  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);

  try {
    _supabase = window.supabase.createClient(url, key);
    $('supabase-banner').classList.remove('show');
    toast('Conectando ao Supabase...', 'info');
    
    // Salva a chave do Gemini no Supabase se preenchida
    if (gemini) {
      S.geminiApiKey = gemini;
      try { await dbSetSetting('gemini_api_key', gemini); } catch(err) {}
    }

    closeModal('config-modal-overlay');
    await loadInitialData();
    toast('Conectado ao Supabase com sucesso!', 'success');
  } catch(err) {
    toast(`Falha na conexão: ${err.message}`, 'error');
  }
});

$('config-btn').addEventListener('click', openConfig);
$('banner-config-btn').addEventListener('click', openConfig);
$('config-modal-cancel').addEventListener('click', () => closeModal('config-modal-overlay'));

// ── NAVIGATION & THEME ────────────────────────
function switchView(v) {
  S.view=v;
  $('backlog-section').classList.toggle('active',v==='backlog');
  $('library-section').classList.toggle('active',v==='library');
  document.querySelectorAll('.nav-pill[data-view]').forEach(p=>p.classList.toggle('active',p.dataset.view===v));
  $('ai-sort-btn').style.display = v==='backlog'?'flex':'none';
  if (v==='library') renderLibrary();
}

document.querySelectorAll('.nav-pill[data-view]').forEach(p => p.addEventListener('click',()=>switchView(p.dataset.view)));

document.querySelectorAll('#library-filters .nav-pill').forEach(p => {
  p.addEventListener('click', () => {
    S.libFilter=p.dataset.filter;
    document.querySelectorAll('#library-filters .nav-pill').forEach(x=>x.classList.toggle('active',x===p));
    renderLibrary();
  });
});

$('search-input').addEventListener('input', () => { S.query=$('search-input').value; renderGenres(); });

$('theme-toggle').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  document.documentElement.setAttribute('data-theme',dark?'light':'dark');
  $('theme-toggle').innerHTML = dark?'<i class="fa-solid fa-moon"></i>':'<i class="fa-solid fa-sun"></i>';
  localStorage.setItem('backlog_theme',dark?'light':'dark');
});

const savedTheme = localStorage.getItem('backlog_theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme',savedTheme);
  $('theme-toggle').innerHTML = savedTheme==='dark'?'<i class="fa-solid fa-sun"></i>':'<i class="fa-solid fa-moon"></i>';
}

// ── BUTTON WIRING ─────────────────────────────
$('add-game-btn').addEventListener('click',()=>openAdd());
$('empty-add-btn')?.addEventListener('click',()=>openAdd());
$('pick-two-btn').addEventListener('click',()=>openPickTwo(true));
$('ai-sort-btn').addEventListener('click',openAi);
$('logo-home-btn').addEventListener('click',e=>{e.preventDefault();switchView('backlog');window.scrollTo({top:0,behavior:'smooth'});});

['add','detail','pick','ai','config'].forEach(n=>{
  $(`${n}-modal-close`)?.addEventListener('click',()=>closeModal(`${n}-modal-overlay`));
  $(`${n}-modal-overlay`)?.addEventListener('click',e=>{if(e.target===$(`${n}-modal-overlay`))closeModal(`${n}-modal-overlay`);});
});
$('add-modal-cancel')?.addEventListener('click',()=>closeModal('add-modal-overlay'));
$('ai-modal-cancel')?.addEventListener('click',()=>closeModal('ai-modal-overlay'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')['add-modal-overlay','detail-modal-overlay','pick-modal-overlay','ai-modal-overlay','config-modal-overlay'].forEach(closeModal);});

// ── DATA LOADING & BOOT ───────────────────────
async function loadInitialData() {
  try {
    S.games = await dbGetAll();

    // Se o banco de dados Supabase estiver vazio, insere o seed inicial no Supabase
    if (!S.games.length && _supabase) {
      toast('Populando banco inicial no Supabase...', 'info');
      for (const g of SEED) {
        try {
          const s = await dbInsert({...g});
          S.games.push(s);
        } catch(e) {
          console.warn('[Seed] Erro ao inserir item:', e);
        }
      }
    }

    // Carrega chave do Gemini do Supabase
    const geminiKey = await dbGetSetting('gemini_api_key');
    if (geminiKey) S.geminiApiKey = geminiKey;

    // Se nenhum jogo estiver em foco no Supabase, auto-seleciona dupla
    const focused = S.games.filter(g=>g.is_focus);
    if (!focused.length && S.games.filter(g=>g.status==='backlog'||g.status==='playing').length>=2) {
      const pair = pickPair();
      if (pair) {
        for (const [g,w] of [[pair.heavy,'heavy'],[pair.light,'light']]) {
          try {
            await dbUpdate(g.id,{is_focus:true,weight:w,status:'playing'});
            const idx=S.games.findIndex(x=>x.id===g.id);
            if(idx>=0){S.games[idx].is_focus=true;S.games[idx].weight=w;S.games[idx].status='playing';}
          } catch(e) {}
        }
      }
    }
  } catch(err) {
    console.error('[Supabase Boot Error]:', err);
    toast(`Supabase: ${err.message || 'Configure suas credenciais'}`, 'error');
  }

  renderAll();
}

async function boot() {
  const ready = initSupabase();
  if (ready) {
    await loadInitialData();
  } else {
    renderAll();
  }
  $('loading-overlay').classList.add('hidden');
  setTimeout(()=>$('loading-overlay').style.display='none',400);
}

window.openPickTwo = openPickTwo;
boot();
