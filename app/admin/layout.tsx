import AdminBrandFrame from '@/components/AdminBrandFrame';
import { OrgProvider } from '@/lib/org-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <AdminBrandFrame>{children}</AdminBrandFrame>
    </OrgProvider>
  );
}
