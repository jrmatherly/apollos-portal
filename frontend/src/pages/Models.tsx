import { Box, Loader2 } from "lucide-react";
import { useModels } from "../hooks/useModels";

export function Models() {
  const { data, isLoading, error } = useModels();

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

  const models = data?.models ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            System Live
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Available Models
          </h1>
          <p className="text-text-secondary max-w-2xl text-lg">
            Models available to your teams through the Apollos AI gateway.
          </p>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Box className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No models available</p>
          <p className="text-sm mt-1">
            Models are assigned based on your team access.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const info = model.model_info ?? {};
            const maxTokens = info.max_tokens as number | undefined;
            const inputCostPerToken = info.input_cost_per_token as
              | number
              | undefined;
            const outputCostPerToken = info.output_cost_per_token as
              | number
              | undefined;

            return (
              <div
                key={model.model_name}
                className="bg-surface border border-surface-border rounded-xl overflow-hidden flex flex-col hover:border-primary/40 transition-all group"
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors">
                        {model.model_name}
                      </h3>
                      {model.litellm_model_name && (
                        <p className="text-text-secondary text-xs font-mono mt-1">
                          {model.litellm_model_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-surface-border">
                    {maxTokens != null && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">
                          Context Window
                        </span>
                        <span className="text-text-primary font-mono text-sm">
                          {maxTokens.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {inputCostPerToken != null && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">
                          Input Cost
                        </span>
                        <span className="text-text-primary font-mono text-sm">
                          ${(inputCostPerToken * 1_000_000).toFixed(2)} / 1M
                        </span>
                      </div>
                    )}
                    {outputCostPerToken != null && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary text-xs uppercase tracking-wider font-semibold">
                          Output Cost
                        </span>
                        <span className="text-text-primary font-mono text-sm">
                          ${(outputCostPerToken * 1_000_000).toFixed(2)} / 1M
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
