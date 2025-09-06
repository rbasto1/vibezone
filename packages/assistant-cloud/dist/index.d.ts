import { ReadonlyJSONObject } from 'assistant-stream/utils';
import { AssistantStream } from 'assistant-stream';

type AssistantCloudAuthStrategy = {
    readonly strategy: "anon" | "jwt" | "api-key";
    getAuthHeaders(): Promise<Record<string, string> | false>;
    readAuthHeaders(headers: Headers): void;
};

type AssistantCloudConfig = {
    baseUrl: string;
    authToken: () => Promise<string | null>;
} | {
    baseUrl: string;
    apiKey: string;
    userId: string;
    workspaceId: string;
} | {
    baseUrl: string;
    anonymous: true;
};
type MakeRequestOptions = {
    method?: "POST" | "PUT" | "DELETE" | undefined;
    headers?: Record<string, string> | undefined;
    query?: Record<string, string | number | boolean> | undefined;
    body?: object | undefined;
};
declare class AssistantCloudAPI {
    _auth: AssistantCloudAuthStrategy;
    _baseUrl: string;
    constructor(config: AssistantCloudConfig);
    initializeAuth(): Promise<boolean>;
    makeRawRequest(endpoint: string, options?: MakeRequestOptions): Promise<Response>;
    makeRequest(endpoint: string, options?: MakeRequestOptions): Promise<any>;
}

type CloudMessage = {
    id: string;
    parent_id: string | null;
    height: number;
    created_at: Date;
    updated_at: Date;
    format: "aui/v0" | string;
    content: ReadonlyJSONObject;
};
type AssistantCloudThreadMessageListQuery = {
    format?: string;
};
type AssistantCloudThreadMessageListResponse = {
    messages: CloudMessage[];
};
type AssistantCloudThreadMessageCreateBody = {
    parent_id: string | null;
    format: "aui/v0" | string;
    content: ReadonlyJSONObject;
};
type AssistantCloudMessageCreateResponse = {
    message_id: string;
};
declare class AssistantCloudThreadMessages {
    private cloud;
    constructor(cloud: AssistantCloudAPI);
    list(threadId: string, query?: AssistantCloudThreadMessageListQuery): Promise<AssistantCloudThreadMessageListResponse>;
    create(threadId: string, body: AssistantCloudThreadMessageCreateBody): Promise<AssistantCloudMessageCreateResponse>;
}

type AssistantCloudAuthTokensCreateResponse = {
    token: string;
};
declare class AssistantCloudAuthTokens {
    private cloud;
    constructor(cloud: AssistantCloudAPI);
    create(): Promise<AssistantCloudAuthTokensCreateResponse>;
}

type AssistantCloudRunsStreamBody = {
    thread_id: string;
    assistant_id: "system/thread_title";
    messages: readonly unknown[];
};
declare class AssistantCloudRuns {
    private cloud;
    constructor(cloud: AssistantCloudAPI);
    __internal_getAssistantOptions(assistantId: string): {
        api: string;
        headers: () => Promise<{
            Accept: string;
        }>;
        body: {
            assistant_id: string;
            response_format: string;
            thread_id: string;
        };
    };
    stream(body: AssistantCloudRunsStreamBody): Promise<AssistantStream>;
}

type AssistantCloudThreadsListQuery = {
    is_archived?: boolean;
    limit?: number;
    after?: string;
};
type CloudThread = {
    title: string;
    last_message_at: Date;
    metadata: unknown;
    external_id: string | null;
    id: string;
    project_id: string;
    created_at: Date;
    updated_at: Date;
    workspace_id: string;
    is_archived: boolean;
};
type AssistantCloudThreadsListResponse = {
    threads: CloudThread[];
};
type AssistantCloudThreadsCreateBody = {
    title?: string | undefined;
    last_message_at: Date;
    metadata?: unknown | undefined;
    external_id?: string | undefined;
};
type AssistantCloudThreadsCreateResponse = {
    thread_id: string;
};
type AssistantCloudThreadsUpdateBody = {
    title?: string | undefined;
    last_message_at?: Date | undefined;
    metadata?: unknown | undefined;
    is_archived?: boolean | undefined;
};
declare class AssistantCloudThreads {
    private cloud;
    readonly messages: AssistantCloudThreadMessages;
    constructor(cloud: AssistantCloudAPI);
    list(query?: AssistantCloudThreadsListQuery): Promise<AssistantCloudThreadsListResponse>;
    create(body: AssistantCloudThreadsCreateBody): Promise<AssistantCloudThreadsCreateResponse>;
    update(threadId: string, body: AssistantCloudThreadsUpdateBody): Promise<void>;
    delete(threadId: string): Promise<void>;
}

type PdfToImagesRequestBody = {
    file_blob?: string | undefined;
    file_url?: string | undefined;
};
type PdfToImagesResponse = {
    success: boolean;
    urls: string[];
    message: string;
};
type GeneratePresignedUploadUrlRequestBody = {
    filename: string;
};
type GeneratePresignedUploadUrlResponse = {
    success: boolean;
    signedUrl: string;
    expiresAt: string;
    publicUrl: string;
};
declare class AssistantCloudFiles {
    private cloud;
    constructor(cloud: AssistantCloudAPI);
    pdfToImages(body: PdfToImagesRequestBody): Promise<PdfToImagesResponse>;
    generatePresignedUploadUrl(body: GeneratePresignedUploadUrlRequestBody): Promise<GeneratePresignedUploadUrlResponse>;
}

declare class AssistantCloud {
    readonly threads: AssistantCloudThreads;
    readonly auth: {
        tokens: AssistantCloudAuthTokens;
    };
    readonly runs: AssistantCloudRuns;
    readonly files: AssistantCloudFiles;
    constructor(config: AssistantCloudConfig);
}

export { AssistantCloud, type CloudMessage };
