// Loup-Garou de Thiercelieux — Assistant du Narrateur
// Dépend de js/roles.js (chargé avant ce script).

const STORAGE_KEY = 'loupgarou_state_v1';
const $app = document.getElementById('app');

// ————————————————————————————— État —————————————————————————————
const defaultState = () => ({
  screen: 'home',            // home | players | roles | deal | game
  tab: 'flow',               // flow | players | log | help
  settings: { debateSec: 240, voteSec: 60 },
  players: [],               // {id, name, roleId, alive, capitaine, lover, charmed, noVote, camp?, infected}
  roleCounts: {},
  dealMode: null,            // 'phone' | 'list'
  dealDone: [],              // ids ayant vu leur carte
  dealShow: null,            // id en cours de révélation (mode téléphone)
  dealRevealed: false,
  phase: 'night',            // night | morning | day
  nightNumber: 0,
  dayCount: 0,
  night: null,               // {steps, idx, actions, temp}
  day: null,                 // {stage, voteRound, pendingElimId}
  announce: { deaths: [], queue: [] },
  flags: {},
  log: [],
  winner: null,
  winnerDismissed: false,
});

let S = defaultState();

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* stockage indisponible */ } }
function update() { save(); render(); }
function byId(id) { return S.players.find(p => p.id === id); }
function alivePlayers() { return S.players.filter(p => p.alive); }
function campOf(p) { return p.camp || roleById[p.roleId]?.camp || 'village'; }
function isWolfSide(p) { return campOf(p) === 'loups' || p.roleId === 'loup_blanc'; }
function roleInPlay(id) { return S.players.some(p => p.roleId === id); }
function roleAlive(id) { return S.players.some(p => p.roleId === id && p.alive); }
function playerWithRole(id) { return S.players.find(p => p.roleId === id && p.alive); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function contextLabel() {
  if (S.phase === 'night') return `Nuit ${S.nightNumber}`;
  return `Jour ${S.dayCount}`;
}
function addLog(msg) { S.log.push({ when: contextLabel(), msg }); }

// Confirmation et notifications intégrées (les popups natives sont bloquées
// dans certains contextes : PWA, iframes sandboxées…)
let confirmBox = null; // {text, action, arg}
let toastMsg = null, toastHandle = null;
function askConfirm(text, action, arg) { confirmBox = { text, action, arg }; render(); }
function toast(msg) {
  toastMsg = msg;
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => { toastMsg = null; const el = document.getElementById('toast'); if (el) el.remove(); }, 2600);
  render();
}

const CAUSE_LABEL = {
  loups: 'dévoré(e) par les Loups-Garous',
  gml: 'dévoré(e) par le Grand Méchant Loup',
  loup_blanc: 'tué(e) par le Loup Blanc',
  sorciere: 'empoisonné(e) par la Sorcière',
  vote: 'éliminé(e) par le vote du village',
  chasseur: 'abattu(e) par le Chasseur',
  chagrin: 'mort(e) de chagrin (amoureux)',
  rouille: 'mort de l’épée rouillée du Chevalier',
  manuel: 'éliminé(e) (décision du narrateur)',
};

// ——————————————————————— Sons / vibrations ———————————————————————
function beep(times = 3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; g.gain.value = 0.15;
      o.start(ctx.currentTime + i * 0.35);
      o.stop(ctx.currentTime + i * 0.35 + 0.2);
    }
  } catch (e) { /* audio indisponible */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ——————————————————————— Minuteurs (hors état sauvegardé) ———————————————————————
const timers = {}; // key -> {remaining, running, handle, total}
function timerEnsure(key, secs) {
  if (!timers[key]) timers[key] = { remaining: secs, total: secs, running: false, handle: null };
  return timers[key];
}
function timerToggle(key) {
  const t = timers[key]; if (!t) return;
  if (t.running) { clearInterval(t.handle); t.running = false; }
  else {
    t.running = true;
    t.handle = setInterval(() => {
      t.remaining--;
      if (t.remaining <= 0) { t.remaining = 0; clearInterval(t.handle); t.running = false; beep(); }
      timerPaint(key);
    }, 1000);
  }
  timerPaint(key);
}
function timerReset(key, secs) {
  const t = timers[key]; if (!t) return;
  clearInterval(t.handle); t.running = false; t.remaining = secs ?? t.total; t.total = secs ?? t.total;
  timerPaint(key);
}
function timerAdd(key, secs) { const t = timers[key]; if (!t) return; t.remaining += secs; timerPaint(key); }
function timerPaint(key) {
  const el = document.getElementById(`timer-${key}`);
  const btn = document.getElementById(`timerbtn-${key}`);
  const t = timers[key]; if (!el || !t) return;
  el.textContent = fmtTime(t.remaining);
  el.classList.toggle('warning', t.remaining <= 10 && t.remaining > 0);
  if (btn) btn.textContent = t.running ? '⏸ Pause' : (t.remaining === 0 ? '🔁 Fini' : '▶️ Lancer');
}
function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function timerHTML(key, secs, label) {
  const t = timerEnsure(key, secs);
  return `
    <div class="center">
      <div class="muted small">${esc(label)}</div>
      <div class="timer-display ${t.remaining <= 10 && t.remaining > 0 ? 'warning' : ''}" id="timer-${key}">${fmtTime(t.remaining)}</div>
      <div class="row" style="justify-content:center">
        <button class="btn-primary" id="timerbtn-${key}" data-action="timerToggle" data-arg="${key}">${t.running ? '⏸ Pause' : '▶️ Lancer'}</button>
        <button class="btn-sm" data-action="timerAdd" data-arg="${key}">+30 s</button>
        <button class="btn-sm btn-ghost" data-action="timerReset" data-arg="${key}">↺</button>
      </div>
    </div>`;
}

// ————————————————————————— Nuit : construction des étapes —————————————————————————
function buildNight() {
  const n = S.nightNumber;
  const steps = [];
  const add = s => steps.push(s);

  add({ key: 'intro', icon: '🌙', title: `Nuit ${n} — Le village s'endort`, ui: 'info',
    say: 'Le village s’endort… Tous les joueurs ferment les yeux.',
    help: n === 1 ? 'Vérifiez que tout le monde a bien vu sa carte avant de commencer.' : null });

  if (n === 1 && roleAlive('voleur')) add({ key: 'voleur', roleId: 'voleur', ui: 'voleur',
    say: 'Voleur, réveille-toi. Je te présente les deux cartes du milieu. Tu peux échanger ta carte contre l’une d’elles.',
    help: 'Si les deux cartes du milieu sont des Loups-Garous, il DOIT échanger. Si son rôle change, mettez-le à jour ci-dessous.' });

  if (roleAlive('comedien') && (S.flags.comedienNights || 0) < 3) add({ key: 'comedien', roleId: 'comedien', ui: 'comedien',
    say: 'Comédien, réveille-toi. Choisis l’un des pouvoirs mis de côté.',
    help: 'Le Comédien utilise ce pouvoir jusqu’à la prochaine nuit, puis la carte est défaussée. Appelez-le au moment adéquat si son pouvoir choisi agit la nuit.' });

  if (n === 1 && roleAlive('cupidon')) add({ key: 'cupidon', roleId: 'cupidon', ui: 'pickMulti', need: 2,
    say: 'Cupidon, réveille-toi. Désigne les deux amoureux.',
    help: 'Touchez ensuite la tête des deux amoureux : ils se réveillent et se reconnaissent (sans montrer leur carte).' });

  if (n === 1 && roleAlive('enfant_sauvage')) add({ key: 'enfant_sauvage', roleId: 'enfant_sauvage', ui: 'pick',
    say: 'Enfant Sauvage, réveille-toi. Choisis ton modèle.',
    help: 'Si ce modèle meurt, l’Enfant Sauvage deviendra Loup-Garou (l’app vous préviendra).' });

  if (n === 1 && roleAlive('chien_loup')) add({ key: 'chien_loup', roleId: 'chien_loup', ui: 'chienloup',
    say: 'Chien-Loup, réveille-toi. Choisis ton camp : Villageois ou Loup-Garou ?',
    help: 'S’il choisit les loups, il se réveillera chaque nuit avec eux.' });

  if (n === 1 && roleInPlay('trois_freres')) add({ key: 'freres', icon: '👨‍👨‍👦', title: 'Les Trois Frères', ui: 'info',
    say: 'Les Trois Frères, réveillez-vous et reconnaissez-vous.',
    help: 'Vous pourrez les réveiller de temps en temps (nuits suivantes) pour qu’ils se concertent en silence.' });

  if (n === 1 && roleInPlay('deux_soeurs')) add({ key: 'soeurs', icon: '👭', title: 'Les Deux Sœurs', ui: 'info',
    say: 'Les Deux Sœurs, réveillez-vous et reconnaissez-vous.',
    help: 'Vous pourrez les réveiller de temps en temps (nuits suivantes) pour qu’elles se concertent en silence.' });

  if (roleAlive('salvateur')) add({ key: 'salvateur', roleId: 'salvateur', ui: 'pick', allowSelf: true,
    say: 'Salvateur, réveille-toi. Qui veux-tu protéger cette nuit ?',
    help: 'Il ne peut pas protéger la même personne deux nuits de suite. La protection ne vaut que contre l’attaque des loups.' });

  if (roleAlive('voyante')) add({ key: 'voyante', roleId: 'voyante', ui: 'voyante',
    say: 'Voyante, réveille-toi. Désigne le joueur dont tu veux connaître la véritable identité.',
    help: null });

  if (roleAlive('renard') && !S.flags.renardLost) add({ key: 'renard', roleId: 'renard', ui: 'renard',
    say: 'Renard, réveille-toi. Veux-tu flairer un groupe de trois joueurs ?',
    help: 'Il désigne un joueur : vous répondez OUI si ce joueur ou l’un de ses deux voisins vivants est un Loup-Garou. Si la réponse est NON, il perd son pouvoir.' });

  const wolves = alivePlayers().filter(isWolfSide);
  if (wolves.length) add({ key: 'loups', icon: '🐺', title: 'Les Loups-Garous', ui: 'pick', optional: true,
    say: 'Loups-Garous, réveillez-vous et désignez votre victime.',
    help: `Loups à appeler : ${wolves.map(p => p.name).join(', ')}.` +
      (roleAlive('petite_fille') ? ' 👧 La Petite Fille peut espionner discrètement.' : '') });

  if (roleAlive('infect_pere') && !S.flags.infectUsed && wolves.length) add({ key: 'infect', roleId: 'infect_pere', ui: 'infect',
    say: 'Infect Père des Loups, veux-tu infecter la victime ?',
    help: 'Une seule fois par partie : la victime ne meurt pas et devient Loup-Garou (elle garde sa carte et se réveillera avec les loups).' });

  if (roleAlive('grand_mechant_loup') && !S.flags.wolfDied) add({ key: 'gml', roleId: 'grand_mechant_loup', ui: 'pick', optional: true,
    say: 'Grand Méchant Loup, réveille-toi seul. Désigne une seconde victime.',
    help: 'Il perd ce pouvoir dès qu’un loup est éliminé.' });

  if (roleAlive('loup_blanc') && n % 2 === 0) add({ key: 'loup_blanc', roleId: 'loup_blanc', ui: 'pick', optional: true, onlyWolves: true,
    say: 'Loup Blanc, réveille-toi seul. Veux-tu dévorer un Loup-Garou ?',
    help: 'Une nuit sur deux, il peut éliminer un loup.' });

  if (roleAlive('sorciere') && !S.flags.ancienPowersLost) add({ key: 'sorciere', roleId: 'sorciere', ui: 'sorciere',
    say: 'Sorcière, réveille-toi. Voici la victime des loups. Veux-tu utiliser une potion ?',
    help: null });

  if (roleAlive('joueur_flute')) add({ key: 'flute', roleId: 'joueur_flute', ui: 'flute',
    say: 'Joueur de Flûte, réveille-toi. Charme deux nouveaux joueurs.',
    help: 'Touchez ensuite les joueurs charmés : ils se réveillent et se reconnaissent entre charmés.' });

  if (roleAlive('corbeau')) add({ key: 'corbeau', roleId: 'corbeau', ui: 'pick', optional: true,
    say: 'Corbeau, réveille-toi. Désigne le joueur qui aura deux voix de plus contre lui au réveil.',
    help: null });

  add({ key: 'fin', icon: '🌅', title: 'Fin de la nuit', ui: 'fin',
    say: 'Le village se réveille !',
    help: 'Vérifiez le récapitulatif ci-dessous avant d’annoncer les morts.' });

  S.night = { steps, idx: 0, actions: {}, temp: [] };
}

// ————————————————————————— Résolution de la nuit —————————————————————————
function resolveNight() {
  const A = S.night.actions;
  S.announce = { deaths: [], queue: [] };

  if (A.salvateur != null) S.flags.lastProtected = A.salvateur; else S.flags.lastProtected = null;
  if (roleAlive('comedien')) S.flags.comedienNights = (S.flags.comedienNights || 0) + 1;

  // Charmés
  (A.flute || []).forEach(id => { const p = byId(id); if (p) p.charmed = true; });
  if ((A.flute || []).length) addLog(`🪈 Charmés cette nuit : ${(A.flute).map(id => byId(id)?.name).join(', ')}`);

  S.flags.corbeauTarget = A.corbeau ?? null;
  if (A.corbeau != null) addLog(`🐦‍⬛ Le Corbeau vise ${byId(A.corbeau)?.name} (+2 voix au prochain vote)`);

  // Victimes des loups
  const victims = [];
  if (A.loups != null) victims.push({ id: A.loups, cause: 'loups' });
  if (A.gml != null && A.gml !== A.loups) victims.push({ id: A.gml, cause: 'gml' });

  for (const v of victims) {
    const p = byId(v.id); if (!p || !p.alive) continue;
    if (A.infectTarget === v.id) {
      p.camp = 'loups'; p.infected = true;
      addLog(`🧟 ${p.name} a été infecté(e) : il/elle rejoint les Loups-Garous (secret).`);
      S.announce.queue.push({ type: 'info', text: `🧟 ${p.name} a été infecté(e) par l'Infect Père des Loups : PAS de mort à annoncer pour lui/elle. Il/elle se réveillera désormais avec les loups.` });
      continue;
    }
    if (A.salvateur === v.id) {
      addLog(`🛡️ ${p.name} attaqué(e) mais protégé(e) par le Salvateur.`);
      S.announce.queue.push({ type: 'info', text: `🛡️ ${p.name} a été protégé(e) par le Salvateur : aucune mort à annoncer pour cette attaque.` });
      continue;
    }
    if (A.sorciereSave === v.id) {
      addLog(`🧪 ${p.name} sauvé(e) par la potion de vie de la Sorcière.`);
      S.announce.queue.push({ type: 'info', text: `🧪 ${p.name} a été sauvé(e) par la Sorcière : aucune mort à annoncer pour cette attaque.` });
      continue;
    }
    if (p.roleId === 'ancien' && !S.flags.ancienExtraUsed) {
      S.flags.ancienExtraUsed = true;
      addLog(`👴 L'Ancien (${p.name}) a résisté à l'attaque des loups.`);
      S.announce.queue.push({ type: 'info', text: `👴 L'Ancien (${p.name}) a survécu à sa première attaque : n'annoncez AUCUNE mort pour cette attaque. Ne le révélez pas !` });
      continue;
    }
    killPlayer(v.id, v.cause);
  }

  if (A.loup_blanc != null) killPlayer(A.loup_blanc, 'loup_blanc');
  if (A.sorciereKill != null) killPlayer(A.sorciereKill, 'sorciere');

  // Épée rouillée du Chevalier (contamination la nuit suivante)
  if (S.flags.chevalierRustId != null) {
    const rp = byId(S.flags.chevalierRustId);
    if (rp && rp.alive) killPlayer(rp.id, 'rouille');
    S.flags.chevalierRustId = null;
  }

  S.phase = 'morning';
  checkVictory();
}

// ————————————————————————— Morts & cascades —————————————————————————
function killPlayer(id, cause) {
  const p = byId(id);
  if (!p || !p.alive) return;
  p.alive = false;
  const role = roleById[p.roleId];
  addLog(`💀 ${p.name} (${role.icon} ${role.name}) ${CAUSE_LABEL[cause] || cause}`);
  S.announce.deaths.push({ id, cause });
  if (isWolfSide(p)) S.flags.wolfDied = true;

  // Ange : gagne s'il meurt au tout premier tour
  if (p.roleId === 'ange' && !S.winner) {
    const firstNight = S.phase === 'night' && S.nightNumber === 1 && (cause === 'loups' || cause === 'gml');
    const firstVote = cause === 'vote' && S.dayCount === 1;
    if (firstNight || firstVote) S.winner = 'ange';
  }

  const Q = S.announce.queue;
  if (p.capitaine) {
    p.capitaine = false;
    Q.push({ type: 'capitaine', playerId: id, text: `👑 ${p.name} était Capitaine : il désigne son successeur avant de partir.` });
  }
  if (p.lover) {
    const partner = S.players.find(x => x.lover && x.id !== id && x.alive);
    if (partner) {
      Q.push({ type: 'info', text: `💔 ${partner.name} était en couple avec ${p.name} : il/elle meurt de chagrin !` });
      killPlayer(partner.id, 'chagrin');
    }
  }
  if (p.roleId === 'chasseur') {
    if (S.flags.ancienPowersLost) Q.push({ type: 'info', text: `🏹 ${p.name} était Chasseur, mais les pouvoirs des villageois sont perdus (mort de l'Ancien) : pas de tir.` });
    else Q.push({ type: 'chasseur', playerId: id, text: `🏹 ${p.name} était Chasseur : il tire une dernière balle ! Qui abat-il ?` });
  }
  if (p.roleId === 'chevalier' && (cause === 'loups' || cause === 'gml')) {
    Q.push({ type: 'chevalier', playerId: id, text: `⚔️ ${p.name} était le Chevalier à l'Épée Rouillée : le premier Loup-Garou à sa gauche est contaminé et mourra la nuit prochaine. Choisissez ce loup (ne rien annoncer au village).` });
  }
  if (p.roleId === 'ancien' && ['vote', 'sorciere', 'chasseur'].includes(cause) && !S.flags.ancienPowersLost) {
    S.flags.ancienPowersLost = true;
    Q.push({ type: 'info', text: `⚠️ L'Ancien a été tué par le village : TOUS les villageois perdent leurs pouvoirs pour le reste de la partie !` });
  }
  if (S.flags.modelId === id) {
    const enfant = S.players.find(x => x.roleId === 'enfant_sauvage' && x.alive && campOf(x) !== 'loups');
    if (enfant) {
      enfant.camp = 'loups';
      Q.push({ type: 'info', text: `🐒 Le modèle de l'Enfant Sauvage est mort : ${enfant.name} devient Loup-Garou (ne rien annoncer). Appelez-le désormais avec les loups.` });
      addLog(`🐒 ${enfant.name} (Enfant Sauvage) rejoint les Loups-Garous.`);
    }
  }
}

// ————————————————————————— Victoire —————————————————————————
function checkVictory() {
  if (S.winner) return;
  const alive = alivePlayers();
  if (!alive.length) { S.winner = 'personne'; return; }
  const wolves = alive.filter(isWolfSide);
  const flute = alive.find(p => p.roleId === 'joueur_flute');

  const lovers = S.players.filter(p => p.lover);
  if (lovers.length === 2 && alive.length === 2 && alive.every(p => p.lover)) { S.winner = 'amoureux'; return; }
  if (alive.length === 1 && alive[0].roleId === 'loup_blanc') { S.winner = 'loup_blanc'; return; }
  if (flute && alive.filter(p => p.id !== flute.id).every(p => p.charmed)) { S.winner = 'flute'; return; }
  const soloAlive = alive.some(p => roleById[p.roleId].camp === 'solo' && p.roleId !== 'ange');
  if (!wolves.length && !soloAlive) { S.winner = 'village'; return; }
  if (wolves.length && alive.every(isWolfSide)) { S.winner = 'loups'; return; }
}

const WINNER_INFO = {
  village: { icon: '🏆', title: 'Victoire du Village !', text: 'Tous les Loups-Garous ont été éliminés.' },
  loups: { icon: '🐺', title: 'Victoire des Loups-Garous !', text: 'Les loups ont dévoré tout le village.' },
  amoureux: { icon: '💘', title: 'Victoire des Amoureux !', text: 'Seuls les deux amoureux ont survécu.' },
  flute: { icon: '🪈', title: 'Victoire du Joueur de Flûte !', text: 'Tous les survivants sont charmés.' },
  loup_blanc: { icon: '🌕', title: 'Victoire du Loup Blanc !', text: 'Il est le dernier survivant.' },
  ange: { icon: '👼', title: 'Victoire de l’Ange !', text: 'Il a été éliminé dès le premier tour.' },
  personne: { icon: '💀', title: 'Personne ne survit…', text: 'Le village est entièrement décimé.' },
};

// ————————————————————————— Actions (dispatch) —————————————————————————
const actions = {
  // ——— Navigation générale ———
  newGame() {
    const keep = S.settings;
    S = defaultState(); S.settings = keep; S.screen = 'players'; update();
  },
  resumeGame() { S.screen = 'game'; update(); },
  goHome() { S.screen = 'home'; update(); },
  resetAll() { askConfirm('Abandonner la partie en cours et tout effacer ?', 'doResetAll'); },
  doResetAll() { const keep = S.settings; S = defaultState(); S.settings = keep; update(); },
  confirmYes() { const c = confirmBox; confirmBox = null; if (c && actions[c.action]) actions[c.action](c.arg); else render(); },
  confirmNo() { confirmBox = null; render(); },
  setTab(tab) { S.tab = tab; update(); },

  // ——— Joueurs ———
  addPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = (input?.value || '').trim();
    if (!name) return;
    S.players.push({ id: Date.now() + Math.floor(Math.random() * 1000), name, roleId: null, alive: true });
    input.value = '';
    update();
    document.getElementById('newPlayerName')?.focus();
  },
  removePlayer(id) { S.players = S.players.filter(p => p.id !== +id); update(); },
  movePlayer(arg) {
    const [id, dir] = arg.split(':');
    const i = S.players.findIndex(p => p.id === +id);
    const j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= S.players.length) return;
    [S.players[i], S.players[j]] = [S.players[j], S.players[i]];
    update();
  },
  toRoles() {
    if (S.players.length < 4) { toast('Il faut au moins 4 joueurs.'); return; }
    if (!Object.keys(S.roleCounts).length) S.roleCounts = suggestComposition(S.players.length);
    S.screen = 'roles'; update();
  },

  // ——— Rôles ———
  roleInc(id) {
    const r = roleById[id];
    const cur = S.roleCounts[id] || 0;
    if (cur >= r.max) return;
    S.roleCounts[id] = r.pair ? r.pair : cur + 1;
    update();
  },
  roleDec(id) {
    const r = roleById[id];
    const cur = S.roleCounts[id] || 0;
    if (!cur) return;
    const next = r.pair ? 0 : cur - 1;
    if (next) S.roleCounts[id] = next; else delete S.roleCounts[id];
    update();
  },
  roleSuggest() { S.roleCounts = suggestComposition(S.players.length); update(); },
  roleClear() { S.roleCounts = {}; update(); },
  backToPlayers() { S.screen = 'players'; update(); },
  toDeal() {
    const total = Object.values(S.roleCounts).reduce((a, b) => a + b, 0);
    if (total !== S.players.length) { toast(`Il faut exactement ${S.players.length} cartes (actuellement ${total}).`); return; }
    dealCards();
    S.screen = 'deal'; S.dealMode = null; S.dealDone = []; S.dealShow = null; S.dealRevealed = false;
    update();
  },

  // ——— Distribution ———
  setDealMode(m) { S.dealMode = m; update(); },
  redeal() { dealCards(); S.dealDone = []; S.dealShow = null; S.dealRevealed = false; update(); },
  dealShowPlayer(id) { S.dealShow = +id; S.dealRevealed = false; update(); },
  dealReveal() { S.dealRevealed = true; update(); },
  dealHide() {
    if (S.dealShow != null && !S.dealDone.includes(S.dealShow)) S.dealDone.push(S.dealShow);
    S.dealShow = null; S.dealRevealed = false; update();
  },
  dealSetRole(arg) {
    const [pid, roleId] = arg.split(':');
    const p = byId(+pid); if (p) p.roleId = roleId;
    update();
  },
  backToRoles() { S.screen = 'roles'; update(); },
  startGame() {
    if (S.players.some(p => !p.roleId)) { toast('Tous les joueurs doivent avoir une carte.'); return; }
    // Groupes du Sectaire : info au lancement
    S.players.forEach(p => { p.alive = true; });
    S.phase = 'night'; S.nightNumber = 1; S.dayCount = 0;
    S.flags = {}; S.log = []; S.winner = null; S.winnerDismissed = false;
    addLog(`🎲 Début de partie : ${S.players.length} joueurs — ${Object.entries(S.roleCounts).map(([id, n]) => `${roleById[id].name}${n > 1 ? ' ×' + n : ''}`).join(', ')}`);
    buildNight();
    S.screen = 'game'; S.tab = 'flow';
    update();
  },

  // ——— Étapes de nuit ———
  nightPick(arg) {
    const step = curStep(); if (!step) return;
    const id = +arg;
    if (step.ui === 'pickMulti' || step.ui === 'flute') {
      const need = step.ui === 'flute' ? 2 : step.need;
      const i = S.night.temp.indexOf(id);
      if (i >= 0) S.night.temp.splice(i, 1);
      else if (S.night.temp.length < need) S.night.temp.push(id);
    } else {
      S.night.actions[step.key] = (S.night.actions[step.key] === id) ? null : id;
    }
    update();
  },
  nightSkip() {
    const step = curStep(); if (!step) return;
    S.night.actions[step.key] = null;
    if (step.ui === 'pickMulti' || step.ui === 'flute') S.night.temp = [];
    actions.nightNext();
  },
  nightNext() {
    const step = curStep(); if (!step) return;
    // Validation / effets de l'étape courante
    if (step.ui === 'pickMulti' && step.key === 'cupidon') {
      if (S.night.temp.length !== 2) { toast('Sélectionnez 2 amoureux (ou passez l’étape).'); return; }
      S.night.temp.forEach(id => { const p = byId(id); if (p) p.lover = true; });
      addLog(`💘 Amoureux : ${S.night.temp.map(id => byId(id)?.name).join(' ❤️ ')}`);
      S.night.temp = [];
    }
    if (step.ui === 'flute') {
      S.night.actions.flute = [...S.night.temp];
      S.night.temp = [];
    }
    if (step.key === 'enfant_sauvage' && S.night.actions.enfant_sauvage != null) {
      S.flags.modelId = S.night.actions.enfant_sauvage;
      addLog(`🐒 Modèle de l'Enfant Sauvage : ${byId(S.flags.modelId)?.name}`);
    }
    if (step.key === 'salvateur' && S.night.actions.salvateur != null) {
      addLog(`🛡️ Protégé cette nuit : ${byId(S.night.actions.salvateur)?.name}`);
    }
    if (step.key === 'loups' && S.night.actions.loups != null) {
      addLog(`🐺 Victime des loups : ${byId(S.night.actions.loups)?.name}`);
    }
    if (S.night.idx < S.night.steps.length - 1) { S.night.idx++; update(); }
  },
  nightPrev() { if (S.night.idx > 0) { S.night.idx--; update(); } },
  voleurSwap(roleId) {
    const p = playerWithRole('voleur'); if (!p) return;
    p.roleId = roleId;
    addLog(`🃏 Le Voleur devient ${roleById[roleId].icon} ${roleById[roleId].name}`);
    // Reconstruit la nuit : son nouveau rôle peut devoir être appelé plus loin
    buildNight();
    const vi = S.night.steps.findIndex(s => s.key === 'voleur');
    S.night.idx = vi >= 0 ? vi + 1 : 1; // reprend juste après l'étape du Voleur
    update();
  },
  chienLoupChoice(choice) {
    const p = playerWithRole('chien_loup'); if (!p) return;
    if (choice === 'loups') { p.camp = 'loups'; addLog(`🐕 Le Chien-Loup (${p.name}) rejoint les Loups-Garous.`); }
    else { addLog('🐕 Le Chien-Loup reste dans le camp du Village.'); }
    S.night.actions.chien_loup = choice;
    actions.nightNext();
  },
  renardAnswer(arg) {
    const step = curStep(); if (!step) return;
    if (arg === 'lost') S.flags.renardLost = true;
    actions.nightNext();
  },
  infectChoice(arg) {
    if (arg === 'yes') {
      const victim = S.night.actions.loups;
      if (victim == null) { toast('Aucune victime des loups à infecter.'); return; }
      S.flags.infectUsed = true;
      S.night.actions.infectTarget = victim;
      addLog(`🧟 L'Infect Père des Loups infecte ${byId(victim)?.name}`);
    }
    actions.nightNext();
  },
  sorciereSave(arg) {
    S.night.actions.sorciereSave = S.night.actions.sorciereSave === +arg ? null : +arg;
    if (S.night.actions.sorciereSave != null) S.flags.sorciereVieUsed = true; else S.flags.sorciereVieUsed = false;
    update();
  },
  sorciereKillPick(arg) {
    S.night.actions.sorciereKill = S.night.actions.sorciereKill === +arg ? null : +arg;
    S.flags.sorciereMortUsed = S.night.actions.sorciereKill != null;
    update();
  },
  finishNight() { resolveNight(); update(); },

  // ——— Matin (annonces & cascades) ———
  promptPick(arg) {
    // Résout l'invite courante (capitaine / chasseur / chevalier) avec le joueur choisi
    const q = S.announce.queue[0]; if (!q) return;
    const id = +arg;
    if (q.type === 'capitaine') {
      const p = byId(id); if (p) { p.capitaine = true; addLog(`👑 Nouveau Capitaine : ${p.name}`); }
      S.announce.queue.shift();
    } else if (q.type === 'chasseur') {
      S.announce.queue.shift();
      killPlayer(id, 'chasseur');
    } else if (q.type === 'chevalier') {
      S.flags.chevalierRustId = id;
      addLog(`⚔️ ${byId(id)?.name} est contaminé par l'épée rouillée (mourra la nuit prochaine).`);
      S.announce.queue.shift();
    }
    checkVictory();
    update();
  },
  promptDismiss() { S.announce.queue.shift(); checkVictory(); update(); },
  promptSkip() { S.announce.queue.shift(); checkVictory(); update(); },
  toDay() {
    S.dayCount++;
    S.phase = 'day';
    S.day = { stage: (S.dayCount === 1 && !S.players.some(p => p.capitaine)) ? 'capitaine' : 'debat', voteRound: 1, pendingElimId: null };
    timerReset('debat', S.settings.debateSec);
    timerReset('vote', S.settings.voteSec);
    S.announce = { deaths: [], queue: [] };
    update();
  },

  // ——— Jour ———
  electCaptain(arg) {
    const p = byId(+arg); if (!p) return;
    S.players.forEach(x => x.capitaine = false);
    p.capitaine = true;
    addLog(`👑 ${p.name} est élu(e) Capitaine (sa voix compte double).`);
    S.day.stage = 'debat';
    update();
  },
  skipCaptain() { addLog('👑 Pas de Capitaine élu.'); S.day.stage = 'debat'; update(); },
  toVote() { S.day.stage = 'vote'; timerReset('vote', S.settings.voteSec); update(); },
  backToDebate() { S.day.stage = 'debat'; update(); },
  voteResult(arg) {
    S.announce = { deaths: [], queue: [] };
    if (arg === 'tie') {
      const bouc = playerWithRole('bouc');
      if (bouc) {
        S.announce.queue.push({ type: 'info', text: `🐐 Égalité ! C'est le Bouc Émissaire (${bouc.name}) qui est éliminé. Avant de partir, il désigne qui aura le droit de voter demain.` });
        finalizeVoteKill(bouc.id);
      } else if (S.players.some(p => p.capitaine && p.alive)) {
        S.day.stage = 'captainDecides';
      } else {
        addLog('🤝 Égalité au vote : personne n’est éliminé.');
        S.day.stage = 'result';
      }
      update();
      return;
    }
    if (arg === 'none') {
      addLog('🕊️ Le village n’élimine personne.');
      S.day.stage = 'result';
      update();
      return;
    }
    const id = +arg;
    const p = byId(id); if (!p) return;
    // Idiot du Village : gracié
    if (p.roleId === 'idiot' && !S.flags.idiotRevealed && !S.flags.ancienPowersLost) {
      S.flags.idiotRevealed = true; p.noVote = true;
      addLog(`🤡 ${p.name} était l'Idiot du Village : il est gracié mais perd son droit de vote.`);
      S.announce.queue.push({ type: 'info', text: `🤡 ${p.name} est l'Idiot du Village ! Le village le gracie : il reste en vie mais ne pourra plus voter.` });
      S.day.stage = 'result';
      update();
      return;
    }
    // Servante Dévouée : avant de révéler la carte
    const servante = playerWithRole('servante');
    if (servante && servante.id !== id) {
      S.day.pendingElimId = id;
      S.day.stage = 'servante';
      update();
      return;
    }
    finalizeVoteKill(id);
    S.day.stage = 'result';
    update();
  },
  captainDecide(arg) {
    S.announce = { deaths: [], queue: [] };
    finalizeVoteKill(+arg);
    S.day.stage = 'result';
    update();
  },
  captainNoDecide() { addLog('🤝 Le Capitaine ne tranche pas : personne n’est éliminé.'); S.day.stage = 'result'; update(); },
  servanteChoice(arg) {
    const id = S.day.pendingElimId;
    S.day.pendingElimId = null;
    S.announce = { deaths: [], queue: [] };
    if (arg === 'yes') {
      const servante = playerWithRole('servante');
      const dead = byId(id);
      if (servante && dead) {
        const newRole = dead.roleId;
        dead.roleId = 'servante';
        servante.roleId = newRole;
        addLog(`🫖 La Servante Dévouée (${servante.name}) prend la carte de ${dead.name} : elle devient ${roleById[newRole].icon} ${roleById[newRole].name} (pouvoirs réinitialisés).`);
        S.announce.queue.push({ type: 'info', text: `🫖 ${servante.name} se dévoile comme Servante Dévouée : elle prend la carte de ${dead.name} sans la montrer. Elle est désormais ${roleById[newRole].name} (ne pas l'annoncer). Ses pouvoirs repartent de zéro.` });
        // Réinitialise les pouvoirs liés au rôle récupéré
        if (newRole === 'sorciere') { S.flags.sorciereVieUsed = false; S.flags.sorciereMortUsed = false; }
        if (newRole === 'ancien') S.flags.ancienExtraUsed = false;
        if (newRole === 'infect_pere') S.flags.infectUsed = false;
        if (newRole === 'renard') S.flags.renardLost = false;
        if (newRole === 'juge') S.flags.jugeUsed = false;
      }
    }
    finalizeVoteKill(id);
    S.day.stage = 'result';
    update();
  },
  jugeSecondVote() {
    S.flags.jugeUsed = true;
    addLog('⚖️ Le Juge Bègue déclenche un second vote immédiat (sans débat) !');
    S.day.voteRound++;
    S.day.stage = 'vote';
    S.announce = { deaths: [], queue: [] };
    timerReset('vote', S.settings.voteSec);
    update();
  },
  toNight() {
    S.nightNumber++;
    S.phase = 'night';
    S.announce = { deaths: [], queue: [] };
    buildNight();
    update();
  },

  // ——— Victoire ———
  continueAnyway() { S.winnerDismissed = true; update(); },
  endGame() { const keep = S.settings; S = defaultState(); S.settings = keep; update(); },

  // ——— Tableau des joueurs (admin) ———
  adminKill(id) { askConfirm(`Éliminer ${byId(+id)?.name} manuellement ?`, 'doAdminKill', id); },
  doAdminKill(id) {
    S.announce.queue = S.announce.queue || [];
    killPlayer(+id, 'manuel');
    checkVictory();
    update();
  },
  adminRevive(id) {
    const p = byId(+id); if (!p) return;
    p.alive = true;
    addLog(`✨ ${p.name} est ressuscité(e) par le narrateur.`);
    S.winner = null; S.winnerDismissed = false;
    update();
  },
  adminToggleCaptain(id) {
    const p = byId(+id); if (!p) return;
    if (!p.capitaine) S.players.forEach(x => x.capitaine = false);
    p.capitaine = !p.capitaine;
    update();
  },
  adminToggleCharm(id) { const p = byId(+id); if (p) p.charmed = !p.charmed; update(); },
  adminToggleLover(id) { const p = byId(+id); if (p) p.lover = !p.lover; update(); },

  // ——— Réglages / minuteurs ———
  openSettings() { S.showSettings = true; update(); },
  closeSettings() {
    const d = +document.getElementById('set-debate')?.value;
    const v = +document.getElementById('set-vote')?.value;
    if (d > 0) S.settings.debateSec = Math.round(d * 60);
    if (v > 0) S.settings.voteSec = v;
    S.showSettings = false; update();
  },
  timerToggle(key) { timerToggle(key); },
  timerAdd(key) { timerAdd(key, 30); },
  timerReset(key) { timerReset(key, key === 'debat' ? S.settings.debateSec : S.settings.voteSec); },
};

function finalizeVoteKill(id) {
  killPlayer(id, 'vote');
  checkVictory();
}

function dealCards() {
  const deck = [];
  Object.entries(S.roleCounts).forEach(([id, n]) => { for (let i = 0; i < n; i++) deck.push(id); });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  S.players.forEach((p, i) => { p.roleId = deck[i]; });
}

function curStep() { return S.night?.steps[S.night.idx]; }

// ————————————————————————— Rendu —————————————————————————
function render() {
  let html = '';
  switch (S.screen) {
    case 'home': html = renderHome(); break;
    case 'players': html = renderPlayersSetup(); break;
    case 'roles': html = renderRolesSetup(); break;
    case 'deal': html = renderDeal(); break;
    case 'game': html = renderGame(); break;
  }
  if (S.showSettings) html += renderSettings();
  if (confirmBox) html += `
    <div class="modal-backdrop">
      <div class="modal center">
        <p style="font-size:1.05rem">${esc(confirmBox.text)}</p>
        <div class="grid2" style="margin-top:14px">
          <button class="btn-big" data-action="confirmNo" style="margin-top:0">Annuler</button>
          <button class="btn-big btn-danger" data-action="confirmYes" style="margin-top:0">Confirmer</button>
        </div>
      </div>
    </div>`;
  if (toastMsg) html += `<div class="toast" id="toast">${esc(toastMsg)}</div>`;
  $app.innerHTML = html;
  bindActions();
}

function bindActions() {
  $app.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const fn = actions[el.dataset.action];
      if (fn) fn(el.dataset.arg);
    });
  });
  const input = document.getElementById('newPlayerName');
  if (input) input.addEventListener('keydown', e => { if (e.key === 'Enter') actions.addPlayer(); });
}

// ——— Accueil ———
function renderHome() {
  const hasGame = S.players.length > 0 && S.players.some(p => p.roleId);
  return `
    <div class="center" style="padding-top:8vh">
      <div style="font-size:5rem">🐺</div>
      <h1>Loup-Garou</h1>
      <p class="muted">Assistant du narrateur — Thiercelieux, édition complète</p>
      <div class="spacer"></div>
      ${hasGame ? `<button class="btn-primary btn-big" data-action="resumeGame">▶️ Reprendre la partie</button>` : ''}
      <button class="btn-big ${hasGame ? '' : 'btn-primary'}" data-action="newGame">🌙 Nouvelle partie</button>
      <div class="spacer"></div>
      <p class="muted small">L'app guide le narrateur : ordre d'appel de la nuit,<br>morts automatiques, minuteurs de débat et de vote.</p>
    </div>`;
}

// ——— Joueurs (setup) ———
function renderPlayersSetup() {
  return `
    <div class="topbar">
      <button class="btn-sm btn-ghost" data-action="goHome">← Accueil</button>
      <span class="badge">Étape 1/3 — Joueurs</span>
    </div>
    <h2>👥 Les joueurs (${S.players.length})</h2>
    <p class="muted small">Ajoutez les joueurs <b>dans l'ordre où ils sont assis</b> autour de la table (important pour le Renard, le Montreur d'Ours et le Chevalier).</p>
    <div class="row" style="margin:12px 0">
      <input type="text" id="newPlayerName" placeholder="Prénom du joueur…" autocomplete="off">
      <button class="btn-primary" data-action="addPlayer">＋</button>
    </div>
    ${S.players.map((p, i) => `
      <div class="player-row">
        <span class="num">${i + 1}.</span>
        <span class="name">${esc(p.name)}</span>
        <button class="btn-sm btn-ghost" data-action="movePlayer" data-arg="${p.id}:up" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn-sm btn-ghost" data-action="movePlayer" data-arg="${p.id}:down" ${i === S.players.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn-sm btn-ghost" data-action="removePlayer" data-arg="${p.id}">✕</button>
      </div>`).join('')}
    ${S.players.length ? `<button class="btn-primary btn-big" data-action="toRoles">Choisir les personnages →</button>` : ''}
  `;
}

// ——— Rôles (setup) ———
function renderRolesSetup() {
  const total = Object.values(S.roleCounts).reduce((a, b) => a + b, 0);
  const n = S.players.length;
  const ok = total === n;
  const groups = [
    ['🐺 Loups-Garous', ROLES.filter(r => r.camp === 'loups')],
    ['🏡 Village', ROLES.filter(r => r.camp === 'village')],
    ['🎭 Solitaires', ROLES.filter(r => r.camp === 'solo')],
  ];
  return `
    <div class="topbar">
      <button class="btn-sm btn-ghost" data-action="backToPlayers">← Joueurs</button>
      <span class="badge">Étape 2/3 — Personnages</span>
    </div>
    <div class="counter-bar">
      <span>Cartes : <span class="${ok ? 'ok' : 'ko'}">${total} / ${n}</span></span>
      <span class="row">
        <button class="btn-sm" data-action="roleSuggest">✨ Suggestion</button>
        <button class="btn-sm btn-ghost" data-action="roleClear">Vider</button>
      </span>
    </div>
    ${groups.map(([title, roles]) => `
      <h3 style="margin-top:14px">${title}</h3>
      ${roles.map(r => {
        const c = S.roleCounts[r.id] || 0;
        return `
        <div class="role-card ${c ? 'selected' : ''}">
          <span class="icon">${r.icon}</span>
          <div class="info">
            <div class="rname">${r.name}${r.pair ? ` <span class="muted small">(×${r.pair})</span>` : ''}</div>
            <div class="rshort">${r.short}</div>
          </div>
          <button class="btn-round btn-ghost" data-action="roleDec" data-arg="${r.id}" ${c ? '' : 'disabled'}>−</button>
          <span class="count">${c}</span>
          <button class="btn-round" data-action="roleInc" data-arg="${r.id}" ${c >= r.max ? 'disabled' : ''}>＋</button>
        </div>`;
      }).join('')}
    `).join('')}
    <button class="btn-primary btn-big" data-action="toDeal" ${ok ? '' : 'disabled'}>Distribuer les cartes →</button>
    <div class="spacer"></div>
  `;
}

// ——— Distribution ———
function renderDeal() {
  let body = '';
  if (!S.dealMode) {
    body = `
      <p>Les cartes ont été mélangées et distribuées au hasard. Comment les révéler aux joueurs ?</p>
      <button class="btn-big btn-primary" data-action="setDealMode" data-arg="phone">📱 Faire passer le téléphone<br><span class="small" style="font-weight:400">Chaque joueur regarde sa carte en secret</span></button>
      <button class="btn-big" data-action="setDealMode" data-arg="list">📋 J'ai des cartes physiques<br><span class="small" style="font-weight:400">Je saisis qui a quelle carte</span></button>
      <button class="btn-big btn-ghost" data-action="redeal">🔀 Re-mélanger</button>`;
  } else if (S.dealMode === 'phone') {
    if (S.dealShow != null) {
      const p = byId(S.dealShow);
      const r = roleById[p.roleId];
      body = S.dealRevealed ? `
        <div class="big-card">
          <div class="icon">${r.icon}</div>
          <div class="rname">${r.name}</div>
          <p class="muted">${r.desc}</p>
          ${p.roleId === 'abominable_sectaire' ? '<p class="small">🕯️ Le narrateur annoncera les 2 groupes au début de la partie.</p>' : ''}
        </div>
        <button class="btn-big btn-primary" data-action="dealHide">✅ J'ai vu ma carte, la cacher</button>` : `
        <div class="center" style="padding-top:8vh">
          <div style="font-size:4rem">🤫</div>
          <h2>Passe le téléphone à<br><span style="color:var(--accent)">${esc(p.name)}</span></h2>
          <p class="muted">Personne d'autre ne doit regarder l'écran.</p>
          <button class="btn-big btn-primary" data-action="dealReveal">👁️ Voir ma carte</button>
          <button class="btn-big btn-ghost" data-action="dealHide">Annuler</button>
        </div>`;
      return `<div class="topbar"><span class="badge">Distribution</span></div>${body}`;
    }
    const allDone = S.players.every(p => S.dealDone.includes(p.id));
    body = `
      <p class="muted small">Chaque joueur touche son nom, regarde sa carte en secret, puis rend le téléphone.</p>
      ${S.players.map(p => `
        <button class="deal-name-btn ${S.dealDone.includes(p.id) ? 'deal-done' : ''}" data-action="dealShowPlayer" data-arg="${p.id}">
          <span>${esc(p.name)}</span><span>${S.dealDone.includes(p.id) ? '✅' : '🂠'}</span>
        </button>`).join('')}
      <button class="btn-big btn-ghost" data-action="redeal">🔀 Re-mélanger (tout recommencer)</button>
      <button class="btn-big ${allDone ? 'btn-primary' : ''}" data-action="startGame">🌙 Commencer la partie</button>`;
  } else {
    // Mode liste : le narrateur voit / ajuste
    const opts = Object.keys(S.roleCounts);
    body = `
      <p class="muted small">Distribuez vos cartes physiques puis reportez ici qui a quoi (ou gardez le tirage aléatoire proposé).</p>
      ${S.players.map(p => `
        <div class="player-row">
          <span class="name">${esc(p.name)}</span>
          <select data-pid="${p.id}" class="deal-select" style="max-width:55%">
            ${opts.map(id => `<option value="${id}" ${p.roleId === id ? 'selected' : ''}>${roleById[id].icon} ${roleById[id].name}</option>`).join('')}
          </select>
        </div>`).join('')}
      <p class="muted small">⚠️ Vérifiez que le nombre de chaque carte correspond à votre composition.</p>
      <button class="btn-big btn-ghost" data-action="redeal">🔀 Re-mélanger</button>
      <button class="btn-big btn-primary" data-action="startGame">🌙 Commencer la partie</button>`;
  }
  const extra = `
    ${roleInPlay('voleur') ? `<div class="panel small">🃏 <b>Voleur en jeu</b> : préparez 2 cartes supplémentaires face cachée au centre de la table.</div>` : ''}
    ${roleInPlay('comedien') ? `<div class="panel small">🎭 <b>Comédien en jeu</b> : préparez 3 cartes à pouvoir non distribuées, face visible.</div>` : ''}
    ${roleInPlay('abominable_sectaire') ? `<div class="panel small">🕯️ <b>Abominable Sectaire en jeu</b> : annoncez à voix haute la séparation du village en 2 groupes (ex. : gauche / droite de la table).</div>` : ''}`;
  return `
    <div class="topbar">
      <button class="btn-sm btn-ghost" data-action="backToRoles">← Personnages</button>
      <span class="badge">Étape 3/3 — Distribution</span>
    </div>
    <h2>🂠 Distribution des cartes</h2>
    ${extra}
    ${body}`;
}

// ——— Écran de jeu ———
function renderGame() {
  const phaseBadge = S.phase === 'night'
    ? `<span class="badge badge-night">🌙 Nuit ${S.nightNumber}</span>`
    : S.phase === 'morning'
      ? `<span class="badge badge-day">🌅 Aube</span>`
      : `<span class="badge badge-day">☀️ Jour ${S.dayCount}</span>`;
  let body = '';
  if (S.winner && !S.winnerDismissed) body = renderVictory();
  else if (S.tab === 'players') body = renderBoard();
  else if (S.tab === 'log') body = renderLog();
  else if (S.tab === 'help') body = renderHelp();
  else body = S.phase === 'night' ? renderNight() : S.phase === 'morning' ? renderMorning() : renderDay();

  return `
    <div class="topbar">
      <span class="title">🐺 Narrateur</span>
      <span class="row">
        ${phaseBadge}
        <button class="btn-sm btn-ghost" data-action="openSettings">⚙️</button>
        <button class="btn-sm btn-ghost" data-action="resetAll">✖</button>
      </span>
    </div>
    ${body}
    <div class="tabs">
      <button class="tab-btn ${S.tab === 'flow' ? 'active' : ''}" data-action="setTab" data-arg="flow"><span class="ticon">🎬</span>Déroulé</button>
      <button class="tab-btn ${S.tab === 'players' ? 'active' : ''}" data-action="setTab" data-arg="players"><span class="ticon">👥</span>Joueurs</button>
      <button class="tab-btn ${S.tab === 'log' ? 'active' : ''}" data-action="setTab" data-arg="log"><span class="ticon">📜</span>Journal</button>
      <button class="tab-btn ${S.tab === 'help' ? 'active' : ''}" data-action="setTab" data-arg="help"><span class="ticon">❓</span>Aide</button>
    </div>`;
}

// ——— Victoire ———
function renderVictory() {
  const w = WINNER_INFO[S.winner];
  return `
    <div class="victory">
      <div class="vicon">${w.icon}</div>
      <h2>${w.title}</h2>
      <p>${w.text}</p>
      <div class="spacer"></div>
      <button class="btn-primary btn-big" data-action="endGame">🎉 Terminer la partie</button>
      <button class="btn-big btn-ghost" data-action="continueAnyway">Continuer quand même</button>
    </div>
    ${renderBoard()}`;
}

// ——— Sélecteur de joueurs (boutons) ———
function pickButtons(step) {
  const selectedSingle = S.night?.actions[step.key];
  const multi = step.ui === 'pickMulti' || step.ui === 'flute';
  let candidates = alivePlayers();
  if (step.onlyWolves) candidates = candidates.filter(p => isWolfSide(p) && p.roleId !== 'loup_blanc');
  if (step.key === 'salvateur' && S.flags.lastProtected != null) candidates = candidates.filter(p => p.id !== S.flags.lastProtected);
  if (step.ui === 'flute') candidates = candidates.filter(p => !p.charmed && p.roleId !== 'joueur_flute');
  return `<div class="pick-list">
    ${candidates.map(p => {
      const picked = multi ? S.night.temp.includes(p.id) : selectedSingle === p.id;
      return `<button class="pick-btn ${picked ? 'picked' : ''}" data-action="nightPick" data-arg="${p.id}">${esc(p.name)}</button>`;
    }).join('')}
  </div>`;
}
function promptPickButtons(actionName, exclude = []) {
  return `<div class="pick-list">
    ${alivePlayers().filter(p => !exclude.includes(p.id)).map(p =>
      `<button class="pick-btn" data-action="${actionName}" data-arg="${p.id}">${esc(p.name)}</button>`).join('')}
  </div>`;
}

// ——— Nuit ———
function renderNight() {
  const step = curStep();
  if (!step) return '<div class="panel">Erreur : aucune étape.</div>';
  const role = step.roleId ? roleById[step.roleId] : null;
  const icon = step.icon || role?.icon || '🌙';
  const title = step.title || role?.name || '';
  const holder = role ? S.players.find(p => p.roleId === step.roleId && p.alive) : null;
  let body = '';

  switch (step.ui) {
    case 'info':
      body = '';
      break;
    case 'pick': {
      const sel = S.night.actions[step.key];
      body = `${pickButtons(step)}
        ${sel != null ? `<p>Choix : <b style="color:var(--accent)">${esc(byId(sel)?.name)}</b></p>` : ''}
        ${step.optional ? `<button class="btn-sm btn-ghost" data-action="nightSkip">Ne désigne personne →</button>` : ''}`;
      break;
    }
    case 'pickMulti':
      body = `${pickButtons(step)}
        <p class="muted small">Sélection : ${S.night.temp.map(id => esc(byId(id)?.name)).join(' + ') || '—'} (${S.night.temp.length}/${step.need})</p>`;
      break;
    case 'flute':
      body = `${pickButtons(step)}
        <p class="muted small">Charmés cette nuit : ${S.night.temp.map(id => esc(byId(id)?.name)).join(' + ') || '—'} (max 2)</p>
        ${alivePlayers().some(p => p.charmed) ? `<p class="small">Déjà charmés : ${alivePlayers().filter(p => p.charmed).map(p => esc(p.name)).join(', ')}</p>` : ''}`;
      break;
    case 'voleur':
      body = `
        <p class="small muted">Si le Voleur échange sa carte, indiquez son nouveau rôle :</p>
        <div class="pick-list">
          ${ROLES.map(r => `<button class="pick-btn" data-action="voleurSwap" data-arg="${r.id}">${r.icon} ${r.name}</button>`).join('')}
        </div>
        <button class="btn-ok btn-big" data-action="nightNext">Il garde sa carte →</button>`;
      break;
    case 'comedien':
      body = `<p class="muted small">Nuit ${(S.flags.comedienNights || 0) + 1}/3 du Comédien. Notez son pouvoir choisi, il s'applique jusqu'à la nuit prochaine.</p>`;
      break;
    case 'chienloup':
      body = `
        <div class="grid2">
          <button class="btn-big" data-action="chienLoupChoice" data-arg="village">🏡 Reste Villageois</button>
          <button class="btn-big btn-danger" data-action="chienLoupChoice" data-arg="loups">🐺 Devient Loup</button>
        </div>`;
      break;
    case 'renard': {
      const sel = S.night.actions[step.key];
      let answer = '';
      if (sel != null) {
        const alive = alivePlayers();
        const i = alive.findIndex(p => p.id === sel);
        const group = [alive[(i - 1 + alive.length) % alive.length], alive[i], alive[(i + 1) % alive.length]];
        const hasWolf = group.some(isWolfSide);
        answer = `
          <div class="panel ${hasWolf ? 'panel-danger' : ''}">
            Groupe flairé : <b>${group.map(p => esc(p.name)).join(', ')}</b><br>
            Réponse à donner (hochement de tête) : <b style="font-size:1.2rem">${hasWolf ? '👍 OUI, un loup s’y trouve' : '👎 NON, aucun loup'}</b>
            ${hasWolf ? '<p class="small muted">Le Renard garde son pouvoir.</p>' : '<p class="small muted">Le Renard perd son pouvoir.</p>'}
          </div>
          <button class="btn-primary btn-big" data-action="renardAnswer" data-arg="${hasWolf ? 'kept' : 'lost'}">C'est fait →</button>`;
      }
      body = `
        <p class="small muted">Le Renard désigne un joueur (le centre du groupe de 3) :</p>
        ${pickButtons(step)}
        ${answer}
        ${sel == null ? `<button class="btn-sm btn-ghost" data-action="nightSkip">Il ne flaire pas cette nuit →</button>` : ''}`;
      break;
    }
    case 'voyante': {
      const sel = S.night.actions[step.key];
      const target = sel != null ? byId(sel) : null;
      body = `${pickButtons(step)}
        ${target ? `<div class="big-card" style="padding:16px">
          <div class="icon" style="font-size:2.5rem">${roleById[target.roleId].icon}</div>
          <div class="rname" style="font-size:1.1rem">${esc(target.name)} est ${roleById[target.roleId].name}</div>
          <p class="muted small">Montrez ce résultat à la Voyante d'un geste ou mimez la carte.</p>
        </div>` : ''}
        <button class="btn-sm btn-ghost" data-action="nightSkip">Elle ne regarde pas →</button>`;
      break;
    }
    case 'infect': {
      const victim = S.night.actions.loups != null ? byId(S.night.actions.loups) : null;
      body = victim ? `
        <p>Victime des loups : <b>${esc(victim.name)}</b></p>
        <div class="grid2">
          <button class="btn-big" data-action="infectChoice" data-arg="no">Non, elle sera dévorée</button>
          <button class="btn-big btn-danger" data-action="infectChoice" data-arg="yes">🧟 Oui, l'infecter !</button>
        </div>` : `<p class="muted">Aucune victime des loups cette nuit.</p>
        <button class="btn-primary btn-big" data-action="nightNext">Continuer →</button>`;
      break;
    }
    case 'sorciere': {
      const A = S.night.actions;
      const victimIds = [A.loups, A.gml].filter(v => v != null && v !== A.infectTarget);
      const victims = [...new Set(victimIds)].map(byId).filter(Boolean);
      const lifeUsed = S.flags.sorciereVieUsed && A.sorciereSave == null;
      const deathUsed = S.flags.sorciereMortUsed && A.sorciereKill == null;
      body = `
        <div class="panel">
          ${victims.length
            ? `Montrez la (les) victime(s) : <b style="color:var(--danger)">${victims.map(p => esc(p.name)).join(' et ')}</b>`
            : 'Aucune victime des loups cette nuit (faites tout de même semblant de montrer quelqu’un ou secouez la tête).'}
        </div>
        <h3>🧪 Potion de vie ${lifeUsed ? '<span class="muted small">(déjà utilisée)</span>' : ''}</h3>
        ${!lifeUsed && victims.length ? `<div class="pick-list">
          ${victims.map(p => `<button class="pick-btn ${A.sorciereSave === p.id ? 'picked' : ''}" data-action="sorciereSave" data-arg="${p.id}">💚 Sauver ${esc(p.name)}</button>`).join('')}
        </div>` : ''}
        <h3>☠️ Potion de mort ${deathUsed ? '<span class="muted small">(déjà utilisée)</span>' : ''}</h3>
        ${!deathUsed ? `<div class="pick-list">
          ${alivePlayers().filter(p => p.roleId !== 'sorciere').map(p =>
            `<button class="pick-btn ${A.sorciereKill === p.id ? 'picked' : ''}" data-action="sorciereKillPick" data-arg="${p.id}">${esc(p.name)}</button>`).join('')}
        </div>` : ''}
        <p class="muted small">${A.sorciereSave != null ? `💚 Sauve ${esc(byId(A.sorciereSave)?.name)}. ` : ''}${A.sorciereKill != null ? `☠️ Empoisonne ${esc(byId(A.sorciereKill)?.name)}.` : ''}</p>`;
      break;
    }
    case 'fin': {
      body = renderNightRecap();
      break;
    }
  }

  const isLast = step.ui === 'fin';
  return `
    <div class="panel panel-accent">
      <div class="step-progress">Étape ${S.night.idx + 1} / ${S.night.steps.length}</div>
      <div class="step-header">
        <span class="icon">${icon}</span>
        <div>
          <h2 style="margin:0">${title}</h2>
          ${holder ? `<span class="muted small">Joueur : ${esc(holder.name)}</span>` : ''}
        </div>
      </div>
      <div class="narrator-say">🗣️ « ${step.say} »</div>
      ${step.help ? `<p class="muted small">💡 ${step.help}</p>` : ''}
      ${body}
      <div class="row" style="margin-top:14px">
        <button class="btn-ghost" data-action="nightPrev" ${S.night.idx === 0 ? 'disabled' : ''}>← Précédent</button>
        <div class="grow"></div>
        ${isLast
          ? `<button class="btn-primary" data-action="finishNight">🌅 Le village se réveille</button>`
          : (['voleur', 'chienloup', 'infect'].includes(step.ui) ? '' : `<button class="btn-primary" data-action="nightNext">Suivant →</button>`)}
      </div>
    </div>
    ${renderNightOrderPreview()}`;
}

function renderNightRecap() {
  const A = S.night.actions;
  const lines = [];
  if (A.loups != null) lines.push(`🐺 Victime des loups : <b>${esc(byId(A.loups)?.name)}</b>`);
  else lines.push('🐺 Les loups n’ont désigné personne.');
  if (A.gml != null) lines.push(`🐗 Victime du Grand Méchant Loup : <b>${esc(byId(A.gml)?.name)}</b>`);
  if (A.infectTarget != null) lines.push(`🧟 Infecté (ne meurt pas) : <b>${esc(byId(A.infectTarget)?.name)}</b>`);
  if (A.salvateur != null) lines.push(`🛡️ Protégé : <b>${esc(byId(A.salvateur)?.name)}</b>`);
  if (A.sorciereSave != null) lines.push(`💚 Sauvé par la Sorcière : <b>${esc(byId(A.sorciereSave)?.name)}</b>`);
  if (A.sorciereKill != null) lines.push(`☠️ Empoisonné : <b>${esc(byId(A.sorciereKill)?.name)}</b>`);
  if (A.loup_blanc != null) lines.push(`🌕 Tué par le Loup Blanc : <b>${esc(byId(A.loup_blanc)?.name)}</b>`);
  if (S.flags.chevalierRustId != null) lines.push(`⚔️ Mort par l'épée rouillée : <b>${esc(byId(S.flags.chevalierRustId)?.name)}</b>`);
  if ((A.flute || []).length) lines.push(`🪈 Charmés : ${A.flute.map(id => esc(byId(id)?.name)).join(', ')}`);
  if (A.corbeau != null) lines.push(`🐦‍⬛ Ciblé par le Corbeau : <b>${esc(byId(A.corbeau)?.name)}</b>`);
  return `<div class="panel">${lines.map(l => `<p>${l}</p>`).join('')}
    <p class="muted small">L'app calculera les morts (protections, potions, Ancien…) à l'étape suivante.</p></div>`;
}

function renderNightOrderPreview() {
  return `
    <details class="panel">
      <summary>📋 Ordre d'appel de cette nuit</summary>
      ${S.night.steps.map((s, i) => {
        const role = s.roleId ? roleById[s.roleId] : null;
        return `<div class="order-item" style="${i === S.night.idx ? 'color:var(--accent);font-weight:700' : ''}">
          <span class="onum">${i + 1}</span>
          <span>${s.icon || role?.icon || ''} ${s.title || role?.name}</span>
          ${i < S.night.idx ? '<span style="margin-left:auto">✅</span>' : ''}
        </div>`;
      }).join('')}
    </details>`;
}

// ——— Aube (annonces) ———
function renderMorning() {
  const q = S.announce.queue[0];
  const deaths = S.announce.deaths;
  let prompt = '';
  if (q) {
    if (q.type === 'info') {
      prompt = `<div class="panel panel-accent"><p>${q.text}</p>
        <button class="btn-primary btn-big" data-action="promptDismiss">Compris →</button></div>`;
    } else if (q.type === 'capitaine') {
      prompt = `<div class="panel panel-accent"><p>${q.text}</p>${promptPickButtons('promptPick')}
        <button class="btn-sm btn-ghost" data-action="promptSkip">Pas de successeur</button></div>`;
    } else if (q.type === 'chasseur') {
      prompt = `<div class="panel panel-danger"><p>${q.text}</p>${promptPickButtons('promptPick')}
        <button class="btn-sm btn-ghost" data-action="promptSkip">Il ne tire pas</button></div>`;
    } else if (q.type === 'chevalier') {
      const wolves = alivePlayers().filter(isWolfSide);
      prompt = `<div class="panel panel-danger"><p>${q.text}</p>
        ${suggestLeftWolf(q.playerId)}
        <div class="pick-list">${wolves.map(p => `<button class="pick-btn" data-action="promptPick" data-arg="${p.id}">${esc(p.name)}</button>`).join('')}</div>
        <button class="btn-sm btn-ghost" data-action="promptSkip">Aucun loup à contaminer</button></div>`;
    }
  }
  const oursNote = renderOursNote();
  return `
    <h2>🌅 L'aube se lève sur Thiercelieux</h2>
    ${deaths.length
      ? deaths.map(d => {
          const p = byId(d.id); const r = roleById[p.roleId];
          return `<div class="death-item"><span style="font-size:1.4rem">💀</span>
            <div><b>${esc(p.name)}</b> — ${CAUSE_LABEL[d.cause]}<br><span class="muted small">Révélez sa carte : ${r.icon} ${r.name}</span></div></div>`;
        }).join('')
      : `<div class="no-death">🌞 Aucune mort cette nuit ! Annoncez la bonne nouvelle.</div>`}
    ${prompt}
    ${!q ? `
      ${oursNote}
      ${S.flags.corbeauTarget != null ? `<div class="panel small">🐦‍⬛ Annoncez : <b>${esc(byId(S.flags.corbeauTarget)?.name)}</b> a été visé(e) par le Corbeau → il/elle commence le vote avec <b>2 voix contre lui/elle</b>.</div>` : ''}
      <button class="btn-primary btn-big" data-action="toDay">☀️ Passer au jour (débat & vote)</button>` : ''}
  `;
}

function suggestLeftWolf(chevalierId) {
  const idx = S.players.findIndex(p => p.id === chevalierId);
  if (idx < 0) return '';
  const n = S.players.length;
  for (let k = 1; k < n; k++) {
    const p = S.players[(idx + k) % n];
    if (p.alive && isWolfSide(p)) return `<p class="small muted">Suggestion (1er loup à sa gauche dans l'ordre de la table) : <b>${esc(p.name)}</b></p>`;
  }
  return '';
}

function renderOursNote() {
  const ours = playerWithRole('montreur_ours');
  if (!ours) return '';
  const alive = alivePlayers();
  const i = alive.findIndex(p => p.id === ours.id);
  const neighbors = [alive[(i - 1 + alive.length) % alive.length], alive[(i + 1) % alive.length]].filter(p => p && p.id !== ours.id);
  const growl = neighbors.some(isWolfSide);
  return `<div class="panel small ${growl ? 'panel-danger' : ''}">🐻 Montreur d'Ours (voisins vivants : ${neighbors.map(p => esc(p.name)).join(', ')}) :
    <b>${growl ? 'GROGNEZ — un loup est à côté de l’ours !' : 'silence, pas de loup adjacent.'}</b></div>`;
}

// ——— Jour ———
function renderDay() {
  const stage = S.day?.stage || 'debat';
  const q = S.announce.queue[0];
  let content = '';

  if (stage === 'capitaine') {
    content = `
      <div class="panel panel-accent">
        <h2>👑 Élection du Capitaine</h2>
        <div class="narrator-say">🗣️ « Le village doit élire son Capitaine. Sa voix comptera double et il tranchera les égalités. Faites vos campagnes, puis votez à main levée ! »</div>
        ${promptPickButtons('electCaptain')}
        <button class="btn-sm btn-ghost" data-action="skipCaptain">Jouer sans Capitaine</button>
      </div>`;
  } else if (stage === 'debat') {
    const capitaine = S.players.find(p => p.capitaine && p.alive);
    content = `
      <div class="panel panel-accent">
        <h2>💬 Débat du village</h2>
        <div class="narrator-say">🗣️ « Le débat est ouvert ! Qui accusez-vous ? »</div>
        ${capitaine ? `<p class="small">👑 Capitaine : <b>${esc(capitaine.name)}</b> (voix double). C'est lui qui distribue la parole.</p>` : ''}
        ${S.flags.corbeauTarget != null && byId(S.flags.corbeauTarget)?.alive ? `<p class="small">🐦‍⬛ Rappel : <b>${esc(byId(S.flags.corbeauTarget)?.name)}</b> part avec 2 voix contre lui/elle.</p>` : ''}
        ${S.players.some(p => p.noVote && p.alive) ? `<p class="small">🤡 Ne vote(nt) pas : ${S.players.filter(p => p.noVote && p.alive).map(p => esc(p.name)).join(', ')}</p>` : ''}
        ${timerHTML('debat', S.settings.debateSec, 'Temps de débat')}
      </div>
      <button class="btn-primary btn-big" data-action="toVote">🗳️ Passer au vote →</button>`;
  } else if (stage === 'vote') {
    content = `
      <div class="panel panel-accent">
        <h2>🗳️ Vote du village ${S.day.voteRound > 1 ? `<span class="badge">2e vote (Juge)</span>` : ''}</h2>
        <div class="narrator-say">🗣️ « À mon signal, désignez tous du doigt le joueur que vous accusez… 3, 2, 1, votez ! »</div>
        ${timerHTML('vote', S.settings.voteSec, 'Temps de vote')}
        <h3 style="margin-top:12px">Résultat : qui est désigné ?</h3>
        ${promptPickButtons('voteResult')}
        <div class="grid2">
          <button data-action="voteResult" data-arg="tie">🤝 Égalité</button>
          <button data-action="voteResult" data-arg="none">🕊️ Personne</button>
        </div>
        <button class="btn-sm btn-ghost" data-action="backToDebate">← Revenir au débat</button>
      </div>`;
  } else if (stage === 'captainDecides') {
    content = `
      <div class="panel panel-accent">
        <h2>👑 Égalité — le Capitaine tranche</h2>
        <p>Le Capitaine départage : qui est éliminé ?</p>
        ${promptPickButtons('captainDecide')}
        <button class="btn-sm btn-ghost" data-action="captainNoDecide">Personne n'est éliminé</button>
      </div>`;
  } else if (stage === 'servante') {
    const dead = byId(S.day.pendingElimId);
    const servante = playerWithRole('servante');
    content = `
      <div class="panel panel-accent">
        <h2>🫖 Servante Dévouée</h2>
        <p><b>${esc(dead?.name)}</b> va être éliminé(e). Avant de révéler sa carte, demandez :</p>
        <div class="narrator-say">🗣️ « Quelqu'un souhaite-t-il se dévoiler ? »</div>
        <p class="small muted">La Servante (${esc(servante?.name)}) peut prendre la carte de l'éliminé et jouer son rôle (sans le révéler).</p>
        <div class="grid2">
          <button class="btn-big" data-action="servanteChoice" data-arg="no">Non, révéler la carte</button>
          <button class="btn-big btn-primary" data-action="servanteChoice" data-arg="yes">🫖 Oui, elle échange</button>
        </div>
      </div>`;
  } else { // result
    let prompt = '';
    if (q) {
      if (q.type === 'info') prompt = `<div class="panel panel-accent"><p>${q.text}</p><button class="btn-primary btn-big" data-action="promptDismiss">Compris →</button></div>`;
      else if (q.type === 'capitaine') prompt = `<div class="panel panel-accent"><p>${q.text}</p>${promptPickButtons('promptPick')}<button class="btn-sm btn-ghost" data-action="promptSkip">Pas de successeur</button></div>`;
      else if (q.type === 'chasseur') prompt = `<div class="panel panel-danger"><p>${q.text}</p>${promptPickButtons('promptPick')}<button class="btn-sm btn-ghost" data-action="promptSkip">Il ne tire pas</button></div>`;
      else if (q.type === 'chevalier') prompt = `<div class="panel panel-danger"><p>${q.text}</p><div class="pick-list">${alivePlayers().filter(isWolfSide).map(p => `<button class="pick-btn" data-action="promptPick" data-arg="${p.id}">${esc(p.name)}</button>`).join('')}</div><button class="btn-sm btn-ghost" data-action="promptSkip">Aucun loup</button></div>`;
    }
    const jugeAvailable = playerWithRole('juge') && !S.flags.jugeUsed && !S.flags.ancienPowersLost;
    content = `
      <h2>📣 Résultat du vote</h2>
      ${S.announce.deaths.length
        ? S.announce.deaths.map(d => {
            const p = byId(d.id); const r = roleById[p.roleId];
            return `<div class="death-item"><span style="font-size:1.4rem">💀</span>
              <div><b>${esc(p.name)}</b> — ${CAUSE_LABEL[d.cause]}<br><span class="muted small">Révélez sa carte : ${r.icon} ${r.name}</span></div></div>`;
          }).join('')
        : `<div class="no-death">Personne n'est éliminé ce tour-ci.</div>`}
      ${prompt}
      ${!q ? `
        ${jugeAvailable ? `<button class="btn-big" data-action="jugeSecondVote">⚖️ Le Juge Bègue demande un 2e vote</button>` : ''}
        <button class="btn-primary btn-big" data-action="toNight">🌙 La nuit tombe (Nuit ${S.nightNumber + 1})</button>` : ''}`;
  }
  return content;
}

// ——— Tableau des joueurs ———
function renderBoard() {
  const alive = alivePlayers().length;
  const wolves = alivePlayers().filter(isWolfSide).length;
  return `
    <div class="row-between" style="margin-bottom:6px">
      <h2>👥 Joueurs</h2>
      <span class="muted small">${alive} vivants · 🐺 ${wolves} loups</span>
    </div>
    ${S.players.map(p => {
      const r = roleById[p.roleId] || { icon: '❔', name: '—', camp: 'village' };
      const camp = campOf(p);
      const st = [
        p.capitaine ? '👑' : '',
        p.lover ? '❤️' : '',
        p.charmed ? '🎶' : '',
        p.infected ? '🧟' : '',
        p.noVote ? '🤐' : '',
        S.flags.modelId === p.id ? '🐒' : '',
        S.flags.chevalierRustId === p.id ? '⚔️' : '',
      ].filter(Boolean).join(' ');
      return `
      <div class="pboard-row ${p.alive ? '' : 'dead'}">
        <span class="picon">${r.icon}</span>
        <div class="pinfo">
          <div class="pname">${esc(p.name)} <span class="status-icons">${st}</span></div>
          <div class="prole">${r.name} · <span class="camp-tag camp-${camp}">${CAMP_LABEL[camp] || camp}</span></div>
        </div>
        ${p.alive
          ? `<button class="btn-sm btn-ghost" data-action="adminToggleCaptain" data-arg="${p.id}">👑</button>
             <button class="btn-sm btn-danger" data-action="adminKill" data-arg="${p.id}">💀</button>`
          : `<button class="btn-sm btn-ghost" data-action="adminRevive" data-arg="${p.id}">✨</button>`}
      </div>`;
    }).join('')}
    <p class="muted small">💀 éliminer manuellement · ✨ ressusciter · 👑 capitaine —
    ❤️ amoureux · 🎶 charmé · 🧟 infecté · 🤐 sans vote · 🐒 modèle de l'Enfant Sauvage</p>
    <div class="panel small">
      <b>Pouvoirs consommés :</b><br>
      🧪 Potion de vie : ${S.flags.sorciereVieUsed ? '❌ utilisée' : '✅ disponible'} ·
      ☠️ Potion de mort : ${S.flags.sorciereMortUsed ? '❌ utilisée' : '✅ disponible'}<br>
      🧟 Infection : ${S.flags.infectUsed ? '❌ utilisée' : roleInPlay('infect_pere') ? '✅ disponible' : '—'} ·
      👴 Résistance de l'Ancien : ${S.flags.ancienExtraUsed ? '❌ utilisée' : roleInPlay('ancien') ? '✅ disponible' : '—'}<br>
      ⚖️ 2e vote du Juge : ${S.flags.jugeUsed ? '❌ utilisé' : roleInPlay('juge') ? '✅ disponible' : '—'} ·
      🦊 Flair du Renard : ${S.flags.renardLost ? '❌ perdu' : roleInPlay('renard') ? '✅ actif' : '—'}
      ${S.flags.ancienPowersLost ? '<br>⚠️ <b>Les villageois ont perdu leurs pouvoirs (mort de l\'Ancien) !</b>' : ''}
    </div>`;
}

// ——— Journal ———
function renderLog() {
  return `
    <h2>📜 Journal de partie</h2>
    ${S.log.length ? [...S.log].reverse().map(l => `<div class="log-item"><span class="when">${l.when}</span>${l.msg}</div>`).join('') : '<p class="muted">Rien pour l’instant.</p>'}`;
}

// ——— Aide ———
function renderHelp() {
  const order = [
    ['🃏 Voleur', 'Nuit 1 uniquement'],
    ['🎭 Comédien', 'Nuits 1 à 3'],
    ['💘 Cupidon puis les Amoureux', 'Nuit 1 uniquement'],
    ['🐒 Enfant Sauvage (choix du modèle)', 'Nuit 1 uniquement'],
    ['🐕 Chien-Loup (choix du camp)', 'Nuit 1 uniquement'],
    ['👨‍👨‍👦 Trois Frères / 👭 Deux Sœurs', 'Nuit 1, puis parfois'],
    ['🛡️ Salvateur', 'Chaque nuit'],
    ['🔮 Voyante', 'Chaque nuit'],
    ['🦊 Renard', 'Tant qu’il a son flair'],
    ['🐺 Loups-Garous (+ 👧 Petite Fille espionne)', 'Chaque nuit'],
    ['🧟 Infect Père des Loups', 'Après les loups, 1 fois'],
    ['🐗 Grand Méchant Loup', 'Tant qu’aucun loup mort'],
    ['🌕 Loup Blanc', 'Une nuit sur deux (nuits paires)'],
    ['🧪 Sorcière', 'Chaque nuit'],
    ['🪈 Joueur de Flûte', 'Chaque nuit'],
    ['🐦‍⬛ Corbeau', 'Chaque nuit'],
  ];
  return `
    <h2>❓ Aide-mémoire du narrateur</h2>
    <details class="panel" open>
      <summary>🌙 Ordre d'appel de la nuit</summary>
      ${order.map((o, i) => `<div class="order-item"><span class="onum">${i + 1}</span><div>${o[0]}<br><span class="muted small">${o[1]}</span></div></div>`).join('')}
    </details>
    <details class="panel">
      <summary>☀️ Déroulé du jour</summary>
      <p>1. 🌅 Annonce des morts (révéler les cartes, gérer Chasseur / amoureux / Capitaine).</p>
      <p>2. 🐻 Grognement du Montreur d'Ours si un loup est voisin.</p>
      <p>3. 👑 Jour 1 : élection du Capitaine (voix double, tranche les égalités).</p>
      <p>4. 💬 Débat (minuteur conseillé : 3-5 min).</p>
      <p>5. 🗳️ Vote simultané au doigt, à votre signal (30-60 s).</p>
      <p>6. ⚖️ Le Juge Bègue peut demander un 2e vote. 🐐 Égalité : le Bouc Émissaire meurt.</p>
      <p>7. 🌙 La nuit retombe.</p>
    </details>
    <details class="panel">
      <summary>🎴 Tous les personnages</summary>
      ${ROLES.map(r => `
        <div class="role-card">
          <span class="icon">${r.icon}</span>
          <div class="info">
            <div class="rname">${r.name} <span class="camp-tag camp-${r.camp}">${CAMP_LABEL[r.camp]}</span> <span class="muted small">· ${r.ext}</span></div>
            <div class="rshort">${r.desc}</div>
          </div>
        </div>`).join('')}
    </details>
    <details class="panel">
      <summary>🏆 Conditions de victoire</summary>
      <p>🏡 <b>Village</b> : tous les loups (et solitaires) éliminés.</p>
      <p>🐺 <b>Loups</b> : plus aucun villageois vivant.</p>
      <p>💘 <b>Amoureux</b> : les 2 amoureux sont les derniers survivants.</p>
      <p>🪈 <b>Joueur de Flûte</b> : tous les survivants sont charmés.</p>
      <p>🌕 <b>Loup Blanc</b> : dernier survivant.</p>
      <p>👼 <b>Ange</b> : éliminé au tout premier tour.</p>
      <p>🕯️ <b>Abominable Sectaire</b> : son groupe est le seul survivant (à vérifier manuellement).</p>
    </details>`;
}

// ——— Réglages ———
function renderSettings() {
  return `
    <div class="modal-backdrop">
      <div class="modal">
        <h2>⚙️ Réglages</h2>
        <p class="small">⏱️ Durée du débat (minutes)</p>
        <input type="number" id="set-debate" min="1" max="30" value="${Math.round(S.settings.debateSec / 60)}">
        <p class="small" style="margin-top:10px">🗳️ Durée du vote (secondes)</p>
        <input type="number" id="set-vote" min="10" max="600" step="10" value="${S.settings.voteSec}">
        <button class="btn-primary btn-big" data-action="closeSettings">Enregistrer</button>
      </div>
    </div>`;
}

// ————————————————————————— Écouteur des <select> de distribution —————————————————————————
document.addEventListener('change', e => {
  if (e.target.classList?.contains('deal-select')) {
    const p = byId(+e.target.dataset.pid);
    if (p) { p.roleId = e.target.value; save(); }
  }
});

// ————————————————————————— Démarrage —————————————————————————
(function init() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      S = Object.assign(defaultState(), parsed);
      S.screen = parsed.screen === 'game' ? 'home' : (parsed.screen || 'home');
      if (parsed.screen === 'game') S.screen = 'home'; // repasse par l'accueil pour proposer la reprise
    }
  } catch (e) { S = defaultState(); }
  render();
})();
