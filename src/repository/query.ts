export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null }>
) {
  const rows: T[] = []
  for (;;) {
    const { data } = await query(rows.length, rows.length + 999)
    // Server row limits can be lower than the requested page size.
    if (!data?.length) return rows
    rows.push(...data)
  }
}
