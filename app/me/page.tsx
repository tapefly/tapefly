import { redirect } from "next/navigation";

/* "My fly" now lives on the home page: the switches, today's place and the week.
   The old page (MyFly.tsx) is kept in the code but no longer shown. */
export default function MePage() {
  redirect("/");
}
