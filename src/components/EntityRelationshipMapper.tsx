import React, { useState, useRef } from 'react';

interface Entity {
  id: string;
  type: 'person' | 'organization' | 'location' | 'document' | 'communication' | 'financial';
  label: string;
  properties: Record<string, any>;
  confidence: number;
  sources: string[];
}

interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  confidence: number;
  evidence: string[];
  properties: Record<string, any>;
}

interface EntityRelationshipMapperProps {
  entities: Entity[];
  relationships: Relationship[];
  onEntitySelect?: (entity: Entity) => void;
  onRelationshipSelect?: (relationship: Relationship) => void;
}

export const EntityRelationshipMapper: React.FC<EntityRelationshipMapperProps> = ({
  entities,
  relationships,
  onEntitySelect,
  onRelationshipSelect
}) => {
  const networkRef = useRef<HTMLDivElement>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">Entity Relationship Network</h3>
        <p className="text-slate-400 text-sm">
          Visualizing connections between {entities.length} entities and {relationships.length} relationships
        </p>
      </div>

      <div ref={networkRef} className="w-full h-96 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
        <div className="text-slate-400 text-center">
          <div className="text-4xl mb-2">🕸️</div>
          <p>Network visualization placeholder</p>
        </div>
      </div>

      {selectedEntity && (
        <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h4 className="text-white font-semibold mb-2">Selected: {selectedEntity.label}</h4>
          <p className="text-slate-400">Type: {selectedEntity.type}</p>
        </div>
      )}
    </div>
  );
};

export default EntityRelationshipMapper;