# 🐺 Loup-Garou — Assistant du Narrateur

Web app pour aider le narrateur d'une partie des **Loups-Garous de Thiercelieux** (basée sur l'édition la plus complète, avec les extensions *Nouvelle Lune* et *Personnages*).

Aucune installation, aucun serveur : ouvrez simplement `index.html` dans un navigateur (téléphone, tablette ou ordinateur). La partie est sauvegardée automatiquement dans le navigateur.

## Fonctionnalités

- **👥 Joueurs** : saisie dans l'ordre de la table (les voisinages sont utilisés pour le Renard, le Montreur d'Ours et le Chevalier).
- **🎴 30 personnages** : jeu de base + Nouvelle Lune + Personnages, avec suggestion automatique de composition selon le nombre de joueurs.
- **🂠 Distribution** : tirage aléatoire, mode « faire passer le téléphone » (chaque joueur voit sa carte en secret) ou saisie de cartes physiques.
- **🌙 Nuit guidée** : l'app dit au narrateur **qui appeler, dans quel ordre, et quoi dire**, avec les phrases types. Les actions (victime des loups, potions, protection, infection…) sont saisies en 1 tap.
- **🌅 Aube automatique** : les morts sont calculées (Salvateur, potion de vie, résistance de l'Ancien, infection…) et les enchaînements gérés pas à pas : tir du Chasseur, mort de chagrin des amoureux, succession du Capitaine, épée rouillée du Chevalier, transformation de l'Enfant Sauvage, grognement de l'ours…
- **☀️ Jour** : élection du Capitaine, **minuteurs de débat et de vote** (réglables, avec bip), résolution du vote : égalité → Bouc Émissaire ou Capitaine, Idiot du Village gracié, Servante Dévouée, 2ᵉ vote du Juge Bègue, rappel des +2 voix du Corbeau.
- **🏆 Victoires détectées** : Village, Loups, Amoureux, Joueur de Flûte, Loup Blanc, Ange.
- **🏘️ Option « Le Village »** : les 9 bâtiments de l'extension (Châtelain, Bailli, Tavernier, Barbier, Boulanger, Institutrice, Rebouteux, Confesseur, Fermiers) attribués aléatoirement ou à la main, affichés sur le tableau des joueurs avec rappel pendant le jour.
- **👥 Tableau de bord** : état de chaque joueur (vivant, capitaine, amoureux, charmé, infecté…), pouvoirs restants, corrections manuelles.
- **📜 Journal** de tous les événements et **❓ aide-mémoire** complet (ordre d'appel, rôles, conditions de victoire).

## Lancer en local

```bash
# au choix :
open index.html            # directement dans le navigateur
python3 -m http.server     # ou via un petit serveur → http://localhost:8000
```

Peut aussi être hébergée telle quelle sur GitHub Pages (aucun build nécessaire).

## Structure

```
index.html      — point d'entrée
css/style.css   — thème sombre « nuit de Thiercelieux », mobile-first
js/roles.js     — données des 30 personnages + suggestions de composition
js/app.js       — moteur de jeu (nuit/jour, morts, cascades, victoires) + interface
```
