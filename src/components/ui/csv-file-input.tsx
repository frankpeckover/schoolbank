import type { ChangeEvent } from "react";

type CsvFileInputProps = {
  fileName: string;
  id: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function CsvFileInput({
  fileName,
  id,
  onChange,
}: CsvFileInputProps) {
  return (
    <div className="mt-5">
      <label className="text-sm font-medium text-text-control" htmlFor={id}>
        CSV file
      </label>
      <input
        accept=".csv,text/csv"
        className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none ring-brand transition file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-medium file:text-white focus:ring-2"
        id={id}
        onChange={onChange}
        type="file"
      />
      {fileName && <p className="mt-2 text-sm text-text-muted">{fileName}</p>}
    </div>
  );
}
