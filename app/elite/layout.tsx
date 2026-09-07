import type { Metadata, Viewport } from 'next';

const V='20260907-elite1';

export const metadata:Metadata={
  title:'HDY Elite',
  description:'Espace joueur HDY Elite — accompagnement individuel, monitoring, charge, récupération et performance.',
  applicationName:'HDY Elite',
  manifest:`/elite.webmanifest?v=${V}`,
  appleWebApp:{capable:true,title:'HDY Elite',statusBarStyle:'default'},
  icons:{
    icon:[
      {url:`/pwa/hdy-icon-192.png?v=${V}`,sizes:'192x192',type:'image/png'},
      {url:`/pwa/hdy-icon-512.png?v=${V}`,sizes:'512x512',type:'image/png'},
    ],
    apple:[{url:`/pwa/hdy-apple-touch-icon.png?v=${V}`,sizes:'192x192',type:'image/png'}],
  },
};

export const viewport:Viewport={
  themeColor:'#F5F5F7',
  width:'device-width',
  initialScale:1,
  viewportFit:'cover',
};

export default function EliteLayout({children}:{children:React.ReactNode}){
  return children;
}
