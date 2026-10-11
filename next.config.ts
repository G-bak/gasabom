import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/audio/:file*", destination: "/api/media/audio/:file*" },
        { source: "/covers/:file*", destination: "/api/media/covers/:file*" },
      ],
    };
  },
  // 개인 로컬 서비스: 원격 이미지, 분석 SDK, 외부 API 없음.
};

export default nextConfig;
