import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Role } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";
import { DelegationError } from "@/lib/delegation";
import type { McpContext } from "./context";

/** Greška koju alat namjerno vraća korisniku (npr. "Nemaš pravo"); poruka ide klijentu. */
export class ToolError extends Error {}

type Shape = Record<string, z.ZodType>;

export type ToolDef<S extends Shape> = {
  name: string;
  description: string;
  roles: Role[];
  input: S;
  readOnly?: boolean;
  run: (args: z.infer<z.ZodObject<S>>, ctx: McpContext) => Promise<unknown>;
};

/** Tipizira argumente unutar `run`; prema van se svi alati tretiraju jednako (ulaz validira zod). */
export function defineTool<S extends Shape>(def: ToolDef<S>): ToolDef<Shape> {
  return def as unknown as ToolDef<Shape>;
}

/**
 * Registruje alat samo ako ga uloga smije koristiti. Svaki poziv se upisuje u mcp_audit,
 * a rezultat vraća kao JSON tekst.
 */
export function registerTools(server: McpServer, ctx: McpContext, tools: ToolDef<Shape>[]) {
  for (const tool of tools) {
    if (!tool.roles.includes(ctx.profile.role)) continue;

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: tool.readOnly ?? false },
      },
      async (args: Record<string, unknown>): Promise<CallToolResult> => {
        let ok = true;
        let error: string | null = null;
        let result: CallToolResult;
        try {
          const data = await tool.run(args as never, ctx);
          result = { content: [{ type: "text", text: JSON.stringify(data ?? { ok: true }, null, 2) }] };
        } catch (e) {
          ok = false;
          // Neočekivane greške ne otkrivaju detalje baze klijentu
          error = e instanceof Error ? e.message : String(e);
          const message =
            e instanceof ToolError || e instanceof DelegationError ? e.message : "Greška na serveru. Pokušaj ponovo.";
          result = { isError: true, content: [{ type: "text", text: message }] };
        }

        await ctx.db.from("mcp_audit").insert({
          token_id: ctx.tokenId,
          profile_id: ctx.profile.id,
          tool: tool.name,
          args: args as Json,
          ok,
          error,
        });
        return result;
      },
    );
  }
}

/** Vraća podatke ili baca (internu) grešku ako Supabase vrati grešku */
export function must<T>(res: { data: T; error: { message: string } | null }, message = "Upit nije uspio."): NonNullable<T> {
  if (res.error || res.data == null) throw new Error(`${message} ${res.error?.message ?? "Nema podataka."}`);
  return res.data;
}

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum u formatu YYYY-MM-DD");
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Vrijeme u formatu HH:MM");
export const uuidSchema = z.string().uuid();
