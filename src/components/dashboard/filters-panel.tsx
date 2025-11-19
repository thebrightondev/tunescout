type FiltersPanelProps = {
  filters: string[];
};

export function FiltersPanel ( { filters }: FiltersPanelProps ) {
  if ( filters.length === 0 ) {
    return (
      <p className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
        Filters will appear once the Tunescout API is reachable.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map( ( filter ) => (
        <span
          key={filter}
          className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {filter}
        </span>
      ) )}
    </div>
  );
}
