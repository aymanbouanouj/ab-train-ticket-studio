# AB TRAIN — Third-party licenses, provenance and attribution

This file describes independently sourced material used or referenced by AB TRAIN. **Copyright © 2026 Ayman Bounaouj** applies to the author's original contributions only. The AB TRAIN software license in [LICENSE](LICENSE) does **not** replace any third-party rights or convert separately licensed media and data to AGPL.

## 1. Destination photographs — Wikimedia Commons

The four photographs distributed in `public/fidelity/` retain the original photographers' credits, license references and change descriptions in [public/fidelity/image-credits.json](public/fidelity/image-credits.json) and [public/fidelity/credits.html](public/fidelity/credits.html).

| Local file | Credited author | License | Source |
| --- | --- | --- | --- |
| `public/fidelity/marrakech.jpg` | YassirZek | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sunset_behind_Koutoubia.jpg) |
| `public/fidelity/fes.jpg` | Yair Haklai | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bab_Bou_Jeloud-Fez.jpg) |
| `public/fidelity/rabat.jpg` | Radosław Botev | [CC BY 3.0 Poland](https://creativecommons.org/licenses/by/3.0/pl/deed.en) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hassan_Tower_Rabat_2007.jpg) |
| `public/fidelity/tangier.jpg` | Herbert wie | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Panorama_Tanger_Bay_Tangier_Marokko.jpg) |

Existing credit records describe unchanged Wikimedia thumbnails displayed with CSS cropping and text contrast overlays. CC BY-SA requirements for adaptations, where applicable, still apply to the relevant works. **These photographs are not the author's reserved AB TRAIN artwork.**

## 2. Geographic and railway source data

- **GeoNames:** `data/places.json` and related geographic metadata contain adapted records derived from the [GeoNames Morocco extract](https://download.geonames.org/export/dump/MA.zip), attributed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Records were filtered and normalized for the application. See [GeoNames terms](https://www.geonames.org/export/).
- **Haut-Commissariat au Plan (HCP):** derived city/commune classifications and labels reference HCP's 2014/2024 sources. Reuse is subject to [HCP reuse conditions](https://www.hcp.ma/Conditions-generales-d-utilisation-Version-1-0_a2194.html), including source attribution and appropriate modification notices. This is **not** an assertion that all HCP site materials are openly licensed.
- **ONCF:** station names and evidence files contain factual references, cited official source URLs and source-review metadata. Original timetable PDFs, maps and proprietary downloads are not redistributed. No ONCF endorsement, permission over original publisher materials, or official booking functionality is claimed.

For precise source dates, data transformations, coverage, IDs and links, consult [docs/GEOGRAPHIC-DATA-PROVENANCE.md](docs/GEOGRAPHIC-DATA-PROVENANCE.md).

## 3. Social icons and brand names

`public/icons/github.svg` and `public/icons/linkedin.svg` were sourced from [Simple Icons](https://simpleicons.org/) version 11.15.0. The supplied copyright waiver text is retained in [public/icons/SIMPLE-ICONS-LICENSE.md](public/icons/SIMPLE-ICONS-LICENSE.md) ([CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)). Individual platform names and marks can also be protected under trademark rules; CC0 does not grant trademark rights.

Beacons appears as a text link only. The Beacons raster mark was expressly **excluded** from the published source and site. Nothing here claims rights to any third-party company name or trademark.

## 4. NPM packages and build dependencies

AB TRAIN uses third-party npm dependencies (including `jspdf`, `qrcode`, `vite`, Playwright-related testing packages and their transitive dependencies) declared in `package.json` and the locked versions in `package-lock.json`.

Each third-party package remains governed by its **own actual license and copyright notices**, which must be retained and complied with wherever applicable. See its package distribution, published license and attribution notices. The author's AGPL selection for original AB TRAIN source does **not** relicense those dependencies.

No `node_modules` directory is committed in this repository. Any new bundled third-party code or asset requires checking its actual license before distribution.

## 5. Original software and original AB TRAIN artwork

For clarity: original authored software is **AGPL-3.0-only**, whereas the owner's separately identified original AB TRAIN artwork/branding is **All Rights Reserved**. See [COPYRIGHT.md](COPYRIGHT.md). Third-party content cannot be designated as owner-created merely because it appears within the project.

This notice is informational and does not replace the legally operative licenses, official source credit records, or applicable law.
