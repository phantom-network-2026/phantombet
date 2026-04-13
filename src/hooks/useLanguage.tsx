import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type LanguageCode =
  | "en" | "es" | "fr" | "de" | "pt" | "it"
  | "ru" | "pl" | "uk" | "ro" | "tr" | "nl"
  | "ja" | "ko" | "zh" | "ar" | "hi" | "th";

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
];

type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    home: "Home", games: "Games", friends: "Friends", promos: "Promos",
    exchange: "Exchange", help: "Help", deposit: "Deposit", withdraw: "Withdraw",
    login: "Log In", signup: "Sign Up", logout: "Log Out", profile: "My Profile",
    admin: "Admin Panel", cpanel: "cPanel", slotPanel: "Slot Panel", ownerPanel: "Owner Panel",
    notifications: "Notifications", markAllRead: "Mark all read", noNotifications: "No notifications yet",
    balance: "Balance", wallet: "Wallet", language: "Language", search: "Search",
    messages: "Messages", settings: "Settings",
  },
  es: {
    home: "Inicio", games: "Juegos", friends: "Amigos", promos: "Promos",
    exchange: "Intercambio", help: "Ayuda", deposit: "Depositar", withdraw: "Retirar",
    login: "Iniciar sesión", signup: "Registrarse", logout: "Cerrar sesión", profile: "Mi Perfil",
    admin: "Panel Admin", cpanel: "cPanel", slotPanel: "Panel de Slots", ownerPanel: "Panel Dueño",
    notifications: "Notificaciones", markAllRead: "Marcar todo leído", noNotifications: "Sin notificaciones",
    balance: "Saldo", wallet: "Cartera", language: "Idioma", search: "Buscar",
    messages: "Mensajes", settings: "Ajustes",
  },
  fr: {
    home: "Accueil", games: "Jeux", friends: "Amis", promos: "Promos",
    exchange: "Échange", help: "Aide", deposit: "Dépôt", withdraw: "Retrait",
    login: "Connexion", signup: "S'inscrire", logout: "Déconnexion", profile: "Mon Profil",
    admin: "Panneau Admin", cpanel: "cPanel", slotPanel: "Panneau Slots", ownerPanel: "Panneau Proprio",
    notifications: "Notifications", markAllRead: "Tout marquer lu", noNotifications: "Aucune notification",
    balance: "Solde", wallet: "Portefeuille", language: "Langue", search: "Rechercher",
    messages: "Messages", settings: "Paramètres",
  },
  de: {
    home: "Startseite", games: "Spiele", friends: "Freunde", promos: "Aktionen",
    exchange: "Wechsel", help: "Hilfe", deposit: "Einzahlen", withdraw: "Auszahlen",
    login: "Anmelden", signup: "Registrieren", logout: "Abmelden", profile: "Mein Profil",
    admin: "Admin-Panel", cpanel: "cPanel", slotPanel: "Slot-Panel", ownerPanel: "Owner-Panel",
    notifications: "Benachrichtigungen", markAllRead: "Alle gelesen", noNotifications: "Keine Benachrichtigungen",
    balance: "Guthaben", wallet: "Geldbörse", language: "Sprache", search: "Suche",
    messages: "Nachrichten", settings: "Einstellungen",
  },
  pt: {
    home: "Início", games: "Jogos", friends: "Amigos", promos: "Promoções",
    exchange: "Câmbio", help: "Ajuda", deposit: "Depositar", withdraw: "Sacar",
    login: "Entrar", signup: "Cadastrar", logout: "Sair", profile: "Meu Perfil",
    admin: "Painel Admin", cpanel: "cPanel", slotPanel: "Painel Slots", ownerPanel: "Painel Dono",
    notifications: "Notificações", markAllRead: "Marcar tudo lido", noNotifications: "Sem notificações",
    balance: "Saldo", wallet: "Carteira", language: "Idioma", search: "Buscar",
    messages: "Mensagens", settings: "Configurações",
  },
  it: {
    home: "Home", games: "Giochi", friends: "Amici", promos: "Promo",
    exchange: "Scambio", help: "Aiuto", deposit: "Deposito", withdraw: "Prelievo",
    login: "Accedi", signup: "Registrati", logout: "Esci", profile: "Il mio Profilo",
    admin: "Pannello Admin", cpanel: "cPanel", slotPanel: "Pannello Slot", ownerPanel: "Pannello Proprietario",
    notifications: "Notifiche", markAllRead: "Segna tutto letto", noNotifications: "Nessuna notifica",
    balance: "Saldo", wallet: "Portafoglio", language: "Lingua", search: "Cerca",
    messages: "Messaggi", settings: "Impostazioni",
  },
  nl: {
    home: "Home", games: "Spellen", friends: "Vrienden", promos: "Acties",
    exchange: "Wissel", help: "Help", deposit: "Storten", withdraw: "Opnemen",
    login: "Inloggen", signup: "Registreren", logout: "Uitloggen", profile: "Mijn Profiel",
    admin: "Admin Paneel", cpanel: "cPanel", slotPanel: "Slot Paneel", ownerPanel: "Eigenaar Paneel",
    notifications: "Meldingen", markAllRead: "Alles gelezen", noNotifications: "Geen meldingen",
    balance: "Saldo", wallet: "Portemonnee", language: "Taal", search: "Zoeken",
    messages: "Berichten", settings: "Instellingen",
  },
  ru: {
    home: "Главная", games: "Игры", friends: "Друзья", promos: "Акции",
    exchange: "Обмен", help: "Помощь", deposit: "Депозит", withdraw: "Вывод",
    login: "Войти", signup: "Регистрация", logout: "Выйти", profile: "Мой Профиль",
    admin: "Админ панель", cpanel: "cPanel", slotPanel: "Панель слотов", ownerPanel: "Панель владельца",
    notifications: "Уведомления", markAllRead: "Прочитать все", noNotifications: "Нет уведомлений",
    balance: "Баланс", wallet: "Кошелёк", language: "Язык", search: "Поиск",
    messages: "Сообщения", settings: "Настройки",
  },
  pl: {
    home: "Strona główna", games: "Gry", friends: "Znajomi", promos: "Promocje",
    exchange: "Wymiana", help: "Pomoc", deposit: "Wpłata", withdraw: "Wypłata",
    login: "Zaloguj", signup: "Zarejestruj", logout: "Wyloguj", profile: "Mój Profil",
    admin: "Panel Admina", cpanel: "cPanel", slotPanel: "Panel Slotów", ownerPanel: "Panel Właściciela",
    notifications: "Powiadomienia", markAllRead: "Oznacz wszystkie", noNotifications: "Brak powiadomień",
    balance: "Saldo", wallet: "Portfel", language: "Język", search: "Szukaj",
    messages: "Wiadomości", settings: "Ustawienia",
  },
  uk: {
    home: "Головна", games: "Ігри", friends: "Друзі", promos: "Акції",
    exchange: "Обмін", help: "Допомога", deposit: "Депозит", withdraw: "Вивід",
    login: "Увійти", signup: "Реєстрація", logout: "Вийти", profile: "Мій Профіль",
    admin: "Адмін панель", cpanel: "cPanel", slotPanel: "Панель слотів", ownerPanel: "Панель власника",
    notifications: "Сповіщення", markAllRead: "Прочитати все", noNotifications: "Немає сповіщень",
    balance: "Баланс", wallet: "Гаманець", language: "Мова", search: "Пошук",
    messages: "Повідомлення", settings: "Налаштування",
  },
  ro: {
    home: "Acasă", games: "Jocuri", friends: "Prieteni", promos: "Promoții",
    exchange: "Schimb", help: "Ajutor", deposit: "Depunere", withdraw: "Retragere",
    login: "Autentificare", signup: "Înregistrare", logout: "Deconectare", profile: "Profilul meu",
    admin: "Panou Admin", cpanel: "cPanel", slotPanel: "Panou Sloturi", ownerPanel: "Panou Proprietar",
    notifications: "Notificări", markAllRead: "Marchează citite", noNotifications: "Nicio notificare",
    balance: "Sold", wallet: "Portofel", language: "Limbă", search: "Căutare",
    messages: "Mesaje", settings: "Setări",
  },
  tr: {
    home: "Ana Sayfa", games: "Oyunlar", friends: "Arkadaşlar", promos: "Promosyonlar",
    exchange: "Borsa", help: "Yardım", deposit: "Yatırma", withdraw: "Çekme",
    login: "Giriş", signup: "Kayıt Ol", logout: "Çıkış", profile: "Profilim",
    admin: "Admin Paneli", cpanel: "cPanel", slotPanel: "Slot Paneli", ownerPanel: "Sahip Paneli",
    notifications: "Bildirimler", markAllRead: "Tümünü okundu", noNotifications: "Bildirim yok",
    balance: "Bakiye", wallet: "Cüzdan", language: "Dil", search: "Ara",
    messages: "Mesajlar", settings: "Ayarlar",
  },
  ja: {
    home: "ホーム", games: "ゲーム", friends: "フレンド", promos: "プロモ",
    exchange: "交換", help: "ヘルプ", deposit: "入金", withdraw: "出金",
    login: "ログイン", signup: "登録", logout: "ログアウト", profile: "マイプロフィール",
    admin: "管理パネル", cpanel: "cPanel", slotPanel: "スロットパネル", ownerPanel: "オーナーパネル",
    notifications: "通知", markAllRead: "すべて既読", noNotifications: "通知なし",
    balance: "残高", wallet: "ウォレット", language: "言語", search: "検索",
    messages: "メッセージ", settings: "設定",
  },
  ko: {
    home: "홈", games: "게임", friends: "친구", promos: "프로모션",
    exchange: "거래소", help: "도움말", deposit: "입금", withdraw: "출금",
    login: "로그인", signup: "가입", logout: "로그아웃", profile: "내 프로필",
    admin: "관리 패널", cpanel: "cPanel", slotPanel: "슬롯 패널", ownerPanel: "소유자 패널",
    notifications: "알림", markAllRead: "모두 읽음", noNotifications: "알림 없음",
    balance: "잔액", wallet: "지갑", language: "언어", search: "검색",
    messages: "메시지", settings: "설정",
  },
  zh: {
    home: "首页", games: "游戏", friends: "好友", promos: "优惠",
    exchange: "兑换", help: "帮助", deposit: "充值", withdraw: "提现",
    login: "登录", signup: "注册", logout: "退出", profile: "我的资料",
    admin: "管理面板", cpanel: "控制面板", slotPanel: "老虎机面板", ownerPanel: "所有者面板",
    notifications: "通知", markAllRead: "全部已读", noNotifications: "暂无通知",
    balance: "余额", wallet: "钱包", language: "语言", search: "搜索",
    messages: "消息", settings: "设置",
  },
  ar: {
    home: "الرئيسية", games: "الألعاب", friends: "الأصدقاء", promos: "العروض",
    exchange: "التبادل", help: "المساعدة", deposit: "إيداع", withdraw: "سحب",
    login: "تسجيل الدخول", signup: "إنشاء حساب", logout: "تسجيل الخروج", profile: "ملفي",
    admin: "لوحة الإدارة", cpanel: "لوحة التحكم", slotPanel: "لوحة السلوت", ownerPanel: "لوحة المالك",
    notifications: "الإشعارات", markAllRead: "قراءة الكل", noNotifications: "لا توجد إشعارات",
    balance: "الرصيد", wallet: "المحفظة", language: "اللغة", search: "بحث",
    messages: "الرسائل", settings: "الإعدادات",
  },
  hi: {
    home: "होम", games: "गेम्स", friends: "दोस्त", promos: "प्रोमो",
    exchange: "एक्सचेंज", help: "मदद", deposit: "जमा", withdraw: "निकासी",
    login: "लॉग इन", signup: "साइन अप", logout: "लॉग आउट", profile: "मेरी प्रोफ़ाइल",
    admin: "एडमिन पैनल", cpanel: "सीपैनल", slotPanel: "स्लॉट पैनल", ownerPanel: "ओनर पैनल",
    notifications: "सूचनाएँ", markAllRead: "सभी पढ़ें", noNotifications: "कोई सूचना नहीं",
    balance: "शेष", wallet: "वॉलेट", language: "भाषा", search: "खोजें",
    messages: "संदेश", settings: "सेटिंग्स",
  },
  th: {
    home: "หน้าแรก", games: "เกม", friends: "เพื่อน", promos: "โปรโมชั่น",
    exchange: "แลกเปลี่ยน", help: "ช่วยเหลือ", deposit: "ฝาก", withdraw: "ถอน",
    login: "เข้าสู่ระบบ", signup: "สมัคร", logout: "ออกจากระบบ", profile: "โปรไฟล์",
    admin: "แผงผู้ดูแล", cpanel: "cPanel", slotPanel: "แผงสล็อต", ownerPanel: "แผงเจ้าของ",
    notifications: "การแจ้งเตือน", markAllRead: "อ่านทั้งหมด", noNotifications: "ไม่มีการแจ้งเตือน",
    balance: "ยอดเงิน", wallet: "กระเป๋าเงิน", language: "ภาษา", search: "ค้นหา",
    messages: "ข้อความ", settings: "ตั้งค่า",
  },
} as const;

interface LanguageContextValue {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  currentLanguage: Language;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved as LanguageCode) || "en";
  });

  const setLang = useCallback((code: LanguageCode) => {
    setLangState(code);
    localStorage.setItem("app_lang", code);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currentLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}