import robloxImg from "@assets/WhatsApp_Image_2026-02-08_at_8.50.17_PM_1770576967461.jpeg";
import pubgImg from "@assets/WhatsApp_Image_2026-02-08_at_8.50.18_PM_(1)_1770576967463.jpeg";
import efootballImg from "@assets/WhatsApp_Image_2026-02-08_at_8.50.18_PM_(2)_1770576967464.jpeg";
import fcMobileImg from "@assets/WhatsApp_Image_2026-02-08_at_8.50.18_PM_(3)_1770576967465.jpeg";
import tiktokImg from "@assets/WhatsApp_Image_2026-02-08_at_8.50.18_PM_1770576967466.jpeg";
import freefireImg from "@assets/WhatsApp_Image_2026-02-08_at_8.50.19_PM_1770576967470.jpeg";

export const gameImageMap: Record<string, string> = {
  "fc-mobile": fcMobileImg,
  "fc-points": fcMobileImg,
  "fifa-mobile": fcMobileImg,
  "pes": efootballImg,
  "pes-mobile": efootballImg,
  "pubg": pubgImg,
  "pubg-id": pubgImg,
  "pubg-kr": pubgImg,
  "pubg-account": pubgImg,
  "tiktok": tiktokImg,
  "freefire": freefireImg,
  "freefire-id": freefireImg,
  "roblox": robloxImg,
};

export function getGameImage(slug: string): string | undefined {
  return gameImageMap[slug];
}
