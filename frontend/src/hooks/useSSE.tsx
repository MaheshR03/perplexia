import { useState, useEffect, useRef } from "react";
import { MetadataResponse } from "@/types";

interface SSEOptions {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onMetadata?: (metadata: MetadataResponse) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

/**
 * Custom hook for Server-Sent Events (SSE) functionality
 */
export function useSSE(url: string | null, options: SSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Function to connect to SSE
  const connect = () => {
    if (!url) return;

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Event handlers
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      options.onOpen?.();
    };

    eventSource.onerror = (event) => {
      setError(event);
      setIsConnected(false);
      options.onError?.(event);
      eventSource.close();
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);

        // Handle different message types
        if (parsedData.type === "metadata") {
          options.onMetadata?.(parsedData.data);
        } else if (parsedData.type === "answer_chunk") {
          options.onMessage?.(parsedData.text);
        }
      } catch (e) {
        console.error("Error parsing SSE data:", e);
      }
    };
  };

  // Function to disconnect from SSE
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      options.onClose?.();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Connect when URL changes
  useEffect(() => {
    if (url) {
      connect();
    } else {
      disconnect();
    }
  }, [url]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}
