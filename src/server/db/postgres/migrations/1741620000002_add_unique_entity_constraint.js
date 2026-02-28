export const shorthands = undefined;

export async function up(pgm) {
  // Add unique constraint for ON CONFLICT support
  pgm.createIndex('entities', ['full_name', 'type'], {
    unique: true,
    name: 'entities_full_name_type_unique_idx',
  });
}

export async function down(pgm) {
  pgm.dropIndex('entities', [], { name: 'entities_full_name_type_unique_idx' });
}
