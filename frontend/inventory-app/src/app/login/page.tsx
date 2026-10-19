// The Inventory UI is mounted once in app/layout.tsx and reads the URL itself, so moving between pages does not
// remount it (a remount re-ran the sign-in check and redrew the whole shell on every click).
// This file only declares the route.
export default function Page() {
  return null;
}
