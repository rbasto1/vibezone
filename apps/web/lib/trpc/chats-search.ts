import { chats, db, messages, projects, threads } from "@/db";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { CHAT_LIST_PAGE_SIZE } from "../constants";

interface SearchChatsInput {
  userId: string;
  query: string;
  cursor?: string;
  limit?: number;
  projectId?: string;
}

interface SearchChatsResultItem {
  chatId: string;
  title: string;
  lastMessageAt: Date;
  createdAt: Date;
  projectId: string;
  projectName: string;
  projectColor: string;
  projectIsDefault: boolean;
  snippet: string | null;
  snippetCreatedAt: Date | null;
}

interface SearchChatsResult {
  results: SearchChatsResultItem[];
  next: string | null;
}

export async function searchChats({
  userId,
  query,
  cursor,
  projectId,
  limit = CHAT_LIST_PAGE_SIZE,
}: SearchChatsInput): Promise<SearchChatsResult> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return { results: [], next: null };
  }

  const searchPattern = `%${trimmedQuery}%`.replace(/\s+/g, "%");
  const baseConditions = [
    eq(projects.userId, userId),
    isNull(projects.deletedAt),
    isNull(chats.deletedAt),
    or(
      ilike(chats.title, searchPattern),
      sql<boolean>`EXISTS (
        SELECT 1
        FROM ${threads} AS t
        INNER JOIN ${messages} AS m ON m.thread_id = t.id
        WHERE t.chat_id = ${chats.id}
          AND m.deleted_at IS NULL
          AND (m.content::text ILIKE ${searchPattern})
      )`
    ),
  ];

  if (projectId) {
    baseConditions.push(eq(projects.id, projectId));
  }

  if (cursor) {
    const separatorIndex = cursor.lastIndexOf(":");
    if (separatorIndex > 0) {
      const timestampStr = cursor.slice(0, separatorIndex);
      const id = cursor.slice(separatorIndex + 1);
      const cursorDate =
        timestampStr && !Number.isNaN(Date.parse(timestampStr))
          ? new Date(timestampStr)
          : null;

      if (cursorDate) {
        baseConditions.push(
          or(
            lt(chats.lastMessageAt, cursorDate),
            and(eq(chats.lastMessageAt, cursorDate), gt(chats.id, id))
          )
        );
      }
    }
  }

  const chatRows = await db
    .select({
      id: chats.id,
      title: chats.title,
      lastMessageAt: chats.lastMessageAt,
      createdAt: chats.createdAt,
      projectId: projects.id,
      projectName: projects.name,
      projectColor: projects.color,
      projectIsDefault: sql<boolean>`${projects.id} = ${userId}`,
    })
    .from(chats)
    .innerJoin(projects, eq(projects.id, chats.projectId))
    .where(and(...baseConditions))
    .orderBy(desc(chats.lastMessageAt), asc(chats.id))
    .limit(limit + 1);

  const hasMore = chatRows.length > limit;
  const chatsData = hasMore ? chatRows.slice(0, limit) : chatRows;

  let next: string | null = null;
  if (hasMore && chatsData.length > 0) {
    const lastChat = chatsData[chatsData.length - 1]!;
    next = `${lastChat.lastMessageAt.toISOString()}:${lastChat.id}`;
  }

  const chatIds = chatsData.map((chat) => chat.id);
  const snippetMap = new Map<
    string,
    { snippet: string | null; createdAt: Date | null }
  >();

  if (chatIds.length) {
    const snippetRows = await db
      .select({
        chatId: threads.chatId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(threads)
      .innerJoin(messages, eq(messages.threadId, threads.id))
      .where(
        and(
          inArray(threads.chatId, chatIds),
          sql<boolean>`( ${messages.content}::text ILIKE ${searchPattern} )`
        )
      )
      .orderBy(asc(threads.chatId), desc(messages.createdAt));

    for (const row of snippetRows) {
      if (snippetMap.has(row.chatId)) continue;
      const snippet = extractTextSnippet(row.content, trimmedQuery);
      snippetMap.set(row.chatId, {
        snippet,
        createdAt: row.createdAt ?? null,
      });
    }
  }

  const results: SearchChatsResultItem[] = chatsData.map((chat) => {
    const snippetInfo = snippetMap.get(chat.id);
    return {
      chatId: chat.id,
      title: chat.title,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt,
      projectId: chat.projectId,
      projectName: chat.projectName,
      projectColor: chat.projectColor,
      projectIsDefault: chat.projectIsDefault,
      snippet: snippetInfo?.snippet ?? null,
      snippetCreatedAt: snippetInfo?.createdAt ?? null,
    };
  });

  return { results, next };
}

function extractTextSnippet(content: unknown, rawQuery: string): string | null {
  if (!content) return null;

  const query = rawQuery.toLowerCase();
  if (!query) return null;

  const createSnippet = (text: string): string | null => {
    if (!text) return null;
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const lower = normalized.toLowerCase();
    const index = lower.indexOf(query);
    const radius = 60;

    if (index === -1) {
      const trimmed = normalized.slice(0, radius * 2);
      return trimmed.length < normalized.length ? `${trimmed}…` : trimmed;
    }

    const start = Math.max(0, index - radius);
    const end = Math.min(normalized.length, index + query.length + radius);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < normalized.length ? "…" : "";
    return `${prefix}${normalized.slice(start, end).trim()}${suffix}`;
  };

  if (Array.isArray(content)) {
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        const snippet = createSnippet((part as { text: string }).text);
        if (snippet) return snippet;
      }
    }
    const firstText = content.find(
      (part) =>
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof (part as { text?: unknown }).text === "string"
    ) as { text?: string } | undefined;
    if (firstText?.text) {
      return createSnippet(firstText.text);
    }
    return null;
  }

  if (typeof content === "string") {
    return createSnippet(content);
  }

  if (
    typeof content === "object" &&
    content &&
    "text" in (content as Record<string, unknown>)
  ) {
    const textValue = (content as { text?: unknown }).text;
    if (typeof textValue === "string") {
      return createSnippet(textValue);
    }
  }

  return null;
}
