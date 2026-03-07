# HODDI Import Guide

This backend includes `import_hoddi` to ingest HODDI-style CSV files into:
- `medication_interaction_knowledge` (2+ drug combinations)
- `medication_side_effects` (single-drug side effects)

## 1) Clone HODDI (data source)

```bash
git clone https://github.com/TIML-Group/HODDI.git /tmp/HODDI
```

## 2) Import a single file

```bash
cd securemed-backend
python manage.py import_hoddi \
  --path /tmp/HODDI/dataset/HODDI_v2/.../2024Q1_positive_samples_condition123_SE_above_0.9.csv \
  --dataset-version HODDI_v2
```

## 3) Import an entire folder recursively

```bash
python manage.py import_hoddi \
  --path /tmp/HODDI/dataset/HODDI_v2 \
  --dataset-version HODDI_v2
```

## 4) Optional side-effect label mapping

If the input has coded side effects (for example `SE_above_0.9` CUI values), pass a map CSV:

```bash
python manage.py import_hoddi \
  --path /tmp/HODDI/dataset/HODDI_v2 \
  --dataset-version HODDI_v2 \
  --side-effect-map /tmp/HODDI/dataset/HODDI_v2/dictionary/Side_effects_unique.csv
```

The map CSV should include recognizable columns like:
- code: `umls_cui_from_meddra` / `umls_cui` / `SE_above_0.9`
- label: `side_effect_name` / `recommended_meddra_term` / `term` / `side_effect`

## 5) Optional DrugBank ID -> Name map

To let the checker resolve UI names (e.g. `Aspirin`) to imported DrugBank IDs (e.g. `DB00945`), load a drug map:

```bash
python manage.py import_hoddi \
  --path /tmp/HODDI/dataset/HODDI_v2 \
  --dataset-version HODDI_v2 \
  --drug-map /path/to/drugbank_id_to_name.csv
```

Expected columns include:
- ID: `drugbank_id` / `DrugBank ID` / `drugbankid`
- Name: `name` / `drug_name` / `generic_name`

### Auto-detection (HODDI layout)

If `--drug-map` is omitted, importer will auto-detect the official HODDI dictionary map when the input path is under a `HODDI_v*` dataset tree:

- `dictionary/Drugbank_ID_SMILE_all_structure links.csv`

Explicit `--drug-map` always takes precedence over auto-detection.

## Docker-first import command

From `securemed-backend`, run import inside Docker and mount the root `HODDI` clone read-only:

```bash
docker compose -f docker-compose.runtime.yml run --rm -T \
  -v /home/anuruprkris/Project/SecureMed/HODDI:/hoddi:ro \
  backend python manage.py import_hoddi \
  --path /hoddi/dataset/HODDI_v2/HODDI/HGNN/positive_samples \
  --dataset-version HODDI_v2 \
  --side-effect-map /hoddi/dataset/HODDI_v2/dictionary/Side_effects_unique.csv \
  --truncate --strict --batch-size 20000
```

## Supported Input Schemas

The importer auto-detects common schemas:

1. HODDI style:
- `DrugBankID`
- `SE_above_0.9`
- optional `hyperedge_label` (defaults to import only positive label `1`)

2. Generic style:
- `drugs`
- `side_effect`
- optional `severity`, `description`

## Notes

- Use `--truncate` to clear existing imported knowledge before reloading.
- Use `--include-negative` only if you intentionally want `hyperedge_label != 1` rows imported.
- Use `--strict` to fail import when rows are skipped due to malformed or filtered input.

## Import QA Summary

After import, generate an operational summary report:

```bash
python manage.py hoddi_import_qa --source-version HODDI_v2
```

This prints JSON with counts, combination-size distribution, severity distribution, and top side effects.

## Report and Check APIs

After import + migration, use:

- `POST /api/medical-records/drug-interactions/check/`
  - body: `{ "medications": ["Aspirin", "Warfarin", "Ibuprofen"] }`
  - response includes `evaluated_combination_depth` and `not_evaluated_depths`
- `GET /api/medical-records/drug-interactions/search/?q=asp`
- `GET /api/medical-records/drug-interactions/reports/latest/?patient_id=<id>`
- `GET /api/medical-records/drug-interactions/reports/?patient_id=<id>`
- `POST /api/medical-records/drug-interactions/reports/generate/`
  - body: `{ "patient_id": <id> }` for doctor/admin, empty body for patient self

Report regeneration also happens automatically on prescription create/sign/cancel/dispense events.
