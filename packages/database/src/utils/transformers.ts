/** TypeORM returns bigint and numeric as strings — this converts them back to numbers on read. */
export const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
