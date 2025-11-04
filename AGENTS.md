# Conventions du projet

## Portée
Ces consignes s'appliquent à l'ensemble du dépôt.

## Style général
- Utiliser l'indentation à deux espaces pour le HTML, le CSS et le JavaScript.
- Garder les fichiers exempts d'espaces inutiles en fin de ligne et terminer par une ligne vide.
- Préférer des commentaires courts en français si un commentaire est indispensable.

## CSS
- Regrouper les règles liées à la réactivité dans des media queries triées du plus large au plus étroit.
- Préfixer les nouvelles variables CSS personnalisées par `--` et choisir des noms explicites.
- Lorsque vous touchez aux contrôles tactiles, vérifier que les marges prennent en compte les "safe areas" (`env(safe-area-inset-*)`).

## Messages de PR
- Le résumé doit mettre en avant les effets visibles pour les joueurs.
