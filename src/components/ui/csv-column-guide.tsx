type CsvColumnGuideProps = {
  columns: CsvColumn[];
  note?: string;
};

type CsvColumn = {
  name: string;
  optional?: boolean;
};

export function CsvColumnGuide({ columns, note }: CsvColumnGuideProps) {
  const requiredColumns = columns.filter((column) => !column.optional);
  const optionalColumns = columns.filter((column) => column.optional);

  return (
    <section className="mt-4 rounded-md bg-panel-soft p-3">
      <p className="text-sm font-semibold text-text-control">CSV columns</p>
      <ColumnGroup columns={requiredColumns} label="Required" />
      {optionalColumns.length > 0 && (
        <ColumnGroup columns={optionalColumns} label="Optional" />
      )}
      {note && <p className="mt-3 text-sm text-text-muted">{note}</p>}
    </section>
  );
}

function ColumnGroup({
  columns,
  label,
}: {
  columns: CsvColumn[];
  label: string;
}) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {columns.map((column) => (
          <code
            className="rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs font-semibold text-text-control"
            key={column.name}
          >
            {column.name}
          </code>
        ))}
      </div>
    </div>
  );
}
