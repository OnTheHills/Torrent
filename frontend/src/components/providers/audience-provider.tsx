"use client";

import { createContext, useContext } from "react";

export type Audience = "public" | "vendor" | "admin";

const AudienceContext = createContext<Audience>("public");

export function AudienceProvider({
  audience,
  children,
}: {
  audience: Audience;
  children: React.ReactNode;
}) {
  return (
    <AudienceContext.Provider value={audience}>{children}</AudienceContext.Provider>
  );
}

export function useAudience() {
  return useContext(AudienceContext);
}
