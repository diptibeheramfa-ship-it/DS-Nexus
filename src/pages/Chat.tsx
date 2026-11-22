import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search,
  Send,
  CheckCheck,
  Check,
  Smile,
  Tag,
  Users,
  RefreshCw,
  Trash2,
  X,
  Building2,
  ChevronDown,
  Info,
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

// Professional discussion tags matching DS Nexus design system
export const DISCUSSION_TAGS = [
  { id: "general", label: "General", icon: "💬", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "announcement", label: "Announcement", icon: "📌", color: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "discussion", label: "Discussion", icon: "💡", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  { id: "action_item", label: "Action Item", icon: "⚡", color: "bg-rose-50 text-rose-800 border-rose-200" },
  { id: "query", label: "Query", icon: "❓", color: "bg-sky-50 text-sky-800 border-sky-200" },
];

export const QUICK_EMOJIS = ["👍", "👏", "🎯", "💼", "✅", "📌", "🚀", "💡", "🤝", "🙏", "❤️", "🔥"];

interface ChatMessageItem {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "EMPLOYEE";
  senderEmail?: string;
  senderDepartment?: string;
  conversationId: string;
  channel: string;
  recipientId?: string | null;
  message: string;
  tag: string;
  readBy: Array<{ userId: string; readAt: string }>;
  createdAt: string;
  isDeleted?: boolean;
  isOptimistic?: boolean;
}

interface StakeholderMember {
  userId: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  position: string;
  department: string;
  employeeCode: string;
  isOnline: boolean;
}

const Chat: React.FC = () => {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;
  const currentUserRole = user?.role || "EMPLOYEE";

  // State
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [members, setMembers] = useState<StakeholderMember[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("general");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Close member filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMemberDropdown(false);
      }
    };
    if (showMemberDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMemberDropdown]);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch unified group chat messages and active stakeholders
  const fetchGroupChat = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/chat/group");
      if (res.data?.success) {
        setMessages(res.data.messages || []);
        setMembers(res.data.members || []);
      }
    } catch (err: any) {
      console.error("Failed to load group chat:", err);
      if (!silent) toast.error("Unable to load team discussions");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchGroupChat();
  }, [fetchGroupChat]);

  // Fast polling loop: sync every 3 seconds for seamless real-time conversations
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGroupChat(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchGroupChat]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      _id: tempId,
      senderId: String(currentUserId),
      senderName: user?.name || (currentUserRole === "ADMIN" ? "Administrator" : "You"),
      senderRole: currentUserRole,
      senderEmail: user?.email,
      senderDepartment: "General",
      conversationId: "ds_nexus_team_group",
      channel: "general",
      recipientId: null,
      message: trimmed,
      tag: selectedTag,
      readBy: [{ userId: String(currentUserId), readAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // Optimistic append
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setSelectedTag("general");
    setShowTagSelector(false);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTimeout(() => scrollToBottom("smooth"), 50);

    try {
      setSending(true);
      const res = await api.post("/chat/send", {
        conversationId: "ds_nexus_team_group",
        channel: "general",
        message: trimmed,
        tag: selectedTag,
      });

      if (res.data?.success && res.data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? res.data.message : m))
        );
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      toast.error(err?.response?.data?.message || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      toast.success("Message deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete message");
    }
  };

  // Keyboard Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Quick Emoji Append
  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Generate list of stakeholders for member filtering with their message counts
  const filterableMembers = useMemo(() => {
    const memberMap = new Map<
      string,
      {
        id: string;
        name: string;
        role: "ADMIN" | "EMPLOYEE";
        department?: string;
        isMe: boolean;
        messageCount: number;
        isOnline?: boolean;
      }
    >();

    // Count messages for each senderId
    const counts: Record<string, number> = {};
    messages.forEach((m) => {
      const sId = String(m.senderId);
      counts[sId] = (counts[sId] || 0) + 1;
    });

    // 1. Add members from stakeholder roster
    members.forEach((m) => {
      const sId = String(m.userId);
      const isMe = sId === String(currentUserId);
      memberMap.set(sId, {
        id: sId,
        name: isMe ? `You (${m.name})` : m.name,
        role: m.role,
        department: m.department,
        isMe,
        messageCount: counts[sId] || 0,
        isOnline: m.isOnline,
      });
    });

    // 2. Add any senders present in messages who might not be in members array
    messages.forEach((m) => {
      const sId = String(m.senderId);
      if (!memberMap.has(sId)) {
        const isMe = sId === String(currentUserId);
        memberMap.set(sId, {
          id: sId,
          name: isMe ? `You (${m.senderName})` : m.senderName,
          role: m.senderRole,
          department: m.senderDepartment,
          isMe,
          messageCount: counts[sId] || 0,
        });
      }
    });

    // If current user is not in roster or messages yet, ensure "You" is always an option
    const myIdStr = String(currentUserId);
    if (!memberMap.has(myIdStr) && user) {
      memberMap.set(myIdStr, {
        id: myIdStr,
        name: `You (${user.name || "Administrator"})`,
        role: currentUserRole,
        department: "Management",
        isMe: true,
        messageCount: counts[myIdStr] || 0,
      });
    }

    // Sort: "You" first, then members with messages descending, then alphabetically
    return Array.from(memberMap.values()).sort((a, b) => {
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
      return a.name.localeCompare(b.name);
    });
  }, [members, messages, currentUserId, user, currentUserRole]);

  const selectedMemberName = useMemo(() => {
    if (selectedMemberId === "all") return "";
    const found = filterableMembers.find((m) => m.id === selectedMemberId);
    return found ? found.name : "Selected Member";
  }, [selectedMemberId, filterableMembers]);

  // Filter messages by selected member and search query
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (selectedMemberId !== "all" && String(m.senderId) !== String(selectedMemberId)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchMsg = m.message.toLowerCase().includes(q);
        const matchSender = m.senderName.toLowerCase().includes(q);
        const matchDept = m.senderDepartment?.toLowerCase().includes(q);
        return matchMsg || matchSender || matchDept;
      }
      return true;
    });
  }, [messages, selectedMemberId, searchQuery]);

  // Group filtered messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [dateStr: string]: ChatMessageItem[] } = {};
    filteredMessages.forEach((msg) => {
      const d = new Date(msg.createdAt);
      const dateKey = d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    });
    return groups;
  }, [filteredMessages]);

  const formatMsgTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || "U").toUpperCase();
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
      {/* 1. Header: DS Nexus Institutional Theme */}
      <div className="px-5 py-4 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
            <Building2 className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                DS Nexus Stakeholder Discussion
              </h1>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                All Stakeholders Group
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official company-wide collaboration hub for administrators and employees
            </p>
          </div>
        </div>

        {/* Controls: Search, Tag Filter, Members Drawer, Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* In-chat Search Input */}
          <div className="relative flex items-center bg-slate-50 rounded-xl px-2.5 py-1.5 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all text-xs w-full sm:w-56">
            <Search className="size-3.5 text-slate-400 mr-1.5 shrink-0" />
            <input
              type="text"
              placeholder="Search group messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none border-none p-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Members Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMembersDrawer((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showMembersDrawer
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
            title="View Participating Stakeholders"
          >
            <Users className="size-3.5" />
            <span>Members ({members.length})</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchGroupChat()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh Messages"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Filter Bar: Member-Wise Dropdown Feature */}
      <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200/60 flex items-center justify-between gap-3 shrink-0 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Users className="size-3.5 text-indigo-600" />
            Filter by Member:
          </span>

          {/* Member Dropdown Selector */}
          <div className="relative" ref={memberDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setShowMemberDropdown((prev) => !prev);
                setMemberSearchQuery("");
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                selectedMemberId !== "all"
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              {selectedMemberId === "all" ? (
                <>
                  <span className="size-2 rounded-full bg-indigo-600"></span>
                  <span>All Members</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-600">
                    {messages.length}
                  </span>
                </>
              ) : (
                (() => {
                  const currentMem = filterableMembers.find((m) => m.id === selectedMemberId);
                  if (!currentMem) return <span>All Members</span>;
                  return (
                    <>
                      <span className="size-4.5 rounded-full flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white">
                        {getInitials(currentMem.name)}
                      </span>
                      <span className="font-bold">{currentMem.name}</span>
                      {currentMem.role === "ADMIN" ? (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Admin
                        </span>
                      ) : currentMem.department ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-medium bg-slate-200 text-slate-700">
                          {currentMem.department}
                        </span>
                      ) : null}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-200 text-indigo-800">
                        {currentMem.messageCount}
                      </span>
                    </>
                  );
                })()
              )}
              <ChevronDown
                className={`size-3.5 text-slate-400 transition-transform ${
                  showMemberDropdown ? "rotate-180 text-indigo-600" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {showMemberDropdown && (
              <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 flex flex-col max-h-96 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Search input if multiple members */}
                {filterableMembers.length > 3 && (
                  <div className="px-3 pb-2 pt-1 border-b border-slate-100">
                    <div className="relative flex items-center bg-slate-50 rounded-lg px-2.5 py-1 border border-slate-200">
                      <Search className="size-3 text-slate-400 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search member name or dept..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none border-none p-0"
                        autoFocus
                      />
                      {memberSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMemberSearchQuery("")}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Options List */}
                <div className="overflow-y-auto py-1 max-h-72 space-y-0.5 px-1.5">
                  {/* All Members Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMemberId("all");
                      setShowMemberDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      selectedMemberId === "all"
                        ? "bg-indigo-50 text-indigo-900 font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                        👥
                      </span>
                      <span>All Members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 text-slate-600">
                        {messages.length} msgs
                      </span>
                      {selectedMemberId === "all" && <Check className="size-3.5 text-indigo-600" />}
                    </div>
                  </button>

                  {/* Individual Members List */}
                  {filterableMembers
                    .filter((m) =>
                      memberSearchQuery
                        ? m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                          m.department?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                        : true
                    )
                    .map((mem) => {
                      const isSelected = selectedMemberId === mem.id;
                      return (
                        <button
                          key={mem.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(mem.id);
                            setShowMemberDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-900 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                            <span
                              className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : mem.role === "ADMIN"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {getInitials(mem.name)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{mem.name}</span>
                                {mem.role === "ADMIN" ? (
                                  <span className="text-[9px] uppercase px-1 py-0.1 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                    Admin
                                  </span>
                                ) : mem.department ? (
                                  <span className="text-[9px] px-1 py-0.1 rounded font-medium bg-slate-100 text-slate-600 shrink-0">
                                    {mem.department}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {mem.messageCount}
                            </span>
                            {isSelected && <Check className="size-3.5 text-indigo-600" />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Reset Button if filtered */}
          {selectedMemberId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedMemberId("all")}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
              title="Reset filter to all members"
            >
              <X className="size-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right side helper info */}
        <div className="hidden sm:flex items-center text-[11px] text-slate-400">
          <span>{filteredMessages.length} of {messages.length} messages shown</span>
        </div>
      </div>

      {/* 3. Main Body Split: Full-Width Message Thread + Optional Slide-Over Members Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Full-Width Message Feed */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-4 bg-slate-50/40">
          {/* Welcome Info Banner */}
          <div className="flex justify-center mb-2">
            <div className="inline-flex items-center gap-2 bg-indigo-50/80 text-indigo-900 border border-indigo-100 text-xs px-4 py-2 rounded-xl shadow-2xs max-w-2xl text-center leading-relaxed">
              <Info className="size-4 text-indigo-600 shrink-0" />
              <span>
                All messages posted here are broadcast to the entire organization. Professional stakeholder collaboration active.
              </span>
            </div>
          </div>

          {/* Active Member Filter Banner */}
          {selectedMemberId !== "all" && (
            <div className="flex justify-center mb-2">
              <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs px-3.5 py-1.5 rounded-xl shadow-2xs">
                <Users className="size-3.5 text-indigo-600 shrink-0" />
                <span>
                  Showing messages from <strong>{selectedMemberName}</strong> ({filteredMessages.length} message{filteredMessages.length === 1 ? "" : "s"})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMemberId("all")}
                  className="ml-2 text-indigo-700 hover:text-indigo-950 font-bold underline cursor-pointer text-[11px]"
                >
                  Show All Members
                </button>
              </div>
            </div>
          )}

          {loading && messages.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="size-6 animate-spin text-indigo-600" />
              <span>Loading team discussions...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <span>
                {selectedMemberId !== "all"
                  ? `No messages posted by ${selectedMemberName} yet.`
                  : searchQuery
                  ? "No messages match your search query."
                  : "No messages yet in the group. Start the discussion below!"}
              </span>
              {selectedMemberId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedMemberId("all")}
                  className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-850 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 cursor-pointer"
                >
                  View All Members
                </button>
              )}
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateStr, msgs]) => (
              <div key={dateStr} className="space-y-4">
                {/* Date Separator */}
                <div className="flex justify-center my-4">
                  <span className="bg-slate-200/80 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs uppercase tracking-wider">
                    {dateStr}
                  </span>
                </div>

                {/* Messages in Group */}
                {msgs.map((m) => {
                  const isMe = String(m.senderId) === String(currentUserId);
                  const tagConfig = DISCUSSION_TAGS.find((t) => t.id === m.tag);

                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative`}
                    >
                      <div
                        className={`relative p-3.5 rounded-2xl max-w-[88%] sm:max-w-[70%] shadow-2xs transition-all border ${
                          isMe
                            ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-xs"
                            : "bg-white text-slate-900 border-slate-200/80 rounded-tl-xs"
                        }`}
                      >
                        {/* Header: Sender details */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedMemberId(selectedMemberId === String(m.senderId) ? "all" : String(m.senderId))}
                            className={`text-xs font-bold hover:underline cursor-pointer text-left ${
                              isMe ? "text-indigo-100" : m.senderRole === "ADMIN" ? "text-indigo-700" : "text-slate-900"
                            }`}
                            title={`Filter messages sent by ${isMe ? "You" : m.senderName}`}
                          >
                            {isMe ? "You" : m.senderName}
                          </button>

                          {m.senderRole === "ADMIN" ? (
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                isMe
                                  ? "bg-white/15 text-indigo-100 border-white/20"
                                  : "text-indigo-700 bg-indigo-50 border-indigo-200"
                              }`}
                            >
                              Admin
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${
                                isMe
                                  ? "bg-white/10 text-indigo-100"
                                  : "text-slate-500 bg-slate-100 border border-slate-200/60"
                              }`}
                            >
                              {m.senderDepartment || "Team"}
                            </span>
                          )}

                          {/* Tag Indicator */}
                          {m.tag && m.tag !== "general" && tagConfig && (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isMe
                                  ? "bg-white/20 text-white border border-white/30"
                                  : tagConfig.color + " border"
                              }`}
                            >
                              <span>{tagConfig.icon}</span>
                              <span>{tagConfig.label}</span>
                            </span>
                          )}
                        </div>

                        {/* Message Content */}
                        <p
                          className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words pr-8 ${
                            isMe ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {m.message}
                        </p>

                        {/* Message Footer: Timestamp & Checkmarks */}
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          <span
                            className={`text-[10px] font-mono ${
                              isMe ? "text-indigo-200" : "text-slate-400"
                            }`}
                          >
                            {formatMsgTime(m.createdAt)}
                          </span>
                          {isMe && (
                            <span title={m.isOptimistic ? "Sending..." : "Delivered to Group"}>
                              {m.isOptimistic ? (
                                <Check className="size-3 text-indigo-200" />
                              ) : (
                                <CheckCheck className="size-3.5 text-indigo-200" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Delete Button (Sender or Admin) */}
                        {(isMe || currentUserRole === "ADMIN") && !m.isOptimistic && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m._id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity cursor-pointer bg-white/90 shadow-2xs"
                            title="Delete Message"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Optional Sliding Members Panel (Toggleable from header) */}
        {showMembersDrawer && (
          <div className="w-72 sm:w-80 shrink-0 bg-white border-l border-slate-200 p-4 overflow-y-auto flex flex-col z-20 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Stakeholder Roster</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersDrawer(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              All active administrators and employees connected to the DS Nexus group discussion:
            </p>

            <div className="space-y-2 flex-1">
              {members.map((member) => (
                <button
                  type="button"
                  key={member.userId}
                  onClick={() => {
                    setSelectedMemberId(selectedMemberId === String(member.userId) ? "all" : String(member.userId));
                    setShowMembersDrawer(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                    selectedMemberId === String(member.userId)
                      ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100/70 border-slate-200/80"
                  }`}
                  title={`Filter messages sent by ${member.name}`}
                >
                  <div
                    className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                      member.role === "ADMIN" ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                      {member.role === "ADMIN" ? (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                          Admin
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500">#{member.employeeCode}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {member.position} • {member.department}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Drawers: Quick Emoji Reactions & Tag Selection */}
      {showEmojiPicker && (
        <div className="bg-white border-t border-slate-200 px-5 py-2 flex items-center gap-2 overflow-x-auto shadow-2xs">
          <span className="text-xs text-slate-400 font-medium">Quick React:</span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="text-lg p-1 hover:bg-slate-100 rounded-lg transition-transform hover:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {showTagSelector && (
        <div className="bg-white border-t border-slate-200 px-5 py-2.5 flex items-center gap-2 overflow-x-auto shadow-2xs">
          <span className="text-xs text-slate-400 font-medium shrink-0">Topic Tag:</span>
          {DISCUSSION_TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedTag(t.id);
                setShowTagSelector(false);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                selectedTag === t.id
                  ? "ring-2 ring-indigo-500 " + t.color
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active Tag Notice */}
      {selectedTag !== "general" && (
        <div className="bg-indigo-50/60 px-5 py-1 flex items-center justify-between text-xs text-indigo-900 border-t border-indigo-100">
          <span className="flex items-center gap-1.5 font-medium">
            <span>Tagging message as:</span>
            <strong className="underline">{DISCUSSION_TAGS.find((t) => t.id === selectedTag)?.label}</strong>
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag("general")}
            className="text-indigo-400 hover:text-indigo-700 cursor-pointer"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* 5. Message Input Bar (DS Nexus Project Styling) */}
      <form
        onSubmit={handleSendMessage}
        className="px-4 sm:px-6 py-3 bg-white border-t border-slate-200/80 flex items-end gap-2.5 shrink-0"
      >
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            showEmojiPicker
              ? "bg-indigo-50 border-indigo-200 text-indigo-600"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
          }`}
          title="Add Emoji Reaction"
        >
          <Smile className="size-4.5" />
        </button>

        {/* Tag Selector Button */}
        <button
          type="button"
          onClick={() => setShowTagSelector((prev) => !prev)}
          className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
            showTagSelector || selectedTag !== "general"
              ? "bg-indigo-50 border-indigo-200 text-indigo-600"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
          }`}
          title="Tag Topic (Announcement, Action Item, Query, Discussion)"
        >
          <Tag className="size-4.5" />
        </button>

        {/* Text Area */}
        <div className="flex-1 bg-slate-50/70 rounded-xl px-3.5 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to the group (Enter to send, Shift+Enter for new line)..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-32 border-none p-0"
          />
        </div>

        {/* Send Button: DS Nexus Indigo Brand Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 text-white transition-all shadow-sm shrink-0 cursor-pointer ${
            !inputText.trim() || sending
              ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none"
              : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/30"
          }`}
          title="Send to Group"
        >
          <span>Send</span>
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
};

export default Chat;
