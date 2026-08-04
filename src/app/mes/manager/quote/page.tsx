import { redirect } from "next/navigation";

/** Quoting moved to the Sales screen (money is not a Production concern). */
export default function LegacyQuoteRedirect() {
  redirect("/mes/sales/quote");
}
