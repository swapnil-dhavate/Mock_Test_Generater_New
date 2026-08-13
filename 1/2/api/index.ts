import { app } from '../server';

export default function (req: any, res: any) {
  console.log("[Vercel API Request] URL:", req.url, "Method:", req.method);
  
  // Vercel sometimes rewrites the URL or strips the path based on the vercel.json rewrite
  // If the URL was rewritten to just "/", we can manually restore it if needed,
  // but Express typically handles it if req.url is preserved.
  return app(req, res);
}
