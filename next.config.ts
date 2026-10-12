import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  // 개인 로컬 서비스: 원격 이미지, 분석 SDK, 외부 API 없음.
};

export default nextConfig;
