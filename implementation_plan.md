# Roadmap CTQ v3 — Extension 360 & Workflow Métier Avancé

L'objectif de cette phase est de consolider l'application pour offrir une **vue 360 sur le cycle de vie complet d'un ascenseur** (parc/asset), en y intégrant toutes les typologies d'interventions métiers (AMO, Expertise, Amiante, etc.), tout en finalisant les fonctionnalités manquantes du MVP (Checklists dynamiques, Mails, Signatures).

## User Review Required
> [!IMPORTANT]
> **Modèle de Données `ServiceType`** : Nous allons devoir adapter la base de données pour inclure les nouveaux types d'interventions (Expertise, AMO, Amiante...). Es-tu d'accord pour que le système utilise une grille générique (Checklist standardisée) pour ces nouvelles interventions, ou ont-elles des rapports radicalement différents du CTQ ?
>
> **Envoi d'E-mails** : Pour la phase de production, souhaites-tu utiliser un service spécifique (SendGrid, Mailgun) ou préfères-tu que l'on implémente d'abord un SMTP standard ?

## Proposed Changes

---

### Phase 1 : Expansion du Référentiel Métier (Service Types)
Ajout des nouvelles typologies d'interventions dans le système de configuration de l'application pour couvrir tout l'éventail de vos prestations.
#### [MODIFY] `scripts/seed_full_ctq.py`
- Insertion en base de données de toutes les nouvelles prestations :
  - Expertise Ponctuelle
  - Assistance Ponctuelle
  - Assistance Périodique
  - Expertise et Assistance Périodique
  - Assistance à Maîtrise d'ouvrage (AMO)
  - Contrôle Achèvement de Travaux
  - Repérage Amiante Avant Travaux
  - Passation

---

### Phase 2 : Vue 360 de l'Équipement (Asset Lifecycle & UX Smart)
Refonte de la page de l'ascenseur pour centraliser l'historique et les documents classés par intervention.
#### [MODIFY] `frontend/app/(app)/assets/[id]/page.tsx`
- **Timeline d'Interventions** : Affichage d'une frise chronologique regroupant toutes les missions (passées et prévues) sur cet ascenseur.
- **Arborescence Documentaire** : Zone de gestion des documents (Rapports PDF, Devis métiers, Attestations) classés hiérarchiquement par type d'intervention et avec un système de versioning clair.
- **Bouton d'Action Smart** : Ajout d'un bouton contextuel "Déclencher une nouvelle intervention" (Ex: Déclencher un CTQ ou une Expertise sur cet équipement spécifique).

---

### Phase 3 : Finalisation Grille d'Audit & Anomalies
#### [MODIFY] `frontend/components/missions/compliance/ChecklistGrid.tsx`
- **i18n & UX** : Traduction intégrale en français de la grille.
- **Workflow "Non Conforme" (NOK)** : Lorsqu'un technicien clique sur "NOK", ouverture automatique du modal d'anomalie (`AddAnomalyModal`) pré-rempli avec le code de l'article réglementaire concerné.

---

### Phase 4 : Analytics & Tableau de Bord
#### [NEW] `app/api/routers/dashboard.py`
- Création d'un endpoint `GET /dashboard/stats` agrégeant les données du parc : taux de conformité, nombre total de réserves ouvertes, compteurs par criticité.
#### [MODIFY] `frontend/app/(app)/dashboard/page.tsx`
- Intégration de la librairie graphique (`Recharts`).
- Affichage de jauges circulaires de conformité et de l'historique des contrôles réalisés vs à planifier.

---

### Phase 5 : Signature Électronique & Notifications
#### [MODIFY] `frontend/components/missions/MissionConclusionTab.tsx`
- Ajout d'un encart de "Capture de Signature" (via pad tactile ou souris) pour le technicien et le client.
#### [NEW] `app/services/notifications.py`
- Implémentation d'un mini-moteur SMTP pour l'envoi asynchrone des e-mails avec en pièce jointe ou en lien direct les rapports PDF signés (connecté aux interrupteurs de la page Paramètres).

## Open Questions
- Sur l'**Arborescence des documents** : Doit-on permettre à vos clients d'accéder à ce portail (Rôle Viewer) pour télécharger leurs propres rapports, ou est-ce exclusivement pour les techniciens internes SaaS Ascenseurs ?
- Concernant les nouveaux types de missions (AMO, Amiante) : Ont-ils besoin d'un nouveau format de PDF spécifique tout de suite, ou on se concentre d'abord sur la structure globale et l'historique de vie de l'ascenseur ?

## Verification Plan
### Automated Tests
- Lancement de la génération d'un rapport avec la boucle complète : `Checklist NOK -> Anomalie créée -> Signature -> PDF Produit`.
### Manual Verification
- Naviguer sur l'équipement "Ascenseur Bâtiment A", constater la "Timeline" contenant un "Repérage Amiante" et un "CTQ", et vérifier qu'on peut y télécharger les différentes versions des documents (v1, v2).
