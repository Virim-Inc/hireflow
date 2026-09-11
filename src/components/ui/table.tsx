import * as React from "react"

// ─── Table Root ──────────────────────────────────────────────────────────────
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ style, ...props }, ref) => (
  <div style={{ width: '100%', overflowX: 'auto' }}>
    <table
      ref={ref}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.855rem',
        tableLayout: 'auto',
        ...style,
      }}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

// ─── TableHeader ─────────────────────────────────────────────────────────────
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ style, ...props }, ref) => (
  <thead
    ref={ref}
    style={{
      borderBottom: '2px solid var(--hf-border)',
      ...style,
    }}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

// ─── TableBody ───────────────────────────────────────────────────────────────
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ ...props }, ref) => (
  <tbody ref={ref} {...props} />
))
TableBody.displayName = "TableBody"

// ─── TableFooter ─────────────────────────────────────────────────────────────
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ style, ...props }, ref) => (
  <tfoot
    ref={ref}
    style={{
      borderTop: '1.5px solid var(--hf-border)',
      background: 'var(--hf-surface-2)',
      fontWeight: 500,
      ...style,
    }}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

// ─── TableRow ────────────────────────────────────────────────────────────────
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ style, ...props }, ref) => (
  <tr
    ref={ref}
    style={{
      borderBottom: '1px solid var(--hf-border)',
      transition: 'background-color 0.16s ease',
      ...style,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--hf-surface-2)';
      props.onMouseEnter?.(e);
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
      props.onMouseLeave?.(e);
    }}
    {...props}
  />
))
TableRow.displayName = "TableRow"

// ─── TableHead ───────────────────────────────────────────────────────────────
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ style, ...props }, ref) => (
  <th
    ref={ref}
    style={{
      padding: '11px 16px',
      textAlign: 'left',
      verticalAlign: 'middle',
      fontWeight: 600,
      fontSize: '0.72rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: 'var(--hf-text-muted)',
      borderRight: '1px solid var(--hf-border)',
      whiteSpace: 'nowrap',
      background: 'var(--hf-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 1,
      ...style,
    }}
    {...props}
  />
))
TableHead.displayName = "TableHead"

// ─── TableCell ───────────────────────────────────────────────────────────────
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ style, ...props }, ref) => (
  <td
    ref={ref}
    style={{
      padding: '12px 16px',
      verticalAlign: 'middle',
      color: 'var(--hf-text-secondary)',
      fontSize: '0.855rem',
      borderRight: '1px solid var(--hf-border)',
      ...style,
    }}
    {...props}
  />
))
TableCell.displayName = "TableCell"

// ─── TableCaption ────────────────────────────────────────────────────────────
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ style, ...props }, ref) => (
  <caption
    ref={ref}
    style={{
      marginTop: '8px',
      fontSize: '0.8rem',
      color: 'var(--hf-text-muted)',
      captionSide: 'bottom',
      ...style,
    }}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
