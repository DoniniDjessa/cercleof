# Mise à jour de la table dd-travailleurs

## Instructions

Ce script SQL ajoute de nouvelles colonnes à la table `dd-travailleurs` pour un suivi avancé des travailleurs.

### Colonnes ajoutées

1. **rating_global** (DECIMAL 3,1) - Note globale de 0 à 10
2. **total_services** (INTEGER) - Nombre total de services effectués
3. **total_montants_recus** (DECIMAL 12,2) - Montant total reçu
4. **jours_travailles** (INTEGER) - Nombre de jours travaillés
5. **heures_travailles** (DECIMAL 10,2) - Nombre d'heures travaillées
6. **salaire** (DECIMAL 10,2) - Salaire actuel
7. **salary_history** (JSONB) - Historique des changements de salaire
8. **payments_history** (JSONB) - Historique des paiements
9. **work_history** (JSONB) - Historique des jours/heures travaillés
10. **notes_history** (JSONB) - Historique des notes

### Pour exécuter

1. Ouvrez votre client Supabase SQL Editor
2. Copiez le contenu du fichier `update-travailleurs.sql`
3. Exécutez le script

### Alternative: Via Supabase CLI

```bash
supabase db execute --file database/update-travailleurs.sql
```

### Vérification

Après l'exécution, vous pouvez vérifier que les colonnes ont été ajoutées:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dd-travailleurs' 
ORDER BY ordinal_position;
```

