import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { PlusIcon, Trash2Icon, EditIcon, CheckIcon, XIcon } from "lucide-react";

export function ChatSidebar() {
  const {
    sessions,
    currentSessionId,
    createNewChat,
    switchSession,
    renameSession,
    deleteSession,
  } = useChat();

  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleRename = (sessionId: number) => {
    setEditingSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setEditName(session.name);
    }
  };

  const saveRename = async (sessionId: number) => {
    await renameSession(sessionId, editName);
    setEditingSessionId(null);
  };

  const cancelRename = () => {
    setEditingSessionId(null);
    setEditName("");
  };

  return (
    <div className="flex flex-col h-full p-3">
      <div className="py-2">
        <Button
          onClick={createNewChat}
          className="w-full justify-start"
          variant="outline"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-auto mt-4">
        <h3 className="mb-2 text-sm font-medium">Recent Chats</h3>
        <ul className="space-y-1">
          {sessions.map((session) => (
            <li
              key={session.id}
              className={`group rounded-md p-2 cursor-pointer ${
                currentSessionId === session.id
                  ? "bg-secondary"
                  : "hover:bg-secondary/50"
              }`}
              onClick={() => {
                if (editingSessionId !== session.id) {
                  switchSession(session.id);
                }
              }}
            >
              <div className="flex items-center justify-between">
                {editingSessionId === session.id ? (
                  <div className="flex items-center w-full">
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveRename(session.id);
                        } else if (e.key === "Escape") {
                          cancelRename();
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex ml-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => saveRename(session.id)}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelRename}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="truncate text-sm">{session.name}</span>

                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(session.id);
                        }}
                      >
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Are you sure you want to delete this chat?"
                            )
                          ) {
                            deleteSession(session.id);
                          }
                        }}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
