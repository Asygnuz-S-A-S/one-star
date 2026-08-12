import { updateTopBannerAction } from "./src/server/actions/top-banner.actions";

async function main() {
  const result = await updateTopBannerAction({
    text: "test",
    btnText: "",
    btnUrl: "",
    messages: [{ text: "test", url: "" }],
    bgColor: "#000000",
    textColor: "#ffffff",
    isActive: true
  });
  console.log(result);
}

main().catch(console.error);
