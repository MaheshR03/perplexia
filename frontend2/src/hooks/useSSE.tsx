import { useEffect, useState, useRef } from "react";
import { MetadataResponse } from "@/types";

interface SSEOptions {
  onOpen?: () => void;
  onMetadata?: (metadata: MetadataResponse) => void;
  onMessage?: (text: string) => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
}

export function useSSE(url: string | null, options: SSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      if (options.onOpen) options.onOpen();
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.metadata && options.onMetadata) {
        options.onMetadata(data.metadata);
      } else if (data.text && options.onMessage) {
        options.onMessage(data.text);
      }
    };

    eventSource.onerror = (event) => {
      setError(event);
      setIsConnected(false);
      if (options.onError) options.onError(event);
    };

    eventSource.onclose = () => {
      setIsConnected(false);
      if (options.onClose) options.onClose();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [url, options]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsConnected(false);
    }
  };

  return { isConnected, error, disconnect, connection: eventSourceRef.current };
}
