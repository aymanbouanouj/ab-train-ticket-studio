# Geographic data provenance and coverage

This documentation describes the unchanged data snapshot and existing station registry in the release candidate. It does not refresh any dataset or certify current railway operations.

## Entity types and measured scope

| Entity / measure | Included scope |
| --- | ---: |
| GeoNames populated-place records | 46,879 |
| Scoped HCP urban entities | 221 |
| Explicit municipalities in the classification source | 215 |
| Arrondissement-based city aggregates | 6 |
| Additional commune records with unconfirmed urban classification | 2 |
| Application station records | 22 |
| Station records marked serviceable in the application | 22 |
| Stations explicitly mapped to one of the scoped HCP cities | 20 |
| Distinct mapped HCP cities | 16 |

The two station records without a scoped HCP city ID are Bouskoura and Mohammed V Airport. Their station identity remains distinct from geographic commune/city identity. No missing city ID is filled by guessing.

The HCP classification covers 221 specified urban entities, not every later urban reclassification or every settlement. GeoNames localities, HCP communes/cities and railway stations have different IDs and purposes. Matching text never establishes that two entities are identical.

All geographic records remain available to the geographic APIs. Booking autocomplete searches **only the 22 eligible registry stations**. A city-name query may match station aliases or city labels attached to a registry station; it never makes the geographic city selectable.

## GeoNames

[GeoNames Morocco extract](https://download.geonames.org/export/dump/MA.zip), retrieved 14 October 2026, is used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution: GeoNames. See [GeoNames terms](https://www.geonames.org/export/) and [extract documentation](https://download.geonames.org/export/dump/readme.txt).

The import retains country MA, feature class P, without a population threshold, and excludes abandoned, historical and destroyed populated places. Stable IDs, coordinates, administrative region codes, aliases and feature codes are retained/normalized for search. These adaptations are not endorsed by GeoNames. The source is community-maintained and supplied without a completeness, accuracy or timeliness guarantee. Source country attribution is reproduced without taking a position on territorial status.

The included data/places.json and data/geography-meta.json are sufficient for normal runtime. The separately downloaded raw dump is not part of the candidate.

## HCP geographic classification and factual extraction

Sources retained by reference:

- [RGPH 2024 catalogue](https://www.hcp.ma/downloads/RGPH-2024_t22752.html).
- [RGPH 2024 legal population tables](https://www.hcp.ma/file/242342/): commune names/codes and per-record page references.
- [RGPH 2014 classification workbook](https://www.rgph2014.hcp.ma/file/166326/): explicit municipality classifications and Arabic toponyms, reconciled to 2024 source codes.
- [HCP reuse conditions](https://www.hcp.ma/Conditions-generales-d-utilisation-Version-1-0_a2194.html).

The documented classification identifies 215 explicitly labelled municipalities and six city aggregates. Matching uses stable administrative codes rather than a name-only merge. It reconciles those 221 identities to the 1,503 commune rows in the 2024 source; the other 1,282 are outside that selected urban scope. This is not proof that later classifications have not changed.

The six city aggregates are Tanger, Fès, Rabat, Salé, Casablanca and Marrakech. Belyounech and Ait Amira remain separately labelled communes with unconfirmed urban status, not invented municipalities or stations.

Factual names/codes, Arabic aliases, scope and page references are attributed to HCP. Records are extracted, filtered, normalized and adapted for local search; they are not HCP-endorsed products. HCP’s current terms permit reuse of specified data indicators subject to attribution, integrity and disclosure of changes. That permission must not be generalized to all HCP site content, graphics or raw documents. Existing source-specific restrictions remain applicable.

The candidate includes derived application JSON, attribution metadata and source hashes. Raw HCP PDFs/workbooks and extraction working files are not redistributed. Historical source hashes in data/official-city-coverage.json identify excluded inputs; they do not require those inputs for normal installation, runtime or tests.

## Station eligibility and ONCF source evidence

The registry contains **22** station IDs, kept separate from geographic IDs and from the deterministic booking model. Existing evidence was retrieved on 14 October 2026, with passenger timetable evidence effective 14 September 2026. The recorded later station review did not establish a fresh live operational inventory.

[ONCF downloads](https://www.oncf.ma/fr/Voyageurs/Relation-client/Telechargements) is the referenced publisher page. The source URLs, dates, reviewed pages and hashes remain in data/station-evidence.json and data/station-source-audit.json. Referenced corridors include Marrakech–Fès, Casa Port–Kénitra, Tanger–Kénitra and Casa–Airport.

Station aliases and canonical saved-booking names/IDs are unchanged. data/station-presentation.json supplies display names for French, Arabic and Spanish. The data files are historical evidence, not a live station availability service.

Some observedNotInventoried lists are retained historical source observations. Entries such as Bouskoura and the airport were subsequently represented in the existing 22-record registry; those old lists must not be presented as the current missing-station list. No dataset is rewritten to hide that limitation.

Only factual station/source metadata is included. Cached ONCF timetable PDFs, maps and reports are excluded; no general public redistribution permission for those originals is claimed. No official timetable times or fares were imported into bookings, and the interface does not imply ONCF affiliation or authorization.

## Simulated services and limits

The four existing simulated corridors are Atlas, Northern, Coastal and Airport. Selecting two registered stations does not guarantee a supported direct simulated service. Where offered, connections are explicit separate bookings; no nearby-station service is inferred from geography. Prices, train numbers, seats and schedules remain deterministic demo data, including next-day arrival metadata for overnight airport runs.

This candidate is not a complete list of Moroccan settlements or railway stations, does not establish current passenger stopping patterns, and cannot sell an official reservation. Source access failures, stale classifications and incomplete national coverage remain limitations rather than reasons to invent stations or routes.

## Attribution and reproduction boundaries

No source data, station ID, alias, evidence, schedule or geographic record was modified while updating this document. Maintain GeoNames/HCP attribution, source-specific terms, dates, source/page references and adaptation notices when distributing derived data.

Included scripts support the existing local index audit and GeoNames refresh from a separately obtained public dump. Full HCP PDF/workbook reconstruction and source-download working files are outside the publication candidate. Do not run import/audit writers as part of an automatic publication check without a separate data-review task.

This data-specific attribution does not override external source terms or grant rights over third-party images, trademarks or libraries. Original AB TRAIN software source is licensed under AGPL-3.0-only (root LICENSE); original AB TRAIN branding and separate artwork have rights reserved (COPYRIGHT.md). Individual data, photo, icon and library terms are recorded in THIRD_PARTY_NOTICES.md. Publisher-side source restrictions remain applicable.
