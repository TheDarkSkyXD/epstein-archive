import Database from 'better-sqlite3';

// Get DB Path
const dbPath = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(dbPath);

console.log(`Open DB: ${dbPath}`);

function computeCommunities() {
  console.time('Graph Load');

  // 1. Load Nodes
  // We only care about nodes that have edges, but let's load all canonicals to be safe.
  const nodes = db
    .prepare(`SELECT DISTINCT canonical_id FROM entities WHERE canonical_id IS NOT NULL`)
    .all() as { canonical_id: number }[];
  const nodeIds = nodes.map((n) => String(n.canonical_id));
  const nodeMap = new Map<
    string,
    { id: string; community: string; neighbors: Map<string, number> }
  >();

  nodeIds.forEach((id) => {
    nodeMap.set(id, { id, community: id, neighbors: new Map() });
  });

  // 2. Load Edges
  const edges = db
    .prepare(
      `
        SELECT 
            s.canonical_id as source, 
            t.canonical_id as target,
            MAX(er.strength) as weight
        FROM entity_relationships er
        JOIN entities s ON er.source_entity_id = s.id
        JOIN entities t ON er.target_entity_id = t.id
        WHERE s.canonical_id != t.canonical_id
        GROUP BY s.canonical_id, t.canonical_id
    `,
    )
    .all() as { source: number; target: number; weight: number }[];

  edges.forEach((e) => {
    const s = String(e.source);
    const t = String(e.target);

    if (nodeMap.has(s) && nodeMap.has(t)) {
      const w = e.weight || 1;
      nodeMap.get(s)!.neighbors.set(t, (nodeMap.get(s)!.neighbors.get(t) || 0) + w);
      nodeMap.get(t)!.neighbors.set(s, (nodeMap.get(t)!.neighbors.get(s) || 0) + w);
    }
  });

  console.timeEnd('Graph Load');
  console.log(`Graph Stats: ${nodeMap.size} nodes, ${edges.length} edges`);

  // 3. Run Label Propagation (LPA)
  console.time('LPA');
  let changed = true;
  let iterations = 0;
  const maxIterations = 20;

  // Fixed Seed LCG for determinism
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Helper to shuffle array deterministically
  const shuffle = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    const checkOrder = shuffle([...nodeIds]);
    let moves = 0;

    for (const nodeId of checkOrder) {
      const node = nodeMap.get(nodeId)!;
      const neighbors = node.neighbors;

      if (neighbors.size === 0) continue;

      // Count community weights
      const communityWeights = new Map<string, number>();
      for (const [neighborId, weight] of neighbors) {
        const neighborCommunity = nodeMap.get(neighborId)!.community;
        communityWeights.set(
          neighborCommunity,
          (communityWeights.get(neighborCommunity) || 0) + weight,
        );
      }

      // Find best community
      let maxWeight = -1;
      let bestCommunities: string[] = [];

      for (const [comm, weight] of communityWeights) {
        if (weight > maxWeight) {
          maxWeight = weight;
          bestCommunities = [comm];
        } else if (weight === maxWeight) {
          bestCommunities.push(comm);
        }
      }

      // Pick one randomly if tie (or logic: prefer current if in list)
      let chosenCommunity = bestCommunities[0];
      if (bestCommunities.length > 1) {
        if (bestCommunities.includes(node.community)) {
          chosenCommunity = node.community;
        } else {
          chosenCommunity = bestCommunities[Math.floor(seededRandom() * bestCommunities.length)];
        }
      }

      if (chosenCommunity !== node.community) {
        node.community = chosenCommunity;
        changed = true;
        moves++;
      }
    }
    console.log(`Iteration ${iterations}: ${moves} moves`);
  }

  console.timeEnd('LPA');

  // 4. Map communities to integer IDs (1...N)
  const communityLabelToId = new Map<string, number>();
  let nextId = 1;
  const finalMapping: Record<string, number> = {}; // nodeId -> communityId (int)

  nodeMap.forEach((node) => {
    if (!communityLabelToId.has(node.community)) {
      communityLabelToId.set(node.community, nextId++);
    }
    finalMapping[node.id] = communityLabelToId.get(node.community)!;
  });

  console.log(`Found ${communityLabelToId.size} communities.`);

  // 5. Update DB
  console.time('Update DB');
  const update = db.prepare('UPDATE entities SET community_id = ? WHERE canonical_id = ?');
  const updateMany = db.transaction((mapping: Record<string, number>) => {
    let count = 0;
    for (const [nodeId, communityId] of Object.entries(mapping)) {
      update.run(communityId, nodeId);
      count++;
    }
    return count;
  });

  const updated = updateMany(finalMapping);
  console.timeEnd('Update DB');
  console.log(`Updated ${updated} entities.`);
}

computeCommunities();
