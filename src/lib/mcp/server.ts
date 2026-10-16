import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "./context";
import { registerTools } from "./define";
import { adminTools } from "./tools/admin";
import { matchTools } from "./tools/match";
import { personalTools } from "./tools/personal";

const ROLE_INFO = {
  admin: "Admin saveza: utakmice, delegiranje, slanje nominacija, ko je slobodan, analitika.",
  official: "Sudija / zapisnički sto: moje nominacije (prihvati/odbij), moje utakmice, odsustva.",
  commissioner: "Komesar: kao sudija, plus unos rezultata po četvrtinama za svoju utakmicu.",
} as const;

/** Novi server po zahtjevu (stateless); alati se filtriraju po ulozi korisnika tokena. */
export function createMcpServer(ctx: McpContext) {
  const server = new McpServer(
    { name: "ksks-nominacije", version: "1.0.0" },
    {
      instructions: `KSKS Nominacije (Košarkaški savez Kantona Sarajevo). Prijavljen: ${ctx.profile.full_name}. ${ROLE_INFO[ctx.profile.role]} Sva vremena su po sarajevskom vremenu (YYYY-MM-DD, HH:MM).`,
    },
  );
  registerTools(server, ctx, [...personalTools, ...matchTools, ...adminTools]);
  return server;
}
