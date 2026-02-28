export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumn('entities', {
    evidence_count: { type: 'integer', default: 0 },
  });
}

export async function down(pgm) {
  pgm.dropColumn('entities', 'evidence_count');
}
