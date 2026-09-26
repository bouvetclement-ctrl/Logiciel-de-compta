# Comptes de la famille

Application de suivi de budget qui tient dans un seul fichier, `index.html` : import de relevés bancaires CSV, tri automatique par règles, plusieurs comptes, budgets mensuels et annuels, tableau de bord.

## Utilisation

Ouvrez `index.html` dans un navigateur, ou publiez-le (GitHub Pages par exemple). Les données restent dans le navigateur (`localStorage`). Il est prudent d'exporter régulièrement une sauvegarde JSON (bouton « Exporter la sauvegarde »).

Une connexion internet est nécessaire au chargement : PapaParse, Chart.js et jsPDF sont chargés depuis cdnjs.

## Sauvegarde automatique sur Google Drive (optionnel)

1. Suivez les instructions en tête de [`google-apps-script.gs`](google-apps-script.gs) pour déployer le script et définir un **code secret** (`TOKEN`).
2. Dans l'application, collez l'URL `/exec` et le code secret, puis cliquez sur « Connecter ».

Fonctionnement :
- Chaque sauvegarde est horodatée. Si un autre appareil a modifié Drive pendant que celui-ci avait des modifications non envoyées, l'application demande quelle version garder au lieu d'écraser l'une par l'autre.
- Si le Drive est vide (script tout neuf), les données locales y sont envoyées : elles ne sont jamais effacées.
- Un ancien script qui ne renvoie pas le champ `updatedAt` fonctionne toujours, mais les conflits ne sont alors détectés qu'à la première connexion.

## Virements internes

Cochez « Virement interne » sur une catégorie (onglet Règles & catégories) pour que les virements entre vos propres comptes ne soient comptés ni en revenus ni en dépenses. Le solde de chaque compte, lui, en tient compte.

## Tests

```sh
node tests/run-tests.js
```

Ces tests couvrent les fonctions « pures » du bloc `<script id="pure-utils">` de `index.html` : lecture des montants et des dates, périodes, échappement HTML/CSV. Aucune dépendance n'est à installer.
