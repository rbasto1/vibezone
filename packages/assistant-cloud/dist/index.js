// src/AssistantCloudAuthStrategy.tsx
var getJwtExpiry = (jwt) => {
  try {
    const parts = jwt.split(".");
    const bodyPart = parts[1];
    if (!bodyPart) {
      throw new Error("Invalid JWT format");
    }
    let base64 = bodyPart.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const payload = atob(base64);
    const payloadObj = JSON.parse(payload);
    const exp = payloadObj.exp;
    if (!exp || typeof exp !== "number") {
      throw new Error('JWT does not contain a valid "exp" field');
    }
    return exp * 1e3;
  } catch (error) {
    throw new Error("Unable to determine the token expiry: " + error);
  }
};
var AssistantCloudJWTAuthStrategy = class {
  strategy = "jwt";
  cachedToken = null;
  tokenExpiry = null;
  #authTokenCallback;
  constructor(authTokenCallback) {
    this.#authTokenCallback = authTokenCallback;
  }
  async getAuthHeaders() {
    const currentTime = Date.now();
    if (this.cachedToken && this.tokenExpiry && this.tokenExpiry - currentTime > 30 * 1e3) {
      return { Authorization: `Bearer ${this.cachedToken}` };
    }
    const newToken = await this.#authTokenCallback();
    if (!newToken) return false;
    this.cachedToken = newToken;
    this.tokenExpiry = getJwtExpiry(newToken);
    return { Authorization: `Bearer ${newToken}` };
  }
  readAuthHeaders(headers) {
    const authHeader = headers.get("Authorization");
    if (!authHeader) return;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new Error("Invalid auth header received");
    }
    this.cachedToken = token;
    this.tokenExpiry = getJwtExpiry(token);
  }
};
var AssistantCloudAPIKeyAuthStrategy = class {
  strategy = "api-key";
  #apiKey;
  #userId;
  #workspaceId;
  constructor(apiKey, userId, workspaceId) {
    this.#apiKey = apiKey;
    this.#userId = userId;
    this.#workspaceId = workspaceId;
  }
  async getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.#apiKey}`,
      "Aui-User-Id": this.#userId,
      "Aui-Workspace-Id": this.#workspaceId
    };
  }
  readAuthHeaders() {
  }
};
var AUI_REFRESH_TOKEN_NAME = "aui:refresh_token";
var AssistantCloudAnonymousAuthStrategy = class {
  strategy = "anon";
  baseUrl;
  jwtStrategy;
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.jwtStrategy = new AssistantCloudJWTAuthStrategy(async () => {
      const currentTime = Date.now();
      const storedRefreshTokenJson = localStorage.getItem(
        AUI_REFRESH_TOKEN_NAME
      );
      const storedRefreshToken = storedRefreshTokenJson ? JSON.parse(storedRefreshTokenJson) : void 0;
      if (storedRefreshToken) {
        const refreshExpiry = new Date(storedRefreshToken.expires_at).getTime();
        if (refreshExpiry - currentTime > 30 * 1e3) {
          const response2 = await fetch(
            `${this.baseUrl}/v1/auth/tokens/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh_token: storedRefreshToken.token })
            }
          );
          if (response2.ok) {
            const data2 = await response2.json();
            const { access_token: access_token2, refresh_token: refresh_token2 } = data2;
            if (refresh_token2) {
              localStorage.setItem(
                AUI_REFRESH_TOKEN_NAME,
                JSON.stringify(refresh_token2)
              );
            }
            return access_token2;
          }
        } else {
          localStorage.removeItem(AUI_REFRESH_TOKEN_NAME);
        }
      }
      const response = await fetch(`${this.baseUrl}/v1/auth/tokens/anonymous`, {
        method: "POST"
      });
      if (!response.ok) return null;
      const data = await response.json();
      const { access_token, refresh_token } = data;
      if (!access_token || !refresh_token) return null;
      localStorage.setItem(
        AUI_REFRESH_TOKEN_NAME,
        JSON.stringify(refresh_token)
      );
      return access_token;
    });
  }
  async getAuthHeaders() {
    return this.jwtStrategy.getAuthHeaders();
  }
  readAuthHeaders(headers) {
    this.jwtStrategy.readAuthHeaders(headers);
  }
};

// src/AssistantCloudAPI.tsx
var CloudAPIError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "APIError";
  }
};
var AssistantCloudAPI = class {
  _auth;
  _baseUrl;
  constructor(config) {
    if ("authToken" in config) {
      this._baseUrl = config.baseUrl;
      this._auth = new AssistantCloudJWTAuthStrategy(config.authToken);
    } else if ("apiKey" in config) {
      this._baseUrl = config.baseUrl;
      this._auth = new AssistantCloudAPIKeyAuthStrategy(
        config.apiKey,
        config.userId,
        config.workspaceId
      );
    } else if ("anonymous" in config) {
      this._baseUrl = config.baseUrl;
      this._auth = new AssistantCloudAnonymousAuthStrategy(config.baseUrl);
    } else {
      throw new Error(
        "Invalid configuration: Must provide authToken, apiKey, or anonymous configuration"
      );
    }
  }
  async initializeAuth() {
    return !!this._auth.getAuthHeaders();
  }
  async makeRawRequest(endpoint, options = {}) {
    const authHeaders = await this._auth.getAuthHeaders();
    if (!authHeaders) throw new Error("Authorization failed");
    const headers = {
      ...authHeaders,
      ...options.headers,
      "Content-Type": "application/json"
    };
    const queryParams = new URLSearchParams();
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === false) continue;
        if (value === true) {
          queryParams.set(key, "true");
        } else {
          queryParams.set(key, value.toString());
        }
      }
    }
    const url = new URL(`${this._baseUrl}/v1${endpoint}`);
    url.search = queryParams.toString();
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : null
    });
    this._auth.readAuthHeaders(response.headers);
    if (!response.ok) {
      const text = await response.text();
      try {
        const body = JSON.parse(text);
        throw new CloudAPIError(body.message);
      } catch {
        throw new Error(
          `Request failed with status ${response.status}, ${text}`
        );
      }
    }
    return response;
  }
  async makeRequest(endpoint, options = {}) {
    const response = await this.makeRawRequest(endpoint, options);
    return response.json();
  }
};

// src/AssistantCloudAuthTokens.tsx
var AssistantCloudAuthTokens = class {
  constructor(cloud) {
    this.cloud = cloud;
  }
  async create() {
    return this.cloud.makeRequest("/auth/tokens", { method: "POST" });
  }
};

// src/AssistantCloudRuns.tsx
import { AssistantStream, PlainTextDecoder } from "assistant-stream";
var AssistantCloudRuns = class {
  constructor(cloud) {
    this.cloud = cloud;
  }
  __internal_getAssistantOptions(assistantId) {
    return {
      api: this.cloud._baseUrl + "/v1/runs/stream",
      headers: async () => {
        const headers = await this.cloud._auth.getAuthHeaders();
        if (!headers) throw new Error("Authorization failed");
        return {
          ...headers,
          Accept: "text/plain"
        };
      },
      body: {
        assistant_id: assistantId,
        response_format: "vercel-ai-data-stream/v1",
        thread_id: "unstable_todo"
      }
    };
  }
  async stream(body) {
    const response = await this.cloud.makeRawRequest("/runs/stream", {
      method: "POST",
      headers: {
        Accept: "text/plain"
      },
      body
    });
    return AssistantStream.fromResponse(response, new PlainTextDecoder());
  }
};

// src/AssistantCloudThreadMessages.tsx
var AssistantCloudThreadMessages = class {
  constructor(cloud) {
    this.cloud = cloud;
  }
  async list(threadId, query) {
    return this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages`,
      { query }
    );
  }
  async create(threadId, body) {
    return this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages`,
      { method: "POST", body }
    );
  }
};

// src/AssistantCloudThreads.tsx
var AssistantCloudThreads = class {
  constructor(cloud) {
    this.cloud = cloud;
    this.messages = new AssistantCloudThreadMessages(cloud);
  }
  messages;
  async list(query) {
    return this.cloud.makeRequest("/threads", { query });
  }
  async create(body) {
    return this.cloud.makeRequest("/threads", { method: "POST", body });
  }
  async update(threadId, body) {
    return this.cloud.makeRequest(`/threads/${encodeURIComponent(threadId)}`, {
      method: "PUT",
      body
    });
  }
  async delete(threadId) {
    return this.cloud.makeRequest(`/threads/${encodeURIComponent(threadId)}`, {
      method: "DELETE"
    });
  }
};

// src/AssistantCloudFiles.tsx
var AssistantCloudFiles = class {
  constructor(cloud) {
    this.cloud = cloud;
  }
  async pdfToImages(body) {
    return this.cloud.makeRequest("/files/pdf-to-images", {
      method: "POST",
      body
    });
  }
  async generatePresignedUploadUrl(body) {
    return this.cloud.makeRequest(
      "/files/attachments/generate-presigned-upload-url",
      {
        method: "POST",
        body
      }
    );
  }
};

// src/AssistantCloud.tsx
var AssistantCloud = class {
  threads;
  auth;
  runs;
  files;
  constructor(config) {
    const api = new AssistantCloudAPI(config);
    this.threads = new AssistantCloudThreads(api);
    this.auth = {
      tokens: new AssistantCloudAuthTokens(api)
    };
    this.runs = new AssistantCloudRuns(api);
    this.files = new AssistantCloudFiles(api);
  }
};
export {
  AssistantCloud
};
