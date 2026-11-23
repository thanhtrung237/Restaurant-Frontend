import type { Branch } from "@/types/models"

export function hasBranchTransferAccount(branch?: Pick<Branch, "bankName" | "bankAccountNo">) {
  return Boolean(branch?.bankName?.trim() && branch.bankAccountNo?.trim())
}
