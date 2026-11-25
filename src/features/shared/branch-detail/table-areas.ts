import type { Area, DiningTable } from "@/types/models"

export function groupBranchTables(areas: Area[], tables: DiningTable[]) {
  const groups = new Map<string, { name: string; tables: DiningTable[] }>()
  const areaIdByName = new Map(areas.map((area) => [area.name, String(area.id)]))
  for (const area of areas) {
    groups.set(String(area.id), { name: area.name, tables: [] })
  }
  for (const table of tables) {
    const id =
      table.areaId != null
        ? String(table.areaId)
        : table.areaName
          ? (areaIdByName.get(table.areaName) ?? `name:${table.areaName}`)
          : "unassigned"
    const group = groups.get(id)
    if (group) group.tables.push(table)
    else
      groups.set(id, {
        name: table.areaName || (id === "unassigned" ? "Chưa phân khu" : `Khu vực #${id}`),
        tables: [table],
      })
  }
  return groups
}
