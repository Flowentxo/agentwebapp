// Integrations Store - In-Memory Provider, Actions, Secrets, Deliveries

export type ProviderType = "webhook" | "slack" | "custom";

export interface IntegrationProvider {
  id: string;
  type: ProviderType;
  name: string;
  config?: Record<string, string>;
  secretId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationSecret {
  id: string;
  name: string;
  value: string;
  createdAt: string;
}

export interface IntegrationAction {
  id: string;
  providerId: string;
  name: string;
  payloadTemplate: string;
  headersTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = "queued" | "sent" | "error";

export interface Delivery {
  id: string;
  actionId: string;
  providerId: string;
  payload: string;
  headers?: Record<string, string>;
  createdAt: string;
  status: DeliveryStatus;
  errorMessage?: string;
}

// Templating - Simple {{key}} interpolation, no eval
const KEY_REGEX = /^[a-zA-Z0-9_]+$/;

export function render(
  template: string,
  context: Record<string, string | number | boolean>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!KEY_REGEX.test(key)) return match;
    const val = context[key];
    return val !== undefined ? String(val) : match;
  });
}

// Secret Masking - Show first 2 and last 3 chars
export function maskSecret(value: string): string {
  if (value.length <= 6) return "***";
  const start = value.slice(0, 2);
  const end = value.slice(-3);
  return `${start}****${end}`;
}

// Store
class IntegrationsStore {
  private providers = new Map<string, IntegrationProvider>();
  private secrets = new Map<string, IntegrationSecret>();
  private actions = new Map<string, IntegrationAction>();
  private deliveries: Delivery[] = [];
  private providerCounter = 0;
  private secretCounter = 0;
  private actionCounter = 0;
  private deliveryCounter = 0;

  private static readonly MAX_DELIVERIES = 200;
  private static readonly MAX_TEMPLATE_SIZE = 10000;

  createSecret(name: string, value: string): IntegrationSecret {
    const id = `sec-${Date.now()}-${++this.secretCounter}`;
    const secret: IntegrationSecret = {
      id,
      name,
      value,
      createdAt: new Date().toISOString(),
    };
    this.secrets.set(id, secret);
    return secret;
  }

  createProvider(input: {
    type: ProviderType;
    name: string;
    config?: Record<string, string>;
    secret?: { name: string; value: string };
  }): IntegrationProvider {
    let secretId: string | undefined;

    if (input.secret) {
      const sec = this.createSecret(input.secret.name, input.secret.value);
      secretId = sec.id;
    }

    const id = `prov-${Date.now()}-${++this.providerCounter}`;
    const provider: IntegrationProvider = {
      id,
      type: input.type,
      name: input.name,
      config: input.config,
      secretId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.providers.set(id, provider);
    return provider;
  }

  createAction(input: {
    providerId: string;
    name: string;
    payloadTemplate: string;
    headersTemplate?: string;
  }): IntegrationAction {
    const provider = this.providers.get(input.providerId);
    if (!provider) throw new Error("provider_not_found");

    if (input.payloadTemplate.length > IntegrationsStore.MAX_TEMPLATE_SIZE) {
      throw new Error("template_too_large");
    }

    if (
      input.headersTemplate &&
      input.headersTemplate.length > IntegrationsStore.MAX_TEMPLATE_SIZE
    ) {
      throw new Error("template_too_large");
    }

    const id = `act-${Date.now()}-${++this.actionCounter}`;
    const action: IntegrationAction = {
      id,
      providerId: input.providerId,
      name: input.name,
      payloadTemplate: input.payloadTemplate,
      headersTemplate: input.headersTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.actions.set(id, action);
    return action;
  }

  invokeAction(
    actionId: string,
    context: Record<string, string | number | boolean>
  ): Delivery {
    const action = this.actions.get(actionId);
    if (!action) throw new Error("action_not_found");

    const provider = this.providers.get(action.providerId);
    if (!provider) throw new Error("provider_not_found");

    // Validate context keys
    for (const key of Object.keys(context)) {
      if (!KEY_REGEX.test(key)) {
        throw new Error(`invalid_context_key: ${key}`);
      }
    }

    let payload: string;
    let headers: Record<string, string> | undefined;
    let status: DeliveryStatus = "sent";
    let errorMessage: string | undefined;

    try {
      // Render payload
      payload = render(action.payloadTemplate, context);

      // Render headers if present
      if (action.headersTemplate) {
        const renderedHeaders = render(action.headersTemplate, context);
        try {
          headers = JSON.parse(renderedHeaders);
        } catch (e) {
          throw new Error("headers_template_invalid_json");
        }
      }
    } catch (err: any) {
      status = "error";
      errorMessage = err.message || "render_error";
      payload = "";
    }

    const id = `del-${Date.now()}-${++this.deliveryCounter}`;
    const delivery: Delivery = {
      id,
      actionId,
      providerId: action.providerId,
      payload,
      headers,
      createdAt: new Date().toISOString(),
      status,
      errorMessage,
    };

    // Add to deliveries (LRU - newest first)
    this.deliveries.unshift(delivery);
    if (this.deliveries.length > IntegrationsStore.MAX_DELIVERIES) {
      this.deliveries = this.deliveries.slice(
        0,
        IntegrationsStore.MAX_DELIVERIES
      );
    }

    return delivery;
  }

  listProviders(): IntegrationProvider[] {
    return Array.from(this.providers.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getProvider(id: string): IntegrationProvider | undefined {
    return this.providers.get(id);
  }

  listActions(): IntegrationAction[] {
    return Array.from(this.actions.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getAction(id: string): IntegrationAction | undefined {
    return this.actions.get(id);
  }

  listDeliveries(limit = 50): Delivery[] {
    return this.deliveries.slice(0, limit);
  }

  getSecret(id: string): IntegrationSecret | undefined {
    return this.secrets.get(id);
  }

  // For API responses - returns providers with masked secrets
  listProvidersWithMaskedSecrets(): Array<
    IntegrationProvider & { secretName?: string; secretValue?: string }
  > {
    return this.listProviders().map((p) => {
      if (p.secretId) {
        const secret = this.secrets.get(p.secretId);
        if (secret) {
          return {
            ...p,
            secretName: secret.name,
            secretValue: maskSecret(secret.value),
          };
        }
      }
      return p;
    });
  }
}

export const integrationsStore = new IntegrationsStore();
