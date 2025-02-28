import { useState, useEffect, useRef, useCallback } from "react";
import { MetadataResponse } from "@/types";

interface SSEOptions {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onMetadata?: (metadata: MetadataResponse) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export function useSSE(url: string | null, options: SSEOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [connection, setConnection] = useState<EventSource | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Function to disconnect from SSE
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("Disconnecting SSE connection");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnection(null);
      setIsConnected(false);
      options.onClose?.();
    }
  }, [options]);

  useEffect(() => {
    // Cleanup previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!url) {
      setIsConnected(false);
      setConnection(null);
      return;
    }

    console.log("Connecting to SSE URL:", url);

    try {
      // Create EventSource with POST body data
      const eventSource = new EventSource(url, {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;
      setConnection(eventSource);

      eventSource.onopen = () => {
        console.log("SSE connection opened");
        setIsConnected(true);
        setError(null);
        options.onOpen?.();
      };

      eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);
        setError(event);
        setIsConnected(false);

        options.onError?.(event);

        // Close the connection on error
        eventSource.close();
        eventSourceRef.current = null;
        setConnection(null);
      };

      eventSource.onmessage = (event) => {
        try {
          console.log("SSE raw message:", event.data);
          const parsedData = JSON.parse(event.data);

          // Handle message based on your backend format
          if (parsedData.type === "metadata") {
            console.log("Processing metadata:", parsedData.data);
            options.onMetadata?.(parsedData.data);
          } else if (parsedData.type === "answer_chunk") {
            console.log("Processing text chunk:", parsedData.text);
            options.onMessage?.(parsedData.text);
          }
        } catch (e) {
          console.error("Error parsing SSE data:", e, "Raw data:", event.data);
        }
      };
    } catch (err) {
      console.error("Failed to create EventSource:", err);
      setError(new Event("Failed to connect"));
      options.onError?.(new Event("Failed to connect"));
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnection(null);
      }
    };
  }, [url, options]);

  return {
    isConnected,
    error,
    disconnect,
    connection,
  };
}
