"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export interface Column<T> {
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: any[];
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

function isTanStackColumn(col: any): boolean {
  // TanStack ColumnDef columns use `id` for key-based columns
  // Custom Column<T> columns never have `id`
  return "id" in col && typeof col.id === "string";
}

function renderCell<T>(col: any, item: T): React.ReactNode {
  if (!col.cell) {
    if (col.accessorKey && typeof col.accessorKey === "string" && col.accessorKey in (item as any)) {
      return String((item as any)[col.accessorKey]);
    }
    return null;
  }
  if (isTanStackColumn(col)) {
    return col.cell({ row: { original: item } });
  }
  return col.cell(item);
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data available",
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-muted/10">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={onRowClick ? "cursor-pointer" : ""}
            >
              {columns.map((col, i) => (
                <TableCell key={i} className={col.className}>
                  {renderCell(col, item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
