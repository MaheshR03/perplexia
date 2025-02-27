import { useState, useEffect, useRef, useCallback } from "react";
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
  const connect = useCallback(() => {
    // Use useCallback
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
      options.onClose?.(); // Call onClose on error as well to cleanup loading state
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

    eventSource.close = () => {
      // Add onclose handler
      setIsConnected(false);
      options.onClose?.();
    };
  }, [url, options]); // Add url and options to useCallback dependencies

  // Function to disconnect from SSE
  const disconnect = useCallback(() => {
    // Use useCallback
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      options.onClose?.();
    }
  }, [options]); // Add options to useCallback dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]); // Add disconnect to useEffect dependencies

  // Connect when URL changes
  useEffect(() => {
    if (url) {
      connect();
    } else {
      disconnect();
    }
  }, [url, connect, disconnect]); // Add connect and disconnect to useEffect dependencies

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}
