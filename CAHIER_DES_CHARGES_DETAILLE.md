# Cahier des charges détaillé — Application de Gestion RH
## Faculté des Sciences et Techniques de Mohammedia (FST)

---

## Table des matières

1. Contexte et objet du projet
2. Objectifs fonctionnels
3. Périmètre de la version 1 (MVP)
4. Utilisateurs, rôles et permissions détaillées
5. Référentiels métier (départements, grades, types de documents)
6. Workflow complet d'une demande
7. Détail de chaque type de document et de ses champs
8. Numérotation et références
9. Gestion documentaire (fichiers, sécurité)
10. Gestion des modèles de documents (templates)
11. Tableaux de bord
12. Notifications
13. Journalisation et audit
14. Architecture technique
15. Authentification et sécurité (RBAC)
16. Modèle de données complet
17. API REST complète
18. Pages du frontend
19. Génération PDF
20. Règles de validation
21. Exigences non fonctionnelles
22. Tests attendus et scénarios d'acceptation
23. Données de démarrage (seeders)

---

## 1. Contexte et objet du projet

Aujourd'hui, à la FST Mohammedia, les documents administratifs (attestations, ordres de mission, cartes de notation, etc.) sont préparés **manuellement** à partir de modèles Word par le service RH, sur demande directe des professeurs et employés. Ce processus est lent, non tracé, et repose entièrement sur la disponibilité du personnel administratif.

L'objectif de ce projet est de développer une **application web** qui :

- centralise les informations administratives de chaque professeur et employé ;
- permet à chacun de soumettre ses demandes de documents en ligne ;
- permet à l'administration de traiter, valider ou rejeter ces demandes dans un workflow tracé ;
- génère automatiquement le document PDF correspondant à partir d'un modèle ;
- garde une trace complète (audit) de toutes les actions.

**Important — ce que l'application ne fait PAS dans cette version 1 :** elle ne remplace pas la signature et le cachet physiques. Le circuit reste :

1. le système génère le document (PDF) ;
2. l'administrateur le télécharge ou l'imprime ;
3. il le fait signer et cacheter manuellement, en dehors de l'application ;
4. il téléverse la version scannée/signée dans l'application ;
5. le demandeur peut alors la télécharger.

---

## 2. Objectifs fonctionnels

L'application doit permettre :

| # | Fonctionnalité | Description |
|---|---|---|
| 1 | Gestion des comptes | Créer, modifier, activer/désactiver, supprimer les comptes utilisateurs |
| 2 | Gestion des profils | Gérer les données administratives des professeurs et employés |
| 3 | Gestion des référentiels | Départements, services, laboratoires, grades |
| 4 | Dépôt de demandes | Le personnel dépose une demande de document en ligne |
| 5 | Traitement des demandes | L'administration examine, valide ou rejette |
| 6 | Génération de documents | Génération automatique du PDF depuis un modèle |
| 7 | Circuit signature manuelle | Upload du document signé, mise à disposition |
| 8 | Téléchargement | Le demandeur télécharge son document final |
| 9 | Notifications | In-app et email à chaque étape clé |
| 10 | Historique / audit | Traçabilité complète de toutes les actions sensibles |
| 11 | Tableau de bord | Statistiques RH pour l'administration et vue personnelle pour l'utilisateur |
| 12 | Bilinguisme FR/AR | Interface en français, documents et certains écrans en arabe avec support RTL |

---

## 3. Périmètre de la version 1 (MVP)

### 3.1 Inclus

- Authentification sécurisée (JWT + refresh token).
- Gestion des rôles et permissions (3 rôles).
- Gestion complète des comptes et des profils administratifs.
- Gestion des départements, services, laboratoires et grades.
- Création, suivi et annulation des demandes.
- Traitement (mise en cours), validation ou rejet par l'administration.
- Génération automatique d'un document PDF.
- Téléversement de la version signée/cachetée.
- Téléchargement du document final par l'ayant droit.
- Notifications in-app et par e-mail.
- Deux tableaux de bord (admin / utilisateur).
- Historique et journal d'audit.
- Interface en français, support de l'arabe et du RTL pour les documents/aperçus.

### 3.2 Explicitement hors périmètre

- Signature électronique qualifiée et cachet électronique officiel.
- Paiement en ligne.
- Application mobile native.
- Notification SMS (optionnelle, reportée).
- Infrastructure haute disponibilité complexe.
- Workflow à plusieurs niveaux de validation (à envisager en V2 si demandé).

---

## 4. Utilisateurs, rôles et permissions détaillées

La V1 comporte **exactement 3 rôles**, aucun rôle supplémentaire ne doit être créé sans validation métier préalable.

### 4.1 ADMIN — Service RH / gestionnaire

Représente le service des ressources humaines ou toute personne chargée de traiter les demandes.

**Peut faire :**
- Se connecter à l'espace d'administration.
- Créer, modifier, activer, désactiver et supprimer (soft delete) des comptes.
- Attribuer le rôle `PROFESSEUR` ou `EMPLOYE` à un compte.
- Gérer l'ensemble des informations administratives d'un utilisateur.
- Affecter un utilisateur à un département, un service ou un laboratoire.
- Gérer les grades (créer, modifier, désactiver).
- Gérer les modèles de documents (templates, versions).
- Consulter l'ensemble des demandes, tous utilisateurs confondus.
- Faire passer une demande à l'état « en cours de traitement ».
- Valider ou rejeter une demande, avec commentaire ou motif de rejet obligatoire en cas de rejet.
- Générer le document PDF associé à une demande validée.
- Télécharger le document généré (avant signature).
- Téléverser la version signée et cachetée.
- Rendre le document final disponible au demandeur.
- Consulter les statistiques RH globales.
- Consulter les journaux d'audit.
- Créer une demande **au nom** d'un utilisateur si nécessaire.

### 4.2 PROFESSEUR

**Peut faire :**
- Se connecter.
- Consulter son propre profil et ses informations administratives.
- Créer une demande, uniquement parmi les types de documents autorisés pour un professeur.
- Suivre l'état d'avancement de ses propres demandes.
- Consulter les commentaires laissés par l'administration.
- Télécharger un document lorsque son état est `DOCUMENT_DISPONIBLE`.
- Gérer les informations non sensibles de son compte (mot de passe, coordonnées de contact).
- Recevoir des notifications.

**Ne peut pas :**
- Gérer d'autres comptes que le sien.
- Modifier directement son grade ou son département (réservé à l'admin).
- Valider ou rejeter sa propre demande.
- Consulter les demandes d'un autre utilisateur.

### 4.3 EMPLOYE — personnel administratif et technique

**Peut faire :** les mêmes actions qu'un professeur, mais limité aux types de documents spécifiques employé + documents communs.

**Ne peut pas :** les mêmes restrictions que pour le professeur.

### 4.4 Matrice synthétique des permissions

| Fonctionnalité | ADMIN | PROFESSEUR | EMPLOYE |
|---|:-:|:-:|:-:|
| Se connecter | Oui | Oui | Oui |
| Consulter son profil | Oui | Oui | Oui |
| Modifier ses infos sensibles | Oui | Non | Non |
| Gérer les comptes | Oui | Non | Non |
| Créer une demande | Oui (pour un tiers) | Oui | Oui |
| Consulter ses propres demandes | Oui | Oui | Oui |
| Consulter toutes les demandes | Oui | Non | Non |
| Mettre en traitement | Oui | Non | Non |
| Valider / rejeter | Oui | Non | Non |
| Générer un document | Oui | Non | Non |
| Téléverser le document signé | Oui | Non | Non |
| Télécharger son document final | Oui | Oui | Oui |
| Gérer les modèles | Oui | Non | Non |
| Consulter l'audit | Oui | Non | Non |

**Règle absolue :** toutes ces vérifications doivent être appliquées **côté backend** (policies Laravel), le frontend ne fait que refléter ces droits pour l'ergonomie — il ne constitue jamais une protection suffisante à lui seul.

---

## 5. Référentiels métier

### 5.1 Départements (table `organizational_units`, type `DEPARTEMENT`)

| Code | Libellé |
|---|---|
| INF | Informatique |
| MAT | Mathématiques |
| BIO | Biologie |
| CHI | Chimie |
| PHY | Physique |
| GEL | Génie Électrique |
| GPE | Génie des Procédés |

Chaque département peut avoir des **services** ou **laboratoires** rattachés (via `parent_id`), gérés dynamiquement par l'admin — pas de liste figée pour ceux-ci.

### 5.2 Grades

| Intitulé | Désignation en arabe |
|---|---|
| Professeur de l'enseignement supérieur, grade C | أستاذ التعليم العالي، درجة ج |
| Professeur de l'enseignement supérieur, grade D | أستاذ التعليم العالي، درجة د |
| Maître de conférences, grade A | أستاذ محاضر، درجة أ |
| Maître de conférences, grade B | أستاذ محاضر، درجة ب |

*(Liste des grades employés à compléter selon la grille FST réelle — le système doit permettre à l'admin d'en ajouter librement via l'interface de gestion des grades.)*

### 5.3 Types de documents (9 au total)

**A. Communs — professeur et employé :**
1. Attestation de travail (français)
2. Attestation de travail (arabe)
3. Attestation de salaire
4. Ordre de mission
5. Autorisation de quitter le territoire national

**B. Spécifique professeur :**
6. Attestation pour habilitation

**C. Spécifique employé :**
7. Carte individuelle de notation — بطاقة التنقيط
8. Procès-verbal de reprise de travail — محضر استئناف العمل
9. Demande de congé administratif annuel — الرخصة الإدارية السنوية

**Règle d'accès :** un professeur ne peut demander que les documents A + B. Un employé ne peut demander que les documents A + C. Cette règle est vérifiée **côté backend** avant toute création de demande.

---

## 6. Workflow complet d'une demande

### 6.1 États possibles

```
BROUILLON            — demande en cours de rédaction, non soumise
EN_ATTENTE            — soumise, en attente de prise en charge
EN_COURS              — prise en charge par l'admin, en cours d'examen
VALIDEE                — validée par l'admin, prête pour génération
REJETEE                — rejetée avec motif obligatoire
DOCUMENT_DISPONIBLE — document final signé disponible au téléchargement
ANNULEE                — annulée par le demandeur
```

### 6.2 Transitions autorisées (aucune autre n'est acceptée)

```
BROUILLON   → EN_ATTENTE
BROUILLON   → ANNULEE
EN_ATTENTE  → EN_COURS
EN_ATTENTE  → REJETEE
EN_ATTENTE  → ANNULEE      (uniquement par le demandeur, avant traitement)
EN_COURS    → VALIDEE
EN_COURS    → REJETEE
VALIDEE     → DOCUMENT_DISPONIBLE
```

Toute tentative de transition non listée doit être refusée par l'API (HTTP 422), quel que soit le rôle qui l'initie.

### 6.3 Étapes détaillées

**a) Création (par l'utilisateur ou l'admin pour un tiers)**
1. L'utilisateur se connecte.
2. Il choisit un type de document parmi ceux autorisés pour son rôle.
3. Le système affiche le formulaire spécifique à ce type.
4. Les champs déjà connus (nom, grade, département...) sont préremplis depuis le profil.
5. L'utilisateur complète les champs propres à la demande (dates, destination, etc.).
6. Il peut enregistrer un brouillon (`BROUILLON`) sans le soumettre.
7. À la soumission, l'état passe à `EN_ATTENTE` et une référence unique est générée.

**b) Traitement administratif**
1. L'admin consulte la liste des demandes en attente.
2. Il ouvre une demande, vérifie les informations fournies.
3. Il la passe à l'état `EN_COURS`.
4. Il peut, à ce stade : corriger des informations administratives autorisées, demander une précision au demandeur, rejeter avec motif, ou valider.

**c) Validation et génération**
1. L'admin valide → état `VALIDEE`.
2. Le système génère automatiquement le PDF depuis le modèle actif correspondant au type de document et à la langue demandée.
3. Le PDF généré est stocké (type `GENERE`) et téléchargeable par l'admin uniquement à ce stade.

**d) Signature manuelle (hors application)**
1. L'admin télécharge ou imprime le PDF généré.
2. Il le fait signer et cacheter par la personne habilitée.
3. Il numérise (ou récupère) le PDF signé.
4. Il le téléverse dans l'application (type `SIGNE`).
5. L'état passe automatiquement à `DOCUMENT_DISPONIBLE`.
6. Le demandeur reçoit une notification in-app et par e-mail.
7. Le demandeur télécharge son document final.

**e) Rejet**
- Peut être effectué uniquement par l'admin, aux états `EN_ATTENTE` ou `EN_COURS`.
- Un motif textuel est **obligatoire**.
- État final : `REJETEE`.
- Le demandeur reçoit une notification avec le motif visible.
- La demande reste consultable dans l'historique (jamais supprimée).

**f) Annulation**
- Réservée au demandeur, uniquement tant que la demande est en `BROUILLON` ou `EN_ATTENTE` (avant prise en charge).
- Une fois en `EN_COURS`, l'utilisateur ne peut plus annuler seul.

---

## 7. Détail de chaque type de document et de ses champs

### 7.1 Attestation de travail (FR/AR)
- Identité du demandeur (nom/prénom FR + AR)
- Grade
- Numéro DOTI/SOM
- Fonction actuelle
- Date de recrutement ou date de prise de fonction
- Langue du document : `FR` ou `AR`
- Date d'édition

### 7.2 Attestation de salaire
- Identité, grade, DOTI/SOM
- Informations salariales nécessaires
- Période / mois de référence
- Langue, date d'édition
- *Note : le modèle exact de mise en forme n'a pas encore été fourni par l'administration — l'admin doit pouvoir ajuster le template avant la mise en production.*

### 7.3 Ordre de mission
- Prénom, nom, grade
- Destination
- Date de départ / date de retour (règle : retour ≥ départ)
- Objet de la mission (obligatoire)
- Moyen de transport
- Date d'édition

### 7.4 Autorisation de quitter le territoire national
- Identité, grade, DOTI/SOM
- Date de la demande
- Date de début / date de fin (règle : fin ≥ début)
- Pays / destination
- Motif (facultatif)
- Articles juridiques issus du modèle (texte fixe)
- Date d'édition
- *Le modèle professeur peut contenir un article supplémentaire relatif au rapport de mission — prévoir des templates séparés professeur/employé si le texte diffère.*

### 7.5 Attestation pour habilitation (professeur uniquement)
- Nom, prénom, DOTI/SOM
- Grade
- Qualité d'enseignant-chercheur
- Date d'effet / date d'habilitation
- Date d'édition

### 7.6 Carte individuelle de notation — بطاقة التنقيط (employé uniquement)

Champs d'identité :
- Numéro de paie, CIN, nom et prénom, date/lieu de naissance
- Situation familiale, nombre d'enfants
- Grade, rang/échelon
- Date d'accès à la fonction publique, date de nomination dans le grade, ancienneté
- Fonction actuelle, année d'évaluation

Critères de notation (calcul automatique côté serveur) :

| Critère | Note maximale |
|---|:-:|
| Réalisation des tâches | 5 |
| Productivité | 5 |
| Capacité d'organisation | 3 |
| Comportement professionnel | 4 |
| Recherche et innovation | 3 |
| **Total** | **20** |

Le total, l'appréciation et le rythme de promotion sont **calculés automatiquement**, jamais saisis manuellement.

### 7.7 Procès-verbal de reprise de travail — محضر استئناف العمل (employé uniquement)
- Identité, grade, DOTI/SOM
- Type de congé
- Date de début / date de fin du congé
- Date de reprise (règle : postérieure à la fin du congé, sauf décision admin particulière)
- Date d'édition

### 7.8 Demande de congé administratif annuel — الرخصة الإدارية السنوية (employé uniquement)
- Identité, grade, service
- Date de début / date de fin
- Nombre de jours (calculé automatiquement)
- Solde avant / après demande (calculé automatiquement selon les règles de l'établissement)
- Congé reporté, commentaire

---

## 8. Numérotation et références

Chaque demande possède une référence unique, générée **dans une transaction** pour éviter tout doublon.

**Format :** `TYPE/NUMERO/ANNEE`

**Exemples :** `ATT-TRAV/0001/2026`, `ODM/0002/2026`, `AQT/0003/2026`

Le compteur peut être global ou séparé par type de document (à trancher côté métier), avec remise à zéro possible en début d'année.

---

## 9. Gestion documentaire

Chaque demande peut posséder plusieurs fichiers, de 3 natures :

| Type | Description |
|---|---|
| `PIECE_JOINTE` | Fichier fourni par l'utilisateur à l'appui de sa demande |
| `GENERE` | Document PDF généré automatiquement par le système |
| `SIGNE` | Version finale, signée et cachetée, téléversée par l'admin |

Pour chaque fichier sont enregistrés : nom original, nom interne sécurisé, chemin de stockage, type MIME, taille, empreinte SHA-256, utilisateur ayant téléversé, date d'upload.

**Règles de sécurité obligatoires :**
- Formats acceptés : principalement PDF, DOCX, JPG, PNG selon le contexte.
- Taille limitée.
- Renommage systématique côté serveur (jamais le nom d'origine utilisé comme chemin).
- Aucune exécution de fichier possible.
- Vérification du type réel du fichier (pas seulement l'extension).
- Chemins internes jamais exposés directement au client.
- Vérification des autorisations avant chaque téléchargement.

---

## 10. Gestion des modèles de documents (templates)

L'administrateur gère les modèles depuis l'interface. Un modèle comprend :
- un type de document associé,
- une langue,
- une version,
- un état actif/inactif,
- un contenu HTML/Blade,
- une date d'activation,
- un historique de versions.

**Variables disponibles dans les modèles :**
```
{{ user.nom_fr }}       {{ user.prenom_fr }}
{{ user.nom_ar }}       {{ user.prenom_ar }}
{{ user.doti }}         {{ user.grade_fr }}
{{ user.grade_ar }}     {{ request.destination }}
{{ request.date_debut }} {{ request.date_fin }}
{{ request.reference }}  {{ document.date_edition }}
```

**Règle importante :** un modèle déjà utilisé pour générer un document ne doit jamais être supprimé définitivement — il est désactivé, et la version utilisée reste liée au document déjà généré (traçabilité).

---

## 11. Tableaux de bord

### 11.1 Dashboard administrateur
- Nombre total de professeurs / employés
- Comptes actifs / inactifs
- Répartition par département, par service
- Demandes par type, par état (attente/en cours/validées/rejetées)
- Documents disponibles
- Statistiques mensuelles et annuelles
- Temps moyen de traitement d'une demande
- Flux d'activité récente

### 11.2 Dashboard professeur / employé
- Nombre total de ses demandes
- Répartition par état
- Documents disponibles au téléchargement
- Dernières notifications
- Accès rapide « Nouvelle demande »

---

## 12. Notifications

### 12.1 Notifications internes (in-app)
Déclenchées à chaque étape clé : soumission, mise en cours, validation, rejet, document disponible, demande d'information complémentaire par l'admin.

### 12.2 E-mails
Envoyés de façon **asynchrone** (file d'attente Laravel) pour : confirmation de soumission, rejet avec motif, document disponible.

### 12.3 SMS
Optionnel, non requis en V1.

---

## 13. Journalisation et audit

Chaque entrée d'audit trace : utilisateur, adresse IP, user-agent, date/heure, action effectuée, entité concernée et son identifiant, anciennes et nouvelles valeurs.

**Actions obligatoirement auditées :**
- Connexion / déconnexion / échec de connexion
- Création ou modification d'un compte
- Modification d'un profil administratif
- Changement de rôle
- Changement d'état d'une demande
- Génération d'un document
- Téléversement d'un document signé
- Téléchargement d'un document sensible
- Suppression logique de données

---

## 14. Architecture technique

### 14.1 Frontend
- Next.js avec TypeScript, App Router.
- Interface responsive.
- Validation des formulaires côté client (en complément, jamais en remplacement du backend).
- Consommation de l'API REST Laravel.
- Support RTL pour les écrans et aperçus en arabe.
- Gestion centralisée des erreurs API.
- Protection des routes selon le rôle connecté.

### 14.2 Backend
- Laravel, exposé exclusivement en API REST.
- Validation systématique des entrées via des Form Requests dédiées.
- Séparation stricte services métier / contrôleurs.
- Policies et middlewares pour toutes les autorisations.
- Jobs asynchrones pour les envois d'e-mail et la génération lourde de PDF.
- Stockage des documents sur disque privé (jamais public).
- Transactions systématiques sur les opérations critiques (génération de référence, changement d'état).

### 14.3 Base de données
- MySQL, migrations Laravel.
- Clés étrangères sur toutes les relations.
- Index sur les champs de recherche fréquente.
- Suppression logique (soft delete) pour utilisateurs, profils, demandes et modèles.

### 14.4 Conteneurisation (Docker Compose)

| Service | Rôle |
|---|---|
| `frontend` | Next.js |
| `backend` | Laravel / PHP-FPM |
| `nginx` | Reverse proxy vers le backend |
| `mysql` | Base de données |
| `phpmyadmin` | Administration DB (dev uniquement) |
| `mailpit` | Capture des e-mails en dev |
| `redis` | Cache et file de tâches (recommandé) |

---

## 15. Authentification et sécurité (RBAC)

### 15.1 Authentification
- Gérée nativement par Laravel.
- Jeton d'accès JWT à durée courte + refresh token.
- Stockage recommandé en cookies `HttpOnly`, `Secure` en production, `SameSite` adapté.
- Endpoint de déconnexion avec révocation du token.
- Changement et réinitialisation de mot de passe.
- Limitation du nombre de tentatives de connexion (rate limiting).

### 15.2 Rôles
```
ADMIN
PROFESSEUR
EMPLOYE
```

### 15.3 Permissions techniques recommandées
```
users.read              users.create           users.update
users.delete             profiles.read           profiles.update
requests.create           requests.read.own      requests.read.all
requests.process          requests.validate       requests.reject
documents.generate        documents.upload_signed
documents.download.own    documents.download.all
templates.manage          settings.manage
audit.read                dashboard.admin        dashboard.user
```

Toute vérification de permission doit être réalisée côté Laravel — le frontend ne fait qu'afficher/masquer les éléments d'UI en conséquence.

---

## 16. Modèle de données complet

### `users`
id · email · password · role · is_active · email_verified_at · last_login_at · created_at · updated_at · deleted_at

### `staff_profiles`
id · user_id · staff_type (`PROFESSEUR`/`EMPLOYE`) · nom_fr · prenom_fr · nom_ar · prenom_ar · sexe · date_naissance · lieu_naissance · cin · doti · telephone · situation_administrative · date_recrutement · grade_id · organizational_unit_id · created_at · updated_at

### `professor_profiles`
id · staff_profile_id · laboratoire_id (nullable) · date_prise_fonction (nullable) · date_habilitation (nullable) · specialite (nullable)

### `employee_profiles`
id · staff_profile_id · service_id (nullable) · date_affectation (nullable) · fonction_actuelle (nullable) · situation_familiale (nullable) · nombre_enfants (nullable) · anciennete (nullable) · solde_conge (nullable) · conge_reporte (nullable)

### `organizational_units`
id · code · nom_fr · nom_ar (nullable) · type (`DEPARTEMENT`/`SERVICE`/`LABORATOIRE`) · parent_id (nullable) · is_active

### `grades`
id · code · intitule_fr · intitule_ar · staff_type (nullable) · is_active

### `document_types`
id · code · nom_fr · nom_ar · allowed_role · requires_language · is_active · form_schema_json

### `document_templates`
id · document_type_id · language · version · content · is_active · created_by · created_at

### `requests`
id · reference · requester_id · document_type_id · language (nullable) · status · payload_json · admin_comment (nullable) · rejection_reason (nullable) · submitted_at · processing_started_at · validated_at · rejected_at · completed_at · processed_by · created_at · updated_at · deleted_at

### `request_status_histories`
id · request_id · old_status · new_status · comment (nullable) · changed_by · created_at

### `documents`
id · request_id · template_id (nullable) · type (`PIECE_JOINTE`/`GENERE`/`SIGNE`) · original_name · stored_name · disk · path · mime_type · size · sha256 · uploaded_by · created_at

### `notifications`
id · user_id · type · title · message · data_json · read_at · created_at

### `audit_logs`
id · user_id (nullable) · action · auditable_type · auditable_id (nullable) · old_values_json (nullable) · new_values_json (nullable) · ip_address · user_agent · created_at

---

## 17. API REST complète

**Préfixe global :** `/api/v1`

### 17.1 Authentification
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
POST   /auth/forgot-password
POST   /auth/reset-password
```

### 17.2 Utilisateurs et profils
```
GET    /users
POST   /users
GET    /users/{id}
PATCH  /users/{id}
DELETE /users/{id}
PATCH  /users/{id}/status
GET    /profile
PATCH  /profile/contact
```

### 17.3 Référentiels
```
GET/POST/PATCH/DELETE  /organizational-units
GET/POST/PATCH/DELETE  /grades
GET                     /document-types
```

### 17.4 Demandes
```
GET    /requests
POST   /requests
GET    /requests/{id}
PATCH  /requests/{id}
POST   /requests/{id}/submit
POST   /requests/{id}/cancel

POST   /admin/requests/{id}/start-processing
POST   /admin/requests/{id}/validate
POST   /admin/requests/{id}/reject
POST   /admin/requests/{id}/generate-document
POST   /admin/requests/{id}/upload-signed-document
```

### 17.5 Documents
```
GET    /requests/{id}/documents
GET    /documents/{id}/download
POST   /requests/{id}/attachments
DELETE /requests/{id}/attachments/{documentId}
```

### 17.6 Notifications et dashboard
```
GET    /notifications
POST   /notifications/{id}/read
POST   /notifications/read-all
GET    /dashboard/user
GET    /dashboard/admin
GET    /admin/audit-logs
```

---

## 18. Pages du frontend

### 18.1 Pages publiques
```
/login
/forgot-password
/reset-password
```

### 18.2 Espace professeur / employé
```
/dashboard
/profile
/requests
/requests/new
/requests/[id]
/documents
/notifications
/settings
```

### 18.3 Espace administrateur
```
/admin/dashboard
/admin/users
/admin/users/new
/admin/users/[id]
/admin/requests
/admin/requests/[id]
/admin/document-types
/admin/templates
/admin/organizational-units
/admin/grades
/admin/audit
/admin/settings
```

---

## 19. Génération PDF

**Approche recommandée :**
- Modèles HTML/Blade versionnés.
- CSS spécifique au format A4.
- Support RTL pour l'arabe.
- Génération côté serveur (job asynchrone si nécessaire).
- Moteur PDF compatible arabe et en-têtes officiels.
- Prévisualisation possible avant génération finale.
- Stockage du PDF sur disque privé.

Le moteur doit être isolé derrière une interface `DocumentGeneratorInterface`, permettant de changer de bibliothèque PDF sans toucher à la logique métier.

**Exigences de mise en page :**
- Format A4, logo et en-tête institutionnel.
- Texte français aligné à gauche, texte arabe en RTL lorsque nécessaire.
- Pied de page, marges identiques aux modèles fournis par l'administration.
- Dates et données dynamiques.
- Aucune donnée nominative réelle dans les seeders de démonstration/production.

---

## 20. Règles de validation importantes

- E-mail unique par compte.
- CIN unique si renseignée.
- DOTI/SOM unique.
- Rôle cohérent avec le type de profil (professeur ↔ profil professeur).
- Date de fin ≥ date de début, partout où applicable.
- Type de document toujours vérifié comme autorisé pour le rôle du demandeur.
- Une demande n'est modifiable que tant qu'elle est en `BROUILLON`.
- Une demande n'est annulable qu'avant le début de son traitement.
- Motif obligatoire lors de tout rejet.
- Fichier signé obligatoire pour passer à `DOCUMENT_DISPONIBLE`.
- Vérification systématique de l'autorisation avant tout téléchargement.
- Note de carte de notation strictement limitée au barème défini.
- Total de notation toujours calculé côté serveur, jamais transmis par le client.
- Référence de demande garantie unique.

---

## 21. Exigences non fonctionnelles

### 21.1 Sécurité
Mots de passe hachés · cookies sécurisés en production · CORS limité au frontend autorisé · validation backend systématique · protection contre l'injection SQL via l'ORM · protection XSS · contrôle strict des uploads · rate limiting · logs ne contenant jamais mots de passe ni tokens · secrets exclusivement en variables d'environnement · principe du moindre privilège.

### 21.2 Performance
Pagination de toutes les listes · index SQL adaptés · chargement différé des graphiques du dashboard · jobs asynchrones pour e-mails et génération PDF · cache des référentiels peu volatils.

### 21.3 Ergonomie
Design moderne, clair et professionnel · responsive · messages d'erreur compréhensibles · confirmation avant toute action sensible · badges colorés selon l'état de la demande · recherche, tri et filtres sur les listes · prise en charge complète de l'arabe.

### 21.4 Sauvegarde
Sauvegarde régulière de la base MySQL · sauvegarde des documents stockés · procédure de restauration documentée.

---

## 22. Tests attendus et scénarios d'acceptation

### 22.1 Backend
Tests d'authentification · tests des permissions par rôle · tests des transitions d'état (valides et invalides) · tests des règles de validation · tests d'accès aux documents · tests de génération de référence unique · tests des calculs de notation · tests API de bout en bout sur les parcours principaux.

### 22.2 Frontend
Tests des formulaires · tests de protection des routes selon le rôle · tests d'affichage conditionnel selon le rôle · tests du parcours utilisateur complet · tests des messages d'erreur.

### 22.3 Scénarios d'acceptation

**Scénario A — Attestation de travail (cas nominal)**
1. Un professeur se connecte.
2. Il demande une attestation en français.
3. La demande passe à `EN_ATTENTE`.
4. L'administrateur la passe à `EN_COURS`.
5. Il la valide → `VALIDEE`.
6. Il génère le PDF.
7. Il téléverse le PDF signé → `DOCUMENT_DISPONIBLE`.
8. Le professeur reçoit une notification.
9. Il télécharge uniquement son propre document.

**Scénario B — Rejet**
1. Un employé crée une demande incomplète.
2. L'administrateur la rejette avec un motif.
3. L'employé reçoit une notification contenant le motif.
4. Aucun document final n'est téléchargeable.

**Scénario C — Sécurité**
1. Un professeur tente d'accéder à `/admin/users`.
2. Le frontend bloque la navigation.
3. Même en appel direct à l'API, Laravel retourne `403`.
4. Un utilisateur ne peut jamais télécharger le document d'un autre utilisateur.

---

## 23. Données de démarrage (seeders)

À créer au premier déploiement :
- Les 3 rôles : `ADMIN`, `PROFESSEUR`, `EMPLOYE`.
- Un compte administrateur de développement.
- Les 7 départements initiaux (voir section 5.1).
- Les grades professeurs et employés (voir section 5.2, à compléter).
- Les 9 types de documents (voir section 5.3).
- Les états et permissions nécessaires.
- Des modèles de documents de démonstration, **sans aucune donnée personnelle réelle**.

---

*Fin du cahier des charges détaillé. Ce document sert de référence unique pour le développement — à consommer par phases avec l'agent de développement (voir le guide séparé de développement étape par étape), jamais en un seul bloc.*
