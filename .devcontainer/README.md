# Ouvrir le projet dans un Codespace

Un Codespace est une machine fournie par GitHub qui exécute le projet et expose
une URL publique — la seule façon native à GitHub d'obtenir un lien de preview
pour une application avec serveur et base de données (GitHub Pages ne sert que
des fichiers statiques).

## Depuis le navigateur

Sur la page du dépôt : bouton **Code** → onglet **Codespaces** → **Create
codespace on refonte-direction-artistique**.

À l'ouverture, les dépendances s'installent, le serveur démarre et le port 3000
est publié. L'onglet **Ports** donne l'URL, de la forme
`https://<nom>-3000.app.github.dev`.

- Côté client : l'URL telle quelle
- Côté administration : la même URL suivie de `/admin`

## Mot de passe de l'administration

Il n'est pas dans le code. Au premier démarrage, il est tiré au hasard et
affiché **une fois** dans le terminal du Codespace. Pour le choisir vous-même,
définissez `SEED_ADMIN_PASSWORD` dans les secrets du Codespace avant de le
créer.

## À savoir

- L'URL ne vit que tant que le Codespace tourne ; il s'arrête tout seul après
  30 minutes d'inactivité et l'URL redevient injoignable.
- Les comptes personnels disposent d'un quota mensuel gratuit, au-delà duquel
  Codespaces est facturé.
- La base locale (PGlite) est recréée à chaque nouveau Codespace : c'est un
  environnement de démonstration, pas de production.
