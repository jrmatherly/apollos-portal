import { Box, Brain, Check, CircuitBoard, Copy, Loader2, Terminal, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Highlight, themes } from "prism-react-renderer";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useModels } from "../hooks/useModels";
import type { ModelInfo } from "../types/api";

const MODE_LABELS: Record<string, string> = {
  chat: "Chat Models",
  embedding: "Embedding Models",
  image_generation: "Image Generation Models",
  audio_transcription: "Audio Transcription Models",
  audio_speech: "Text-to-Speech Models",
  other: "Other Models",
};

const MODE_ORDER = [
  "chat",
  "embedding",
  "image_generation",
  "audio_transcription",
  "audio_speech",
  "other",
];

function groupModelsByMode(
  models: ModelInfo[],
): { mode: string; label: string; models: ModelInfo[] }[] {
  const groups = new Map<string, ModelInfo[]>();

  for (const model of models) {
    const mode = model.mode ?? "other";
    const existing = groups.get(mode);
    if (existing) {
      existing.push(model);
    } else {
      groups.set(mode, [model]);
    }
  }

  return [...groups.entries()]
    .sort(
      ([a], [b]) =>
        (MODE_ORDER.indexOf(a) === -1 ? 999 : MODE_ORDER.indexOf(a)) -
        (MODE_ORDER.indexOf(b) === -1 ? 999 : MODE_ORDER.indexOf(b)),
    )
    .map(([mode, models]) => ({
      mode,
      label: MODE_LABELS[mode] ?? `${mode.charAt(0).toUpperCase()}${mode.slice(1)} Models`,
      models,
    }));
}

type CodeTab = "python" | "curl" | "typescript";

const TAB_LABELS: Record<CodeTab, string> = {
  python: "Python",
  curl: "curl",
  typescript: "TypeScript",
};

const TABS: CodeTab[] = ["python", "curl", "typescript"];

const TAB_LANGUAGES: Record<CodeTab, string> = {
  python: "python",
  curl: "bash",
  typescript: "typescript",
};

function getCodeExamples(modelName: string, mode: string | null): Record<CodeTab, string> {
  const base =
    import.meta.env.VITE_LITELLM_BASE_URL?.replace(/\/+$/, "") ||
    "https://your-litellm-proxy.example.com";

  switch (mode ?? "chat") {
    case "embedding":
      return {
        python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${base}/v1"
)

response = client.embeddings.create(
    model="${modelName}",
    input="The quick brown fox jumps over the lazy dog"
)
print(response.data[0].embedding[:5])`,
        curl: `curl ${base}/v1/embeddings \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "input": "The quick brown fox jumps over the lazy dog"
  }'`,
        typescript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "your-api-key",
  baseURL: "${base}/v1",
});

const response = await client.embeddings.create({
  model: "${modelName}",
  input: "The quick brown fox jumps over the lazy dog",
});
console.log(response.data[0].embedding.slice(0, 5));`,
      };

    case "image_generation":
      return {
        python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${base}/v1"
)

response = client.images.generate(
    model="${modelName}",
    prompt="A sunset over mountains",
    n=1,
    size="1024x1024"
)
print(response.data[0].url)`,
        curl: `curl ${base}/v1/images/generations \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "prompt": "A sunset over mountains",
    "n": 1,
    "size": "1024x1024"
  }'`,
        typescript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "your-api-key",
  baseURL: "${base}/v1",
});

const response = await client.images.generate({
  model: "${modelName}",
  prompt: "A sunset over mountains",
  n: 1,
  size: "1024x1024",
});
console.log(response.data[0].url);`,
      };

    case "audio_transcription":
      return {
        python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${base}/v1"
)

with open("audio.mp3", "rb") as f:
    response = client.audio.transcriptions.create(
        model="${modelName}",
        file=f
    )
print(response.text)`,
        curl: `curl ${base}/v1/audio/transcriptions \\
  -H "Authorization: Bearer your-api-key" \\
  -F "model=${modelName}" \\
  -F "file=@audio.mp3"`,
        typescript: `import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: "your-api-key",
  baseURL: "${base}/v1",
});

const response = await client.audio.transcriptions.create({
  model: "${modelName}",
  file: fs.createReadStream("audio.mp3"),
});
console.log(response.text);`,
      };

    case "audio_speech":
      return {
        python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${base}/v1"
)

response = client.audio.speech.create(
    model="${modelName}",
    voice="alloy",
    input="Hello, welcome to Apollos AI!"
)
response.stream_to_file("output.mp3")`,
        curl: `curl ${base}/v1/audio/speech \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "voice": "alloy",
    "input": "Hello, welcome to Apollos AI!"
  }' --output output.mp3`,
        typescript: `import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  apiKey: "your-api-key",
  baseURL: "${base}/v1",
});

const response = await client.audio.speech.create({
  model: "${modelName}",
  voice: "alloy",
  input: "Hello, welcome to Apollos AI!",
});
const buffer = Buffer.from(await response.arrayBuffer());
fs.writeFileSync("output.mp3", buffer);`,
      };

    case "responses":
      return {
        python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${base}/v1"
)

response = client.responses.create(
    model="${modelName}",
    input="Write a Python function to sort a list"
)
print(response.output_text)`,
        curl: `curl ${base}/v1/responses \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "input": "Write a Python function to sort a list"
  }'`,
        typescript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "your-api-key",
  baseURL: "${base}/v1",
});

const response = await client.responses.create({
  model: "${modelName}",
  input: "Write a Python function to sort a list",
});
console.log(response.output_text);`,
      };

    default:
      return {
        python: `from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="${base}/v1"
)

response = client.chat.completions.create(
    model="${modelName}",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`,
        curl: `curl ${base}/v1/chat/completions \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${modelName}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
        typescript: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "your-api-key",
  baseURL: "${base}/v1",
});

const response = await client.chat.completions.create({
  model: "${modelName}",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(response.choices[0].message.content);`,
      };
  }
}

function ModelUsageDialog({
  open,
  model,
  onClose,
}: {
  open: boolean;
  model: ModelInfo | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<CodeTab>("python");
  const [copied, setCopied] = useState(false);

  const examples = useMemo(
    () => (model ? getCodeExamples(model.model_name, model.mode) : null),
    [model],
  );

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!model || !examples) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(examples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchTab = (tab: CodeTab) => {
    setActiveTab(tab);
    setCopied(false);
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  const info = model.model_info ?? {};
  const maxTokens = info.max_tokens as number | undefined;
  const inputCost = info.input_cost_per_token as number | undefined;
  const outputCost = info.output_cost_per_token as number | undefined;

  return (
    <AnimatePresence>
      {open ? (
        <dialog
          ref={dialogRef}
          onCancel={onClose}
          onClick={handleBackdropClick}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          className="fixed inset-0 z-50 m-auto bg-transparent backdrop:bg-black/50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-[90vw] max-w-3xl rounded-xl border border-white/10 bg-surface/90 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Terminal className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary">{model.model_name}</h3>
                  {model.litellm_model_name ? (
                    <p className="text-text-secondary text-xs font-medium mt-0.5">
                      {model.litellm_model_name}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-text-secondary hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Model stats */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 px-6 pt-4 text-xs text-text-secondary">
              {maxTokens != null ? (
                <span>
                  <span className="font-semibold uppercase tracking-wider">Context:</span>{" "}
                  <span className="text-text-primary font-mono">{maxTokens.toLocaleString()}</span>
                </span>
              ) : null}
              {inputCost != null ? (
                <span>
                  <span className="font-semibold uppercase tracking-wider">Input:</span>{" "}
                  <span className="text-text-primary font-mono">
                    ${(inputCost * 1_000_000).toFixed(2)}/1M
                  </span>
                </span>
              ) : null}
              {outputCost != null ? (
                <span>
                  <span className="font-semibold uppercase tracking-wider">Output:</span>{" "}
                  <span className="text-text-primary font-mono">
                    ${(outputCost * 1_000_000).toFixed(2)}/1M
                  </span>
                </span>
              ) : null}
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-white/5 bg-black/20 px-4 mt-4">
              <div className="flex">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => switchTab(tab)}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "text-primary font-semibold border-b-2 border-primary"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 my-2 text-xs font-bold text-text-secondary hover:text-text-primary border border-white/10 rounded-md transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-secondary" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Code
                  </>
                )}
              </button>
            </div>

            {/* Code area */}
            <Highlight
              theme={themes.nightOwl}
              code={examples[activeTab]}
              language={TAB_LANGUAGES[activeTab]}
            >
              {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className="px-6 py-5 overflow-x-auto leading-relaxed font-mono text-[13px] bg-[#0a0c14]"
                  style={{ ...style, margin: 0, borderRadius: 0 }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>

            {/* Footer */}
            <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Endpoint is active and ready
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold bg-white/5 hover:bg-white/10 rounded-full transition-colors text-text-primary"
              >
                Close
              </button>
            </div>
          </motion.div>
        </dialog>
      ) : null}
    </AnimatePresence>
  );
}

const MODE_ICONS: Record<
  string,
  {
    Icon: typeof Brain;
    bg: string;
    text: string;
    badge: string;
    badgeBg: string;
  }
> = {
  chat: {
    Icon: Brain,
    bg: "bg-[#8b5cf6]/20",
    text: "text-[#8b5cf6]",
    badge: "Chat",
    badgeBg: "bg-[#8b5cf6]/10 text-[#8b5cf6]",
  },
  embedding: {
    Icon: CircuitBoard,
    bg: "bg-primary/20",
    text: "text-primary",
    badge: "Embedding",
    badgeBg: "bg-primary/10 text-primary",
  },
  image_generation: {
    Icon: Zap,
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    badge: "Image",
    badgeBg: "bg-orange-500/10 text-orange-400",
  },
  audio_transcription: {
    Icon: Terminal,
    bg: "bg-secondary/20",
    text: "text-secondary",
    badge: "Transcription",
    badgeBg: "bg-secondary/10 text-secondary",
  },
  audio_speech: {
    Icon: Terminal,
    bg: "bg-blue-400/20",
    text: "text-blue-400",
    badge: "Speech",
    badgeBg: "bg-blue-400/10 text-blue-400",
  },
  other: {
    Icon: Box,
    bg: "bg-slate-500/20",
    text: "text-slate-400",
    badge: "Other",
    badgeBg: "bg-slate-500/10 text-slate-400",
  },
};

/** Known model descriptions keyed by substring match against model_name (lowercased). Order matters — more specific patterns first. */
const MODEL_DESCRIPTIONS: [pattern: string, description: string][] = [
  // OpenAI — GPT-5
  ["gpt-5-nano", "Ultra-compact model optimized for edge deployment and minimal latency tasks."],
  ["gpt-5-mini", "Efficient next-gen model balancing speed and intelligence for everyday tasks."],
  ["gpt-5.2", "Latest iteration with enhanced reasoning and improved instruction-following."],
  [
    "gpt-5",
    "Next-generation flagship model with breakthrough reasoning and multimodal capabilities.",
  ],
  // OpenAI — GPT-4
  [
    "gpt-4o-mini",
    "Optimized for speed and efficiency, offering the best cost-to-performance ratio for simple tasks.",
  ],
  [
    "gpt-4o",
    "Most advanced multimodal model with high intelligence and native real-time audio/vision capabilities.",
  ],
  [
    "gpt-4-turbo",
    "High-capability model with vision understanding and broad knowledge at reduced cost.",
  ],
  [
    "gpt-4.5",
    "Enhanced model bridging GPT-4 and GPT-5 with improved creative and analytical tasks.",
  ],
  [
    "gpt-4.1",
    "Refined GPT-4 variant with improved coding, instruction-following, and long-context.",
  ],
  ["gpt-4", "Flagship reasoning model with broad knowledge and advanced instruction-following."],
  // OpenAI — Other
  [
    "gpt-3.5",
    "Fast and cost-effective model suitable for straightforward tasks and high-volume workloads.",
  ],
  ["o4-mini", "Compact reasoning model optimized for STEM tasks with fast response times."],
  ["o3-mini", "Small reasoning model optimized for STEM tasks with adjustable thinking effort."],
  ["o3", "Powerful reasoning model for complex multi-step problem solving across domains."],
  ["o1-mini", "Fast reasoning model optimized for coding, math, and science tasks."],
  ["o1", "Advanced reasoning model that thinks before responding for complex analytical tasks."],
  // Anthropic
  [
    "claude-opus",
    "Most capable Claude model for complex analysis, nuanced writing, and multi-step reasoning.",
  ],
  [
    "claude-sonnet",
    "Exceptional reasoning and coding performance, with human-like nuance and high reliability.",
  ],
  [
    "claude-haiku",
    "Fast and compact model ideal for near-instant responses and lightweight tasks.",
  ],
  [
    "claude-3.5",
    "High-performance model balancing speed and intelligence for production workloads.",
  ],
  [
    "claude-3",
    "Versatile model family offering a range of intelligence, speed, and cost trade-offs.",
  ],
  ["claude", "Anthropic's AI assistant model with strong reasoning and safety capabilities."],
  // Google
  ["gemini-2.5", "Google's latest model with enhanced multimodal reasoning and efficiency."],
  ["gemini-2", "Google's next-generation multimodal model with improved reasoning and efficiency."],
  [
    "gemini-1.5-pro",
    "Google's flagship multimodal model featuring an industry-leading 1M+ token context window.",
  ],
  [
    "gemini-1.5-flash",
    "Fast and efficient Google model optimized for high-throughput and lower-latency tasks.",
  ],
  ["gemini-pro", "Google's capable multimodal model for general reasoning and content generation."],
  ["gemini", "Google's multimodal AI model with strong reasoning across text, code, and images."],
  // Meta
  [
    "llama-4",
    "Meta's latest open-weight model with state-of-the-art performance across benchmarks.",
  ],
  [
    "llama-3.3",
    "Meta's efficient open-weight model delivering strong performance at reduced compute cost.",
  ],
  [
    "llama-3.1",
    "Meta's open-source model with extended context and improved multilingual capabilities.",
  ],
  [
    "llama-3",
    "Meta's most capable open-source model, rivaling top proprietary models in performance.",
  ],
  ["llama", "Meta's open-weight large language model family for diverse AI applications."],
  // Mistral
  [
    "mistral-large",
    "Mistral's flagship model with top-tier reasoning and multilingual capabilities.",
  ],
  [
    "mistral-medium",
    "Balanced Mistral model for complex tasks requiring reasoning and instruction-following.",
  ],
  [
    "mistral-small",
    "Efficient Mistral model for low-latency tasks and cost-sensitive applications.",
  ],
  ["mixtral", "Sparse mixture-of-experts model delivering high quality at efficient compute cost."],
  ["mistral", "Open-weight model offering strong performance for its size class."],
  // Cohere
  [
    "command-r-plus",
    "Cohere's advanced model optimized for RAG, tool use, and multi-step reasoning.",
  ],
  [
    "command-r",
    "Cohere's scalable model for retrieval-augmented generation and enterprise workflows.",
  ],
  ["command", "Cohere's generative model for text generation and business applications."],
  // Embedding
  [
    "text-embedding-3-large",
    "OpenAI's highest-dimension embedding model for maximum retrieval accuracy.",
  ],
  [
    "text-embedding-3-small",
    "Compact and efficient embedding model balancing performance and cost.",
  ],
  ["text-embedding-ada", "Foundational embedding model for semantic search and similarity tasks."],
  ["embed", "Text embedding model for converting text into dense vector representations."],
  // Image
  [
    "dall-e-3",
    "Advanced image generation model producing highly detailed and accurate visuals from text.",
  ],
  ["dall-e", "OpenAI's image generation model for creating visuals from natural language prompts."],
  // Audio
  [
    "whisper",
    "Robust speech recognition model supporting multilingual transcription and translation.",
  ],
  ["tts", "Text-to-speech model generating natural-sounding audio from text input."],
];

/** Descriptive badge labels keyed by substring match (most specific first). */
const MODEL_BADGES: [pattern: string, label: string, classes: string][] = [
  // Nano/Mini/Small → Fast
  ["nano", "Fast", "bg-blue-500/10 text-blue-400"],
  ["mini", "Fast", "bg-blue-500/10 text-blue-400"],
  ["small", "Fast", "bg-blue-500/10 text-blue-400"],
  ["flash", "Fast", "bg-blue-500/10 text-blue-400"],
  ["haiku", "Fast", "bg-blue-500/10 text-blue-400"],
  // Reasoning models
  ["o1", "Reasoning", "bg-amber-500/10 text-amber-400"],
  ["o3", "Reasoning", "bg-amber-500/10 text-amber-400"],
  ["o4", "Reasoning", "bg-amber-500/10 text-amber-400"],
  // Open-weight
  ["llama", "Open", "bg-slate-500/10 text-slate-400"],
  ["mixtral", "Open", "bg-slate-500/10 text-slate-400"],
  ["mistral", "Open", "bg-slate-500/10 text-slate-400"],
  // Large/Pro/Opus → Advanced
  ["opus", "Advanced", "bg-orange-500/10 text-orange-400"],
  ["large", "Advanced", "bg-orange-500/10 text-orange-400"],
  ["pro", "Advanced", "bg-orange-500/10 text-orange-400"],
  // Embedding
  ["embed", "Embedding", "bg-primary/10 text-primary"],
  // Image
  ["dall-e", "Creative", "bg-pink-500/10 text-pink-400"],
  // Audio
  ["whisper", "Audio", "bg-teal-500/10 text-teal-400"],
  ["tts", "Audio", "bg-teal-500/10 text-teal-400"],
];

const MODE_FALLBACK_DESCRIPTIONS: Record<string, string> = {
  chat: "Large language model available for chat completions and general reasoning tasks.",
  embedding: "Embedding model for converting text into dense vector representations.",
  image_generation: "Image generation model for creating visuals from text prompts.",
  audio_transcription: "Audio transcription model for converting speech to text.",
  audio_speech: "Text-to-speech model for generating audio from text input.",
  responses: "Model available via the Responses API for structured generation.",
  other: "Model available through the API proxy.",
};

function getModelDescription(modelName: string, mode: string | null): string {
  const lower = modelName.toLowerCase();
  for (const [pattern, desc] of MODEL_DESCRIPTIONS) {
    if (lower.includes(pattern)) return desc;
  }
  return MODE_FALLBACK_DESCRIPTIONS[mode ?? "other"] ?? MODE_FALLBACK_DESCRIPTIONS.other;
}

function getModelBadge(
  modelName: string,
  mode: string | null,
  modeStyle: { badge: string; badgeBg: string },
): { label: string; classes: string } {
  const lower = modelName.toLowerCase();
  for (const [pattern, label, classes] of MODEL_BADGES) {
    if (lower.includes(pattern)) return { label, classes };
  }
  // Fallback: default to "Stable" for chat, or the mode badge for others
  if (mode === "chat" || mode == null)
    return { label: "Stable", classes: "bg-green-500/10 text-green-400" };
  return { label: modeStyle.badge, classes: modeStyle.badgeBg };
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000).toLocaleString()}k tokens`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k tokens`;
  return `${tokens.toLocaleString()} tokens`;
}

function ModelCard({ model, onClick }: { model: ModelInfo; onClick: () => void }) {
  const info = model.model_info ?? {};
  const maxTokens = info.max_tokens as number | undefined;
  const inputCostPerToken = info.input_cost_per_token as number | undefined;
  const modeStyle = MODE_ICONS[model.mode ?? "other"] ?? MODE_ICONS.other;
  const ModeIcon = modeStyle.Icon;
  const badge = getModelBadge(model.model_name, model.mode, modeStyle);

  return (
    <div className="bg-white/3 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-slate-700 transition-all group text-left w-full">
      <div className="p-6 flex-1 w-full flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div
              className={`w-12 h-12 rounded-xl ${modeStyle.bg} flex items-center justify-center ${modeStyle.text}`}
            >
              <ModeIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">{model.model_name}</h3>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${badge.classes}`}
              >
                {badge.label}
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          {getModelDescription(model.model_name, model.mode)}
        </p>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          {maxTokens != null ? (
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                Context Window
              </p>
              <p className="text-text-primary text-sm font-medium mt-0.5">
                {formatTokenCount(maxTokens)}
              </p>
            </div>
          ) : null}
          {inputCostPerToken != null ? (
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                Input Cost
              </p>
              <p className="text-text-primary text-sm font-medium font-mono mt-0.5">
                ${(inputCostPerToken * 1_000_000).toFixed(2)} / 1M
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClick}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-xs font-bold transition-colors"
          >
            Documentation
          </button>
          <button
            type="button"
            onClick={onClick}
            className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-xs font-bold transition-colors"
          >
            View Usage
          </button>
        </div>
      </div>
    </div>
  );
}

export function Models() {
  const { data, isLoading, error } = useModels();
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const models = data?.models ?? [];
  const groups = useMemo(() => groupModelsByMode(models), [models]);

  // Default to first available mode once data loads
  useEffect(() => {
    if (groups.length > 0 && activeMode === null) {
      setActiveMode(groups[0].mode);
    }
  }, [groups, activeMode]);

  const activeGroup = groups.find((g) => g.mode === activeMode) ?? groups[0];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load models</p>
          <p className="mt-1 text-sm text-zinc-500">{String(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-text-primary">Model Directory</h1>
          <p className="text-text-secondary mt-2 text-lg">
            Deploy and manage high-performance LLMs for your production environment.
          </p>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Box className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No models available</p>
          <p className="text-sm mt-1">Models are assigned based on your team access.</p>
        </div>
      ) : (
        <>
          {/* Tab navigation */}
          <div className="flex border-b border-white/10 mb-8">
            {groups.map((group) => (
              <button
                key={group.mode}
                type="button"
                onClick={() => setActiveMode(group.mode)}
                className={`px-8 py-4 text-sm font-medium transition-colors ${
                  activeMode === group.mode
                    ? "font-bold border-b-2 border-primary text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>

          {/* Model grid */}
          {activeGroup ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeGroup.models.map((model) => (
                <ModelCard
                  key={model.model_name}
                  model={model}
                  onClick={() => setSelectedModel(model)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}

      <ModelUsageDialog
        open={selectedModel !== null}
        model={selectedModel}
        onClose={() => setSelectedModel(null)}
      />
    </div>
  );
}
