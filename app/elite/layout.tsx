import type { Metadata, Viewport } from 'next';

const V='20260907-elite-final';

export const metadata:Metadata={
  title:'HDY Elite',
  description:'Espace joueur HDY Elite — accompagnement individuel, monitoring, récupération et performance.',
  applicationName:'HDY Elite',
  manifest:`/elite.webmanifest?v=${V}`,
  appleWebApp:{capable:true,title:'HDY Elite',statusBarStyle:'black-translucent'},
  icons:{
    icon:[
      {url:'/branding/elite/icon-192.png?v=static-v1',sizes:'192x192',type:'image/png'},
      {url:'/branding/elite/icon-512.png?v=static-v1',sizes:'512x512',type:'image/png'},
    ],
    apple:[{url:'/branding/elite/apple-touch-icon.png?v=static-v1',sizes:'180x180',type:'image/png'}],
  },
};

export const viewport:Viewport={
  themeColor:'#050506',
  width:'device-width',
  initialScale:1,
  viewportFit:'cover',
};

export default function EliteLayout({children}:{children:React.ReactNode}){
  return children;
}
