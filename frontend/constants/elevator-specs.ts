/**
 * Constants métier ascenseur / CTQ
 * Référentiel réglementaire FR : Décret n°2004-964 du 9 septembre 2004
 * Arrêté du 11 mars 1977, NF EN 81-xx
 */

// --- Fabricants homologués ---
export const ELEVATOR_MANUFACTURERS = [
    "Otis",
    "Schindler",
    "Kone",
    "TK Elevator (ThyssenKrupp)",
    "Orona",
    "Mistral Ascenseurs",
    "Sodimas",
    "Thyssen",
    "Fichet-Bauche",
    "Lifteurop",
    "Mundus Ascenseurs",
    "GMV",
    "Savoisienne",
    "Autre"
];

// --- Types d'appareil ---
export const DEVICE_TYPES = [
    { label: "Ascenseur (ASC)", value: "ASC" },
    { label: "Monte-charge (MC)", value: "MC" },
    { label: "Élévateur EPMR", value: "EPMR" },
    { label: "Escalier Mécanique (EM)", value: "EM" },
    { label: "Trottoir Roulant (TR)", value: "TR" },
    { label: "Plateforme Élévatrice Verticale (PEV)", value: "PEV" },
];

// --- Types de traction / machinerie ---
export const TRACTION_TYPES = [
    "Électrique à adhérence (câbles)",
    "Électrique avec treuil tambour",
    "Hydraulique à action directe",
    "Hydraulique à action indirecte (câbles)",
    "MRL — Sans local machinerie",
    "Linéaire (moteur linéaire)",
    "Autre",
];

// --- Usage type ---
export const USAGE_TYPES = [
    "Immeuble d'habitation (collectif)",
    "Bureaux / Tertiaire",
    "ERP — Hôtel",
    "ERP — Hôpital / EHPAD",
    "ERP — Commerce / Centre commercial",
    "ERP — Administrations / Musées",
    "Industriel / Entrepôt",
    "Mixte (habitation + commerce)",
    "Privatif (maison individuelle)",
];

// --- Emplacements machinerie ---
export const MACHINERY_LOCATIONS = [
    "Local machinerie en toiture",
    "Local machinerie en partie basse",
    "Local machinerie adjacent",
    "Sans local machinerie (MRL)",
    "Gaine — treuil intégré",
    "Externe à l'immeuble",
];

// --- Statuts anomalie ---
export const ANOMALY_STATUSES = [
    { value: "OPEN",        label: "Ouverte",           color: "destructive" },
    { value: "IN_PROGRESS", label: "En cours",          color: "warning"  },
    { value: "RESOLVED",    label: "Résolue",           color: "success"  },
    { value: "WAIVED",      label: "Levée / Écartée",   color: "neutral"  },
] as const;

// --- Niveaux de sévérité ---
export const SEVERITY_LEVELS = [
    { value: "LOW",      label: "Observation",          css: "severity-low",      icon: "🔵" },
    { value: "MEDIUM",   label: "Prescrit",             css: "severity-medium",   icon: "🟡" },
    { value: "HIGH",     label: "Recommandé (urgent)",  css: "severity-high",     icon: "🟠" },
    { value: "CRITICAL", label: "ARRÊT — Danger immédiat", css: "severity-critical", icon: "🔴" },
] as const;

// --- Statuts de travaux (Work Items) ---
export const WORK_ITEM_STATUSES = [
    { value: "TODO",        label: "À faire",    color: "bg-slate-100  text-slate-700" },
    { value: "IN_PROGRESS", label: "En cours",   color: "bg-amber-100  text-amber-800" },
    { value: "DONE",        label: "Réalisé",    color: "bg-green-100  text-green-800" },
    { value: "CANCELLED",   label: "Annulé",     color: "bg-red-100    text-red-700"   },
] as const;

// --- Rôles intervenants ---
export const ATTENDEE_ROLES = [
    "Contrôleur Technique (OQA)",
    "Inspecteur Bureau de Contrôle",
    "Ascensoriste — Technicien maintenance",
    "Ascensoriste — Chef de chantier",
    "Propriétaire / Bailleur",
    "Syndic de copropriété",
    "Gestionnaire d'immeuble",
    "Occupant / Représentant locataires",
    "Maître d'ouvrage",
    "BET Ascenseurs",
    "Autre",
];

// --- Organismes certificateurs ---
export const CERTIFICATION_BODIES = [
    "Socotec",
    "Bureau Veritas",
    "Apave",
    "Dekra",
    "SGS",
    "Véritas",
    "Qualiconsult",
    "Autre",
];

// --- Raisons d'arrêt réglementaires ---
export const STOP_REASONS = [
    { value: "ART_R125_2_I",   label: "Art. R125-2 I — Arrêt immédiat (danger grave et imminent)" },
    { value: "ART_R125_2_II",  label: "Art. R125-2 II — Mise hors service (défaillance grave)" },
    { value: "PREV_MAINT",     label: "Arrêt maintenance préventive programmée" },
    { value: "TRAVAUX",        label: "Arrêt pour travaux de modernisation" },
    { value: "SIGNALEMENT",    label: "Arrêt sur signalement occupant" },
    { value: "AUTRE",          label: "Autre motif" },
];

// --- Codes observation checklist (NF EN 81 / Décret 2004-964) ---
export const OBSERVATION_CODE_LABELS: Record<string, string> = {
    "1A": "Observation — Point de sécurité à corriger sous 6 mois",
    "1B": "Prescrit — Travaux obligatoires (décret modernisation)",
    "2A": "Recommandation — Amélioration souhaitée",
    "3A": "Information — Constat sans incidence sécurité",
    "AD": "Arrêt de Danger — Mise hors service immédiate",
    "NC": "Non Conforme",
    "NA": "Non Applicable",
    "SO": "Sans Objet",
};

// --- Codes APE ascenseurs (NAF) ---
export const APE_CODES_ASCENSEURS = [
    { code: "43.29B", label: "Installation d'équipements thermiques et de climatisation" },
    { code: "43.21A", label: "Travaux d'installation électrique dans tous locaux" },
    { code: "28.22Z", label: "Fabrication de matériel de levage et de manutention" },
    { code: "33.12Z", label: "Réparation de machines et équipements mécaniques" },
    { code: "43.29A", label: "Pose de cloisons et de faux-plafonds" },
    { code: "81.10Z", label: "Services d'entretien des bâtiments" },
];
