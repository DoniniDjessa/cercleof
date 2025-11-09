export interface CascadeSubTranches {
  formes: string[]
  benefices: string[]
}

export interface CascadeNode {
  tranche_principale: string
  sous_tranches: CascadeSubTranches
}

export interface CategoryCascade {
  [domaine: string]: CascadeNode[]
}

const BASE_CASCADE = [
  {
    tranche_principale: "Soin du visage",
    sous_tranches: {
      formes: [
        "Crème",
        "Gel",
        "Huile",
        "Lotion",
        "Masque",
        "Sérum",
        "Mousse",
        "Tonique",
        "Eau micellaire",
        "Gommage / Exfoliant",
        "Contour des yeux"
      ],
      benefices: [
        "Hydratant",
        "Nourrissant",
        "Purifiant",
        "Anti-âge",
        "Éclaircissant",
        "Apaisant",
        "Matifiant",
        "Réparateur",
        "Anti-taches",
        "Démaquillant"
      ]
    }
  },
  {
    tranche_principale: "Soin du corps",
    sous_tranches: {
      formes: [
        "Lait",
        "Crème",
        "Huile",
        "Beurre",
        "Lotion",
        "Gommage",
        "Gel",
        "Baume",
        "Sérum",
        "Huile de massage",
        "Bain moussant / Sels de bain"
      ],
      benefices: [
        "Hydratant",
        "Nourrissant",
        "Raffermissant",
        "Éclaircissant",
        "Apaisant",
        "Exfoliant",
        "Régénérant",
        "Anti-vergetures",
        "Nettoyant"
      ]
    }
  },
  {
    tranche_principale: "Soin des cheveux",
    sous_tranches: {
      formes: [
        "Shampoing",
        "Après-shampoing",
        "Masque",
        "Huile",
        "Sérum",
        "Crème coiffante",
        "Spray",
        "Lotion",
        "Gel / Cire coiffante"
      ],
      benefices: [
        "Nourrissant",
        "Réparateur",
        "Hydratant",
        "Anti-chute",
        "Lissant",
        "Volume",
        "Brillance",
        "Anti-frisottis",
        "Purifiant"
      ]
    }
  },
  {
    tranche_principale: "Hygiène",
    sous_tranches: {
      formes: [
        "Savon",
        "Gel douche",
        "Mousse",
        "Déodorant",
        "Dentifrice",
        "Lingettes",
        "Crème / Mousse à raser",
        "Après-rasage",
        "Bain de bouche"
      ],
      benefices: [
        "Nettoyant",
        "Purifiant",
        "Désodorisant",
        "Antibactérien",
        "Apaisant",
        "Hydratant",
        "Éclaircissant"
      ]
    }
  },
  {
    tranche_principale: "Maquillage",
    sous_tranches: {
      formes: [
        "Fond de teint",
        "Poudre",
        "Rouge à lèvres",
        "Mascara",
        "Crayon",
        "Gloss",
        "Fard",
        "Spray fixateur",
        "Anti-cernes / Correcteur",
        "Base de teint (Primer)",
        "Démaquillant spécifique",
        "Blush / Highlighter"
      ],
      benefices: [
        "Couvrant",
        "Matifiant",
        "Illuminateur",
        "Hydratant",
        "Longue tenue",
        "Brillant"
      ]
    }
  },
  {
    tranche_principale: "Parfum & senteur",
    sous_tranches: {
      formes: [
        "Parfum",
        "Eau de toilette",
        "Brume",
        "Déodorant parfumé",
        "Huile parfumée"
      ],
      benefices: [
        "Fraîcheur",
        "Tenue longue",
        "Doux",
        "Intense",
        "Naturel"
      ]
    }
  },
  {
    tranche_principale: "Solaire",
    sous_tranches: {
      formes: [
        "Crème solaire",
        "Huile bronzante",
        "Lait solaire",
        "Spray",
        "Après-soleil",
        "Autobronzant"
      ],
      benefices: [
        "Protection solaire",
        "Hydratant",
        "Apaisant",
        "Rafraîchissant",
        "Brunissant",
        "Réparateur"
      ]
    }
  },
  {
    tranche_principale: "Soin des mains et pieds",
    sous_tranches: {
      formes: [
        "Crème",
        "Baume",
        "Lotion",
        "Gommage",
        "Masque",
        "Vernis",
        "Huile",
        "Dissolvant"
      ],
      benefices: [
        "Hydratant",
        "Nourrissant",
        "Adoucissant",
        "Réparateur",
        "Fortifiant ongles",
        "Anti-gerçures"
      ]
    }
  },
  {
    tranche_principale: "Soin spécifique / dermatologique",
    sous_tranches: {
      formes: ["Crème", "Gel", "Sérum", "Lotion", "Baume", "Spray"],
      benefices: [
        "Anti-acné",
        "Anti-taches",
        "Anti-âge",
        "Réparateur",
        "Apaisant",
        "Hydratant profond",
        "Peaux sensibles"
      ]
    }
  }
];

const cloneCascade = (nodes: CascadeNode[]): CascadeNode[] =>
  nodes.map(node => ({
    tranche_principale: node.tranche_principale,
    sous_tranches: {
      formes: [...node.sous_tranches.formes],
      benefices: [...node.sous_tranches.benefices]
    }
  }));

export const CATEGORY_CASCADE: CategoryCascade = {
  cosmetics: cloneCascade(BASE_CASCADE),
  COB: cloneCascade(BASE_CASCADE)
};

