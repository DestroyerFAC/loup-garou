// Données des personnages — Les Loups-Garous de Thiercelieux (édition complète « Le Pacte »)
// camp de base : 'village' | 'loups' | 'solo'
// Chargé comme script classique (pas de module) pour fonctionner en ouvrant index.html directement.

const ROLES = [
  // ——— Loups-Garous ———
  {
    id: 'loup', name: 'Loup-Garou', icon: '🐺', camp: 'loups', max: 6, ext: 'Jeu de base',
    short: 'Dévore un villageois chaque nuit avec ses compères.',
    desc: "Chaque nuit, les Loups-Garous se réveillent ensemble et désignent une victime à dévorer. Le jour, ils se font passer pour des villageois."
  },
  {
    id: 'grand_mechant_loup', name: 'Grand Méchant Loup', icon: '🐗', camp: 'loups', max: 1, ext: 'Personnages',
    short: 'Dévore une 2e victime tant qu’aucun loup n’est mort.',
    desc: "Se réveille avec les loups, puis une seconde fois seul pour dévorer une victime supplémentaire. Il perd ce pouvoir dès qu'un Loup-Garou est éliminé."
  },
  {
    id: 'infect_pere', name: 'Infect Père des Loups', icon: '🧟', camp: 'loups', max: 1, ext: 'Personnages',
    short: 'Peut transformer la victime des loups en loup (1 fois).',
    desc: "Une fois dans la partie, après le vote des loups, il peut infecter la victime : elle ne meurt pas et devient Loup-Garou (elle garde son pouvoir mais joue pour les loups)."
  },
  {
    id: 'loup_blanc', name: 'Loup Blanc', icon: '🌕', camp: 'solo', max: 1, ext: 'Personnages',
    goal: 'Être le DERNIER survivant : il trahit même les loups.',
    short: 'Loup solitaire : doit rester le dernier survivant.',
    desc: "Se réveille avec les loups. Une nuit sur deux, il se réveille ensuite seul et peut dévorer un Loup-Garou. Il gagne s'il est le dernier survivant."
  },

  // ——— Village ———
  {
    id: 'villageois', name: 'Simple Villageois', icon: '🧑‍🌾', camp: 'village', max: 12, ext: 'Jeu de base',
    short: 'Aucun pouvoir, seulement son intuition et son vote.',
    desc: "N'a pour seules armes que son intuition, son éloquence et son vote."
  },
  {
    id: 'villageois_villageois', name: 'Villageois-Villageois', icon: '👥', camp: 'village', max: 1, ext: 'Personnages',
    short: 'Villageois certifié : sa carte a 2 faces villageois.',
    desc: "Sa carte porte un villageois sur les deux faces : tout le monde peut vérifier qu'il est un vrai villageois."
  },
  {
    id: 'voyante', name: 'Voyante', icon: '🔮', camp: 'village', max: 1, ext: 'Jeu de base',
    short: 'Découvre chaque nuit la carte d’un joueur.',
    desc: "Chaque nuit, elle désigne un joueur et le narrateur lui montre sa carte."
  },
  {
    id: 'sorciere', name: 'Sorcière', icon: '🧪', camp: 'village', max: 1, ext: 'Jeu de base',
    short: '1 potion de vie, 1 potion de mort, pour toute la partie.',
    desc: "Elle voit la victime des loups. Elle possède une potion de vie (sauver la victime) et une potion de mort (éliminer un joueur), chacune utilisable une seule fois."
  },
  {
    id: 'chasseur', name: 'Chasseur', icon: '🏹', camp: 'village', max: 1, ext: 'Jeu de base',
    short: 'En mourant, il tue un joueur de son choix.',
    desc: "Lorsqu'il meurt, il tire une dernière balle et élimine immédiatement le joueur de son choix."
  },
  {
    id: 'cupidon', name: 'Cupidon', icon: '💘', camp: 'village', max: 1, ext: 'Jeu de base',
    short: 'Désigne 2 amoureux la première nuit.',
    desc: "La première nuit, il désigne deux amoureux. Si l'un meurt, l'autre meurt de chagrin. Si les amoureux sont de camps opposés, leur but devient d'éliminer tous les autres."
  },
  {
    id: 'petite_fille', name: 'Petite Fille', icon: '👧', camp: 'village', max: 1, ext: 'Jeu de base',
    short: 'Peut espionner les loups pendant la nuit.',
    desc: "Elle peut entrouvrir les yeux pendant le tour des Loups-Garous. Si elle est démasquée, elle risque de prendre la place de la victime."
  },
  {
    id: 'voleur', name: 'Voleur', icon: '🃏', camp: 'village', max: 1, ext: 'Jeu de base',
    short: 'Nuit 1 : peut échanger sa carte avec 1 des 2 cartes du milieu.',
    desc: "Préparez 2 cartes supplémentaires face cachée au centre. La première nuit, le Voleur peut échanger sa carte contre l'une d'elles. Si les 2 cartes sont des Loups-Garous, il doit échanger."
  },
  {
    id: 'salvateur', name: 'Salvateur', icon: '🛡️', camp: 'village', max: 1, ext: 'Nouvelle Lune',
    short: 'Protège un joueur des loups chaque nuit.',
    desc: "Chaque nuit, il protège un joueur (lui-même inclus) de l'attaque des Loups-Garous. Il ne peut pas protéger la même personne deux nuits de suite."
  },
  {
    id: 'ancien', name: 'Ancien', icon: '👴', camp: 'village', max: 1, ext: 'Nouvelle Lune',
    short: 'Survit à la 1re attaque des loups. Gare au village !',
    desc: "Il résiste à la première attaque des Loups-Garous (le narrateur n'annonce aucune mort). Si le village l'élimine (vote, Sorcière ou Chasseur), tous les villageois perdent leurs pouvoirs."
  },
  {
    id: 'idiot', name: 'Idiot du Village', icon: '🤡', camp: 'village', max: 1, ext: 'Nouvelle Lune',
    short: 'S’il est voté, il est gracié mais perd son droit de vote.',
    desc: "Si le village vote contre lui, sa carte est révélée : il reste en vie mais ne peut plus voter. Il peut toujours parler et être dévoré."
  },
  {
    id: 'bouc', name: 'Bouc Émissaire', icon: '🐐', camp: 'village', max: 1, ext: 'Nouvelle Lune',
    short: 'En cas d’égalité au vote, c’est lui qui meurt.',
    desc: "En cas d'égalité lors du vote du village, c'est le Bouc Émissaire qui est éliminé. Avant de mourir, il désigne qui aura le droit de voter le lendemain."
  },
  {
    id: 'joueur_flute', name: 'Joueur de Flûte', icon: '🪈', camp: 'solo', max: 1, ext: 'Nouvelle Lune',
    goal: 'Charmer tous les survivants pour gagner seul.',
    short: 'Charme 2 joueurs par nuit. Gagne si tous sont charmés.',
    desc: "Chaque nuit, il charme 2 joueurs (le narrateur les touche, ils se réveillent et se reconnaissent). Il gagne seul si tous les survivants sont charmés."
  },
  {
    id: 'corbeau', name: 'Corbeau', icon: '🐦‍⬛', camp: 'village', max: 1, ext: 'Nouvelle Lune',
    short: 'Ajoute chaque nuit 2 voix contre un joueur.',
    desc: "Chaque nuit, il désigne un joueur : au réveil, ce joueur commence le vote du jour avec 2 voix contre lui."
  },
  {
    id: 'renard', name: 'Renard', icon: '🦊', camp: 'village', max: 1, ext: 'Personnages',
    short: 'Flaire un groupe de 3 joueurs à la recherche d’un loup.',
    desc: "La nuit, il peut désigner un joueur : le narrateur lui indique si, parmi ce joueur et ses 2 voisins, se trouve au moins un Loup-Garou. Si oui, il peut recommencer une autre nuit ; si non, il perd son pouvoir."
  },
  {
    id: 'chien_loup', name: 'Chien-Loup', icon: '🐕', camp: 'village', max: 1, ext: 'Personnages',
    goal: 'Suivant son choix de la première nuit : Village ou Loups.',
    short: 'Nuit 1 : choisit son camp, Village ou Loups.',
    desc: "La première nuit, il choisit secrètement son camp : simple villageois, ou Loup-Garou (il se réveillera alors chaque nuit avec eux)."
  },
  {
    id: 'enfant_sauvage', name: 'Enfant Sauvage', icon: '🐒', camp: 'village', max: 1, ext: 'Personnages',
    goal: 'Village tant que son modèle est vivant ; Loups dès qu\'il meurt.',
    short: 'Choisit un modèle. Si le modèle meurt, il devient loup.',
    desc: "La première nuit, il choisit un joueur modèle. Tant que le modèle vit, il est villageois. Si le modèle meurt, il devient Loup-Garou et se réveille avec eux."
  },
  {
    id: 'deux_soeurs', name: 'Deux Sœurs', icon: '👭', camp: 'village', max: 2, pair: 2, ext: 'Personnages',
    short: 'Se reconnaissent la nuit et peuvent se concerter.',
    desc: "Les deux sœurs se reconnaissent la première nuit. Le narrateur peut les réveiller certaines nuits pour qu'elles se concertent en silence."
  },
  {
    id: 'trois_freres', name: 'Trois Frères', icon: '👨‍👨‍👦', camp: 'village', max: 3, pair: 3, ext: 'Personnages',
    short: 'Se reconnaissent la nuit et peuvent se concerter.',
    desc: "Les trois frères se reconnaissent la première nuit. Le narrateur peut les réveiller certaines nuits pour qu'ils se concertent en silence."
  },
  {
    id: 'montreur_ours', name: 'Montreur d’Ours', icon: '🐻', camp: 'village', max: 1, ext: 'Personnages',
    short: 'L’ours grogne au matin si un loup est son voisin.',
    desc: "Chaque matin, si au moins un de ses voisins directs est un Loup-Garou, le narrateur grogne : l'ours a flairé un loup."
  },
  {
    id: 'chevalier', name: 'Chevalier à l’Épée Rouillée', icon: '⚔️', camp: 'village', max: 1, ext: 'Personnages',
    short: 'S’il est dévoré, un loup meurt de la rouille.',
    desc: "S'il est dévoré par les Loups-Garous, le premier loup à sa gauche est contaminé par la rouille et meurt la nuit suivante."
  },
  {
    id: 'servante', name: 'Servante Dévouée', icon: '🫖', camp: 'village', max: 1, ext: 'Personnages',
    short: 'Peut prendre la carte d’un joueur éliminé au vote.',
    desc: "Avant qu'on ne révèle la carte d'un joueur éliminé par le vote, elle peut se dévoiler : elle prend alors la carte et le rôle de l'éliminé (rôle réinitialisé)."
  },
  {
    id: 'comedien', name: 'Comédien', icon: '🎭', camp: 'village', max: 1, ext: 'Personnages',
    short: 'Utilise chaque nuit un pouvoir parmi 3 cartes réservées.',
    desc: "Préparez 3 cartes à pouvoir non distribuées, face visible. Chaque nuit, pendant 3 nuits, le Comédien choisit l'une d'elles et utilise son pouvoir jusqu'à la nuit suivante ; la carte est ensuite défaussée."
  },
  {
    id: 'abominable_sectaire', name: 'Abominable Sectaire', icon: '🕯️', camp: 'solo', max: 1, ext: 'Personnages',
    goal: 'Être le seul groupe survivant : éliminer toute l\'autre moitié du village.',
    short: 'Gagne si l’autre moitié du village est éliminée.',
    desc: "Le narrateur divise le village en 2 groupes visibles (ex. : d'un côté / de l'autre de la table). Le Sectaire gagne seul si tous les joueurs de l'autre groupe sont éliminés."
  },
  {
    id: 'juge', name: 'Juge Bègue', icon: '⚖️', camp: 'village', max: 1, ext: 'Personnages',
    short: 'Peut déclencher un 2e vote immédiat (1 fois).',
    desc: "Une fois dans la partie, grâce à un signe convenu avec le narrateur, il déclenche un second vote immédiatement après le premier, sans débat."
  },
  {
    id: 'ange', name: 'Ange', icon: '👼', camp: 'solo', max: 1, ext: 'Personnages',
    goal: 'Se faire éliminer au tout premier tour pour gagner seul.',
    short: 'Gagne s’il est éliminé au tout premier tour.',
    desc: "S'il est éliminé au premier vote du village (ou dévoré la première nuit), il gagne la partie seul. Sinon, il redevient simple villageois."
  },
];

const roleById = Object.fromEntries(ROLES.map(r => [r.id, r]));

// Objectif de victoire : celui du camp, sauf objectif propre au rôle.
const CAMP_GOAL = {
  village: 'Démasquer et éliminer tous les Loups-Garous.',
  loups: 'Dévorer les villageois jusqu\'à contrôler le village, sans se faire démasquer.',
  solo: 'Gagner seul, contre tous les autres.',
};
function roleGoal(role) { return role.goal || CAMP_GOAL[role.camp] || ''; }

// Camps « effectifs » gérés dynamiquement par joueur (chien-loup, enfant sauvage, infection).
const CAMP_LABEL = {
  village: 'Village', loups: 'Loups-Garous', solo: 'Solitaire',
};

// ——— Extension « Le Village » : les 9 bâtiments ———
// Les bâtiments sont PUBLICS (posés devant les joueurs). L'app suit qui
// possède quoi et le rappelle au narrateur ; appliquez les effets selon
// votre livret de règles.
const BUILDINGS = [
  { id: 'chatelain', name: 'Le Châtelain', icon: '🏰', token: 'Blason',
    short: 'Notable du village : il préside la place et pèse dans les débats.' },
  { id: 'bailli', name: 'Le Bailli', icon: '🗝️', token: 'Double des clés',
    short: 'Représentant de l’ordre : il encadre le scrutin du village.' },
  { id: 'tavernier', name: 'Le Tavernier', icon: '🍺', token: 'Gobelet',
    short: 'Il peut héberger un joueur à la taverne pour la nuit.' },
  { id: 'barbier', name: 'Le Barbier', icon: '🪒', token: 'Rasoir',
    short: 'Peut « raser de près » un client en plein jour — à ses risques.' },
  { id: 'boulanger', name: 'Le Boulanger', icon: '🥖', token: 'Pain',
    short: 'Chaque matin, il distribue le pain et rythme la vie du village.' },
  { id: 'institutrice', name: 'L’Institutrice', icon: '🔔', token: 'Cloche',
    short: 'Elle sonne la cloche et peut discipliner le vote d’un élève turbulent.' },
  { id: 'rebouteux', name: 'Le Rebouteux', icon: '🧉', token: 'Mortier',
    short: 'Guérisseur du village : il peut soigner une victime.' },
  { id: 'confesseur', name: 'Le Confesseur', icon: '📿', token: 'Chapelet',
    short: 'Il peut recevoir la confession d’un joueur et sonder son âme.' },
  { id: 'fermier', name: 'Fermier', icon: '🐄', token: 'Vache', multi: true,
    short: 'La force tranquille du village : sans pouvoir, mais nombreux.' },
];
const buildingById = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

// ——— Cartes Événements (inspirées de la Nouvelle Lune) ———
// Tirées au matin, à la discrétion du narrateur. Chaque carte donne une
// consigne précise à annoncer au village.
const EVENTS = [
  { id: 'nuit_noire', icon: '🌑', name: 'Nuit noire',
    text: 'Au prochain vote, le village votera les yeux fermés, au doigt levé : seul le narrateur compte les voix.' },
  { id: 'pleine_lune_ev', icon: '🌕', name: 'Pleine lune',
    text: 'La nuit prochaine, les Loups-Garous devront désigner leur victime sans aucune concertation : unanimité silencieuse, sinon pas de victime.' },
  { id: 'couvre_feu', icon: '🕯️', name: 'Couvre-feu',
    text: 'Pas de débat aujourd’hui : le vote a lieu immédiatement après les annonces du matin.' },
  { id: 'offrande', icon: '🎁', name: 'Offrande au dieu Loup',
    text: 'Le village désigne ensemble un joueur : il sera protégé des Loups-Garous la nuit prochaine.' },
  { id: 'voeu_silence', icon: '🤐', name: 'Vœu de silence',
    text: 'Interdiction de parler jusqu’au vote : le débat se fait uniquement par gestes. Celui qui parle reçoit 1 voix contre lui.' },
  { id: 'grand_echange', icon: '🔄', name: 'Le grand déménagement',
    text: 'Deux joueurs tirés au sort échangent leurs places autour de la table (les voisinages changent !).' },
  { id: 'esprit_frappeur', icon: '👻', name: 'Esprit frappeur',
    text: 'L’esprit d’un mort s’exprime : le narrateur révèle le rôle d’un joueur éliminé qui ne l’avait pas été.' },
  { id: 'double_accusation', icon: '⚖️', name: 'Double accusation',
    text: 'Au prochain vote, chaque joueur vote avec DEUX doigts pour deux accusés différents.' },
  { id: 'reves_premonitoires', icon: '💭', name: 'Rêves prémonitoires',
    text: 'Chaque joueur, à tour de rôle, raconte en une phrase le « rêve » qu’il a fait cette nuit (indice ou intox !).' },
  { id: 'beuverie', icon: '🍺', name: 'Beuverie à la taverne',
    text: 'Le village a trop bu : la nuit prochaine, tous les pouvoirs de nuit du village sont suspendus (les loups, eux, rôdent toujours).' },
];
const eventById = Object.fromEntries(EVENTS.map(e => [e.id, e]));

// ——— Styles de partie ———
// Un même nombre de joueurs, des ambiances différentes : chaque style
// génère une composition distincte (loups + rôles prioritaires + villageois).

function baseWolves(n) { return n >= 18 ? 4 : n >= 12 ? 3 : n >= 8 ? 2 : 1; }

const GAME_STYLES = [
  {
    id: 'classique', name: 'Classique', icon: '🌙',
    desc: 'La partie traditionnelle : pouvoirs emblématiques et équilibre éprouvé.',
    priority: ['voyante', 'sorciere', 'chasseur', 'cupidon', 'petite_fille', 'salvateur', 'ancien', 'corbeau', 'montreur_ours', 'renard', 'idiot', 'bouc', 'deux_soeurs'],
  },
  {
    id: 'decouverte', name: 'Découverte', icon: '🌱',
    desc: 'Peu de pouvoirs, règles simples : idéale pour les nouveaux joueurs.',
    priority: ['voyante', 'sorciere', 'chasseur', 'cupidon'],
  },
  {
    id: 'enquete', name: 'Enquête', icon: '🔍',
    desc: 'Beaucoup d’indices : Voyante, Renard, Ours, Petite Fille, Corbeau… aux villageois de recouper.',
    priority: ['voyante', 'renard', 'montreur_ours', 'petite_fille', 'corbeau', 'sorciere', 'chasseur', 'salvateur', 'deux_soeurs', 'trois_freres'],
  },
  {
    id: 'chaos', name: 'Chaos', icon: '🎭',
    desc: 'Solitaires et coups de théâtre : Joueur de Flûte, Loup Blanc, Ange, Grand Méchant Loup…',
    wolfTwist: 'grand_mechant_loup',
    priority: ['joueur_flute', 'loup_blanc', 'sorciere', 'voyante', 'chasseur', 'comedien', 'juge', 'ange', 'bouc', 'idiot', 'corbeau'],
  },
  {
    id: 'trahisons', name: 'Trahisons', icon: '🗡️',
    desc: 'Camps mouvants : Chien-Loup, Enfant Sauvage, Infect Père des Loups, Sectaire, amoureux maudits…',
    wolfTwist: 'infect_pere',
    priority: ['chien_loup', 'enfant_sauvage', 'ange', 'abominable_sectaire', 'cupidon', 'voyante', 'sorciere', 'chasseur', 'servante', 'salvateur'],
  },
  {
    id: 'surprise', name: 'Surprise', icon: '🎲',
    desc: 'Composition aléatoire équilibrée — différente à chaque fois. Retentez votre chance !',
    random: true,
  },
];
const styleById = Object.fromEntries(GAME_STYLES.map(s => [s.id, s]));

function composeStyle(styleId, n) {
  const style = styleById[styleId] || GAME_STYLES[0];
  const c = {};
  let used = 0;
  const add = (id, k = 1) => { c[id] = (c[id] || 0) + k; used += k; };

  // Les loups : le style peut remplacer un loup simple par un loup spécial.
  const w = baseWolves(n);
  if (style.wolfTwist && w >= 2) { add('loup', w - 1); add(style.wolfTwist); }
  else add('loup', w);

  // Rôles prioritaires du style (ou tirage aléatoire pour « Surprise »).
  let priority = style.priority || [];
  if (style.random) {
    priority = ROLES
      .filter(r => !['loup', 'villageois', 'voleur'].includes(r.id) && r.camp !== 'loups')
      .map(r => r.id);
    for (let i = priority.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [priority[i], priority[j]] = [priority[j], priority[i]];
    }
    // Une chance sur trois de corser les loups avec une variante.
    if (w >= 2 && Math.random() < 1 / 3) {
      c.loup--; used--;
      add(Math.random() < .5 ? 'grand_mechant_loup' : 'infect_pere');
    }
  }
  for (const id of priority) {
    if (used >= n) break;
    if (c[id]) continue;
    const r = roleById[id];
    const k = r.pair || 1;
    if (used + k > n) continue;
    add(id, k);
  }
  if (n - used > 0) add('villageois', n - used);
  return c;
}

// Compatibilité : la suggestion par défaut est le style Classique.
function suggestComposition(n) { return composeStyle('classique', n); }
