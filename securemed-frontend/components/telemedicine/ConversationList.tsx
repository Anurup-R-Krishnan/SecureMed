import React from "react";
import { Conversation, User } from "@/services/messaging";
import { cn } from "@/lib/utils";
import { User as UserIcon, Calendar, MessageSquare } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: number;
  selectedConversationId: number | null;
  onSelectConversation: (id: number) => void;
}

export function ConversationList({
  conversations,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const getOtherParticipant = (conversation: Conversation) => {
    return (
      conversation.participants.find((p) => p.id !== currentUserId) ||
      conversation.participants[0]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 opacity-50" />
            </div>
            <p className="text-sm font-medium">No messages yet</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isSelected = selectedConversationId === conversation.id;

              return (
                <li
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    "p-3 mx-2 cursor-pointer rounded-xl transition-all duration-200 group relative overflow-hidden",
                    isSelected
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "hover:bg-muted/50 text-foreground",
                  )}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full" />
                  )}

                  <div className="flex items-start space-x-3 pl-2">
                    <div className="flex-shrink-0 relative">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                        )}
                      >
                        <UserIcon size={18} />
                      </div>
                      {/* Online Indicator (Mock) */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3
                          className={cn(
                            "text-sm font-bold truncate",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                        >
                          {otherParticipant?.name ||
                            otherParticipant?.username ||
                            "Unknown User"}
                        </h3>
                        <span className="text-[10px] font-medium opacity-60 flex-shrink-0 uppercase tracking-wide">
                          {conversation.last_message
                            ? formatDate(conversation.last_message.created_at)
                            : formatDate(conversation.updated_at)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "text-xs truncate font-medium",
                          isSelected
                            ? "text-primary/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {conversation.last_message
                          ? conversation.last_message.content
                          : "Start a conversation"}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
