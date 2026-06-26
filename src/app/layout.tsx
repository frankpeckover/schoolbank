import type { Metadata } from "next";
import { appConfig } from "@/lib/app-config";
import { themeStorageKey } from "@/lib/theme-config";
import "./globals.css";

const themeInitScript = `
(() => {
  try {
    const savedTheme = window.localStorage.getItem(${JSON.stringify(
      themeStorageKey,
    )});
    document.documentElement.dataset.theme =
      savedTheme === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export const metadata: Metadata = {
  title: appConfig.name,
  description: "A school economy platform for fake currency rewards and spending.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
