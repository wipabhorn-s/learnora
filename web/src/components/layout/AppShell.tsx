/**
 * โครงหน้าที่มี Sidebar ใช้ตัวเดียวทั้งฝั่งเรียน ฝั่งสอน และหลังบ้าน
 * ระยะขอบของ <main> จึงเท่ากันทุกพื้นที่ (Page fit อิงตัวเลขนี้อยู่)
 */
export default function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {sidebar}
      <main className="min-w-0 flex-1 overflow-x-clip p-4 sm:p-6 xl:p-8">
        {children}
      </main>
    </div>
  );
}
