import type { Metadata } from "next";
import { Bebas_Neue, Roboto_Condensed, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/providers/toast-provider";
import { AppLayout } from "@/components/layout/app-layout";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UnregisterSW } from "@/components/pwa/unregister-sw";

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

export const metadata: Metadata = {
  title: "Cercle Of - Beauty Institute Management",
  description: "Gestion complète de votre institut de beauté - Point de vente, clients, services, produits et plus",
  manifest: "/manifest.json",
  themeColor: "#ec4899",
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
    <html lang="fr">
      <head>
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
        className={`${bebasNeue.variable} ${robotoCondensed.variable} ${poppins.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider />
            <AppLayout>
              {children}
            </AppLayout>
            <UnregisterSW />
            <InstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
