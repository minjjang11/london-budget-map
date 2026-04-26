import type { Metadata } from "next";
import BudgetMapApp from "../components/BudgetMapApp";

export const metadata: Metadata = {
  title: "Map — mappetite",
  description: "Cheap pubs, food & coffee across London — live map.",
};

export default function MapPage() {
  return <BudgetMapApp />;
}
