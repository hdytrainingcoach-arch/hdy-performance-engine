export const dynamic='force-dynamic';

export async function GET(){
  return Response.json({
    id:'/elite',
    name:'HDY Elite',
    short_name:'HDY Elite',
    description:'Espace joueur HDY Elite — accompagnement individuel, monitoring, récupération et progression.',
    start_url:'/?app=elite',
    scope:'/',
    display:'standalone',
    background_color:'#050506',
    theme_color:'#050506',
    orientation:'portrait-primary',
    icons:[
      {src:'/pwa/elite-icon-192.png?v=20260907-elite-final',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/pwa/elite-icon-512.png?v=20260907-elite-final',sizes:'512x512',type:'image/png',purpose:'any'}
    ]
  },{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}});
}
