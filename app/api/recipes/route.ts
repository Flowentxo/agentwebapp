import { NextRequest, NextResponse } from "next/server";
import { recipesStore } from "@/lib/recipes/store";

/**
 * GET /api/recipes - List all recipes
 * POST /api/recipes - Create new recipe
 */

export async function GET() {
  try {
    const recipes = recipesStore.listRecipes();
    return NextResponse.json(recipes, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/recipes error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, steps, defaults } = body || {};

    if (!name || !steps) {
      return NextResponse.json(
        { error: "name and steps required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(steps)) {
      return NextResponse.json(
        { error: "steps must be an array" },
        { status: 400 }
      );
    }

    const recipe = recipesStore.createRecipe({
      name,
      description,
      steps,
      defaults,
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/recipes error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
