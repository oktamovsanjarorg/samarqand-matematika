import { describe, expect, it } from "vitest";
import { weakTopics, type AnswerFact } from "../src/insights/topic-weakness";

const fact = (
  topicId: string,
  correct: boolean,
  source: AnswerFact["source"] = "topic",
  skills: string[] = [],
): AnswerFact => ({
  topicId,
  correct,
  source,
  skills,
});

describe("BR-R01: kuchsiz mavzular faktlardan", () => {
  it("kamida 3 javob va 60% dan past; eng pasti birinchi; xato ko'nikmalar", () => {
    const facts = [
      fact("a", false, "topic", ["viet"]),
      fact("a", false, "weekly", ["viet", "diskriminant"]),
      fact("a", true, "mock"),
      fact("b", false),
      fact("b", false),
      fact("c", false),
      fact("c", true),
      fact("c", true),
      fact("c", true),
      fact("d", false),
      fact("d", false),
      fact("d", true),
      fact("d", false),
    ];
    const r = weakTopics(facts);
    expect(r.map((x) => [x.topicId, x.percent])).toEqual([
      ["d", 25],
      ["a", 33],
    ]);
    expect(r[1]).toMatchObject({
      sources: { topic: 1, weekly: 1, mock: 1 },
      weakSkills: ["viet", "diskriminant"],
    });
  });

  it("chegaradagi 60% kuchsiz emas; limit", () => {
    const f = [fact("x", true), fact("x", true), fact("x", true), fact("x", false), fact("x", false)];
    expect(weakTopics(f)).toEqual([]);
    const many = ["p", "q", "r", "s"].flatMap((t) => [fact(t, false), fact(t, false), fact(t, false)]);
    expect(weakTopics(many, 2)).toHaveLength(2);
  });
});
