import {
  ClerkProvider,
} from '@clerk/nextjs'
import "../styles.css";
import React from "react";
import { ThemeProvider } from "@components/theme-provider";
import { Inter as FontSans, Lato, Nunito } from "next/font/google";
import { cn } from "@lib/utils";
import { Metadata } from "next";
import client from "@tina/__generated__/client";
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/react"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const lato = Lato({
  subsets: ["latin"],
  variable: "--font-lato",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Rebel SBK" + (process.env.NODE_ENV == 'development' ? " - DEV" : ""),
  description: "Rebel SBK Evtns and Conventions - Andreas Salsa Rebel",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const globalQuery = await client.queries.global({
    relativePath: "index.json",
  });
  const global = globalQuery.data.global;

  const selectFont = (fontName: string) => {
    switch (fontName) {
      case "nunito":
        return `font-nunito ${nunito.variable}`;
      case "lato":
        return `font-lato ${lato.variable}`;
      case "sans":
      default:
        return `font-sans ${fontSans.variable} `;
    }
  };
  const fontVariable = selectFont(global.theme.font);

  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <Script
        src="https://scripts.withcabin.com/hello.js"
        strategy="afterInteractive"
      />
      <Analytics/>
      <body
        className={cn("min-h-screen flex flex-col antialiased", fontVariable)}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          forcedTheme={global.theme.darkMode}
        >
          
          {children}
        </ThemeProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
