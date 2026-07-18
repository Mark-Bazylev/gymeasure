export type LicenseLike = {
  full_name?: string;
  short_name?: string;
};

export function isRedistributableLicense(license?: LicenseLike | null): boolean {
  if (!license) return false;
  const name = `${license.short_name ?? ""} ${license.full_name ?? ""}`.toLowerCase();
  return (
    name.includes("cc-by") ||
    name.includes("creative commons") ||
    name.includes("public domain") ||
    name.includes("cc0")
  );
}
