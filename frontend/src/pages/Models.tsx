import {
  Box,
  Brain,
  Check,
  CircuitBoard,
  Code,
  Copy,
  Loader2,
  Terminal,
  X,
  Zap,
} from "lucide-react";
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

const MODE_ICONS: Record<string, { Icon: typeof Brain; bg: string; text: string }> = {
  chat: { Icon: Brain, bg: "bg-[#8b5cf6]/20", text: "text-[#8b5cf6]" },
  embedding: { Icon: CircuitBoard, bg: "bg-primary/20", text: "text-primary" },
  image_generation: {
    Icon: Zap,
    bg: "bg-orange-500/20",
    text: "text-orange-400",
  },
  audio_transcription: {
    Icon: Terminal,
    bg: "bg-secondary/20",
    text: "text-secondary",
  },
  audio_speech: { Icon: Terminal, bg: "bg-blue-400/20", text: "text-blue-400" },
  other: { Icon: Box, bg: "bg-slate-500/20", text: "text-slate-400" },
};

function ModelCard({ model, onClick }: { model: ModelInfo; onClick: () => void }) {
  const info = model.model_info ?? {};
  const maxTokens = info.max_tokens as number | undefined;
  const inputCostPerToken = info.input_cost_per_token as number | undefined;
  const outputCostPerToken = info.output_cost_per_token as number | undefined;
  const modeStyle = MODE_ICONS[model.mode ?? "other"] ?? MODE_ICONS.other;
  const ModeIcon = modeStyle.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white/3 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group cursor-pointer text-left w-full"
    >
      <div className="p-6 flex-1 w-full flex flex-col gap-5">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div
              className={`w-12 h-12 rounded-xl ${modeStyle.bg} flex items-center justify-center ${modeStyle.text}`}
            >
              <ModeIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors">
                {model.model_name}
              </h3>
              {model.litellm_model_name ? (
                <p className="text-text-secondary text-xs font-mono mt-0.5">
                  {model.litellm_model_name}
                </p>
              ) : null}
            </div>
          </div>
          <Code className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          {maxTokens != null ? (
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                Context Window
              </p>
              <p className="text-text-primary text-sm font-medium mt-0.5">
                {maxTokens.toLocaleString()}
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
          {outputCostPerToken != null ? (
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
                Output Cost
              </p>
              <p className="text-text-primary text-sm font-medium font-mono mt-0.5">
                ${(outputCostPerToken * 1_000_000).toFixed(2)} / 1M
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function Models() {
  const { data, isLoading, error } = useModels();
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);

  const models = data?.models ?? [];
  const groups = useMemo(() => groupModelsByMode(models), [models]);

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
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Live
          </div>
          <h1 className="text-4xl font-black tracking-tight text-text-primary">Model Directory</h1>
          <p className="text-text-secondary max-w-2xl text-lg">
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
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.mode}>
              <h2 className="text-2xl font-bold text-text-primary mb-6">{group.label}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.models.map((model) => (
                  <ModelCard
                    key={model.model_name}
                    model={model}
                    onClick={() => setSelectedModel(model)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ModelUsageDialog
        open={selectedModel !== null}
        model={selectedModel}
        onClose={() => setSelectedModel(null)}
      />
    </div>
  );
}
