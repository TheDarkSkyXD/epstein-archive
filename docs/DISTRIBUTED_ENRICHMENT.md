# Distributed AI Enrichment

## Two Approaches

### Option A: Exo Cluster (Recommended for macOS 26.2+)

Uses Apple's Thunderbolt 5 RDMA for automatic distributed inference. All Macs act as one unified LLM.

**Setup:**

```bash
# On each Mac
pip install exo
exo  # Starts discovery and joins cluster automatically
```

**Run enrichment:**

```bash
AI_PROVIDER=exo_cluster npx tsx scripts/ai_enrich_batch.ts
```

No ID partitioning needed - Exo distributes work automatically!

---

### Option B: Manual ID-Range Partitioning (Any macOS)

Each Mac processes a specific ID range independently. Results merged at the end.

## Prerequisites (Option B Only)

1. **Clone the repo** (or git pull if already cloned)
2. **Install Ollama**: `brew install ollama`
3. **Pull the model**: `ollama pull llama3.2:1b`
4. **Start Ollama**: `ollama serve` (run in background terminal)
5. **Copy the database**: Transfer `epstein-archive.db` (~1.9GB) to each Mac

## Load Distribution (Option B)

| Mac         | RAM  | ID Range          | Documents | Command   |
| :---------- | :--- | :---------------- | :-------- | :-------- |
| M5 MBP      | 32GB | 1 - 305,000       | ~305k     | See below |
| M4 Pro Mini | 24GB | 305,001 - 610,000 | ~305k     | See below |
| M2 MBA      | 8GB  | 610,001 - 763,780 | ~153k     | See below |

## Exact Commands

### Mac 1: M5 MBP (32GB)

```bash
cd epstein-archive
ID_START=1 ID_END=305000 OUTPUT_DIR=./enrichment_mac1 npx tsx scripts/ai_enrich_batch.ts
```

### Mac 2: M4 Pro Mini (24GB)

```bash
cd epstein-archive
ID_START=305001 ID_END=610000 OUTPUT_DIR=./enrichment_mac2 npx tsx scripts/ai_enrich_batch.ts
```

### Mac 3: M2 MBA (8GB)

```bash
cd epstein-archive
ID_START=610001 ID_END=763780 OUTPUT_DIR=./enrichment_mac3 npx tsx scripts/ai_enrich_batch.ts
```

## Monitoring Progress

Each script will show:

- Real-time progress percentage
- Processing rate (docs/second)
- ETA for completion

Checkpoints are saved every 1000 documents. If interrupted, simply re-run the same command to resume.

## Merging Results

After all Macs complete:

1. **Collect all output folders** to one machine (the master)
2. **Combine outputs**:
   ```bash
   mkdir -p enrichment_results
   cp enrichment_mac1/*.json enrichment_results/
   cp enrichment_mac2/*.json enrichment_results/
   cp enrichment_mac3/*.json enrichment_results/
   ```
3. **Run the merge script**:

   ```bash
   # Dry run first to verify
   DRY_RUN=true npx tsx scripts/merge_enrichments.ts

   # Apply for real
   npx tsx scripts/merge_enrichments.ts
   ```

## Estimated Time

| Mac    | Rate (est.) | Time      |
| :----- | :---------- | :-------- |
| M5 MBP | ~1.5 docs/s | ~56 hours |
| M4 Pro | ~1.2 docs/s | ~70 hours |
| M2 MBA | ~0.8 docs/s | ~53 hours |

**Total wall-clock time: ~70 hours (3 days)** running in parallel vs. ~9 days on one machine.
