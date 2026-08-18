import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base:'/pos/',
  plugins:[react(), tailwindcss()],
  server:{
    allowedHosts:['pos-frontend','localhost'],
    proxy:{'/pos-api':{target:process.env.VITE_API_PROXY_TARGET||'http://localhost:8100',changeOrigin:true,rewrite:p=>p.replace(/^\/pos-api/,'/api')}}
  }
});
