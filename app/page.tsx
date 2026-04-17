import { redirect } from "next/navigation";

/** Opens the map first; marketing shell lives at `/home`. */
export default function RootPage() {
  redirect("/map");
}
