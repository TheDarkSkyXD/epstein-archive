/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.addColumns(
    { schema: 'public', name: 'articles' },
    {
      content: { type: 'text' },
      author: { type: 'text' },
      guid: { type: 'text', unique: true },
    },
  );
}

export async function down(pgm) {
  pgm.dropColumns({ schema: 'public', name: 'articles' }, ['content', 'author', 'guid']);
}
