import { NextRequest, NextResponse } from "next/server";
import { recipesStore } from "@/lib/recipes/store";

/**
 * GET /api/recipes/[id] - Get single recipe
 * PATCH /api/recipes/[id] - Update recipe
 * DELETE /api/recipes/[id] - Delete recipe
 * POST /api/recipes/[id]?action=run - Run recipe with input
 */

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = recipesStore.getRecipe(params.id);
    if (!recipe) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(recipe, { status: 200 });
  } catch (error: any) {
    console.error(`GET /api/recipes/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, description, steps, defaults } = body || {};

    const updated = recipesStore.updateRecipe(params.id, {
      name,
      description,
      steps,
      defaults,
    });

    if (!updated) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error(`PATCH /api/recipes/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = recipesStore.deleteRecipe(params.id);
    if (!ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/recipes/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action !== "run") {
      return NextResponse.json(
        { error: "unsupported_action" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { input } = body || {};

    const run = recipesStore.runRecipe(params.id, input);

    return NextResponse.json(run, { status: 200 });
  } catch (error: any) {
    console.error(`POST /api/recipes/${params.id}?action=run error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
