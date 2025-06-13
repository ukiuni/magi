import { LLM } from "./LLM";
import { VSCodeLLM } from "./VSCodeLLM";

type llmName = "melchior" | "balthasar" | "caspar";

export function createLLM(name: llmName): LLM {
    switch (name) {
        case "melchior":
            return new VSCodeLLM("melchior", "バリバリと成果を出す。いろんな手段を使いこなす。");
        case "balthasar":
            return new VSCodeLLM("balthasar", "慎重で懐疑的。問題を深く掘り下げ、改善策を提案する。");
        case "caspar":
            return new VSCodeLLM("caspar", "完璧主義。ヌケモレを見逃さず、さらなる課題を発見、提言する。");
    }
}
