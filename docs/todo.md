# MenuData Schema Documentation

This document describes the schema and structure for the menuData, including all existing data. The backoffice app should use this to dynamically generate forms and manage the data in Supabase.

## Type Definitions

### MediaItem
```typescript
{
  type: "image" | "video";
  src: string;
  label?: string;  // Optional label for the media
}
```

### GalleryMediaItem
```typescript
{
  type: "image" | "video";
  src: string;
}
```

### Service
```typescript
{
  title: string;                    // Required: Service title
  description: string;              // Required: Service description
  image?: string;                   // Optional: Main image URL
  heroMedia?: MediaItem;            // Optional: Hero media (video/image with optional label)
  fallbackVideo?: string;           // Optional: Fallback video URL
  price?: string;                   // Optional: Price (e.g., "5 000 FCFA", "Sur devis")
  duration?: string;                // Optional: Duration (e.g., "40 minutes", "1 heure")
  tags?: string[];                  // Optional: Array of tag strings
  media?: MediaItem[];              // Optional: Array of media items
  galleryMedia?: GalleryMediaItem[]; // Optional: Array of gallery media items
}
```

### SubCategory
```typescript
{
  title: string;                    // Required: SubCategory title
  subtitle: string;                 // Required: SubCategory subtitle
  description?: string;             // Optional: SubCategory description
  video: string;                    // Required: Video URL (preferably YouTube Shorts)
  services: Service[];              // Required: Array of services
}
```

### MenuCategory
```typescript
{
  title: string;                    // Required: Category title
  subtitle: string;                 // Required: Category subtitle
  video: string;                    // Required: Video URL (preferably YouTube Shorts)
  subCategories?: SubCategory[];    // Optional: Array of subcategories
  services?: Service[];             // Optional: Array of services (if no subCategories)
}
```

### MenuData
```typescript
MenuCategory[]  // Array of MenuCategory objects
```

## Notes

- **Video URLs**: All videos should be YouTube Shorts URLs (vertical format 9:16)
  - Format: `https://youtube.com/shorts/VIDEO_ID` or `https://youtu.be/VIDEO_ID`
  - The `@` prefix is supported and will be automatically removed during processing
  
- **Price**: Can be a specific amount (e.g., "5 000 FCFA") or "Sur devis" for quote-based pricing

- **Hierarchy**: A MenuCategory can either have:
  - Direct services (`services` array)
  - OR subcategories (`subCategories` array), where each subcategory has its own services
  - Never both at the same level

## Existing Data (JSON)

```json
[
  {
    "title": "Spéciale Coiffure",
    "subtitle": "Stylisations & soins du cheveux",
    "video": "https://youtube.com/shorts/jpDuH5i4wSQ",
    "services": [
      {
        "title": "Chion",
        "description": "Nettoyage précis et harmonisation de la coupe.",
        "image": "https://fr.pinterest.com/pin/13159023901251260/",
        "fallbackVideo": "https://youtube.com/shorts/SHBomeVJkHM?feature=share",
        "price": "5 000 FCFA",
        "duration": "40 minutes",
        "tags": ["Coupe", "Nettoyage"],
        "media": [
          {
            "type": "video",
            "src": "https://cdn.coverr.co/videos/coverr-hairdresser-trims-the-ends-2089/1080p.mp4",
            "label": "Finitions"
          }
        ],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/13159023901251260/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/569353577886905074/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/92323861108015540/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5418462043482874/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/11399805458525432/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/59180182597195575/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/55943220365802265/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/911486412122587853/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/633387442840267/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/71565081580442966/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4606971405259904256/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/140806234181636/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/32228953578486302/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/307370743339881553/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/2392606048379136/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/31103053674671174/" }
        ]
      },
      {
        "title": "Shampoing",
        "description": "Bain lavant, massage cuir chevelu et soin express.",
        "image": "https://fr.pinterest.com/pin/418623727885389541/",
        "heroMedia": {
          "type": "video",
          "src": "https://youtube.com/shorts/SHBomeVJkHM?feature=share"
        },
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hair-wash-2-4460/1080p.mp4",
        "price": "3 000 FCFA",
        "duration": "25 minutes",
        "tags": ["Nettoyage", "Massage"],
        "media": [
          {
            "type": "video",
            "src": "https://cdn.coverr.co/videos/coverr-hair-wash-2-4460/1080p.mp4",
            "label": "Massage cuir chevelu"
          }
        ],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/418623727885389541/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/894246069769888268/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/50172983344138015/" }
        ]
      },
      {
        "title": "Entretien de perruque",
        "description": "Nettoyage, soin et remise en forme de vos perruques favorites.",
        "image": "https://fr.pinterest.com/pin/327707310408464369/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hairdresser-styling-wig-4187/1080p.mp4",
        "price": "5 000 FCFA",
        "duration": "45 minutes",
        "tags": ["Wig care", "Stylisation"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/327707310408464369/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/20688479532607113/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/474426142018660876/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/42080577765168441/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/583145851792883599/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/1015491415996307309/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/23925441767261782/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/531495193545077220/" }
        ]
      },
      {
        "title": "Pose perruque",
        "description": "Pose professionnelle, fixation invisible et finition naturelle.",
        "image": "https://www.pinterest.com/pin/32299322323414627/",
        "heroMedia": {
          "type": "video",
          "src": "https://cdn.coverr.co/videos/coverr-hairdresser-puts-a-wig-3711/1080p.mp4"
        },
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hairdresser-puts-a-wig-3711/1080p.mp4",
        "price": "10 000 FCFA",
        "duration": "1 heure",
        "tags": ["Pose", "Stylisme"]
      },
      {
        "title": "Marcoussis",
        "description": "Technique traditionnelle pour un volume maîtrisé.",
        "image": "https://fr.pinterest.com/pin/23292123067474545/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-braiding-hair-7307/1080p.mp4",
        "price": "5 000 FCFA",
        "duration": "1 heure",
        "tags": ["Volume", "Tresses"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/23292123067474545/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/536421005630686673/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4574037113514863/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/115123334218510060/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/84020349290502801/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/9077636742026606/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/318629742409851312/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/774124929182085/" }
        ]
      },
      {
        "title": "Locks",
        "description": "Création ou entretien de locks parfaites.",
        "image": "https://fr.pinterest.com/pin/140806232892326/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-fresh-locs-5042/1080p.mp4",
        "price": "25 000 FCFA",
        "duration": "2 heures",
        "tags": ["Locks", "Longue durée"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/140806232892326/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4644405855000325/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/2392606046198272/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/749567931772066278/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/9288742977251883/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/2111131072055284/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/744782857165140745/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/12525705207933519/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4292562140673384/" }
        ]
      },
      {
        "title": "Micro twist",
        "description": "Torsades fines et régulières pour un rendu naturel.",
        "image": "https://fr.pinterest.com/pin/140806232892326/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-braids-creation-8872/1080p.mp4",
        "price": "25 000 FCFA",
        "duration": "2 h 30",
        "tags": ["Torsades", "Protective style"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/140806232892326/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4644405855000325/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/2392606046198272/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/749567931772066278/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/9288742977251883/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/2111131072055284/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/744782857165140745/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/12525705207933519/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4292562140673384/" }
        ]
      },
      {
        "title": "Natte",
        "description": "Nattes classiques et finitions soignées.",
        "image": "https://fr.pinterest.com/pin/12103492741116467/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-african-hair-braiding-7702/1080p.mp4",
        "price": "2 000 FCFA",
        "duration": "45 minutes",
        "tags": ["Coiffure", "Classique"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/12103492741116467/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/3377768467850562/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/256845984995412689/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5770305769284168/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/422281210836350/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/803751864739316733/" }
        ]
      },
      {
        "title": "Défrichage",
        "description": "Réduction de volume et assouplissement du cheveu.",
        "image": "https://fr.pinterest.com/pin/423971752431643886/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hair-treatment-process-0961/1080p.mp4",
        "price": "3 000 FCFA",
        "duration": "1 heure",
        "tags": ["Soin", "Lissage"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/423971752431643886/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/1052294269185823029/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/281543715645413/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/143270831892894669/" }
        ]
      },
      {
        "title": "Mise en forme",
        "description": "Brushing ou mise en pli sur mesure.",
        "image": "https://fr.pinterest.com/pin/568649890446171253/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-styling-hair-0590/1080p.mp4",
        "price": "5 000 FCFA",
        "duration": "50 minutes",
        "tags": ["Brushing", "Stylisation"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/568649890446171253/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/269582727687627732/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/32932641016504002/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/352195633380742021/" }
        ]
      },
      {
        "title": "Confection de perruque",
        "description": "Création artisanale de perruque à votre mesure.",
        "image": "https://fr.pinterest.com/pin/654218283406999471/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-wig-styling-session-4361/1080p.mp4",
        "price": "7 000 FCFA",
        "duration": "Sur commande",
        "tags": ["Sur-mesure", "Création"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/654218283406999471/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/15762667443531021/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/508977195405902226/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/14144186325717443/" }
        ]
      },
      {
        "title": "Rajout tissage",
        "description": "Pose de tissage pour densité et longueur accrue.",
        "image": "https://fr.pinterest.com/pin/46161964927133561/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hair-weaving-press-2312/1080p.mp4",
        "price": "5 000 FCFA",
        "duration": "1 h 30",
        "tags": ["Tissage", "Extension"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/46161964927133561/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/29484572556400635/" }
        ]
      },
      {
        "title": "Tresse tout mèche sans mèche",
        "description": "Tresses complètes avec votre volume naturel.",
        "image": "https://fr.pinterest.com/pin/2322237302181671/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-african-braids-formation-9338/1080p.mp4",
        "price": "20 000 FCFA",
        "duration": "3 heures",
        "tags": ["Protective style"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/2322237302181671/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4362930883854229/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/45880489945508437/" }
        ]
      },
      {
        "title": "Tresse tout mèche avec mèche",
        "description": "Tresses complètes avec ajout de mèches pour plus de volume.",
        "image": "https://fr.pinterest.com/pin/351912465618264/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hair-braiding-with-extensions-0080/1080p.mp4",
        "price": "30 000 FCFA",
        "duration": "3 h 30",
        "tags": ["Volume", "Protective style"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/351912465618264/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/9288742973303453/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/1005850898001821118/" }
        ]
      },
      {
        "title": "Tresse mèche coupée en deux sans mèche",
        "description": "Tresses élégantes avec mèche sectionnée pour finesse.",
        "image": "https://fr.pinterest.com/pin/6192518232711864/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-creating-braids-2080/1080p.mp4",
        "price": "15 000 FCFA",
        "duration": "2 h 30",
        "tags": ["Finesse"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/6192518232711864/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/91831279895631632/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4855512094692389/" }
        ]
      },
      {
        "title": "Tresse mèche coupée en deux avec mèche",
        "description": "Finitions délicates avec ajout de mèches fines pour plus de style.",
        "image": "https://fr.pinterest.com/pin/6192518232711864/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-intricate-hair-braids-4582/1080p.mp4",
        "price": "20 000 FCFA",
        "duration": "3 heures",
        "tags": ["Finesse", "Volume"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/6192518232711864/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/91831279895631632/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4855512094692389/" }
        ]
      }
    ]
  },
  {
    "title": "Spécial Sourcils",
    "subtitle": "Architecture du regard",
    "video": "https://youtube.com/shorts/lFgFkMaeeaI",
    "services": [
      {
        "title": "Microblading",
        "description": "Poil à poil pour des sourcils naturellement dessinés.",
        "image": "https://fr.pinterest.com/pin/140806233250441/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-perfect-brows-9891/1080p.mp4",
        "price": "60 000 FCFA",
        "duration": "2 heures",
        "tags": ["Poil à poil", "Naturel"],
        "media": [
          {
            "type": "video",
            "src": "https://cdn.coverr.co/videos/coverr-perfect-brows-9891/1080p.mp4",
            "label": "Technique"
          }
        ],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/140806233250441/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/187321665746446728/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/281543721320771/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/13088655162899560/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/289356344852670772/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/95490454606241765/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/13299761395488528/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/25755029112792672/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5066618330849176/" }
        ]
      },
      {
        "title": "Microshading",
        "description": "Effet ombré poudré pour un rendu maquillage tout en douceur.",
        "image": "https://fr.pinterest.com/pin/43839796370623127/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-brow-shading-artist-7241/1080p.mp4",
        "price": "80 000 FCFA",
        "duration": "2 h 30",
        "tags": ["Ombre", "Effet maquillage"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/43839796370623127/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/187321665746446728/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/281543721320771/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/13088655162899560/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/289356344852670772/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/95490454606241765/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/13299761395488528/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/25755029112792672/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5066618330849176/" }
        ]
      },
      {
        "title": "Combinaison du microblading + shading + air strock",
        "description": "Mix haute couture pour un regard structuré et intense.",
        "image": "https://www.pinterest.com/pin/69172544273031228/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-brow-lamination-closeup-6423/1080p.mp4",
        "price": "210 000 FCFA",
        "duration": "3 heures",
        "tags": ["Signature", "Intensité"],
        "galleryMedia": [
          { "type": "image", "src": "https://www.pinterest.com/pin/69172544273031228/" },
          { "type": "image", "src": "https://www.pinterest.com/pin/92675704829117763/" },
          { "type": "image", "src": "https://www.pinterest.com/pin/8725793022018746/" }
        ]
      },
      {
        "title": "Brolifth",
        "description": "Lamination des sourcils pour un effet lifté et discipliné.",
        "image": "https://www.pinterest.com/pin/633387443990394/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-brow-lamination-steps-2816/1080p.mp4",
        "price": "25 000 FCFA",
        "duration": "1 h 15",
        "tags": ["Lamination", "Discipline"],
        "galleryMedia": [
          { "type": "image", "src": "https://www.pinterest.com/pin/633387443990394/" },
          { "type": "image", "src": "https://www.pinterest.com/pin/140806233900221/" },
          { "type": "image", "src": "https://www.pinterest.com/pin/3659243439396298/" }
        ]
      }
    ]
  },
  {
    "title": "Spécial Makeup",
    "subtitle": "Maquillages sur-mesure",
    "video": "https://youtube.com/shorts/R7R8POEhxC4",
    "services": [
      {
        "title": "Make-up effet bonne mine (sans faux cils)",
        "description": "Teint lumineux, regard frais, résultat discret.",
        "image": "https://fr.pinterest.com/pin/11681280280164650/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-makeup-artist-in-action-5314/1080p.mp4",
        "price": "10 000 FCFA",
        "tags": ["Glow", "Naturel"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/11681280280164650/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/6333255724157284/" }
        ]
      },
      {
        "title": "Make-up effet bonne mine (avec faux cils)",
        "description": "Ajout de cils pour intensifier le regard.",
        "image": "https://fr.pinterest.com/pin/297448750416468369/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-makeup-with-false-lashes-9722/1080p.mp4",
        "price": "15 000 FCFA",
        "tags": ["Cils", "Intensité"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/297448750416468369/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/338544097003490313/" }
        ]
      },
      {
        "title": "Make-up nude",
        "description": "Palette neutre et harmonies douces pour toutes occasions.",
        "image": "https://fr.pinterest.com/pin/17592254792661180/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-nude-makeup-application-2120/1080p.mp4",
        "price": "20 000 FCFA",
        "tags": ["Nude", "Élégance"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/17592254792661180/" }
        ]
      },
      {
        "title": "Make-up nuit",
        "description": "Rendu profond et lumineux pour vos soirées.",
        "image": "https://fr.pinterest.com/pin/1055599906963225/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-evening-makeup-look-6104/1080p.mp4",
        "price": "20 000 FCFA",
        "tags": ["Soirée", "Smokey"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/1055599906963225/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5629568275609067/" }
        ]
      },
      {
        "title": "Make-up shoot",
        "description": "Contrastes photo-ready et tenue longue durée.",
        "image": "https://fr.pinterest.com/pin/3799980928919115/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-photoshoot-makeup-session-0833/1080p.mp4",
        "price": "25 000 FCFA",
        "tags": ["Studio", "Haute définition"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/3799980928919115/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5629568275609067/" }
        ]
      },
      {
        "title": "Make-up glamour",
        "description": "Signature C&B : regards captants, lèvres sculptées.",
        "image": "https://fr.pinterest.com/pin/297448750416468369/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-glamour-makeup-artist-0981/1080p.mp4",
        "price": "50 000 FCFA",
        "tags": ["Glam", "Intense"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/297448750416468369/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/140806234475269/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5629568275609067/" }
        ]
      },
      {
        "title": "Make-up anniversaire",
        "description": "Palette festive personnalisée selon votre tenue.",
        "image": "https://fr.pinterest.com/pin/150237337564327820/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-birthday-makeup-2341/1080p.mp4",
        "price": "35 000 FCFA",
        "tags": ["Fête", "Coloré"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/150237337564327820/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/5629568275609067/" }
        ]
      },
      {
        "title": "Make-up cérémonie",
        "description": "Look cérémonial avec finition longue tenue.",
        "image": "https://fr.pinterest.com/pin/150237337564327820/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-ceremony-makeup-6798/1080p.mp4",
        "price": "À partir de 60 000 FCFA",
        "tags": ["Cérémonie", "Prestige"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/150237337564327820/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/150237337564327820/" }
        ]
      },
      {
        "title": "Make-up demoiselle d'honneur",
        "description": "Teint lumineux coordonné à l'univers du mariage.",
        "image": "https://fr.pinterest.com/pin/14707136280866774/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-bridesmaid-makeup-2203/1080p.mp4",
        "price": "À partir de 15 000 FCFA",
        "tags": ["Mariage", "Harmonie"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/14707136280866774/" }
        ]
      },
      {
        "title": "Make-up mariage - Dot",
        "description": "Signature traditionnelle sublimant vos traits naturels.",
        "image": "https://fr.pinterest.com/pin/14707136280866774/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-traditional-bridal-makeup-2839/1080p.mp4",
        "price": "70 000 FCFA",
        "tags": ["Tradition", "Éclat"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/14707136280866774/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/70437489212900/" }
        ]
      },
      {
        "title": "Make-up mariage - Civil",
        "description": "Look élégiant et lumineux pour la mairie.",
        "image": "https://fr.pinterest.com/pin/5066618330618599/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-civil-wedding-makeup-6721/1080p.mp4",
        "price": "100 000 FCFA",
        "tags": ["Civil", "Élégance"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/5066618330618599/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/4925880837519965/" },
          { "type": "image", "src": "https://fr.pinterest.com/pin/70437489212900/" }
        ]
      },
      {
        "title": "Make-up mariage - Religieux",
        "description": "Maquillage sacré et raffiné pour la cérémonie.",
        "image": "https://fr.pinterest.com/pin/13159023905867272/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-religious-ceremony-makeup-0996/1080p.mp4",
        "price": "100 000 FCFA",
        "tags": ["Religieux", "Tenue longue"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/13159023905867272/" }
        ]
      },
      {
        "title": "Make-up dame de compagnie",
        "description": "Coiffées-maquillées en harmonie avec la mariée.",
        "image": "https://fr.pinterest.com/pin/13159023905867272/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-bridal-party-prep-2090/1080p.mp4",
        "price": "60 000 FCFA",
        "tags": ["Cortège", "Coordination"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/13159023905867272/" }
        ]
      },
      {
        "title": "Make-up demoiselle d'honneur (pack)",
        "description": "Tarif préférentiel pour groupe à partir de 10 000 FCFA.",
        "image": "https://fr.pinterest.com/pin/13159023905867272/",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-bridesmaids-getting-ready-9918/1080p.mp4",
        "price": "À partir de 10 000 FCFA",
        "tags": ["Pack", "Équipe"],
        "galleryMedia": [
          { "type": "image", "src": "https://fr.pinterest.com/pin/13159023905867272/" }
        ]
      }
    ]
  },
  {
    "title": "Spécial Ongles",
    "subtitle": "Pieds & mains impeccables",
    "video": "https://youtube.com/shorts/T1YC7iN5VJw",
    "subCategories": [
      {
        "title": "Ongles avec acrylique",
        "subtitle": "Longue tenue et finitions personnalisées",
        "video": "https://youtube.com/shorts/St6Tvm2wijU",
        "services": [
          {
            "title": "Court",
            "description": "Pose courte classique pour un look naturel.",
            "image": "https://fr.pinterest.com/pin/1970393583718418/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-acrylic-nails-application-1112/1080p.mp4",
            "price": "10 000 FCFA",
            "tags": ["Naturel", "Résistant"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/1970393583718418/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/4433299629806334/" }
            ]
          },
          {
            "title": "Court avec design",
            "description": "Décors graphiques ou délicats selon vos envies.",
            "image": "https://fr.pinterest.com/pin/19703317113649574/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-nail-art-details-4486/1080p.mp4",
            "price": "15 000 FCFA",
            "tags": ["Design", "Créatif"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/19703317113649574/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/414260865744450238/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/9499849209945709/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/645562927876714965/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/5911043260505272/" }
            ]
          },
          {
            "title": "Long",
            "description": "Allongement élégant pour un effet glamour.",
            "image": "https://fr.pinterest.com/pin/885027764296858616/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-long-nails-creation-6746/1080p.mp4",
            "price": "20 000 FCFA",
            "tags": ["Longueur", "Stylé"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/885027764296858616/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/633387443151133/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/12314598977401181/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/11259067813648989/" }
            ]
          },
          {
            "title": "Long avec design",
            "description": "Créations artistiques, strass, dégradés et effets spéciaux.",
            "image": "https://fr.pinterest.com/pin/472385448436944932/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-creative-nail-design-5025/1080p.mp4",
            "price": "25 000 FCFA",
            "tags": ["Art", "Premium"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/472385448436944932/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868558699047/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/1970393583881670/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/27795722695910472/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/7740630606119608/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2814818510772117/" }
            ]
          }
        ]
      },
      {
        "title": "Vernis semi-permanent",
        "subtitle": "Brillance et tenue impeccable",
        "video": "https://youtube.com/shorts/tDZCHWgeCBY",
        "services": [
          {
            "title": "Court (main)",
            "description": "Couleur uniforme et finition brillante.",
            "image": "https://fr.pinterest.com/pin/292171094599848259/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-gel-polish-application-5537/1080p.mp4",
            "price": "5 000 FCFA",
            "tags": ["Brillance", "Express"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/292171094599848259/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868558155969/" }
            ]
          },
          {
            "title": "Pieds",
            "description": "Application précise sur les ongles de pieds.",
            "image": "https://fr.pinterest.com/pin/292171094599848259/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-pedicure-polish-application-2252/1080p.mp4",
            "price": "2 000 FCFA",
            "tags": ["Pieds", "Couleur"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/292171094599848259/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868558155969/" }
            ]
          },
          {
            "title": "Court avec design",
            "description": "Touches artistiques et jeux de couleurs.",
            "image": "https://fr.pinterest.com/pin/1125968711522203/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-detailed-nail-art-5582/1080p.mp4",
            "price": "7 000 FCFA",
            "tags": ["Design", "Original"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/1125968711522203/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/844493674098086/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/1055599908595876/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/68749160955/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/11681280279577688/" }
            ]
          },
          {
            "title": "Long",
            "description": "Finition uniforme pour poses longues.",
            "image": "https://fr.pinterest.com/pin/168533211051073067/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-long-gel-nails-2219/1080p.mp4",
            "price": "7 000 FCFA",
            "tags": ["Longueur"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/168533211051073067/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/3307399721450742/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/47498971065453473/" }
            ]
          },
          {
            "title": "Long avec design",
            "description": "Créations détaillées sur bases longues.",
            "image": "https://fr.pinterest.com/pin/492649954154946/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-nail-art-master-0928/1080p.mp4",
            "price": "8 000 FCFA",
            "tags": ["Créatif", "Brillant"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/492649954154946/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/422282902578017050/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/985231164131926/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/320388961006968125/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/14847873766968808/" }
            ]
          }
        ]
      },
      {
        "title": "Pédicure & Manucure",
        "subtitle": "Soin complet des mains & pieds",
        "video": "https://youtube.com/shorts/TLzq15WNPeY",
        "services": [
          {
            "title": "Pédicure classique",
            "description": "Nettoyage, limage et finition de l'ongle.",
            "image": "https://fr.pinterest.com/pin/14073817580600639/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-pedicure-treatment-7808/1080p.mp4",
            "price": "2 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/14073817580600639/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/5840674509395550/" }
            ]
          },
          {
            "title": "Manicure classique",
            "description": "Soin express des mains avec mise en forme.",
            "image": "https://fr.pinterest.com/pin/292171094599848259/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-fast-manicure-service-0760/1080p.mp4",
            "price": "1 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/292171094599848259/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868558155969/" }
            ]
          },
          {
            "title": "Pédicure & manucure classique",
            "description": "Combo essentiel pour mains et pieds soignés.",
            "image": "https://fr.pinterest.com/pin/281543725237141/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-manicure-and-pedicure-combo-2045/1080p.mp4",
            "price": "3 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/281543725237141/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/91620173664675652/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/1196337404763803/" }
            ]
          },
          {
            "title": "Pédicure Spa",
            "description": "Bain aromatique, gommage, masque et massage.",
            "image": "https://fr.pinterest.com/pin/396809417190209890/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-luxury-spa-pedicure-7732/1080p.mp4",
            "price": "10 000 FCFA",
            "tags": ["Spa", "Relax"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/396809417190209890/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/133348838960970125/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/350295677287696525/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/86835099526575694/" }
            ]
          },
          {
            "title": "Manicure Spa",
            "description": "Rituel complet pour des mains satinées.",
            "image": "https://fr.pinterest.com/pin/292171094599848259/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-spa-manicure-treatment-2211/1080p.mp4",
            "price": "5 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/292171094599848259/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868558155969/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/1759287346942844/" }
            ]
          },
          {
            "title": "Pédicure & manucure Spa",
            "description": "Expérience sensorielle coordonnée mains & pieds.",
            "image": "https://fr.pinterest.com/pin/350506783516143671/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-spa-manicure-and-pedicure-0906/1080p.mp4",
            "price": "15 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/350506783516143671/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/18366310976364349/" }
            ]
          },
          {
            "title": "Pédicure médicale (ongles incarnés)",
            "description": "Soin spécifique pour soulager et rééquilibrer.",
            "image": "https://fr.pinterest.com/pin/710724384985670475/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-medical-pedicure-care-5408/1080p.mp4",
            "price": "15 000 FCFA",
            "tags": ["Soin médicalisé"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/710724384985670475/" }
            ]
          }
        ]
      }
    ]
  },
  {
    "title": "Spécial Épilation",
    "subtitle": "Douceur longue durée",
    "video": "https://youtube.com/shorts/38gs_w0CpO4?feature=share",
    "subCategories": [
      {
        "title": "Zones sensibles",
        "subtitle": "Précision & douceur",
        "video": "https://youtube.com/shorts/NaB52ZZIUZU",
        "services": [
          {
            "title": "Maillot",
            "description": "Épilation adaptée à votre morphologie.",
            "image": "https://fr.pinterest.com/pin/2251868557946676/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-waxing-procedure-5521/1080p.mp4",
            "price": "20 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868557946676/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/9781324184892482/" }
            ]
          },
          {
            "title": "Aisselles",
            "description": "Soin rapide et net avec finition apaisante.",
            "image": "https://fr.pinterest.com/pin/2251868557836777/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-underarm-waxing-utility-6620/1080p.mp4",
            "price": "5 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868557836777/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/322148179614232365/" }
            ]
          },
          {
            "title": "Barbe",
            "description": "Rééquilibrage des lignes et finition douce.",
            "image": "https://fr.pinterest.com/pin/20547742047536747/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-barber-waxing-0581/1080p.mp4",
            "price": "5 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/20547742047536747/" }
            ]
          },
          {
            "title": "Sourcils",
            "description": "Nettoyage précis des arcades.",
            "image": "https://fr.pinterest.com/pin/64457838417899040/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-eyebrow-waxing-2218/1080p.mp4",
            "price": "5 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/64457838417899040/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/114630753014982352/" }
            ]
          }
        ]
      },
      {
        "title": "Grandes zones",
        "subtitle": "Jambes & bras parfaitement lisses",
        "video": "https://youtube.com/shorts/kL5Y2a7mtrQ?feature=share",
        "services": [
          {
            "title": "Jambes",
            "description": "Épilation complète, douceur longue durée.",
            "image": "https://fr.pinterest.com/pin/2462974790367424/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-leg-waxing-treatment-5524/1080p.mp4",
            "price": "15 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/2462974790367424/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2251868557946676/" }
            ]
          },
          {
            "title": "Bras",
            "description": "Traitement intégral avec touche d'aloe vera.",
            "image": "https://fr.pinterest.com/pin/8303580558355896/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-arm-waxing-procedure-0899/1080p.mp4",
            "price": "10 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/8303580558355896/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/2603712279202243/" }
            ]
          }
        ]
      }
    ]
  },
  {
    "title": "Spécial Soins Visage",
    "subtitle": "Diagnostics personnalisés",
    "video": "https://youtube.com/shorts/PX5gtdr923s",
    "subCategories": [
      {
        "title": "Soins ponctuels",
        "subtitle": "Traiter et révéler l'éclat immédiatement",
        "video": "https://youtube.com/shorts/hxsj-S4q9lQ",
        "services": [
          {
            "title": "Soin purifiant / nettoyant",
            "description": "Nettoyage profond et purification du teint.",
            "image": "https://fr.pinterest.com/pin/788200372326543810/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-facial-cleansing-7024/1080p.mp4",
            "price": "10 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/788200372326543810/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/122652789845101713/" }
            ]
          },
          {
            "title": "Soin hydratant",
            "description": "Hydratation intense et repulpante.",
            "image": "https://fr.pinterest.com/pin/7388786883433748/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hydrating-facial-treatment-8154/1080p.mp4",
            "price": "10 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/7388786883433748/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/325103666864252126/" }
            ]
          },
          {
            "title": "Soin apaisant",
            "description": "Calme les irritations et rougeurs.",
            "image": "https://fr.pinterest.com/pin/39125090510149225/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-calming-facial-treatment-0400/1080p.mp4",
            "price": "10 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/39125090510149225/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/69876231723820007/" }
            ]
          },
          {
            "title": "Soin détox",
            "description": "Détoxication cutanée et éclat naturel.",
            "image": "https://fr.pinterest.com/pin/296533956736705094/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-detox-facial-treatment-5199/1080p.mp4",
            "price": "15 000 FCFA",
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/296533956736705094/" }
            ]
          }
        ]
      },
      {
        "title": "Traitements esthétiques",
        "subtitle": "Technologies de pointe non invasives",
        "video": "https://youtube.com/shorts/4QdvKSoDjCo",
        "services": [
          {
            "title": "Soin HydraFacial",
            "description": "Multi-actions pour nettoyer, exfolier et hydrater intensément.",
            "image": "https://fr.pinterest.com/pin/353603008262610414/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hydrafacial-treatment-8672/1080p.mp4",
            "price": "25 000 FCFA",
            "tags": ["Glow", "Hydratation"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/353603008262610414/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/892838694886127510/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/3307399719816241/" }
            ],
            "media": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/353603008262610414/", "label": "Protocole" },
              {
                "type": "video",
                "src": "https://cdn.coverr.co/videos/coverr-hydrafacial-treatment-8672/1080p.mp4",
                "label": "Application"
              },
              { "type": "image", "src": "https://fr.pinterest.com/pin/892838694886127510/", "label": "Résultat" }
            ]
          },
          {
            "title": "Microneedling",
            "description": "Stimulation du collagène pour une peau lissée et repulpée.",
            "image": "https://fr.pinterest.com/pin/333336809939898183/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-microneedling-procedure-4219/1080p.mp4",
            "price": "25 000 FCFA",
            "tags": ["Anti-âge"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/333336809939898183/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/7810999349531327/" }
            ]
          },
          {
            "title": "HydraFacial + Microneedling",
            "description": "Combo signature pour un résultat longue durée.",
            "image": "https://fr.pinterest.com/pin/18436679719878289/",
            "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hydrafacial-and-microneedling-5371/1080p.mp4",
            "price": "30 000 FCFA",
            "tags": ["Signature", "Intensif"],
            "galleryMedia": [
              { "type": "image", "src": "https://fr.pinterest.com/pin/18436679719878289/" },
              { "type": "image", "src": "https://fr.pinterest.com/pin/556827941449602944/" }
            ]
          }
        ]
      }
    ]
  },
  {
    "title": "Spécial Gommage & Massages..",
    "subtitle": "Exfoliation et relaxation absolues",
    "video": "https://youtube.com/shorts/0qJDY8QwbLs",
    "services": [
      {
        "title": "Gommage mécanique (physique)",
        "description": "Exfoliation aux grains fins pour lisser le grain de peau.",
        "image": "https://images.pexels.com/photos/4348078/pexels-photo-4348078.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-scrub-treatment-8242/1080p.mp4",
        "price": "25 000 FCFA"
      },
      {
        "title": "Gommage mécanique avec soins visage",
        "description": "Combo exfoliant + soin sur-mesure.",
        "image": "https://images.pexels.com/photos/3865689/pexels-photo-3865689.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-body-scrub-and-facial-2391/1080p.mp4",
        "price": "30 000 FCFA"
      },
      {
        "title": "Gommage chimique (peeling)",
        "description": "Peeling doux adapté à votre phototype.",
        "image": "https://images.pexels.com/photos/3997981/pexels-photo-3997981.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-chemical-peel-8094/1080p.mp4",
        "price": "Sur devis"
      },
      {
        "title": "Gommage mécanique + chimique",
        "description": "Action combinée pour un éclat maximal.",
        "image": "https://images.pexels.com/photos/3865679/pexels-photo-3865679.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-dual-exfoliation-8472/1080p.mp4",
        "price": "50 000 FCFA"
      },
      {
        "title": "Gommage mécanique + chimique + soins visage",
        "description": "Notre rituel complet pour une peau transformée.",
        "image": "https://images.pexels.com/photos/3865675/pexels-photo-3865675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-ultimate-body-treatment-2189/1080p.mp4",
        "price": "60 000 FCFA"
      },
      {
        "title": "Gommage enzymatique (bio)",
        "description": "Formule douce aux enzymes végétales.",
        "image": "https://images.pexels.com/photos/6621296/pexels-photo-6621296.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-natural-enzyme-peel-2031/1080p.mp4",
        "price": "50 000 FCFA"
      },
      {
        "title": "Massage suédois (45 min)",
        "description": "Manœuvres profondes pour relâcher les tensions.",
        "image": "https://images.pexels.com/photos/3865686/pexels-photo-3865686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-swedish-massage-session-4485/1080p.mp4",
        "price": "30 000 FCFA",
        "duration": "45 minutes"
      },
      {
        "title": "Massage californien (1h - 1h30)",
        "description": "Gestes enveloppants pour apaiser corps et esprit.",
        "image": "https://images.pexels.com/photos/3865681/pexels-photo-3865681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-californian-massage-0382/1080p.mp4",
        "price": "Sur devis",
        "duration": "60 à 90 minutes"
      },
      {
        "title": "Massage aux pierres chaudes (45 min)",
        "description": "Pierres volcaniques pour une détente profonde.",
        "image": "https://images.pexels.com/photos/3865673/pexels-photo-3865673.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-hot-stone-massage-1109/1080p.mp4",
        "price": "Sur devis",
        "duration": "45 minutes"
      },
      {
        "title": "VVIP - Couple",
        "description": "Jacuzzi + sauna + soins relaxants ou massage plus buts + champagne.",
        "image": "https://images.pexels.com/photos/3865673/pexels-photo-3865673.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-luxury-spa-experience-1121/1080p.mp4",
        "price": "250 000 FCFA",
        "duration": "2h 30",
        "tags": ["VIP", "Premium", "Couple"]
      },
      {
        "title": "VVIP - 1 personne",
        "description": "Jacuzzi + sauna + soins relaxants ou massage plus buts + champagne.",
        "image": "https://images.pexels.com/photos/3865673/pexels-photo-3865673.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-luxury-spa-experience-1121/1080p.mp4",
        "price": "130 000 FCFA",
        "duration": "2h 30",
        "tags": ["VIP", "Premium"]
      },
      {
        "title": "VIP - Couple",
        "description": "Expérience relaxante pour deux personnes.",
        "image": "https://images.pexels.com/photos/3865681/pexels-photo-3865681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-couples-massage-3321/1080p.mp4",
        "price": "180 000 FCFA",
        "duration": "1h 30",
        "tags": ["VIP", "Couple"]
      },
      {
        "title": "VIP - 1 personne",
        "description": "Expérience relaxante individuelle.",
        "image": "https://images.pexels.com/photos/3865681/pexels-photo-3865681.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-californian-massage-0382/1080p.mp4",
        "price": "115 000 FCFA",
        "duration": "1h 30",
        "tags": ["VIP"]
      },
      {
        "title": "C & B Classique - Massage relaxant et bien être",
        "description": "Massage relaxant pour votre bien-être.",
        "image": "https://images.pexels.com/photos/3865686/pexels-photo-3865686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-relaxing-massage-6678/1080p.mp4",
        "price": "100 000 FCFA",
        "tags": ["Classique", "Relaxant"]
      },
      {
        "title": "C & B Classique - Massage plus buts",
        "description": "Massage thérapeutique avec objectifs ciblés.",
        "image": "https://images.pexels.com/photos/3865686/pexels-photo-3865686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-therapeutic-massage-8854/1080p.mp4",
        "price": "120 000 FCFA",
        "tags": ["Classique", "Thérapeutique"]
      },
      {
        "title": "C&B Standard - Massage relaxant et bien être",
        "description": "Massage relaxant pour votre bien-être.",
        "image": "https://images.pexels.com/photos/3865686/pexels-photo-3865686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-relaxing-massage-6678/1080p.mp4",
        "price": "50 000 FCFA",
        "tags": ["Standard", "Relaxant"]
      },
      {
        "title": "C&B Standard - Massage plus but",
        "description": "Massage thérapeutique avec objectifs ciblés.",
        "image": "https://images.pexels.com/photos/3865686/pexels-photo-3865686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-therapeutic-massage-8854/1080p.mp4",
        "price": "60 000 FCFA",
        "tags": ["Standard", "Thérapeutique"]
      },
      {
        "title": "Gommage formule couple - Gommage mécanique + l'hammam",
        "description": "Gommage mécanique suivi d'un passage à l'hammam pour 2 personnes.",
        "image": "https://images.pexels.com/photos/4348078/pexels-photo-4348078.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-scrub-treatment-8242/1080p.mp4",
        "price": "50 000 FCFA",
        "tags": ["Couple", "Hammam"]
      },
      {
        "title": "Gommage formule couple - Gommage mécanique + l'hammam + soins visage",
        "description": "Gommage mécanique, hammam et soins visage pour 2 personnes.",
        "image": "https://images.pexels.com/photos/3865689/pexels-photo-3865689.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-body-scrub-and-facial-2391/1080p.mp4",
        "price": "60 000 FCFA",
        "tags": ["Couple", "Hammam", "Visage"]
      },
      {
        "title": "Gommage formule couple - Gommage chimique (ou peeling) + l'hammam",
        "description": "Gommage chimique ou peeling suivi d'un passage à l'hammam pour 2 personnes.",
        "image": "https://images.pexels.com/photos/3997981/pexels-photo-3997981.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-chemical-peel-8094/1080p.mp4",
        "price": "60 000 FCFA",
        "tags": ["Couple", "Hammam", "Peeling"]
      },
      {
        "title": "Gommage formule couple - Gommage chimique + l'hammam + soins de visage",
        "description": "Gommage chimique, hammam et soins de visage pour 2 personnes.",
        "image": "https://images.pexels.com/photos/3865675/pexels-photo-3865675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-chemical-peel-facial-8105/1080p.mp4",
        "price": "70 000 FCFA",
        "tags": ["Couple", "Hammam", "Peeling", "Visage"]
      },
      {
        "title": "Gommage formule couple - Gommage chimique + mécanique",
        "description": "Combinaison gommage chimique et mécanique pour 2 personnes.",
        "image": "https://images.pexels.com/photos/3865679/pexels-photo-3865679.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-dual-exfoliation-8472/1080p.mp4",
        "price": "100 000 FCFA",
        "tags": ["Couple", "Combo"]
      },
      {
        "title": "Gommage formule couple - Gommage chimique + mécanique + soins visage",
        "description": "Gommage chimique et mécanique avec soins visage pour 2 personnes.",
        "image": "https://images.pexels.com/photos/3865675/pexels-photo-3865675.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "fallbackVideo": "https://cdn.coverr.co/videos/coverr-ultimate-body-treatment-2189/1080p.mp4",
        "price": "120 000 FCFA",
        "tags": ["Couple", "Combo", "Visage"]
      }
    ]
  }
]
```

## Form Generation Guidelines

### MenuCategory Form Fields:
- `title` (text, required)
- `subtitle` (text, required)
- `video` (url, required) - YouTube Shorts preferred
- Choice: Either add `services` array OR `subCategories` array (mutually exclusive)

### SubCategory Form Fields:
- `title` (text, required)
- `subtitle` (text, required)
- `description` (textarea, optional)
- `video` (url, required) - YouTube Shorts preferred
- `services` (array of Service objects, required)

### Service Form Fields:
- `title` (text, required)
- `description` (textarea, required)
- `image` (url, optional) - Main image URL
- `heroMedia` (object, optional) - Single MediaItem
  - `type` (select: "image" | "video", required if heroMedia is set)
  - `src` (url, required if heroMedia is set)
  - `label` (text, optional)
- `fallbackVideo` (url, optional)
- `price` (text, optional) - Can be "Sur devis" or specific amount
- `duration` (text, optional) - e.g., "40 minutes", "1 heure"
- `tags` (array of strings, optional)
- `media` (array of MediaItem objects, optional)
- `galleryMedia` (array of GalleryMediaItem objects, optional)

### MediaItem Form Fields:
- `type` (select: "image" | "video", required)
- `src` (url, required)
- `label` (text, optional)

### GalleryMediaItem Form Fields:
- `type` (select: "image" | "video", required)
- `src` (url, required)

## Supabase Schema Suggestions

Consider creating the following tables:

1. **menu_categories** - stores MenuCategory data (id, title, subtitle, video, created_at, updated_at)
2. **sub_categories** - stores SubCategory data (id, category_id, title, subtitle, description, video, created_at, updated_at)
3. **services** - stores Service data (id, category_id, subcategory_id, title, description, image, fallback_video, price, duration, created_at, updated_at)
4. **service_tags** - stores tags (id, service_id, tag_name)
5. **media_items** - stores MediaItem data (id, service_id, type, src, label, order_index)
6. **gallery_media_items** - stores GalleryMediaItem data (id, service_id, type, src, order_index)

Note: Use `order_index` fields to maintain the order of items in arrays when storing in relational database.
