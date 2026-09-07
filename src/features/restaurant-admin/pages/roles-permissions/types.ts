export type PermissionLevel = "allow" | "approval" | "readonly" | "none"

export interface PermissionFeatureRow {
  id: number
  feature: string
  roles: {
    customer: PermissionLevel
    waiter: PermissionLevel
    cashier: PermissionLevel
    branchManager: PermissionLevel
    restaurantAdmin: PermissionLevel
    platformAdmin: PermissionLevel
  }
}

export interface RoleColumnConfig {
  key: keyof PermissionFeatureRow["roles"]
  label: string
  canEdit: boolean
}
