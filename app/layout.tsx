import type { Metadata } from "next";
import { Anton, Playfair_Display, Fira_Sans_Condensed, Nunito_Sans, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardYearProvider } from "@/contexts/DashboardYearContext";
import { VoiceNavigationProvider } from "@/contexts/VoiceNavigationContext";
import { ToastProvider } from "@/components/providers/toast-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UnregisterSW } from "@/components/pwa/unregister-sw";

// Fonts (same pairing as biz-platform): Nunito Sans for the UI, Fira Sans Condensed for headings
const firaCondensed = Fira_Sans_Condensed({
  variable: "--font-fira-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

// Anton: big display titles
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

// Playfair Display italic: elegant accent on the login page
const script = Playfair_Display({
  variable: "--font-script",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  display: "swap",
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

// Applies the saved theme before paint (no light/dark flash)
// Dark is the default: only an explicit 'light' choice switches to light
const themeInitScript = `(function(){var m='dark';try{if(localStorage.getItem('app-theme')==='light')m='light'}catch(e){}var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(m);d.dataset.theme=m})()`;

export const metadata: Metadata = {
  title: "Cercle Of - Beauty Institute Management",
  description: "Gestion complète de votre institut de beauté - Point de vente, clients, services, produits et plus",
  manifest: "/manifest.json",
  themeColor: "#7d5a1e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cercle Of",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="dark" className={`dark ${anton.variable} ${script.variable} ${firaCondensed.variable} ${nunito.variable} ${robotoCondensed.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                // Unregister all service workers immediately
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister().then(function(success) {
                      if (success) {
                        console.log('Service Worker unregistered');
                      }
                    });
                  }
                });
                // Also try to unregister by scope
                navigator.serviceWorker.register && navigator.serviceWorker.getRegistration().then(function(registration) {
                  if (registration) {
                    registration.unregister();
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider>
          <AuthProvider>
            <DashboardYearProvider>
              <VoiceNavigationProvider>
                <ToastProvider />
                <AppLayout>
                  {children}
                </AppLayout>
                <UnregisterSW />
                <InstallPrompt />
              </VoiceNavigationProvider>
            </DashboardYearProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
