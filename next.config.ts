import type { NextConfig } from "next";
import { siteBasePath } from "./lib/site-paths";

if (!/^(?:\/[a-zA-Z0-9_-]+)*$/.test(siteBasePath))
  throw new Error("NEXT_PUBLIC_BASE_PATH는 빈 값 또는 /gasabom 같은 경로여야 합니다.");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: siteBasePath,
  // 개인 로컬 서비스: 원격 이미지, 분석 SDK, 외부 API 없음.
};

export default nextConfig;
