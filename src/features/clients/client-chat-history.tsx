import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2 } from "lucide-react";

import type { AppError } from "@/core/errors/app-error";
import {
  fetchClientChatHistory,
  toClientsFriendlyMessage,
  type ChatMessage,
} from "@/features/clients/clients-service";

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const RAW_URL_RE = /(https?:\/\/\S+)/g;

type Token =
  | { type: "link"; label: string; url: string; start: number; end: number }
  | { type: "bold"; text: string; start: number; end: number }
  | { type: "url"; url: string; start: number; end: number };

function truncateUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return pathname.length > 1 ? `${hostname}/…` : hostname;
  } catch {
    return `${url.slice(0, 30)}…`;
  }
}

function renderMessageContent(content: string): ReactNode {
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;

  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((m = MARKDOWN_LINK_RE.exec(content)) !== null) {
    tokens.push({ type: "link", label: m[1], url: m[2], start: m.index, end: m.index + m[0].length });
  }

  BOLD_RE.lastIndex = 0;
  while ((m = BOLD_RE.exec(content)) !== null) {
    tokens.push({ type: "bold", text: m[1], start: m.index, end: m.index + m[0].length });
  }

  RAW_URL_RE.lastIndex = 0;
  while ((m = RAW_URL_RE.exec(content)) !== null) {
    tokens.push({ type: "url", url: m[1], start: m.index, end: m.index + m[0].length });
  }

  tokens.sort((a, b) => a.start - b.start);

  const filtered: Token[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.start >= cursor) {
      filtered.push(token);
      cursor = token.end;
    }
  }

  const nodes: ReactNode[] = [];
  let last = 0;

  for (const token of filtered) {
    if (token.start > last) nodes.push(content.slice(last, token.start));

    if (token.type === "link") {
      nodes.push(
        <a key={token.start} href={token.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 underline">
          {token.label}
        </a>
      );
    } else if (token.type === "bold") {
      nodes.push(<strong key={token.start}>{token.text}</strong>);
    } else {
      nodes.push(
        <a key={token.start} href={token.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 underline" title={token.url}>
          {truncateUrl(token.url)}
        </a>
      );
    }

    last = token.end;
  }

  if (last < content.length) nodes.push(content.slice(last));

  return nodes.length > 0 ? nodes : content;
}

type ClientChatHistoryProps = {
  clientId: string;
};

const PAGE_SIZE = 12;

function groupMessagesByDay(messages: ChatMessage[]) {
  const groups: Array<{ date: string; messages: ChatMessage[] }> = [];
  let currentDate = "";
  let currentGroup: ChatMessage[] = [];

  messages.forEach((message) => {
    const messageDate = new Date(message.createdAt).toLocaleDateString("es-PY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (messageDate !== currentDate) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate, messages: currentGroup });
      }
      currentDate = messageDate;
      currentGroup = [message];
      return;
    }

    currentGroup.push(message);
  });

  if (currentGroup.length > 0) {
    groups.push({ date: currentDate, messages: currentGroup });
  }

  return groups;
}

function mergeOlderMessages(olderMessages: ChatMessage[], currentMessages: ChatMessage[]) {
  const knownIds = new Set(currentMessages.map((message) => message.id));
  const uniqueOlder = olderMessages.filter((message) => !knownIds.has(message.id));
  const merged = [...uniqueOlder, ...currentMessages];
  return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function getMessageTypeLabel(messageType: ChatMessage["messageType"]) {
  const labels: Record<ChatMessage["messageType"], string> = {
    TEXT: "",
    IMAGE: "Imagen",
    AUDIO: "Audio",
    VIDEO: "Video",
    DOCUMENT: "Documento",
    STICKER: "Sticker",
    UNKNOWN: "Mensaje",
  };

  return labels[messageType];
}

export function ClientChatHistory({ clientId }: ClientChatHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-chat", clientId],
    queryFn: () => fetchClientChatHistory(clientId, { size: PAGE_SIZE }),
  });

  useEffect(() => {
    if (data) {
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);

      requestAnimationFrame(() => {
        if (!scrollContainerRef.current) {
          return;
        }
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      });
    }
  }, [data, clientId]);

  const loadOlderMessages = async () => {
    if (!hasMore || isLoadingOlder || !nextCursor) {
      return;
    }

    const container = scrollContainerRef.current;

    setIsLoadingOlder(true);
    prevScrollHeightRef.current = container?.scrollHeight ?? 0;
    prevScrollTopRef.current = container?.scrollTop ?? 0;

    try {
      const olderData = await fetchClientChatHistory(clientId, {
        before: nextCursor,
        size: PAGE_SIZE,
      });

      setMessages((previousMessages) => mergeOlderMessages(olderData.messages, previousMessages));
      setHasMore(olderData.hasMore);
      setNextCursor(olderData.nextCursor);

      requestAnimationFrame(() => {
        if (!scrollContainerRef.current) {
          return;
        }
        const newScrollHeight = scrollContainerRef.current.scrollHeight;
        const heightDiff = newScrollHeight - prevScrollHeightRef.current;
        scrollContainerRef.current.scrollTop = prevScrollTopRef.current + heightDiff;
      });
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop } = scrollContainerRef.current;

    if (scrollTop < 100 && hasMore && !isLoadingOlder) {
      void loadOlderMessages();
    }
  };

  const groupedMessages = groupMessagesByDay(messages);

  if (isLoading) {
    return (
      <div className="flex h-[620px] items-center justify-center rounded-xl border border-neutral-dark bg-white text-sm text-primary-light">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Cargando historial de chat...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
        {toClientsFriendlyMessage(error as unknown as AppError)}
      </div>
    );
  }

  return (
    <div className="flex h-[620px] flex-col">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-neutral-dark p-4"
        style={{
          backgroundColor: "#efeae2",
          backgroundImage: "radial-gradient(#d9dbd2 0.7px, transparent 0.7px)",
          backgroundSize: "10px 10px",
        }}
      >
        {!hasMore && messages.length > 0 && (
          <div className="mb-3 text-center">
            <span className="rounded-full bg-black/10 px-3 py-1 text-[11px] text-primary-light">
              Inicio de la conversación
            </span>
          </div>
        )}

        {isLoadingOlder && (
          <div className="text-center text-xs text-primary-light">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2.5 py-1">
              <Loader2 className="size-3 animate-spin" />
              Cargando mensajes anteriores...
            </span>
          </div>
        )}

        {groupedMessages.map((group, groupIdx) => (
          <div key={groupIdx}>
            <div className="my-4 flex items-center justify-center">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary-light shadow-sm">
                {group.date}
              </span>
            </div>

            <div className="space-y-2">
              {group.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "CUSTOMER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                      msg.sender === "CUSTOMER"
                        ? "rounded-br-sm bg-[#dcf8c6] text-primary"
                        : "rounded-bl-sm bg-white text-primary"
                    }`}
                  >
                    {msg.messageType !== "TEXT" && (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary-light">
                        {getMessageTypeLabel(msg.messageType)}
                      </p>
                    )}

                    <p className="whitespace-pre-wrap break-words text-sm">
                      {msg.content ? renderMessageContent(msg.content) : "Mensaje sin contenido"}
                    </p>

                    <p className="mt-1 text-right text-[11px] text-primary-light/80">
                      {new Date(msg.createdAt).toLocaleTimeString("es-PY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto size-12 text-primary-light/40" />
            <p className="mt-4 text-sm text-primary-light">
              No hay mensajes en el historial de este cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
