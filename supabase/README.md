# Supabase — migrations

Projet : `kibyxovxqrscpfttjgsy` (« HDY Performance Engine », région `eu-central-1`).

## Historique

Les 17 migrations `20260830*` → `20260908*` ont été **rapatriées depuis la base
de production le 9 septembre 2026** (elles avaient été appliquées directement via
l'assistant Supabase sans être versionnées dans le dépôt). Le contenu est un
export fidèle de `supabase_migrations.schema_migrations`.

À partir d'ici, **toute évolution de schéma passe par une migration dans ce
dossier**, appliquée avec la CLI Supabase :

```bash
supabase link --project-ref kibyxovxqrscpfttjgsy
supabase db push          # applique les migrations en attente
supabase migration new <nom>   # crée un nouveau fichier
```

## Vérifier que le dépôt est aligné avec la base

```bash
supabase db diff --linked   # doit ne rien renvoyer
```
