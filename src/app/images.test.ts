import { describe, expect, test } from "bun:test";
import { itemIconUrl, thumbnailUrl } from "./images.ts";

describe("image URLs", () => {
  test("name the library's files under the game's own names", () => {
    expect(thumbnailUrl("csprt-3-0099")).toBe("https://gkms-library.tia.run/img/w192/img_general_csprt-3-0099_full.webp");
    expect(itemIconUrl("img_general_pitem_2-004")).toBe("https://gkms-library.tia.run/img/w48/img_general_pitem_2-004.webp");
  });
});
