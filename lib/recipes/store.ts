// Recipes Store - Declarative Workflows with Safe Expression Evaluation

import { integrationsStore } from "@/lib/integrations/store";
import { runsStore } from "@/lib/agents/store";

// Types
export type RecipeStepIf = {
  id: string;
  type: "if";
  expr: string;
  then: RecipeStep[];
  else?: RecipeStep[];
};

export type RecipeStepActionInvoke = {
  id: string;
  type: "action.invoke";
  actionId: string;
  context?: Record<string, string | number | boolean>;
};

export type RecipeStepAgentRun = {
  id: string;
  type: "agent.run";
  agentId: string;
  note?: string;
};

export type RecipeStep =
  | RecipeStepIf
  | RecipeStepActionInvoke
  | RecipeStepAgentRun;

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  steps: RecipeStep[];
  defaults?: Record<string, string | number | boolean>;
  createdAt: string;
  updatedAt: string;
}

export type RecipeRunStatus = "running" | "success" | "error";

export interface RecipeRunLog {
  ts: string;
  level: "info" | "warn" | "error";
  msg: string;
  stepId?: string;
}

export interface RecipeRun {
  id: string;
  recipeId: string;
  status: RecipeRunStatus;
  startedAt: string;
  completedAt?: string;
  logs: RecipeRunLog[];
  outputs: {
    deliveries: Array<{ id: string; actionId: string }>;
    agentRuns: Array<{ runId: string; agentId: string }>;
  };
  errorMessage?: string;
}

// Safe Expression Parser (no eval)
const KEY_REGEX = /^[A-Za-z_]\w*$/;
const CLAUSE_REGEX =
  /^\s*([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<|contains|startsWith|endsWith)\s*(true|false|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*")\s*$/;

function parseValue(
  literal: string
): string | number | boolean | null {
  if (literal === "true") return true;
  if (literal === "false") return false;
  if (literal.startsWith('"') && literal.endsWith('"')) {
    return literal.slice(1, -1).replace(/\\"/g, '"');
  }
  const num = parseFloat(literal);
  if (!isNaN(num)) return num;
  return null;
}

function evaluateClause(
  clause: string,
  context: Record<string, string | number | boolean>
): boolean {
  const match = clause.match(CLAUSE_REGEX);
  if (!match) return false;

  const [, key, op, literal] = match;
  if (!KEY_REGEX.test(key)) return false;

  const leftVal = context[key];
  const rightVal = parseValue(literal);

  if (leftVal === undefined || rightVal === null) return false;

  switch (op) {
    case "==":
      return leftVal == rightVal;
    case "!=":
      return leftVal != rightVal;
    case ">":
      return Number(leftVal) > Number(rightVal);
    case ">=":
      return Number(leftVal) >= Number(rightVal);
    case "<":
      return Number(leftVal) < Number(rightVal);
    case "<=":
      return Number(leftVal) <= Number(rightVal);
    case "contains":
      return String(leftVal).includes(String(rightVal));
    case "startsWith":
      return String(leftVal).startsWith(String(rightVal));
    case "endsWith":
      return String(leftVal).endsWith(String(rightVal));
    default:
      return false;
  }
}

export function evaluateExpression(
  expr: string,
  context: Record<string, string | number | boolean>
): boolean {
  if (!expr || expr.length > 500) return false;

  // Check for combinators
  if (expr.includes("&&")) {
    const parts = expr.split("&&");
    if (parts.length > 2) return false; // Max 2 clauses
    return parts.every((p) => evaluateClause(p.trim(), context));
  }

  if (expr.includes("||")) {
    const parts = expr.split("||");
    if (parts.length > 2) return false;
    return parts.some((p) => evaluateClause(p.trim(), context));
  }

  // Single clause
  return evaluateClause(expr, context);
}

// Recipe Engine
class RecipesStore {
  private recipes = new Map<string, Recipe>();
  private runs = new Map<string, RecipeRun>();
  private recipeCounter = 0;
  private runCounter = 0;

  private static readonly MAX_RUNS = 200;
  private static readonly MAX_STEPS_PER_RECIPE = 200;

  createRecipe(input: {
    name: string;
    description?: string;
    steps: RecipeStep[];
    defaults?: Record<string, string | number | boolean>;
  }): Recipe {
    // Validate step count
    const stepCount = this.countSteps(input.steps);
    if (stepCount > RecipesStore.MAX_STEPS_PER_RECIPE) {
      throw new Error(
        `Recipe exceeds max steps (${RecipesStore.MAX_STEPS_PER_RECIPE})`
      );
    }

    const id = `recipe-${Date.now()}-${++this.recipeCounter}`;
    const recipe: Recipe = {
      id,
      name: input.name,
      description: input.description,
      steps: input.steps,
      defaults: input.defaults,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.recipes.set(id, recipe);
    return recipe;
  }

  private countSteps(steps: RecipeStep[]): number {
    let count = 0;
    for (const step of steps) {
      count++;
      if (step.type === "if") {
        count += this.countSteps(step.then);
        if (step.else) count += this.countSteps(step.else);
      }
    }
    return count;
  }

  updateRecipe(
    id: string,
    updates: {
      name?: string;
      description?: string;
      steps?: RecipeStep[];
      defaults?: Record<string, string | number | boolean>;
    }
  ): Recipe | undefined {
    const recipe = this.recipes.get(id);
    if (!recipe) return undefined;

    if (updates.steps) {
      const stepCount = this.countSteps(updates.steps);
      if (stepCount > RecipesStore.MAX_STEPS_PER_RECIPE) {
        throw new Error("Recipe exceeds max steps");
      }
    }

    const updated: Recipe = {
      ...recipe,
      name: updates.name ?? recipe.name,
      description: updates.description ?? recipe.description,
      steps: updates.steps ?? recipe.steps,
      defaults: updates.defaults ?? recipe.defaults,
      updatedAt: new Date().toISOString(),
    };

    this.recipes.set(id, updated);
    return updated;
  }

  getRecipe(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  listRecipes(): Array<Recipe & { stepCount: number }> {
    return Array.from(this.recipes.values())
      .map((r) => ({
        ...r,
        stepCount: this.countSteps(r.steps),
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  deleteRecipe(id: string): boolean {
    return this.recipes.delete(id);
  }

  // Run Engine
  runRecipe(
    recipeId: string,
    input?: Record<string, string | number | boolean>
  ): RecipeRun {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) throw new Error("recipe_not_found");

    const runId = `run-${Date.now()}-${++this.runCounter}`;
    const run: RecipeRun = {
      id: runId,
      recipeId,
      status: "running",
      startedAt: new Date().toISOString(),
      logs: [],
      outputs: {
        deliveries: [],
        agentRuns: [],
      },
    };

    this.runs.set(runId, run);

    // Build context
    const context: Record<string, string | number | boolean> = {
      ...(recipe.defaults || {}),
      ...(input || {}),
    };

    const log = (
      level: "info" | "warn" | "error",
      msg: string,
      stepId?: string
    ) => {
      run.logs.push({
        ts: new Date().toISOString(),
        level,
        msg,
        stepId,
      });
    };

    log("info", `Starting recipe: ${recipe.name}`);

    try {
      this.executeSteps(recipe.steps, context, run, log);
      run.status = "success";
      run.completedAt = new Date().toISOString();
      log("info", "Recipe completed successfully");
    } catch (err: any) {
      run.status = "error";
      run.errorMessage = err.message || "Unknown error";
      run.completedAt = new Date().toISOString();
      log("error", `Recipe failed: ${run.errorMessage}`);
    }

    // LRU management
    const runsList = Array.from(this.runs.values()).sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    if (runsList.length > RecipesStore.MAX_RUNS) {
      const toRemove = runsList.slice(RecipesStore.MAX_RUNS);
      toRemove.forEach((r) => this.runs.delete(r.id));
    }

    return run;
  }

  private executeSteps(
    steps: RecipeStep[],
    context: Record<string, string | number | boolean>,
    run: RecipeRun,
    log: (level: "info" | "warn" | "error", msg: string, stepId?: string) => void
  ): void {
    for (const step of steps) {
      log("info", `Executing step ${step.id} (type: ${step.type})`, step.id);

      if (step.type === "if") {
        log("info", `Evaluating expression: ${step.expr}`, step.id);

        let result: boolean;
        try {
          result = evaluateExpression(step.expr, context);
          log("info", `Expression result: ${result}`, step.id);
        } catch (err: any) {
          log(
            "warn",
            `Expression parse error: ${err.message}, defaulting to false`,
            step.id
          );
          result = false;
        }

        if (result) {
          log("info", "Taking 'then' branch", step.id);
          this.executeSteps(step.then, context, run, log);
        } else if (step.else) {
          log("info", "Taking 'else' branch", step.id);
          this.executeSteps(step.else, context, run, log);
        } else {
          log("info", "No 'else' branch, skipping", step.id);
        }
      } else if (step.type === "action.invoke") {
        log(
          "info",
          `Invoking action ${step.actionId}`,
          step.id
        );

        const invokeContext = {
          ...context,
          ...(step.context || {}),
        };

        try {
          const delivery = integrationsStore.invokeAction(
            step.actionId,
            invokeContext
          );
          run.outputs.deliveries.push({
            id: delivery.id,
            actionId: step.actionId,
          });
          log(
            "info",
            `Action invoked successfully, delivery ID: ${delivery.id}`,
            step.id
          );
        } catch (err: any) {
          throw new Error(
            `action.invoke failed at step ${step.id}: ${err.message}`
          );
        }
      } else if (step.type === "agent.run") {
        log("info", `Starting agent run for ${step.agentId}`, step.id);

        try {
          const agentRun = runsStore.createRun(step.agentId);
          run.outputs.agentRuns.push({
            runId: agentRun.id,
            agentId: step.agentId,
          });
          log(
            "info",
            `Agent run created: ${agentRun.id}${step.note ? ` (${step.note})` : ""}`,
            step.id
          );
        } catch (err: any) {
          throw new Error(
            `agent.run failed at step ${step.id}: ${err.message}`
          );
        }
      }
    }
  }

  getRun(id: string): RecipeRun | undefined {
    return this.runs.get(id);
  }

  listRuns(recipeId?: string): RecipeRun[] {
    let runs = Array.from(this.runs.values());

    if (recipeId) {
      runs = runs.filter((r) => r.recipeId === recipeId);
    }

    return runs.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }
}

export const recipesStore = new RecipesStore();
