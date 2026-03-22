import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, AlertCircle } from "lucide-react";

import { fetchClientChatHistory, type ChatMessage } from "@/features/clients/clients-service";

type ClientChatHistoryProps = {
  clientId: string;
};

export function ClientChatHistory({ clientId }: ClientChatHistoryProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-chat", clientId],
    queryFn: () => fetchClientChatHistory(clientId, { size: 50 }),
  });

  useEffect(() => {
    if (data) {
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);

      // Scroll to bottom on initial load
      if (scrollContainerRef.current && messages.length === 0) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  }, [data]);

  const loadOlderMessages = async () => {
    if (!hasMore || isLoadingOlder || !cursor) return;

    setIsLoadingOlder(true);
    prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? 0;

    try {
      const olderData = await fetchClientChatHistory(clientId, { cursor, size: 50 });
      setMessages((prev) => [...olderData.messages, ...prev]);
      setHasMore(olderData.hasMore);
      setCursor(olderData.nextCursor);

      // Preserve scroll position after loading older messages
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const newScrollHeight = scrollContainerRef.current.scrollHeight;
          const heightDiff = newScrollHeight - prevScrollHeightRef.current;
          scrollContainerRef.current.scrollTop = heightDiff;
        }
      }, 0);
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop } = scrollContainerRef.current;
    
    // Trigger load when scrolled near the top (within 100px)
    if (scrollTop < 100 && hasMore && !isLoadingOlder) {
      loadOlderMessages();
    }
  };

  const groupMessagesByDay = (msgs: ChatMessage[]) => {
    const groups: Array<{ date: string; messages: ChatMessage[] }> = [];
    let currentDate = "";
    let currentGroup: ChatMessage[] = [];

    msgs.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toLocaleDateString("es-PY", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  };

  const getBubbleStyle = (role: ChatMessage["role"]) => {
    if (role === "client") {
      return "ml-auto bg-primary text-white";
    }
    if (role === "agent") {
      return "mr-auto bg-neutral-dark text-primary";
    }
    return "mx-auto bg-secondary/20 text-secondary-dark text-xs";
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-primary-light">
        Cargando historial de chat...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
        Error al cargar el historial de chat.
      </div>
    );
  }

  // Backend not available mode
  if (messages.length === 0 && !hasMore) {
    return (
      <div className="rounded-lg border border-neutral-dark bg-neutral p-8 text-center">
        <AlertCircle className="mx-auto size-12 text-primary-light" />
        <h3 className="mt-4 text-base font-semibold text-primary">
          Historial de chat no disponible
        </h3>
        <p className="mt-2 text-sm text-primary-light">
          El backend aún no implementa la persistencia de mensajes de WhatsApp.
        </p>
        <p className="mt-1 text-xs text-primary-light">
          Esta vista está lista para conectarse cuando el endpoint esté disponible.
        </p>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDay(messages);

  return (
    <div className="flex h-[600px] flex-col">
      {/* Chat Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-neutral-dark bg-neutral p-4"
      >
        {/* Loading Older Indicator */}
        {isLoadingOlder && (
          <div className="text-center text-xs text-primary-light">
            Cargando mensajes anteriores...
          </div>
        )}

        {/* Messages */}
        {groupedMessages.map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* Day Separator */}
            <div className="my-4 flex items-center justify-center">
              <span className="rounded-full bg-neutral-dark px-3 py-1 text-xs font-medium text-primary-light">
                {group.date}
              </span>
            </div>

            {/* Messages in this day */}
            <div className="space-y-2">
              {group.messages.map((msg) => (
                <div key={msg.id} className="flex">
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${getBubbleStyle(
                      msg.role
                    )}`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="mt-1 text-right text-xs opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString("es-PY", {
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

        {/* Empty State (when backend is connected but no messages) */}
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto size-12 text-neutral-dark" />
            <p className="mt-4 text-sm text-primary-light">
              No hay mensajes en el historial de este cliente.
            </p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
        <strong>Nota:</strong> Este historial refleja las conversaciones de WhatsApp Business API.
        Los mensajes se cargan automáticamente al inicio, y puedes desplazarte hacia arriba para
        ver mensajes más antiguos.
      </div>
    </div>
  );
}
