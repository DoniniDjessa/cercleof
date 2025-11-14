# Solution: TypeScript ESLint "no-unused-vars" Warning

## Problème

Lors de l'utilisation de Next.js avec TypeScript et ESLint, vous pouvez rencontrer des avertissements pour les variables non utilisées, même quand elles sont nécessaires (par exemple, les paramètres de fonction qui doivent être présents pour la signature mais ne sont pas utilisés dans le corps).

## Solution

Désactiver les règles `no-unused-vars` et `@typescript-eslint/no-unused-vars` dans votre configuration ESLint.

### Configuration ESLint (eslint.config.mjs)

Pour Next.js 13+ avec ESLint 9+ (flat config), ajoutez ces règles dans votre fichier `eslint.config.mjs` :

```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable unused vars warnings
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // ... autres règles
    },
  },
];

export default eslintConfig;
```

### Configuration ESLint (ancienne syntaxe .eslintrc.json)

Si vous utilisez l'ancienne configuration ESLint (`.eslintrc.json` ou `.eslintrc.js`), ajoutez :

```json
{
  "rules": {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off"
  }
}
```

Ou dans `.eslintrc.js` :

```javascript
module.exports = {
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
  },
};
```

## Pourquoi cette solution ?

1. **TypeScript gère déjà les variables non utilisées** : TypeScript lui-même détecte et signale les variables non utilisées, donc ESLint fait double emploi.

2. **Flexibilité pour les paramètres requis** : Parfois, vous devez inclure des paramètres dans une signature de fonction (pour correspondre à une interface ou un type) même s'ils ne sont pas utilisés dans le corps de la fonction.

3. **Évite les préfixes inutiles** : Sans cette configuration, vous seriez obligé d'utiliser des préfixes comme `_` pour chaque variable non utilisée (ex: `_unusedParam`).

## Alternative : Utiliser des préfixes

Si vous préférez garder les règles activées mais les désactiver de manière sélective, vous pouvez préfixer les variables non utilisées avec un underscore :

```typescript
// Au lieu de :
function handleClick(event: MouseEvent) {
  // event non utilisé
}

// Utilisez :
function handleClick(_event: MouseEvent) {
  // Le préfixe _ indique que c'est intentionnel
}
```

## Vérification

Après avoir appliqué la configuration, vérifiez que les avertissements ont disparu :

```bash
npm run lint
```

Les avertissements `no-unused-vars` et `@typescript-eslint/no-unused-vars` ne devraient plus apparaître.

## Notes

- Cette solution désactive complètement les vérifications de variables non utilisées
- TypeScript continuera à signaler les erreurs de variables non utilisées si vous avez `"noUnusedLocals": true` ou `"noUnusedParameters": true` dans votre `tsconfig.json`
- Pour un contrôle plus fin, vous pouvez utiliser `"warn"` au lieu de `"off"` pour recevoir des avertissements sans erreurs

