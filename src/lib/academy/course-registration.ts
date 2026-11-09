/** Free courses enroll directly. A positive price uses the shared cart. */
export function courseRegistrationPath(price: number): "enroll" | "cart" {
  return Number(price) > 0 ? "cart" : "enroll";
}
