import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

type Screen = "auth" | "register" | "chats" | "chat" | "settings" | "privacy" | "newChat" | "addAccount" | "editProfile" | "notifications" | "support";

interface Attachment {
  id: number;
  type: "image" | "file" | "audio";
  name: string;
  url: string;
  size?: string;
}

interface Message {
  id: number;
  text: string;
  mine: boolean;
  time: string;
  attachment?: Attachment;
  replyTo?: number;
}

interface Chat {
  id: number;
  name: string;
  username: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  type: "user" | "group" | "channel" | "bot";
  messages: Message[];
  theme?: string;
  muted?: boolean;
  pinned?: boolean;
}

interface CallState {
  active: boolean;
  type: "voice" | "video";
  chatName: string;
  avatar: string;
  status: "calling" | "connected" | "ended";
  duration: number;
}

const THEMES = [
  { id: "default", label: "Чёрный", bg: "from-[#080808] to-[#0f0f0f]" },
  { id: "ocean", label: "Океан", bg: "from-[#001f3f] to-[#003366]" },
  { id: "violet", label: "Фиолет", bg: "from-[#1a0033] to-[#2d0052]" },
  { id: "forest", label: "Лес", bg: "from-[#0a1a0a] to-[#0d2b0d]" },
  { id: "sunset", label: "Закат", bg: "from-[#1a0a00] to-[#2b1500]" },
];

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
];

const INITIAL_CHATS: Chat[] = [
  {
    id: 1, name: "Алекс Новиков", username: "@alex-dart", avatar: "АН",
    lastMsg: "Привет! Как дела?", time: "22:14", unread: 3, online: true, type: "user", pinned: true,
    messages: [
      { id: 1, text: "Привет! Как дела?", mine: false, time: "22:10" },
      { id: 2, text: "Отлично, спасибо! Работаю над новым проектом", mine: true, time: "22:12" },
      { id: 3, text: "Звучит круто! Когда встретимся?", mine: false, time: "22:14" },
    ]
  },
  {
    id: 2, name: "Dart Official", username: "@dart", avatar: "D",
    lastMsg: "Добро пожаловать в Dart!", time: "20:00", unread: 1, online: true, type: "channel",
    messages: [
      { id: 1, text: "Добро пожаловать в Dart — мессенджер нового поколения!", mine: false, time: "20:00" },
      { id: 2, text: "Здесь вы найдёте все обновления и новости платформы.", mine: false, time: "20:01" },
    ]
  },
  {
    id: 3, name: "Команда проекта", username: "@team-dart", avatar: "КП",
    lastMsg: "Митинг в 18:00", time: "18:30", unread: 0, online: false, type: "group",
    messages: [
      { id: 1, text: "Митинг в 18:00, не забудьте!", mine: false, time: "18:30" },
      { id: 2, text: "Буду!", mine: true, time: "18:31" },
      { id: 3, text: "И я!", mine: false, time: "18:31" },
    ]
  },
  {
    id: 4, name: "DartBot", username: "@dartbot", avatar: "🤖",
    lastMsg: "Чем могу помочь?", time: "15:00", unread: 0, online: true, type: "bot",
    messages: [
      { id: 1, text: "Привет! Я DartBot. Чем могу помочь?", mine: false, time: "15:00" },
    ]
  },
  {
    id: 5, name: "Мария Соколова", username: "@maria-s", avatar: "МС",
    lastMsg: "Увидимся завтра!", time: "14:22", unread: 0, online: false, type: "user",
    messages: [
      { id: 1, text: "Увидимся завтра!", mine: false, time: "14:22" },
      { id: 2, text: "Конечно, до завтра!", mine: true, time: "14:23" },
    ]
  },
];

function getGradient(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function AuroraBackground({ theme }: { theme: string }) {
  const t = THEMES.find(t => t.id === theme) || THEMES[0];
  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${t.bg} z-0`}>
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
    </div>
  );
}

function Avatar({ initials, size = 44, src }: { initials: string; size?: number; src?: string }) {
  const g = getGradient(initials);
  if (src) return <img src={src} alt={initials} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none"
      style={{ width: size, height: size, background: g, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

/* ===== CALL OVERLAY ===== */
function CallOverlay({ call, onEnd, onMute, onVideo, muted, videoOff }:
  { call: CallState; onEnd: () => void; onMute: () => void; onVideo: () => void; muted: boolean; videoOff: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between py-16"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #1a0d2e 50%, #0a1a2e 100%)", animation: "fadeSlideUp 0.4s ease both" }}>
      <div className="aurora aurora-1 opacity-30" />
      <div className="aurora aurora-2 opacity-20" />
      <div className="relative z-10 flex flex-col items-center gap-4 mt-8">
        <div className="relative">
          <Avatar initials={call.avatar} size={96} />
          {call.status === "connected" && (
            <div className="absolute inset-0 rounded-full ring-4 ring-white/20 animate-ping" style={{ animationDuration: "2s" }} />
          )}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Oswald" }}>{call.chatName}</h2>
          <p className="text-white/50 text-sm mt-1">
            {call.status === "calling" ? (call.type === "video" ? "Видеозвонок..." : "Вызов...") :
              call.status === "connected" ? formatDuration(call.duration) : "Звонок завершён"}
          </p>
        </div>
        {call.status === "calling" && (
          <div className="flex gap-1 mt-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40"
                style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full px-8">
        <div className="flex gap-5 justify-center">
          <button onClick={onMute}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${muted ? "bg-red-500/30 border border-red-500/50" : "dart-glass-btn"}`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={22} className="text-white" />
            <span className="text-[10px] text-white/60">{muted ? "Вкл. микр." : "Микр."}</span>
          </button>
          {call.type === "video" && (
            <button onClick={onVideo}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${videoOff ? "bg-red-500/30 border border-red-500/50" : "dart-glass-btn"}`}>
              <Icon name={videoOff ? "VideoOff" : "Video"} size={22} className="text-white" />
              <span className="text-[10px] text-white/60">{videoOff ? "Вкл. камеру" : "Камера"}</span>
            </button>
          )}
          <button className="dart-glass-btn flex flex-col items-center gap-2 p-4 rounded-2xl">
            <Icon name="Speaker" size={22} className="text-white" />
            <span className="text-[10px] text-white/60">Динамик</span>
          </button>
        </div>
        <button onClick={onEnd}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 0 30px rgba(239,68,68,0.5)" }}>
          <Icon name="PhoneOff" size={26} className="text-white" />
        </button>
      </div>
    </div>
  );
}

/* ===== FILE ATTACHMENT PREVIEW ===== */
function AttachmentPreview({ att, mine }: { att: Attachment; mine: boolean }) {
  if (att.type === "image") {
    return (
      <div className="mb-2 rounded-xl overflow-hidden" style={{ maxWidth: 220 }}>
        <img src={att.url} alt={att.name} className="w-full object-cover" style={{ maxHeight: 180 }} />
      </div>
    );
  }
  if (att.type === "audio") {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${mine ? "bg-white/10" : "bg-white/8"}`}>
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <Icon name="Music" size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{att.name}</p>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-0.5 bg-white/40 rounded-full" style={{ height: 4 + Math.random() * 12 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${mine ? "bg-white/10" : "bg-white/8"}`}>
      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
        <Icon name="File" size={16} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-white text-xs font-medium truncate">{att.name}</p>
        <p className="text-white/40 text-[10px]">{att.size}</p>
      </div>
    </div>
  );
}

export default function DartMessenger() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [globalTheme, setGlobalTheme] = useState("default");
  const [account, setAccount] = useState({ name: "Юра Dart", username: "@yura-dart", email: "yura@gmail.com", phone: "+7 999 123 45 67", avatarUrl: "" });
  const [editForm, setEditForm] = useState({ name: "", username: "", phone: "" });
  const [privacy, setPrivacy] = useState({ showPhone: "nobody", showOnline: "everyone", searchable: true });
  const [notifSettings, setNotifSettings] = useState({ sound: true, vibration: true, preview: true, mentions: true });
  const [newChatVal, setNewChatVal] = useState("");
  const [newChatType, setNewChatType] = useState<"chat" | "group" | "channel" | "bot">("chat");
  const [regForm, setRegForm] = useState({ email: "", nick: "", username: "" });
  const [regError, setRegError] = useState("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [call, setCall] = useState<CallState | null>(null);
  const [callMuted, setCallMuted] = useState(false);
  const [callVideoOff, setCallVideoOff] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchGlobal, setSearchGlobal] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length]);

  // Call timer
  useEffect(() => {
    if (call?.status === "connected") {
      callTimerRef.current = setInterval(() => {
        setCall(prev => prev ? { ...prev, duration: prev.duration + 1 } : prev);
      }, 1000);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [call?.status]);

  const startCall = useCallback((type: "voice" | "video") => {
    if (!activeChat) return;
    setCall({ active: true, type, chatName: activeChat.name, avatar: activeChat.avatar, status: "calling", duration: 0 });
    setTimeout(() => setCall(prev => prev ? { ...prev, status: "connected" } : null), 2500);
  }, [activeChat]);

  const endCall = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCall(prev => prev ? { ...prev, status: "ended" } : null);
    setTimeout(() => setCall(null), 1200);
  }, []);

  const sendMessage = (attachment?: Attachment) => {
    if (!inputText.trim() && !attachment) return;
    if (!activeChat) return;
    const now = new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    const newMsg: Message = {
      id: Date.now(), text: inputText, mine: true, time: now,
      attachment, replyTo: replyTo?.id
    };
    const txt = inputText || (attachment ? `[${attachment.type === "image" ? "Фото" : attachment.type === "audio" ? "Аудио" : "Файл"}]` : "");
    setInputText("");
    setReplyTo(null);
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, newMsg], lastMsg: txt, time: "сейчас", unread: 0 } : c));
    setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);

    if (activeChat.type !== "channel") {
      setTimeout(() => {
        const botReplies = ["Понял! 👍", "Отлично!", "Хорошо, спасибо", "ОК!", "Принято!", "Супер 🔥", "Хм, интересно...", "Классно!", "Ладно 😊"];
        const reply: Message = { id: Date.now() + 1, text: botReplies[Math.floor(Math.random() * botReplies.length)], mine: false, time: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }) };
        setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, newMsg, reply], lastMsg: reply.text } : c));
        setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg, reply] } : prev);
      }, 900 + Math.random() * 700);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file" | "audio") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const att: Attachment = {
      id: Date.now(), type, name: file.name, url,
      size: file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} КБ` : `${(file.size / 1024 / 1024).toFixed(1)} МБ`
    };
    sendMessage(att);
    setShowAttachMenu(false);
    e.target.value = "";
  };

  const validateUsername = (u: string) => {
    if (!u.startsWith("@")) return false;
    const name = u.slice(1);
    if (name.length < 3) return false;
    if (/--/.test(name)) return false;
    if (/[^a-zA-Z0-9\-_]/.test(name)) return false;
    return true;
  };

  const handleRegister = () => {
    if (!regForm.email.includes("@gmail.com")) { setRegError("Введите корректный Gmail"); return; }
    if (regForm.nick.length < 2) { setRegError("Имя слишком короткое"); return; }
    if (!validateUsername(regForm.username)) { setRegError("Юзернейм: @имя (можно - но не подряд), мин 3 символа"); return; }
    setAccount({ name: regForm.nick, username: regForm.username, email: regForm.email, phone: "", avatarUrl: "" });
    setRegForm({ email: "", nick: "", username: "" });
    setRegError("");
    setScreen("chats");
  };

  const handleSaveProfile = () => {
    setAccount(prev => ({
      ...prev,
      name: editForm.name || prev.name,
      username: validateUsername(editForm.username) ? editForm.username : prev.username,
      phone: editForm.phone || prev.phone,
    }));
    setScreen("settings");
  };

  const addChat = () => {
    if (!newChatVal.trim()) return;
    const typeMap = { chat: "user" as const, group: "group" as const, channel: "channel" as const, bot: "bot" as const };
    const typeLabels = { chat: "Чат", group: "Группа", channel: "Канал", bot: "Бот" };
    const newChat: Chat = {
      id: Date.now(),
      name: newChatType !== "chat" ? `${typeLabels[newChatType]}: ${newChatVal}` : newChatVal,
      username: newChatVal.startsWith("@") ? newChatVal : `+${newChatVal}`,
      avatar: newChatVal[0]?.toUpperCase() || "?",
      lastMsg: "Начните общение", time: "сейчас",
      unread: 0, online: false, type: typeMap[newChatType], messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setNewChatVal("");
    setScreen("chats");
  };

  const toggleMute = (chatId: number) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, muted: !c.muted } : c));
    if (activeChat?.id === chatId) setActiveChat(prev => prev ? { ...prev, muted: !prev.muted } : prev);
  };

  const togglePin = (chatId: number) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
  };

  const deleteChat = (chatId: number) => {
    setChats(prev => prev.filter(c => c.id !== chatId));
    setScreen("chats");
  };

  const filteredChats = chats
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const globalSearchResults = searchGlobal.length > 1
    ? chats.filter(c => c.name.toLowerCase().includes(searchGlobal.toLowerCase()) || c.username.toLowerCase().includes(searchGlobal.toLowerCase()))
    : [];

  /* ===== HIDDEN FILE INPUTS ===== */
  const HiddenInputs = () => (
    <>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "image")} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileUpload(e, "file")} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e => handleFileUpload(e, "audio")} />
    </>
  );

  /* =================== AUTH =================== */
  if (screen === "auth") return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 w-full max-w-sm mx-auto px-6" style={{ animation: "fadeSlideUp 0.5s ease both" }}>
        <div className="text-center mb-10">
          <div className="dart-logo-wrap mx-auto mb-5">
            <span className="dart-logo-letter">D</span>
          </div>
          <h1 className="dart-title">DART</h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest uppercase" style={{ fontFamily: "Golos Text" }}>Мессенджер нового поколения</p>
        </div>
        <div className="dart-glass p-6 rounded-3xl">
          <p className="text-white/50 text-center mb-6 text-sm">Войдите или создайте аккаунт</p>
          <button onClick={() => setScreen("chats")} className="dart-btn w-full py-4 rounded-2xl font-semibold text-white mb-3 text-sm">
            Войти
          </button>
          <button onClick={() => setScreen("register")}
            className="w-full py-4 rounded-2xl font-semibold text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-all text-sm">
            Создать аккаунт
          </button>
        </div>
        <p className="text-center text-white/20 text-xs mt-6">Dart v1.0 · Конфиденциально и безопасно</p>
      </div>
    </div>
  );

  /* =================== REGISTER =================== */
  if (screen === "register" || screen === "addAccount") return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 w-full max-w-sm mx-auto px-6" style={{ animation: "fadeSlideUp 0.4s ease both" }}>
        <button onClick={() => setScreen(screen === "addAccount" ? "settings" : "auth")}
          className="flex items-center gap-2 text-white/40 hover:text-white mb-7 transition-colors text-sm">
          <Icon name="ChevronLeft" size={18} /> Назад
        </button>
        <h2 className="dart-title mb-8">{screen === "addAccount" ? "ДОБАВИТЬ АККАУНТ" : "РЕГИСТРАЦИЯ"}</h2>
        <div className="dart-glass p-6 rounded-3xl space-y-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block tracking-wider">GMAIL</label>
            <input className="dart-input w-full" placeholder="example@gmail.com"
              value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block tracking-wider">ИМЯ</label>
            <input className="dart-input w-full" placeholder="Ваше имя"
              value={regForm.nick} onChange={e => setRegForm(p => ({ ...p, nick: e.target.value }))} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block tracking-wider">ЮЗЕРНЕЙМ</label>
            <input className="dart-input w-full" placeholder="@your-username"
              value={regForm.username}
              onChange={e => {
                let v = e.target.value;
                if (v && !v.startsWith("@")) v = "@" + v;
                setRegForm(p => ({ ...p, username: v }));
              }} />
            <p className="text-white/25 text-[11px] mt-1.5">Буквы, цифры и - (не подряд). Мин 3 символа.</p>
          </div>
          {regError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs">{regError}</p>
            </div>
          )}
          <button onClick={handleRegister} className="dart-btn w-full py-4 rounded-2xl font-semibold text-white text-sm">
            Создать аккаунт
          </button>
        </div>
      </div>
    </div>
  );

  /* =================== CHATS =================== */
  if (screen === "chats") return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <HiddenInputs />
      {call && <CallOverlay call={call} onEnd={endCall} onMute={() => setCallMuted(p => !p)} onVideo={() => setCallVideoOff(p => !p)} muted={callMuted} videoOff={callVideoOff} />}
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full">
        <div className="px-4 pt-6 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="dart-title text-2xl">DART</h1>
            <div className="flex gap-2">
              <button onClick={() => setShowSearch(p => !p)} className="dart-glass-btn p-2.5 rounded-xl">
                <Icon name="Search" size={18} className="text-white/70" />
              </button>
              <div className="relative">
                <button onClick={() => setShowCreateMenu(!showCreateMenu)} className="dart-glass-btn p-2.5 rounded-xl">
                  <Icon name="Plus" size={18} className="text-white/70" />
                </button>
                {showCreateMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
                    <div className="absolute right-0 top-12 dart-glass rounded-2xl p-2 min-w-52 z-50" style={{ animation: "scaleIn 0.15s ease both" }}>
                      {[
                        { icon: "MessageCircle", label: "Новый чат", type: "chat" },
                        { icon: "Users", label: "Создать группу", type: "group" },
                        { icon: "Radio", label: "Создать канал", type: "channel" },
                        { icon: "Bot", label: "Создать бота", type: "bot" },
                      ].map(item => (
                        <button key={item.label}
                          onClick={() => { setShowCreateMenu(false); setNewChatType(item.type as "chat" | "group" | "channel" | "bot"); setScreen("newChat"); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all text-white text-sm">
                          <Icon name={item.icon} fallback="MessageCircle" size={16} className="text-white/50" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Search */}
          {showSearch ? (
            <div className="relative mb-1" style={{ animation: "fadeSlideUp 0.2s ease both" }}>
              <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input autoFocus className="dart-input w-full pl-9 text-sm pr-9"
                placeholder="Глобальный поиск по людям и чатам..."
                value={searchGlobal} onChange={e => setSearchGlobal(e.target.value)} />
              {searchGlobal && (
                <button onClick={() => setSearchGlobal("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Icon name="X" size={14} className="text-white/40" />
                </button>
              )}
              {globalSearchResults.length > 0 && (
                <div className="absolute top-12 left-0 right-0 dart-glass rounded-2xl overflow-hidden z-50">
                  {globalSearchResults.map(c => (
                    <button key={c.id} onClick={() => { setActiveChat(c); setScreen("chat"); setShowSearch(false); setSearchGlobal(""); }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/8 transition-all text-left border-b border-white/5 last:border-0">
                      <Avatar initials={c.avatar} size={36} />
                      <div>
                        <p className="text-white text-sm font-medium">{c.name}</p>
                        <p className="text-white/40 text-xs">{c.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <Icon name="Search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input className="dart-input w-full pl-9 text-sm" placeholder="Поиск по чатам..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5">
          {filteredChats.length === 0 && (
            <div className="text-center text-white/30 py-16 text-sm">Ничего не найдено</div>
          )}
          {filteredChats.map((chat, i) => (
            <div key={chat.id} className="relative group" style={{ animation: `fadeSlideUp 0.3s ${i * 30}ms ease both` }}>
              <button onClick={() => { setActiveChat(chat); setScreen("chat"); }}
                className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all text-left ${chat.pinned ? "bg-white/3" : ""}`}>
                <div className="relative">
                  <Avatar initials={chat.avatar} size={52} />
                  {chat.online && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-black" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {chat.pinned && <Icon name="Pin" size={11} className="text-white/30 flex-shrink-0" />}
                      <span className="font-semibold text-white text-sm truncate" style={{ fontFamily: "Golos Text" }}>{chat.name}</span>
                      {chat.type !== "user" && <Icon name={chat.type === "channel" ? "Radio" : chat.type === "bot" ? "Bot" : "Users"} size={11} className="text-white/35 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {chat.muted && <Icon name="BellOff" size={11} className="text-white/30" />}
                      <span className="text-white/35 text-xs">{chat.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/45 text-xs truncate">{chat.lastMsg}</span>
                    {chat.unread > 0 && !chat.muted && <span className="dart-badge ml-2">{chat.unread}</span>}
                    {chat.unread > 0 && chat.muted && <span className="dart-badge-muted ml-2">{chat.unread}</span>}
                  </div>
                </div>
              </button>
              {/* Swipe actions */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1 z-10">
                <button onClick={() => togglePin(chat.id)} className="dart-glass-btn p-1.5 rounded-lg">
                  <Icon name={chat.pinned ? "PinOff" : "Pin"} size={13} className="text-white/60" />
                </button>
                <button onClick={() => toggleMute(chat.id)} className="dart-glass-btn p-1.5 rounded-lg">
                  <Icon name={chat.muted ? "Bell" : "BellOff"} size={13} className="text-white/60" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 pb-6">
          <div className="dart-glass rounded-2xl flex overflow-hidden">
            <button className="flex-1 flex flex-col items-center py-3 gap-1 border-b-2 border-white/30">
              <Icon name="MessageCircle" size={20} className="text-white" />
              <span className="text-[10px] text-white font-medium">Чаты</span>
            </button>
            <button onClick={() => setScreen("settings")} className="flex-1 flex flex-col items-center py-3 gap-1">
              <Icon name="Settings" size={20} className="text-white/40" />
              <span className="text-[10px] text-white/40">Настройки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* =================== NEW CHAT =================== */
  if (screen === "newChat") return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full px-4">
        <div className="pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setScreen("chats")} className="dart-glass-btn p-2.5 rounded-xl">
            <Icon name="ChevronLeft" size={20} className="text-white" />
          </button>
          <h2 className="dart-title text-xl">
            {newChatType === "chat" ? "НОВЫЙ ЧАТ" : newChatType === "group" ? "СОЗДАТЬ ГРУППУ" : newChatType === "channel" ? "СОЗДАТЬ КАНАЛ" : "СОЗДАТЬ БОТА"}
          </h2>
        </div>
        <div className="dart-glass rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-5 p-3 bg-white/5 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Icon name={newChatType === "chat" ? "MessageCircle" : newChatType === "group" ? "Users" : newChatType === "channel" ? "Radio" : "Bot"} size={20} className="text-white/60" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {newChatType === "chat" ? "Личный чат" : newChatType === "group" ? "Группа" : newChatType === "channel" ? "Канал" : "Бот"}
              </p>
              <p className="text-white/40 text-xs">{newChatType === "chat" ? "Введите номер или @юзернейм" : "Введите название"}</p>
            </div>
          </div>
          <label className="text-white/40 text-xs mb-1.5 block tracking-wider">
            {newChatType === "chat" ? "НОМЕР ИЛИ @ЮЗЕРНЕЙМ" : "НАЗВАНИЕ"}
          </label>
          <input className="dart-input w-full mb-4"
            placeholder={newChatType === "chat" ? "+7 999 ... или @username" : "Введите название..."}
            value={newChatVal} onChange={e => setNewChatVal(e.target.value)} />
          <button onClick={addChat} className="dart-btn w-full py-4 rounded-2xl font-semibold text-white text-sm">
            {newChatType === "chat" ? "Начать чат" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );

  /* =================== CHAT =================== */
  if (screen === "chat" && activeChat) {
    const chatThemeCfg = THEMES.find(t => t.id === (activeChat.theme || globalTheme)) || THEMES[0];
    return (
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className={`fixed inset-0 bg-gradient-to-br ${chatThemeCfg.bg} z-0`}>
          <div className="aurora aurora-1 opacity-40" />
          <div className="aurora aurora-2 opacity-25" />
        </div>
        <HiddenInputs />
        {call && <CallOverlay call={call} onEnd={endCall} onMute={() => setCallMuted(p => !p)} onVideo={() => setCallVideoOff(p => !p)} muted={callMuted} videoOff={callVideoOff} />}
        {(showThemePicker || showAttachMenu || showChatMenu) && (
          <div className="fixed inset-0 z-40" onClick={() => { setShowThemePicker(false); setShowAttachMenu(false); setShowChatMenu(false); }} />
        )}

        <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full">
          {/* Header */}
          <div className="px-3 pt-5 pb-3 dart-glass-header flex items-center gap-2.5">
            <button onClick={() => setScreen("chats")} className="dart-glass-btn p-2 rounded-xl">
              <Icon name="ChevronLeft" size={20} className="text-white" />
            </button>
            <div className="relative">
              <Avatar initials={activeChat.avatar} size={40} />
              {activeChat.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-black" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate" style={{ fontFamily: "Golos Text" }}>{activeChat.name}</p>
              <p className="text-xs" style={{ color: activeChat.online && activeChat.type === "user" ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
                {activeChat.type === "user" ? (activeChat.online ? "В сети" : "Не в сети") :
                  activeChat.type === "group" ? "Группа" : activeChat.type === "channel" ? "Канал" : "Бот"}
              </p>
            </div>
            <div className="flex gap-1.5">
              {/* Video call */}
              {activeChat.type === "user" && (
                <button onClick={() => startCall("video")} className="dart-glass-btn p-2 rounded-xl">
                  <Icon name="Video" size={17} className="text-white/70" />
                </button>
              )}
              {/* Voice call */}
              {activeChat.type === "user" && (
                <button onClick={() => startCall("voice")} className="dart-glass-btn p-2 rounded-xl">
                  <Icon name="Phone" size={17} className="text-white/70" />
                </button>
              )}
              {/* Theme + more */}
              <div className="relative">
                <button onClick={() => setShowChatMenu(!showChatMenu)} className="dart-glass-btn p-2 rounded-xl">
                  <Icon name="MoreVertical" size={17} className="text-white/70" />
                </button>
                {showChatMenu && (
                  <div className="absolute right-0 top-11 dart-glass rounded-2xl p-2 min-w-48 z-50" style={{ animation: "scaleIn 0.15s ease both" }}>
                    <button onClick={() => { setShowChatMenu(false); setShowThemePicker(true); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm">
                      <Icon name="Palette" size={15} className="text-white/50" /> Тема чата
                    </button>
                    <button onClick={() => { toggleMute(activeChat.id); setShowChatMenu(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm">
                      <Icon name={activeChat.muted ? "Bell" : "BellOff"} size={15} className="text-white/50" />
                      {activeChat.muted ? "Включить звук" : "Отключить звук"}
                    </button>
                    <button onClick={() => { togglePin(activeChat.id); setShowChatMenu(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm">
                      <Icon name={activeChat.pinned ? "PinOff" : "Pin"} size={15} className="text-white/50" />
                      {activeChat.pinned ? "Открепить" : "Закрепить"}
                    </button>
                    <div className="border-t border-white/8 my-1" />
                    <button onClick={() => deleteChat(activeChat.id)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-500/15 text-red-400 text-sm">
                      <Icon name="Trash2" size={15} className="text-red-400/70" /> Удалить чат
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Theme picker */}
          {showThemePicker && (
            <div className="absolute top-16 right-4 dart-glass rounded-2xl p-3 min-w-44 z-50" style={{ animation: "scaleIn 0.15s ease both" }}>
              <p className="text-white/35 text-[10px] tracking-wider mb-2 px-1">ТЕМА ЧАТА</p>
              {THEMES.map(t => (
                <button key={t.id}
                  onClick={() => {
                    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, theme: t.id } : c));
                    setActiveChat(prev => prev ? { ...prev, theme: t.id } : prev);
                    setShowThemePicker(false);
                  }}
                  className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-xl hover:bg-white/10 transition-all text-white text-sm ${activeChat.theme === t.id ? "bg-white/10" : ""}`}>
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${t.bg} flex-shrink-0`} />
                  {t.label}
                  {activeChat.theme === t.id && <Icon name="Check" size={12} className="text-white ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
            {activeChat.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                <Avatar initials={activeChat.avatar} size={64} />
                <p className="text-white/40 text-sm text-center">Начните диалог с {activeChat.name}</p>
              </div>
            )}
            {activeChat.messages.map((msg) => {
              const replyMsg = msg.replyTo ? activeChat.messages.find(m => m.id === msg.replyTo) : null;
              return (
                <div key={msg.id} className={`flex ${msg.mine ? "justify-end" : "justify-start"} group`}
                  style={{ animation: "fadeSlideUp 0.2s ease both" }}>
                  <div className="flex flex-col max-w-[78%]">
                    {replyMsg && (
                      <div className={`text-xs px-3 py-1.5 rounded-t-xl mb-0 border-l-2 border-white/40 bg-white/8 ${msg.mine ? "self-end" : "self-start"}`}>
                        <p className="text-white/60 truncate">{replyMsg.text}</p>
                      </div>
                    )}
                    <div className={`relative ${msg.mine ? "dart-bubble-mine" : "dart-bubble-other"} ${replyMsg ? "rounded-tl-none" : ""}`}>
                      {msg.attachment && <AttachmentPreview att={msg.attachment} mine={msg.mine} />}
                      {msg.text && <p className="text-white text-sm leading-relaxed break-words">{msg.text}</p>}
                      <div className={`flex items-center gap-1 mt-1 ${msg.mine ? "justify-end" : ""}`}>
                        <p className="text-[10px] text-white/40">{msg.time}</p>
                        {msg.mine && <Icon name="CheckCheck" size={11} className="text-white/40" />}
                      </div>
                      {/* Reply button on hover */}
                      <button onClick={() => setReplyTo(msg)}
                        className={`absolute top-1/2 -translate-y-1/2 dart-glass-btn p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${msg.mine ? "-left-8" : "-right-8"}`}>
                        <Icon name="Reply" size={12} className="text-white/60" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply preview */}
          {replyTo && (
            <div className="px-4 py-2 dart-glass-header flex items-center gap-3">
              <div className="w-0.5 h-8 rounded-full bg-white/40" />
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-xs">Ответ</p>
                <p className="text-white text-xs truncate">{replyTo.text}</p>
              </div>
              <button onClick={() => setReplyTo(null)}>
                <Icon name="X" size={16} className="text-white/40" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 pb-6 dart-glass-header">
            {inputText && (
              <div className="mb-2 px-1">
                <p className="text-white/25 text-xs truncate">✍ {inputText.slice(0, 55)}{inputText.length > 55 ? "..." : ""}</p>
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* Attach */}
              <div className="relative">
                <button onClick={() => setShowAttachMenu(!showAttachMenu)} className="dart-glass-btn p-2.5 rounded-xl flex-shrink-0 mb-0.5">
                  <Icon name="Paperclip" size={19} className="text-white/60" />
                </button>
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 dart-glass rounded-2xl p-2 min-w-44 z-50" style={{ animation: "scaleIn 0.15s ease both" }}>
                    <button onClick={() => photoInputRef.current?.click()}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm">
                      <Icon name="Image" size={15} className="text-purple-400" /> Фото / Видео
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm">
                      <Icon name="File" size={15} className="text-blue-400" /> Файл
                    </button>
                    <button onClick={() => audioInputRef.current?.click()}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/10 text-white text-sm">
                      <Icon name="Music" size={15} className="text-green-400" /> Аудио
                    </button>
                  </div>
                )}
              </div>
              <div className="flex-1 relative">
                <textarea
                  className="dart-input w-full resize-none py-2.5 px-4 text-sm leading-relaxed"
                  placeholder="Написать сообщение..."
                  rows={1}
                  value={inputText}
                  onChange={e => { setInputText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  style={{ minHeight: 44, maxHeight: 120 }}
                />
              </div>
              <button onClick={() => sendMessage()}
                className={`p-2.5 rounded-xl flex-shrink-0 mb-0.5 transition-all duration-200 ${inputText.trim() ? "dart-btn" : "dart-glass-btn"}`}>
                <Icon name={inputText.trim() ? "Send" : "Mic"} size={19} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =================== EDIT PROFILE =================== */
  if (screen === "editProfile") return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full px-4">
        <div className="pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setScreen("settings")} className="dart-glass-btn p-2.5 rounded-xl">
            <Icon name="ChevronLeft" size={20} className="text-white" />
          </button>
          <h2 className="dart-title text-xl">РЕДАКТИРОВАТЬ</h2>
        </div>
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar initials={account.name[0]} size={80} src={account.avatarUrl} />
            <button className="absolute -bottom-1 -right-1 dart-btn p-2 rounded-full border border-white/20">
              <Icon name="Camera" size={14} className="text-white" />
            </button>
          </div>
        </div>
        <div className="dart-glass rounded-3xl p-5 space-y-4">
          <div>
            <label className="text-white/40 text-xs mb-1.5 block tracking-wider">ИМЯ</label>
            <input className="dart-input w-full" placeholder={account.name}
              value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block tracking-wider">ЮЗЕРНЕЙМ</label>
            <input className="dart-input w-full" placeholder={account.username}
              value={editForm.username}
              onChange={e => {
                let v = e.target.value;
                if (v && !v.startsWith("@")) v = "@" + v;
                setEditForm(p => ({ ...p, username: v }));
              }} />
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1.5 block tracking-wider">ТЕЛЕФОН</label>
            <input className="dart-input w-full" placeholder={account.phone || "+7 ..."}
              value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <button onClick={handleSaveProfile} className="dart-btn w-full py-4 rounded-2xl font-semibold text-white text-sm">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );

  /* =================== NOTIFICATIONS =================== */
  if (screen === "notifications") return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full">
        <div className="px-4 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setScreen("settings")} className="dart-glass-btn p-2.5 rounded-xl">
            <Icon name="ChevronLeft" size={20} className="text-white" />
          </button>
          <h2 className="dart-title text-xl">УВЕДОМЛЕНИЯ</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          <div className="dart-glass rounded-3xl overflow-hidden">
            {[
              { key: "sound", icon: "Volume2", label: "Звук", sub: "Звук при новых сообщениях" },
              { key: "vibration", icon: "Smartphone", label: "Вибрация", sub: "Вибрация при уведомлениях" },
              { key: "preview", icon: "Eye", label: "Предпросмотр", sub: "Показывать текст в уведомлении" },
              { key: "mentions", icon: "AtSign", label: "Упоминания", sub: "Уведомлять об @упоминаниях" },
            ].map((item, i) => {
              const val = notifSettings[item.key as keyof typeof notifSettings];
              return (
                <div key={item.key} className={`flex items-center justify-between px-5 py-4 ${i > 0 ? "border-t border-white/5" : ""}`}>
                  <div className="flex items-center gap-3.5">
                    <div className="dart-glass-btn p-2 rounded-xl">
                      <Icon name={item.icon} fallback="Bell" size={17} className="text-white/60" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{item.label}</p>
                      <p className="text-white/35 text-xs">{item.sub}</p>
                    </div>
                  </div>
                  <button onClick={() => setNotifSettings(p => ({ ...p, [item.key]: !val }))}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${val ? "dart-toggle" : "bg-white/15"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${val ? "left-7" : "left-1"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  /* =================== SETTINGS =================== */
  if (screen === "settings") return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full">
        <div className="px-4 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setScreen("chats")} className="dart-glass-btn p-2.5 rounded-xl">
            <Icon name="ChevronLeft" size={20} className="text-white" />
          </button>
          <h2 className="dart-title text-xl">НАСТРОЙКИ</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {/* Profile */}
          <div className="dart-glass rounded-3xl p-5 flex items-center gap-4">
            <div className="relative">
              <Avatar initials={account.name[0]} size={64} src={account.avatarUrl} />
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-lg" style={{ fontFamily: "Golos Text" }}>{account.name}</p>
              <p className="text-white/45 text-sm">{account.username}</p>
              {account.phone && <p className="text-white/30 text-xs mt-0.5">{account.phone}</p>}
            </div>
            <button onClick={() => { setEditForm({ name: account.name, username: account.username, phone: account.phone }); setScreen("editProfile"); }}
              className="dart-glass-btn p-2.5 rounded-xl">
              <Icon name="Pencil" size={16} className="text-white/60" />
            </button>
          </div>

          {/* Theme */}
          <div className="dart-glass rounded-3xl p-4">
            <p className="text-white/35 text-[10px] tracking-widest uppercase mb-3">Тема приложения</p>
            <div className="flex gap-2 flex-wrap">
              {THEMES.map(t => (
                <button key={t.id} onClick={() => setGlobalTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all ${globalTheme === t.id ? "bg-white/15" : "hover:bg-white/5"}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.bg} ${globalTheme === t.id ? "ring-2 ring-white ring-offset-2 ring-offset-transparent" : ""}`} />
                  <span className="text-[10px] text-white/50">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu */}
          <div className="dart-glass rounded-3xl overflow-hidden">
            {[
              { icon: "Shield", label: "Конфиденциальность", sub: "Номер, статус, поиск", action: () => setScreen("privacy") },
              { icon: "Bell", label: "Уведомления", sub: "Звуки, вибрация, предпросмотр", action: () => setScreen("notifications") },
              { icon: "Lock", label: "Безопасность", sub: "Пароль, двухфакторная", action: () => {} },
              { icon: "HelpCircle", label: "Помощь", sub: "Поддержка, FAQ", action: () => setScreen("support") },
            ].map((item, i) => (
              <button key={item.label} onClick={item.action}
                className={`flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 transition-all text-left ${i > 0 ? "border-t border-white/5" : ""}`}>
                <div className="flex items-center gap-3.5">
                  <div className="dart-glass-btn p-2 rounded-xl">
                    <Icon name={item.icon} fallback="Circle" size={17} className="text-white/60" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{item.label}</p>
                    <p className="text-white/35 text-xs">{item.sub}</p>
                  </div>
                </div>
                <Icon name="ChevronRight" size={15} className="text-white/25" />
              </button>
            ))}
          </div>

          {/* Add account */}
          <button onClick={() => setScreen("addAccount")}
            className="dart-glass rounded-2xl p-4 flex items-center gap-3 w-full hover:bg-white/8 transition-all border border-dashed border-white/15 text-left">
            <div className="dart-glass-btn p-2 rounded-xl">
              <Icon name="UserPlus" size={17} className="text-white/60" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Добавить аккаунт</p>
              <p className="text-white/35 text-xs">Войти в другой профиль</p>
            </div>
          </button>

          {/* Logout */}
          <button onClick={() => setScreen("auth")}
            className="dart-glass rounded-2xl p-4 flex items-center gap-3 w-full hover:bg-red-500/10 transition-all border border-red-500/15 text-left">
            <div className="p-2 rounded-xl bg-red-500/15">
              <Icon name="LogOut" size={17} className="text-red-400" />
            </div>
            <p className="text-red-400 font-medium text-sm">Выйти из аккаунта</p>
          </button>
        </div>

        <div className="px-4 py-3 pb-6">
          <div className="dart-glass rounded-2xl flex overflow-hidden">
            <button onClick={() => setScreen("chats")} className="flex-1 flex flex-col items-center py-3 gap-1">
              <Icon name="MessageCircle" size={20} className="text-white/40" />
              <span className="text-[10px] text-white/40">Чаты</span>
            </button>
            <button className="flex-1 flex flex-col items-center py-3 gap-1 border-b-2 border-white/30">
              <Icon name="Settings" size={20} className="text-white" />
              <span className="text-[10px] text-white font-medium">Настройки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* =================== PRIVACY =================== */
  if (screen === "privacy") return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <AuroraBackground theme={globalTheme} />
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full">
        <div className="px-4 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => setScreen("settings")} className="dart-glass-btn p-2.5 rounded-xl">
            <Icon name="ChevronLeft" size={20} className="text-white" />
          </button>
          <h2 className="dart-title text-xl">КОНФИДЕНЦИАЛЬНОСТЬ</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {[
            { key: "showPhone", label: "Кто видит мой номер", icon: "Phone" },
            { key: "showOnline", label: "Кто видит «В сети»", icon: "Wifi" },
          ].map(section => (
            <div key={section.key} className="dart-glass rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Icon name={section.icon} fallback="Circle" size={15} className="text-white/40" />
                <p className="text-white/40 text-xs tracking-wider uppercase">{section.label}</p>
              </div>
              <div className="space-y-1.5">
                {[{ val: "everyone", label: "Все" }, { val: "contacts", label: "Мои контакты" }, { val: "nobody", label: "Никто" }].map(opt => {
                  const active = privacy[section.key as keyof typeof privacy] === opt.val;
                  return (
                    <button key={opt.val} onClick={() => setPrivacy(p => ({ ...p, [section.key]: opt.val }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${active ? "bg-white/12" : "hover:bg-white/5"}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? "border-white bg-white" : "border-white/25"}`}>
                        {active && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                      <span className="text-white text-sm">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="dart-glass rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium text-sm">Поиск по юзернейму</p>
                <p className="text-white/35 text-xs mt-0.5">Можно ли найти вас в поиске Dart</p>
              </div>
              <button onClick={() => setPrivacy(p => ({ ...p, searchable: !p.searchable }))}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${privacy.searchable ? "dart-toggle" : "bg-white/15"}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${privacy.searchable ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* =================== SUPPORT =================== */
  if (screen === "support") return (
    <SupportScreen account={account} globalTheme={globalTheme} onBack={() => setScreen("settings")} />
  );

  return null;
}

const SUPPORT_URL = "https://functions.poehali.dev/08645c64-77a4-4877-8cc4-61e52af0fcd3";

interface SupportMsg { id: number; text: string; mine: boolean; time: string; isSystem?: boolean; }

function SupportScreen({ account, globalTheme, onBack }: { account: { name: string; email: string }; globalTheme: string; onBack: () => void }) {
  const THEMES = [
    { id: "default", bg: "from-[#080808] to-[#0f0f0f]" },
    { id: "ocean", bg: "from-[#001f3f] to-[#003366]" },
    { id: "violet", bg: "from-[#1a0033] to-[#2d0052]" },
    { id: "forest", bg: "from-[#0a1a0a] to-[#0d2b0d]" },
    { id: "sunset", bg: "from-[#1a0a00] to-[#2b1500]" },
  ];
  const t = THEMES.find(x => x.id === globalTheme) || THEMES[0];

  const [msgs, setMsgs] = useState<SupportMsg[]>([
    { id: 1, text: "Привет! Это чат поддержки Dart. Опишите вашу проблему — мы ответим как можно скорее.", mine: false, time: "сейчас", isSystem: true },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const now = new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    const userMsg: SupportMsg = { id: Date.now(), text, mine: true, time: now };
    setMsgs(p => [...p, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(SUPPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: account.name, email: account.email, message: text }),
      });
      const data = await res.json();
      const replyTime = new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      if (data.ok) {
        setSent(true);
        setMsgs(p => [...p, { id: Date.now(), text: "Ваше сообщение доставлено! Мы ответим в ближайшее время.", mine: false, time: replyTime, isSystem: true }]);
      } else {
        setMsgs(p => [...p, { id: Date.now(), text: "Не удалось отправить сообщение. Попробуйте ещё раз.", mine: false, time: replyTime, isSystem: true }]);
      }
    } catch {
      const replyTime = new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      setMsgs(p => [...p, { id: Date.now(), text: "Ошибка сети. Проверьте соединение и попробуйте снова.", mine: false, time: replyTime, isSystem: true }]);
    }
    setSending(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <div className={`fixed inset-0 bg-gradient-to-br ${t.bg} z-0`}>
        <div className="aurora aurora-1 opacity-30" />
        <div className="aurora aurora-2 opacity-20" />
      </div>
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto w-full">
        {/* Header */}
        <div className="px-3 pt-5 pb-3 dart-glass-header flex items-center gap-3">
          <button onClick={onBack} className="dart-glass-btn p-2 rounded-xl">
            <Icon name="ChevronLeft" size={20} className="text-white" />
          </button>
          <div className="w-10 h-10 rounded-full dart-btn flex items-center justify-center flex-shrink-0">
            <Icon name="HeadphonesIcon" fallback="HelpCircle" size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm" style={{ fontFamily: "Golos Text" }}>Поддержка Dart</p>
            <p className="text-green-400 text-xs">Онлайн</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {msgs.map(msg => (
            <div key={msg.id} className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}
              style={{ animation: "fadeSlideUp 0.2s ease both" }}>
              {!msg.mine && (
                <div className="w-7 h-7 rounded-full dart-btn flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Icon name="HelpCircle" size={13} className="text-white" />
                </div>
              )}
              <div className={`max-w-[78%] ${msg.mine ? "dart-bubble-mine" : "dart-bubble-other"}`}>
                <p className="text-white text-sm leading-relaxed">{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 ${msg.mine ? "justify-end" : ""}`}>
                  <p className="text-[10px] text-white/40">{msg.time}</p>
                  {msg.mine && <Icon name="CheckCheck" size={11} className={sending ? "text-white/30" : "text-white/40"} />}
                </div>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start items-center gap-2 pl-9">
              <div className="dart-bubble-other px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                      style={{ animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 pb-6 dart-glass-header">
          {sent && (
            <p className="text-center text-white/40 text-xs mb-2">Сообщение отправлено на почту поддержки</p>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                className="dart-input w-full resize-none py-2.5 px-4 text-sm leading-relaxed"
                placeholder="Опишите проблему..."
                rows={1}
                value={input}
                disabled={sending}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                style={{ minHeight: 44, maxHeight: 120, opacity: sending ? 0.5 : 1 }}
              />
            </div>
            <button onClick={send} disabled={sending || !input.trim()}
              className={`p-2.5 rounded-xl flex-shrink-0 mb-0.5 transition-all ${input.trim() && !sending ? "dart-btn" : "dart-glass-btn opacity-50"}`}>
              <Icon name={sending ? "Loader" : "Send"} size={19} className={`text-white ${sending ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}