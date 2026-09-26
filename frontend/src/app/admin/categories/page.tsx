'use client';

import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { CategoryResponse } from '@/lib/types';
import { getErrorMessage } from '@/lib/api';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

function CategoryRow({ category }: { category: CategoryResponse }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  function handleSave() {
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    updateCategory.mutate(
      { id: category.id, name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Category updated');
          setEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Could not update category')),
      },
    );
  }

  function handleDelete() {
    if (!confirm(`Delete category "${category.name}"?`)) return;
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success('Category deleted'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not delete category')),
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-100 last:border-0">
        <td className="px-4 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <button onClick={handleSave} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50">
              <Check size={16} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
      <td className="px-4 py-3 text-slate-500">{category.description || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Pencil size={16} />
          </button>
          <button onClick={handleDelete} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewCategoryForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createCategory = useCreateCategory();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    createCategory.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Category created');
          setName('');
          setDescription('');
        },
        onError: (err) => toast.error(getErrorMessage(err, 'Could not create category')),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={createCategory.isPending}
        className="flex items-center justify-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        <Plus size={16} /> Add
      </button>
    </form>
  );
}

export default function AdminCategoriesPage() {
  const { data: categories, isLoading } = useCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Categories</h1>
      <NewCategoryForm />

      {isLoading ? (
        <PageSpinner />
      ) : !categories || categories.length === 0 ? (
        <EmptyState title="No categories yet" description="Add a category to start organizing products." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
