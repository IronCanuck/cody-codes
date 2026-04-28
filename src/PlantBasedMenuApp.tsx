import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Leaf, Menu, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

const STORAGE_VERSION = 1 as const;

type Ingredient = {
  id: string;
  name: string;
  defaultUnit: string;
  category: string;
};

type RecipeIngredient = {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  notes: string;
};

type Recipe = {
  id: string;
  name: string;
  description: string;
  baseServings: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
};

type PersistedSnapshot = {
  version: typeof STORAGE_VERSION;
  ingredients: Ingredient[];
  recipes: Recipe[];
};

type RecipeIngredientDraft = {
  id: string;
  ingredientId: string;
  quantity: string;
  unit: string;
  notes: string;
};

type RecipeDraft = {
  name: string;
  description: string;
  baseServings: string;
  ingredients: RecipeIngredientDraft[];
};

const DEFAULT_INGREDIENTS: Array<Omit<Ingredient, 'id'>> = [
  { name: 'Chickpeas', defaultUnit: 'cup', category: 'Legumes' },
  { name: 'Lentils', defaultUnit: 'cup', category: 'Legumes' },
  { name: 'Black Beans', defaultUnit: 'cup', category: 'Legumes' },
  { name: 'Tofu', defaultUnit: 'g', category: 'Protein' },
  { name: 'Tempeh', defaultUnit: 'g', category: 'Protein' },
  { name: 'Brown Rice', defaultUnit: 'cup', category: 'Grains' },
  { name: 'Quinoa', defaultUnit: 'cup', category: 'Grains' },
  { name: 'Spinach', defaultUnit: 'cup', category: 'Vegetables' },
  { name: 'Broccoli', defaultUnit: 'cup', category: 'Vegetables' },
  { name: 'Bell Pepper', defaultUnit: 'piece', category: 'Vegetables' },
  { name: 'Olive Oil', defaultUnit: 'tbsp', category: 'Pantry' },
  { name: 'Garlic', defaultUnit: 'clove', category: 'Pantry' },
];

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `pbm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function storageKeyForUser(userId: string) {
  return `plantbasedmenu:${userId}`;
}

function defaultSnapshot(): PersistedSnapshot {
  return {
    version: STORAGE_VERSION,
    ingredients: DEFAULT_INGREDIENTS.map((item) => ({ ...item, id: newId() })),
    recipes: [],
  };
}

function loadSnapshot(userId: string | undefined): PersistedSnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (
      parsed?.version !== STORAGE_VERSION ||
      !Array.isArray(parsed.ingredients) ||
      !Array.isArray(parsed.recipes)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSnapshot(userId: string | undefined, data: PersistedSnapshot) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyForUser(userId), JSON.stringify(data));
  } catch {
    // Ignore storage quota errors.
  }
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, '');
}

function makeBlankRecipeDraft(): RecipeDraft {
  return {
    name: '',
    description: '',
    baseServings: '4',
    ingredients: [{ id: newId(), ingredientId: '', quantity: '1', unit: '', notes: '' }],
  };
}

function makeDraftFromRecipe(recipe: Recipe): RecipeDraft {
  return {
    name: recipe.name,
    description: recipe.description,
    baseServings: String(recipe.baseServings),
    ingredients: recipe.ingredients.map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      quantity: String(item.quantity),
      unit: item.unit,
      notes: item.notes,
    })),
  };
}

export function PlantBasedMenuApp() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuId = useId();
  const userId = session?.user?.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<PersistedSnapshot>(() => defaultSnapshot());
  const [ingredientQuery, setIngredientQuery] = useState('');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientUnit, setNewIngredientUnit] = useState('cup');
  const [newIngredientCategory, setNewIngredientCategory] = useState('Pantry');
  const [servingsByRecipe, setServingsByRecipe] = useState<Record<string, string>>({});
  const [draftOpen, setDraftOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraft>(() => makeBlankRecipeDraft());

  const persist = useCallback(
    (next: PersistedSnapshot | ((prev: PersistedSnapshot) => PersistedSnapshot)) => {
      setData((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveSnapshot(userId, resolved);
        return resolved;
      });
    },
    [userId],
  );

  useEffect(() => {
    document.title = 'Plant-Based Menu · Cody James Fairburn';
  }, []);

  useEffect(() => {
    if (!userId) return;
    const stored = loadSnapshot(userId);
    if (stored) setData(stored);
    else setData(defaultSnapshot());
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    setServingsByRecipe((prev) => {
      const next: Record<string, string> = {};
      for (const recipe of data.recipes) {
        next[recipe.id] = prev[recipe.id] ?? String(recipe.baseServings);
      }
      return next;
    });
  }, [data.recipes]);

  const ingredientMap = useMemo(
    () => new Map<string, Ingredient>(data.ingredients.map((item) => [item.id, item])),
    [data.ingredients],
  );

  const ingredientUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const recipe of data.recipes) {
      for (const item of recipe.ingredients) {
        usage.set(item.ingredientId, (usage.get(item.ingredientId) ?? 0) + 1);
      }
    }
    return usage;
  }, [data.recipes]);

  const filteredIngredients = useMemo(() => {
    const query = ingredientQuery.trim().toLowerCase();
    if (!query) return data.ingredients;
    return data.ingredients.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.defaultUnit.toLowerCase().includes(query)
      );
    });
  }, [data.ingredients, ingredientQuery]);

  const openNewRecipeDraft = () => {
    setEditingRecipeId(null);
    setRecipeError(null);
    setRecipeDraft(makeBlankRecipeDraft());
    setDraftOpen(true);
  };

  const openEditRecipeDraft = (recipe: Recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeError(null);
    setRecipeDraft(makeDraftFromRecipe(recipe));
    setDraftOpen(true);
  };

  const addIngredientToLibrary = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newIngredientName.trim();
    const unit = newIngredientUnit.trim();
    const category = newIngredientCategory.trim();
    if (!name || !unit || !category) return;
    persist((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { id: newId(), name, defaultUnit: unit, category }],
    }));
    setNewIngredientName('');
  };

  const removeIngredientFromLibrary = (ingredientId: string) => {
    const used = ingredientUsage.get(ingredientId) ?? 0;
    if (used > 0) return;
    persist((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((item) => item.id !== ingredientId),
    }));
  };

  const saveRecipeDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = recipeDraft.name.trim();
    const description = recipeDraft.description.trim();
    const baseServings = Math.max(1, Math.round(Number(recipeDraft.baseServings) || 1));
    if (!name) {
      setRecipeError('Recipe name is required.');
      return;
    }
    const ingredients = recipeDraft.ingredients
      .map((item) => {
        const quantity = Number(item.quantity);
        if (!item.ingredientId || !Number.isFinite(quantity) || quantity <= 0) return null;
        const ingredient = ingredientMap.get(item.ingredientId);
        return {
          id: item.id,
          ingredientId: item.ingredientId,
          quantity,
          unit: item.unit.trim() || ingredient?.defaultUnit || '',
          notes: item.notes.trim(),
        } satisfies RecipeIngredient;
      })
      .filter((item): item is RecipeIngredient => Boolean(item));

    if (ingredients.length === 0) {
      setRecipeError('Add at least one ingredient with a valid quantity.');
      return;
    }

    const nowIso = new Date().toISOString();
    persist((prev) => {
      if (editingRecipeId) {
        return {
          ...prev,
          recipes: prev.recipes.map((recipe) =>
            recipe.id === editingRecipeId
              ? {
                  ...recipe,
                  name,
                  description,
                  baseServings,
                  ingredients,
                  updatedAt: nowIso,
                }
              : recipe,
          ),
        };
      }

      const newRecipe: Recipe = {
        id: newId(),
        name,
        description,
        baseServings,
        ingredients,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      return {
        ...prev,
        recipes: [newRecipe, ...prev.recipes],
      };
    });

    setDraftOpen(false);
    setEditingRecipeId(null);
    setRecipeError(null);
  };

  const removeRecipe = (recipeId: string) => {
    persist((prev) => ({
      ...prev,
      recipes: prev.recipes.filter((recipe) => recipe.id !== recipeId),
    }));
  };

  const goToSection = (sectionId: string) => {
    setMenuOpen(false);
    const target = document.getElementById(sectionId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-evergreen-surface">
        <p className="text-evergreen-dark text-sm font-medium">Sign in to use Plant-Based Menu.</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-evergreen-surface">
        <p className="text-evergreen-dark text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-evergreen-surface text-evergreen-ink flex flex-col">
      <header className="sticky top-0 z-30 border-b border-evergreen/35 bg-gradient-to-r from-evergreen-dark to-evergreen text-white shadow-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <Link to="/plant-based-menu" className="min-w-0 flex items-center gap-3 rounded-lg">
            <span className="shrink-0 rounded-lg bg-white/15 p-2 ring-1 ring-white/35">
              <Leaf className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </span>
            <span className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base truncate">Plant-Based Menu</h1>
              <p className="text-[11px] sm:text-xs text-white/85 truncate">Recipes & ingredient scaling</p>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/35 bg-black/10 text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-evergreen-ink/45 backdrop-blur-[1px]"
          aria-hidden
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-hidden={!menuOpen}
        aria-label="Plant-Based Menu navigation"
        className={`fixed inset-y-0 right-0 z-50 w-[min(100vw-2.5rem,20rem)] bg-white border-l border-evergreen/25 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100">
          <p className="text-sm font-bold text-evergreen-dark">Menu</p>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <nav className="p-3 space-y-2" aria-label="In app navigation">
          <button
            type="button"
            onClick={() => goToSection('recipes')}
            className="w-full rounded-xl border border-evergreen/20 bg-evergreen-light/35 px-3 py-3 text-left text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/50"
          >
            Recipes
          </button>
          <button
            type="button"
            onClick={() => goToSection('ingredients')}
            className="w-full rounded-xl border border-evergreen/20 bg-evergreen-light/35 px-3 py-3 text-left text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/50"
          >
            Ingredient library
          </button>
        </nav>
        <div className="mt-auto p-3 border-t border-slate-100 space-y-2">
          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-evergreen/25 bg-evergreen-light/30 px-3 py-2.5 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/55"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            All apps
          </Link>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void signOut().then(() => navigate('/', { replace: true }));
            }}
            className="w-full rounded-xl border border-evergreen/30 px-3 py-2.5 text-sm font-semibold text-evergreen-dark hover:bg-evergreen-light/35"
          >
            Sign out
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-6">
        <section className="rounded-2xl border border-evergreen/20 bg-white p-4 sm:p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-evergreen">Kitchen planner</p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-evergreen-dark">Build once, scale instantly</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Save your go-to plant-based recipes and automatically scale each ingredient to the number
            of people you need to feed.
          </p>
        </section>

        <section id="recipes" className="scroll-mt-20 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-evergreen-dark flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-evergreen" strokeWidth={2.25} aria-hidden />
              Recipes
            </h3>
            <button
              type="button"
              onClick={openNewRecipeDraft}
              className="inline-flex items-center gap-2 rounded-xl bg-evergreen text-white px-3.5 py-2 text-sm font-semibold hover:bg-evergreen-dark"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              New recipe
            </button>
          </div>

          {data.recipes.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-evergreen/30 bg-white/80 p-6 text-center">
              <p className="text-sm font-medium text-evergreen-dark">No recipes yet</p>
              <p className="text-sm text-slate-600 mt-1">
                Create your first recipe to start scaling ingredients by servings.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.recipes.map((recipe) => {
                const targetServingsRaw = servingsByRecipe[recipe.id] ?? String(recipe.baseServings);
                const targetServings = Math.max(1, Number(targetServingsRaw) || recipe.baseServings);
                const scaleFactor = targetServings / recipe.baseServings;

                return (
                  <li
                    key={recipe.id}
                    className="rounded-2xl border border-evergreen/20 bg-white p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-evergreen-dark text-lg leading-tight">{recipe.name}</h4>
                        {recipe.description ? (
                          <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">
                            {recipe.description}
                          </p>
                        ) : null}
                        <p className="text-xs font-medium text-evergreen mt-2">
                          Base servings: {recipe.baseServings}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditRecipeDraft(recipe)}
                          className="rounded-lg p-2 text-evergreen hover:bg-evergreen-light/45"
                          aria-label={`Edit ${recipe.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecipe(recipe.id)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          aria-label={`Delete ${recipe.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-evergreen/15 bg-evergreen-light/25 p-3">
                      <label className="text-sm">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-evergreen-dark/80">
                          People to feed
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={targetServingsRaw}
                          onChange={(event) =>
                            setServingsByRecipe((prev) => ({
                              ...prev,
                              [recipe.id]: event.target.value,
                            }))
                          }
                          className="mt-1 w-28 rounded-lg border border-evergreen/30 bg-white px-2.5 py-1.5 text-sm"
                        />
                      </label>
                      <p className="text-xs text-evergreen-dark font-medium">
                        Scale factor: x{formatQuantity(scaleFactor)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Ingredient</th>
                            <th className="px-3 py-2 text-left font-semibold">Scaled amount</th>
                            <th className="px-3 py-2 text-left font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipe.ingredients.map((item) => {
                            const ingredient = ingredientMap.get(item.ingredientId);
                            const scaled = item.quantity * scaleFactor;
                            return (
                              <tr key={item.id} className="border-t border-slate-100 align-top">
                                <td className="px-3 py-2 font-medium text-slate-800">
                                  {ingredient?.name ?? 'Unknown ingredient'}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {formatQuantity(scaled)} {item.unit || ingredient?.defaultUnit}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{item.notes || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="ingredients" className="scroll-mt-20 space-y-3">
          <h3 className="text-lg font-bold text-evergreen-dark flex items-center gap-2">
            <Users className="h-5 w-5 text-evergreen" strokeWidth={2.25} aria-hidden />
            Ingredient library
          </h3>

          <form
            onSubmit={addIngredientToLibrary}
            className="rounded-2xl border border-evergreen/20 bg-white p-4 shadow-sm grid gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]"
          >
            <label className="text-xs font-semibold text-slate-600">
              Ingredient
              <input
                type="text"
                required
                value={newIngredientName}
                onChange={(event) => setNewIngredientName(event.target.value)}
                placeholder="e.g. Nutritional yeast"
                className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Unit
              <input
                type="text"
                required
                value={newIngredientUnit}
                onChange={(event) => setNewIngredientUnit(event.target.value)}
                placeholder="tbsp"
                className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Category
              <input
                type="text"
                required
                value={newIngredientCategory}
                onChange={(event) => setNewIngredientCategory(event.target.value)}
                placeholder="Seasoning"
                className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="self-end h-9 rounded-lg bg-evergreen text-white px-3 text-sm font-semibold hover:bg-evergreen-dark"
            >
              Add
            </button>
          </form>

          <div className="rounded-2xl border border-evergreen/20 bg-white p-4 shadow-sm">
            <label className="block text-xs font-semibold text-slate-600">
              Search ingredients
              <input
                type="text"
                value={ingredientQuery}
                onChange={(event) => setIngredientQuery(event.target.value)}
                placeholder="Filter by name, category, or unit"
                className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm"
              />
            </label>
            <ul className="mt-3 space-y-1.5">
              {filteredIngredients.map((item) => {
                const usage = ingredientUsage.get(item.id) ?? 0;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.category} · default {item.defaultUnit} · used in {usage} recipe
                        {usage === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredientFromLibrary(item.id)}
                      disabled={usage > 0}
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent"
                      aria-label={`Remove ${item.name}`}
                      title={usage > 0 ? 'Ingredient is in use by recipes' : 'Remove ingredient'}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
              {filteredIngredients.length === 0 ? (
                <li className="text-sm text-slate-500 py-2">No ingredients match this filter.</li>
              ) : null}
            </ul>
          </div>
        </section>
      </main>

      {draftOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 p-0 sm:p-4 flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-evergreen/25 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
              <h4 className="font-bold text-evergreen-dark">
                {editingRecipeId ? 'Edit recipe' : 'New recipe'}
              </h4>
              <button
                type="button"
                onClick={() => setDraftOpen(false)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                aria-label="Close recipe form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveRecipeDraft} className="p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1.8fr_1fr]">
                <label className="text-xs font-semibold text-slate-600">
                  Recipe name
                  <input
                    type="text"
                    required
                    value={recipeDraft.name}
                    onChange={(event) =>
                      setRecipeDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Base servings
                  <input
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={recipeDraft.baseServings}
                    onChange={(event) =>
                      setRecipeDraft((prev) => ({ ...prev, baseServings: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-600">
                Description (optional)
                <textarea
                  value={recipeDraft.description}
                  onChange={(event) =>
                    setRecipeDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-sm min-h-[68px]"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-evergreen-dark">Ingredients for this recipe</p>
                  <button
                    type="button"
                    onClick={() =>
                      setRecipeDraft((prev) => ({
                        ...prev,
                        ingredients: [
                          ...prev.ingredients,
                          { id: newId(), ingredientId: '', quantity: '1', unit: '', notes: '' },
                        ],
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-evergreen/30 px-2.5 py-1.5 text-xs font-semibold text-evergreen-dark hover:bg-evergreen-light/30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add row
                  </button>
                </div>

                {recipeDraft.ingredients.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 p-3 grid gap-2 sm:grid-cols-[1.8fr_0.7fr_0.8fr_1fr_auto]"
                  >
                    <label className="text-[11px] font-semibold text-slate-600">
                      Ingredient
                      <select
                        value={item.ingredientId}
                        onChange={(event) =>
                          setRecipeDraft((prev) => ({
                            ...prev,
                            ingredients: prev.ingredients.map((row) => {
                              if (row.id !== item.id) return row;
                              const selected = ingredientMap.get(event.target.value);
                              return {
                                ...row,
                                ingredientId: event.target.value,
                                unit: row.unit || selected?.defaultUnit || '',
                              };
                            }),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-evergreen/30 px-2 py-1.5 text-sm bg-white"
                      >
                        <option value="">Select ingredient</option>
                        {data.ingredients.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Qty
                      <input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={item.quantity}
                        onChange={(event) =>
                          setRecipeDraft((prev) => ({
                            ...prev,
                            ingredients: prev.ingredients.map((row) =>
                              row.id === item.id ? { ...row, quantity: event.target.value } : row,
                            ),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-evergreen/30 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Unit
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(event) =>
                          setRecipeDraft((prev) => ({
                            ...prev,
                            ingredients: prev.ingredients.map((row) =>
                              row.id === item.id ? { ...row, unit: event.target.value } : row,
                            ),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-evergreen/30 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">
                      Notes
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(event) =>
                          setRecipeDraft((prev) => ({
                            ...prev,
                            ingredients: prev.ingredients.map((row) =>
                              row.id === item.id ? { ...row, notes: event.target.value } : row,
                            ),
                          }))
                        }
                        className="mt-1 w-full rounded-lg border border-evergreen/30 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <div className="self-end">
                      <button
                        type="button"
                        onClick={() =>
                          setRecipeDraft((prev) => ({
                            ...prev,
                            ingredients:
                              prev.ingredients.length > 1
                                ? prev.ingredients.filter((row) => row.id !== item.id)
                                : prev.ingredients,
                          }))
                        }
                        disabled={recipeDraft.ingredients.length <= 1}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                        aria-label={`Remove ingredient row ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {recipeError ? <p className="text-sm text-rose-700">{recipeError}</p> : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDraftOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-evergreen px-3.5 py-2 text-sm font-semibold text-white hover:bg-evergreen-dark"
                >
                  Save recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="border-t border-evergreen/20 bg-white/80 py-4">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 text-xs text-slate-500 flex items-center gap-2">
          <Leaf className="h-3.5 w-3.5 text-evergreen" aria-hidden />
          Plant-Based Menu keeps recipe and ingredient data locally for your account on this device.
        </div>
      </footer>
    </div>
  );
}
