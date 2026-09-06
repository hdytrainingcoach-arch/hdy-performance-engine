import AdminBrandFrame from '@/components/AdminBrandFrame';

export default function AdminLayout({children}:{children:React.ReactNode}){
  return <AdminBrandFrame>{children}</AdminBrandFrame>;
}
