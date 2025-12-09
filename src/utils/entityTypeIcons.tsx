/**
 * Entity Type Icon Utility
 * 
 * Provides consistent icon mapping for different entity types across the application.
 */

import Icon from '../components/Icon';
import React from 'react';

// Define the entity types
export type EntityType = 'Person' | 'Organization' | 'Location' | 'Document' | 'Date' | 'Event' | 'FinancialEntity';

// Map entity types to appropriate Lucide icons
export const ENTITY_TYPE_ICONS: Record<EntityType, string> = {
  Person: 'User',
  Organization: 'Building2',
  Location: 'MapPin',
  Document: 'FileText',
  Date: 'Calendar',
  Event: 'Calendar',
  FinancialEntity: 'DollarSign'
};

/**
 * Get the appropriate icon name for an entity type
 */
export function getEntityTypeIconName(entityType: string): string {
  // Normalize the entity type to match our keys
  const normalizedType = entityType.charAt(0).toUpperCase() + entityType.slice(1) as EntityType;
  
  // Return the icon name if it exists, otherwise default to User
  return ENTITY_TYPE_ICONS[normalizedType] || 'User';
}

/**
 * Get the Icon component for an entity type
 */
export function getEntityTypeIcon(entityType: string, size: 'sm' | 'md' | 'lg' = 'md') {
  const iconName = getEntityTypeIconName(entityType);
  return <Icon name={iconName} size={size} />;
}