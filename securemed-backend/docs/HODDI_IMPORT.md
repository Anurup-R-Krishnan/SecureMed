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
  --version HODDI_v2
```

## 3) Import an entire folder recursively

```bash
python manage.py import_hoddi \
  --path /tmp/HODDI/dataset/HODDI_v2 \
  --version HODDI_v2
```

## 4) Optional side-effect label mapping

If the input has coded side effects (for example `SE_above_0.9` CUI values), pass a map CSV:

```bash
python manage.py import_hoddi \
  --path /tmp/HODDI/dataset/HODDI_v2 \
  --version HODDI_v2 \
  --side-effect-map /tmp/HODDI/dataset/HODDI_v2/dictionary/Side_effects_unique.csv
```

The map CSV should include recognizable columns like:
- code: `umls_cui_from_meddra` / `umls_cui` / `SE_above_0.9`
- label: `recommended_meddra_term` / `term` / `side_effect`

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
