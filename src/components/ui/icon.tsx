// Shared defaults for lucide icons (BRAND.md §8): 1.75px stroke, 20px in
// teacher UI, 24px in student UI. Icons are decorative next to a label, so they
// are hidden from assistive technology by default.
export const iconProps = { size: 20, strokeWidth: 1.75, "aria-hidden": true } as const;
export const iconPropsSmall = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;
export const iconPropsStudent = { size: 24, strokeWidth: 1.75, "aria-hidden": true } as const;
