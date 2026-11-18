// This layout is for public pages (login, register) - no auth check needed
// The protected pages have their own layout in (protected)/layout.tsx

interface Props {
  children: React.ReactNode;
  params?: Promise<Record<string, string | undefined>>;
}

export default async function AdminPublicLayout({ children }: Props) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
