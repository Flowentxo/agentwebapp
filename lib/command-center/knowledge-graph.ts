/**
 * COMMAND CENTER - Knowledge Graph
 *
 * Maps relationships between entities (commands, agents, users, data)
 * for intelligent recommendations
 */

// =====================================================
// TYPES
// =====================================================

export type EntityType = 'command' | 'agent' | 'intent' | 'user' | 'document' | 'workflow';

export interface Entity {
  id: string;
  type: EntityType;
  label: string;
  properties: Record<string, any>;
  createdAt: Date;
}

export interface Relationship {
  id: string;
  from: string; // Entity ID
  to: string; // Entity ID
  type: string; // 'executes', 'uses', 'relates_to', 'follows', 'requires'
  strength: number; // 0.0 to 1.0
  metadata?: Record<string, any>;
}

export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relationships: Map<string, Relationship[]>;
}

// =====================================================
// GRAPH STORAGE (In-Memory for now, can be Redis/Neo4j)
// =====================================================

class KnowledgeGraphStore {
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship[]> = new Map();

  // Add entity
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  // Get entity
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  // Add relationship
  addRelationship(relationship: Relationship): void {
    const fromRels = this.relationships.get(relationship.from) || [];
    fromRels.push(relationship);
    this.relationships.set(relationship.from, fromRels);

    // Bidirectional (optional)
    const toRels = this.relationships.get(relationship.to) || [];
    toRels.push({
      ...relationship,
      from: relationship.to,
      to: relationship.from,
      type: `inverse_${relationship.type}`,
    });
    this.relationships.set(relationship.to, toRels);
  }

  // Get relationships for entity
  getRelationships(entityId: string, type?: string): Relationship[] {
    const rels = this.relationships.get(entityId) || [];
    return type ? rels.filter(r => r.type === type) : rels;
  }

  // Find related entities
  getRelatedEntities(entityId: string, relationshipType?: string): Entity[] {
    const rels = this.getRelationships(entityId, relationshipType);
    return rels
      .map(r => this.getEntity(r.to))
      .filter((e): e is Entity => e !== undefined);
  }

  // Search entities by type and properties
  searchEntities(type: EntityType, filter?: (entity: Entity) => boolean): Entity[] {
    const entities = Array.from(this.entities.values()).filter(e => e.type === type);
    return filter ? entities.filter(filter) : entities;
  }

  // Calculate path between two entities
  findPath(fromId: string, toId: string, maxDepth: number = 3): Entity[] | null {
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: Entity[] }> = [];

    const startEntity = this.getEntity(fromId);
    if (!startEntity) return null;

    queue.push({ id: fromId, path: [startEntity] });
    visited.add(fromId);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;

      if (id === toId) {
        return path;
      }

      if (path.length >= maxDepth) {
        continue;
      }

      const rels = this.getRelationships(id);
      for (const rel of rels) {
        if (!visited.has(rel.to)) {
          visited.add(rel.to);
          const entity = this.getEntity(rel.to);
          if (entity) {
            queue.push({ id: rel.to, path: [...path, entity] });
          }
        }
      }
    }

    return null;
  }

  // Get statistics
  getStats(): {
    entityCount: number;
    relationshipCount: number;
    byType: Record<EntityType, number>;
  } {
    const byType: Record<string, number> = {};

    for (const entity of this.entities.values()) {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
    }

    let totalRels = 0;
    for (const rels of this.relationships.values()) {
      totalRels += rels.length;
    }

    return {
      entityCount: this.entities.size,
      relationshipCount: totalRels,
      byType: byType as Record<EntityType, number>,
    };
  }
}

// Singleton instance
const graphStore = new KnowledgeGraphStore();

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Record command execution in knowledge graph
 */
export function recordCommandExecution(
  userId: string,
  command: string,
  intent: string,
  agentIds: string[]
): void {
  // Add command entity
  const commandEntity: Entity = {
    id: `cmd_${Date.now()}_${Math.random()}`,
    type: 'command',
    label: command,
    properties: { intent, agentIds },
    createdAt: new Date(),
  };
  graphStore.addEntity(commandEntity);

  // Add user entity if not exists
  if (!graphStore.getEntity(userId)) {
    graphStore.addEntity({
      id: userId,
      type: 'user',
      label: userId,
      properties: {},
      createdAt: new Date(),
    });
  }

  // Create user -> command relationship
  graphStore.addRelationship({
    id: `rel_${Date.now()}_${Math.random()}`,
    from: userId,
    to: commandEntity.id,
    type: 'executes',
    strength: 1.0,
  });

  // Create command -> agent relationships
  agentIds.forEach(agentId => {
    if (!graphStore.getEntity(agentId)) {
      graphStore.addEntity({
        id: agentId,
        type: 'agent',
        label: agentId,
        properties: {},
        createdAt: new Date(),
      });
    }

    graphStore.addRelationship({
      id: `rel_${Date.now()}_${Math.random()}`,
      from: commandEntity.id,
      to: agentId,
      type: 'uses',
      strength: 1.0,
    });
  });
}

/**
 * Get related commands for a user
 */
export function getRelatedCommands(userId: string, limit: number = 5): string[] {
  const commands = graphStore.getRelatedEntities(userId, 'executes');
  return commands
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map(c => c.label);
}

/**
 * Find users who use similar commands
 */
export function findSimilarUsers(userId: string, limit: number = 3): string[] {
  const userCommands = graphStore.getRelatedEntities(userId, 'executes');
  const commandIds = new Set(userCommands.map(c => c.id));

  // Find other users
  const allUsers = graphStore.searchEntities('user', e => e.id !== userId);

  // Calculate similarity scores
  const scores = allUsers.map(user => {
    const theirCommands = graphStore.getRelatedEntities(user.id, 'executes');
    const overlap = theirCommands.filter(c => commandIds.has(c.id)).length;
    const similarity = overlap / Math.max(userCommands.length, theirCommands.length);

    return { userId: user.id, similarity };
  });

  return scores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(s => s.userId);
}

/**
 * Get frequently paired agents
 */
export function getFrequentlyPairedAgents(agentId: string, limit: number = 3): string[] {
  // Find commands that use this agent
  const commands = graphStore.searchEntities('command', entity => {
    const agentIds = entity.properties.agentIds || [];
    return agentIds.includes(agentId);
  });

  // Count co-occurrences
  const pairCounts = new Map<string, number>();
  commands.forEach(cmd => {
    const agentIds = cmd.properties.agentIds || [];
    agentIds.forEach((id: string) => {
      if (id !== agentId) {
        pairCounts.set(id, (pairCounts.get(id) || 0) + 1);
      }
    });
  });

  return Array.from(pairCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Suggest next command based on graph patterns
 */
export function suggestNextCommand(userId: string, currentCommand: string): string[] {
  // Find similar past sequences
  const allCommands = graphStore.getRelatedEntities(userId, 'executes');

  // Simple: Return most recent commands (can be enhanced with sequence learning)
  return allCommands
    .slice(0, 3)
    .map(c => c.label)
    .filter(label => label !== currentCommand);
}

/**
 * Get knowledge graph statistics
 */
export function getGraphStats() {
  return graphStore.getStats();
}

/**
 * Visualize graph (for debugging)
 */
export function getGraphVisualization(): {
  nodes: Array<{ id: string; label: string; type: EntityType }>;
  edges: Array<{ from: string; to: string; label: string }>;
} {
  const stats = graphStore.getStats();
  const nodes: Array<{ id: string; label: string; type: EntityType }> = [];
  const edges: Array<{ from: string; to: string; label: string }> = [];

  // Sample entities (limit to avoid overwhelming)
  const entities = graphStore.searchEntities('command').slice(0, 20);
  entities.forEach(e => {
    nodes.push({ id: e.id, label: e.label, type: e.type });

    const rels = graphStore.getRelationships(e.id);
    rels.forEach(r => {
      edges.push({ from: r.from, to: r.to, label: r.type });
    });
  });

  return { nodes, edges };
}
