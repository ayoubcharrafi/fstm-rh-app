# FST RH — Gestion des Ressources Humaines

Application web de gestion des demandes de documents administratifs pour la
**Faculté des Sciences et Techniques de Mohammedia** — Université Hassan II de
Casablanca.

Le personnel enseignant et administratif y soumet ses demandes d'attestations et
de documents officiels ; l'administration les traite et génère les documents
signés, en français comme en arabe.

---

## Sommaire

- [Aperçu fonctionnel](#aperçu-fonctionnel)
- [Architecture technique](#architecture-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Workflow d'une demande](#workflow-dune-demande)
- [Structure du projet](#structure-du-projet)
- [Choix techniques notables](#choix-techniques-notables)
- [Configuration](#configuration)
- [État du projet](#état-du-projet)

---

## Aperçu fonctionnel

### Rôles

L'application distingue trois rôles (`backend/app/Enums/Role.php`) :

| Rôle | Périmètre |
|------|-----------|
| `ADMIN` | Traitement des demandes, gestion des utilisateurs et des référentiels, génération des documents, journal d'audit, paramètres de la plateforme |
| `PROFESSEUR` | Ses demandes, ses documents, son profil et son compte |
| `EMPLOYE` | Identique au professeur, avec un catalogue de documents distinct |

Professeurs et employés partagent les mêmes droits d'API ; ils diffèrent par les
**types de documents** auxquels ils ont accès.

### Fonctionnalités

- **Demandes de documents** — création en brouillon, dépôt de pièces
  justificatives, soumission, suivi de l'avancement et annulation.
- **Traitement administratif** — prise en charge, validation ou rejet motivé,
  puis génération automatique du PDF ou dépôt d'un document signé manuellement.
- **Catalogue bilingue** — 8 types de documents (attestation de travail, de
  salaire, ordre de mission, autorisation de quitter le territoire administratif,
  carte de notation…), disponibles en français et en arabe selon le type.
- **Notifications** — notifications dans l'application et envoi d'e-mails via une
  file d'attente, avec préférence désactivable par l'utilisateur.
- **Gestion des utilisateurs** — création, activation/désactivation,
  réinitialisation de mot de passe, profils bilingues (français et arabe).
- **Référentiels** — grades, départements, types de documents et modèles de
  documents, tous administrables depuis l'interface.
- **Tableaux de bord** — vue personnelle pour l'agent, vue agrégée avec
  indicateurs et graphiques pour l'administration.
- **Traçabilité** — journal d'audit des actions sensibles, exportable.
- **Protection des données** — export de ses données personnelles et demande de
  suppression de compte soumise à l'approbation d'un administrateur.

---

## Architecture technique

### Backend — API REST

| Composant | Version |
|-----------|---------|
| PHP | 8.3+ (image Docker : 8.4) |
| Laravel | 13.x |
| MySQL | 8.4 |
| Authentification | JWT (`tymon/jwt-auth`) |
| Génération PDF | Dompdf (français) et mPDF (arabe) |

### Frontend

| Composant | Version |
|-----------|---------|
| Next.js | 16.2 (App Router) |
| React | 19.2 |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| Données serveur | TanStack Query |
| Formulaires | React Hook Form + Zod |
| Graphiques | Recharts |

---

## Démarrage rapide

### Prérequis

Docker et Docker Compose.

### Installation

```bash
git clone <url-du-depot>
cd fst-rh-app

# Copier les fichiers de configuration
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Lancer l'ensemble des services
docker compose up -d --build
```

Au premier démarrage, le conteneur backend installe les dépendances, génère la
clé applicative et applique les migrations automatiquement.

Il reste à insérer les données de référence et les comptes de démonstration :

```bash
docker compose exec backend php artisan db:seed
```

### Services exposés

| Service | URL | Rôle |
|---------|-----|------|
| Frontend | http://localhost:3000 | Interface utilisateur |
| API | http://localhost:8000/api/v1 | API REST |
| Mailpit | http://localhost:8025 | Boîte de réception des e-mails de test |
| phpMyAdmin | http://localhost:8080 | Administration de la base |
| MySQL | `localhost:3307` | Accès direct à la base |

Un worker de file d'attente tourne en parallèle pour l'envoi des e-mails.

---

## Comptes de démonstration

Créés par `php artisan db:seed`.

| E-mail | Mot de passe | Rôle |
|--------|--------------|------|
| `admin@fst.ma` | `Admin@1234` | Administrateur |
| `professeur@fst.ma` | `Prof@1234` | Professeur |
| `employe@fst.ma` | `Emp@1234` | Employé |

> Ces identifiants sont destinés à l'environnement de développement local
> uniquement. Ils doivent être supprimés ou modifiés avant tout déploiement.

---

## Workflow d'une demande

Les statuts et leurs transitions sont définis dans
`backend/app/Enums/RequestStatus.php`.

```
                    ┌──────────────┐
                    │  BROUILLON   │  l'agent rédige sa demande
                    └──────┬───────┘
                           │ soumission
                    ┌──────▼───────┐
                    │  EN_ATTENTE  │  en file de traitement
                    └──────┬───────┘
                           │ prise en charge par l'admin
                    ┌──────▼───────┐
                    │   EN_COURS   │
                    └──────┬───────┘
              ┌────────────┴────────────┐
              │ validation              │ rejet motivé
       ┌──────▼───────┐          ┌──────▼───────┐
       │   VALIDEE    │          │   REJETEE    │
       └──────┬───────┘          └──────────────┘
              │ génération du PDF
              │ ou dépôt d'un document signé
   ┌──────────▼─────────────┐
   │  DOCUMENT_DISPONIBLE   │  téléchargeable par l'agent
   └────────────────────────┘
```

Une demande peut être annulée par son auteur tant qu'elle n'est pas en cours de
traitement (`ANNULEE`). Chaque changement de statut est historisé.

Les transitions autorisées sont encodées dans l'enum lui-même : un saut d'étape
est **impossible par construction**, et non simplement contrôlé à l'affichage.

---

## Structure du projet

```text
backend/                    API Laravel
├── app/
│   ├── Enums/              Rôles, statuts de demande, audiences
│   ├── Http/Controllers/   Contrôleurs de l'API
│   ├── Models/             16 modèles Eloquent
│   ├── Mail/               E-mails transactionnels
│   └── Services/           Génération PDF, notifications, audit
├── database/
│   ├── migrations/         Schéma de la base
│   └── seeders/            Référentiels et comptes de démonstration
└── routes/api.php          Définition des routes

frontend/                   Interface Next.js
├── app/                    Pages (App Router)
│   ├── admin/              Espace administrateur
│   └── ...                 Espace agent
├── components/
│   ├── layout/             Sidebar, AppShell, écran d'authentification
│   └── ui/                 Composants réutilisables
└── lib/                    Client API, contextes, types partagés

docker-compose.yml          Orchestration des 6 services
```

---

## Choix techniques notables

**Machine à états encapsulée.** Le cycle de vie d'une demande n'est pas dispersé
dans les contrôleurs : les transitions valides sont déclarées dans l'enum
`RequestStatus`, qui refuse toute transition non autorisée. Le workflow est ainsi
garanti au niveau du modèle.

**Deux moteurs PDF selon la langue.** Dompdf est utilisé pour les documents
français, mais il ne gère ni la liaison des glyphes arabes ni le sens
d'écriture de droite à gauche. Les documents arabes passent donc par mPDF, avec
`SetDirectionality('rtl')`. Les deux implémentations sont derrière une interface
`DocumentGeneratorInterface`, ce qui rend le moteur interchangeable.

**Modèles de documents en base de données.** Les gabarits HTML sont stockés en
base et indexés par type, langue et rôle cible — ils sont donc modifiables depuis
l'interface d'administration, avec prévisualisation, sans redéploiement.

**Réinitialisation de mot de passe par code.** Un code à 6 chiffres est envoyé
par e-mail et stocké **haché** en base, valable 15 minutes, limité à 5 tentatives
et à usage unique.

**Paramètres applicatifs configurables.** Seuil de retard des demandes, durée de
validité des jetons, longueur minimale des mots de passe et durée de rétention
des journaux sont stockés en base et modifiables par l'administration.

**Interface bilingue.** Les profils et les documents gèrent le français et
l'arabe, y compris pour les noms des agents.

---

## Configuration

Les variables d'environnement sont documentées dans les fichiers d'exemple :

- `backend/.env.example` — base de données, JWT, SMTP, URL du frontend
- `frontend/.env.example` — URL de l'API

Les valeurs sensibles (`APP_KEY`, `JWT_SECRET`, identifiants SMTP) ne sont pas
versionnées et doivent être renseignées localement. `APP_KEY` est générée
automatiquement au premier démarrage du conteneur.

En développement, les e-mails ne sortent pas de la machine : ils sont capturés
par Mailpit, consultable sur http://localhost:8025.

---

## État du projet

Les fonctionnalités décrites ci-dessus sont opérationnelles : parcours complet
d'une demande, génération des documents en français et en arabe, administration
des utilisateurs et des référentiels, notifications, audit.

**Pistes d'amélioration identifiées :**

- **Tests automatisés** — PHPUnit est configuré mais la suite de tests métier
  reste à écrire ; seul le squelette Laravel par défaut est présent.
- Pagination et recherche à étendre sur certaines vues d'administration.
- Archivage des demandes anciennes.

---

## Contexte

Projet réalisé dans le cadre d'un travail universitaire à la Faculté des Sciences
et Techniques de Mohammedia, Université Hassan II de Casablanca.
