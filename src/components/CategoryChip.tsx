// Reusable Category Chip
import React from "react";

interface Props {
  category: string;
}

export default function CategoryChip({ category }: Props) {
  if (!category) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 whitespace-nowrap">
      {category}
    </span>
  );
}
