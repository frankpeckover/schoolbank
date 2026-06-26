import type { Metadata } from "next";
import { appConfig } from "@/lib/app-config";
import {
  accentThemeStorageKey,
  customAccentColorStorageKey,
  defaultCustomAccentColor,
  defaultAccentTheme,
} from "@/lib/accent-theme-config";
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
    const savedAccent = window.localStorage.getItem(${JSON.stringify(
      accentThemeStorageKey,
    )});
    const savedCustomAccent = window.localStorage.getItem(${JSON.stringify(
      customAccentColorStorageKey,
    )});
    const customAccent =
      /^#[0-9a-f]{6}$/i.test(savedCustomAccent || "")
        ? savedCustomAccent
        : ${JSON.stringify(defaultCustomAccentColor)};
    document.documentElement.dataset.accent =
      ["teal", "blue", "purple", "orange", "custom"].includes(savedAccent)
        ? savedAccent
        : ${JSON.stringify(defaultAccentTheme)};
    document.documentElement.style.setProperty(
      "--custom-accent-primary",
      customAccent
    );
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.accent = ${JSON.stringify(
      defaultAccentTheme,
    )};
    document.documentElement.style.setProperty(
      "--custom-accent-primary",
      ${JSON.stringify(defaultCustomAccentColor)}
    );
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
