export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string | number>({ value, options, onChange }: Props<T>) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? 'on' : ''}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
