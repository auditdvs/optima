import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export type BranchRow = {
  name: string;
  region: string;
  location: string;
};

export function BranchLocationTable({ data }: { data: BranchRow[] }) {
  const columns: ColumnDef<BranchRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Branch Name <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => row.getValue("name"),
    },
    {
      accessorKey: "region",
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 font-medium text-xs"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Region <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => row.getValue("region"),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => row.getValue("location"),
    },
  ];

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="w-full rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}