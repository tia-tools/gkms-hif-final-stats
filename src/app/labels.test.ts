import { describe, expect, test } from "bun:test";
import { conditionLabel, memberLabel, occasionLabel, triggerLabel } from "./labels.ts";

describe("triggerLabel, on the DMM deck's triggers", () => {
  test("words the occasion, its filters and its conditions", () => {
    expect(
      triggerLabel({ occasion: "GetProduceCard", filters: [{ family: "effectGroup", member: "full_power" }], conditions: [{ kind: "dance", min: 700, max: 0 }] }),
    ).toBe("スキルカード獲得時（全力）／ダンス700以上");
    expect(
      triggerLabel({ occasion: "EndLesson", filters: [{ family: "lessonStat", member: "dance" }, { family: "lessonKind", member: "sp" }] }),
    ).toBe("レッスン終了時（ダンス・SPレッスン）");
    expect(triggerLabel({ occasion: "EndAudition", conditions: [{ kind: "produce_card_search_count", min: 15, max: 0 }] })).toBe(
      "試験・オーディション終了時／所持しているスキルカード15枚以上",
    );
    expect(triggerLabel({ occasion: "ChangeProduceCard", filters: [{ family: "cardName", member: "starter" }] })).toBe("スキルカードチェンジ時（名前に「基本」）");
  });

  test("falls back to the game's own word for one it does not know", () => {
    expect(occasionLabel("SomethingNew")).toBe("SomethingNew");
    expect(memberLabel("effectGroup", "new_group")).toBe("new_group");
    expect(conditionLabel({ kind: "stamina_ratio", min: 500, max: 0 })).toBe("体力50%以上");
  });
});
