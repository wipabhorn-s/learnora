import AppShell from "@/components/layout/AppShell";
import RememberWorkspace from "@/components/layout/RememberWorkspace";
import Sidebar from "@/components/layout/Sidebar";
import {
  ACCOUNT_ITEMS,
  WORKSPACE_ITEMS,
} from "@/components/layout/workspace-nav";
import type { Workspace } from "@/lib/constants/workspace";

/** โครงหน้าเดียวกันทั้งฝั่งเรียน ฝั่งสอน และหน้าบัญชีที่ใช้ร่วมกัน */
export default function WorkspaceShell({
  workspace,
  canTeach,
  remember = true,
  children,
}: {
  workspace: Workspace;
  canTeach: boolean;
  /** หน้าที่ใช้ร่วมกันแค่แสดงพื้นที่ล่าสุด ไม่ได้เปลี่ยนว่าผู้ใช้อยู่ที่ไหน */
  remember?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={
        <>
          {remember && <RememberWorkspace workspace={workspace} />}
          <Sidebar
            items={WORKSPACE_ITEMS[workspace]}
            accountItems={ACCOUNT_ITEMS}
            workspace={{ current: workspace, canTeach }}
          />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
