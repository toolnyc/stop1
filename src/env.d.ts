/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: import('@supabase/supabase-js').User;
    doorSlug?: string;
    collaborator?: { id: string; eventId: string };
  }
}
