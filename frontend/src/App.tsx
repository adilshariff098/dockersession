import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Todo = {
  id: string
  title: string
  description: string
  completed: boolean
  createdAt: string
  updatedAt: string
}
type Filter = 'all' | 'active' | 'completed'

async function api<T>(path = '', options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/todos${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(
      error?.detail ?? 'Unable to reach the task service. Please try again.',
    )
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

function Icon({
  name,
}: {
  name: 'plus' | 'edit' | 'delete' | 'check' | 'arrow' | 'search'
}) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    edit: 'm16 3 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z',
    delete: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
    check: 'm5 12 4 4L19 6',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Todo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)

  async function load(signal?: AbortSignal) {
    try {
      setTodos(await api<Todo[]>('', { signal }))
    } catch (problem) {
      if (!signal?.aborted)
        setError(
          problem instanceof Error ? problem.message : 'Could not load tasks.',
        )
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }
  function retryLoad() {
    setLoading(true)
    setError('')
    void load()
  }
  useEffect(() => {
    const controller = new AbortController()
    api<Todo[]>('', { signal: controller.signal })
      .then(setTodos)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted)
          setError(problem instanceof Error ? problem.message : 'Could not load tasks.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (dialogOpen && !dialog.current?.open) {
      dialog.current?.showModal()
      titleInput.current?.focus()
    } else if (!dialogOpen && dialog.current?.open) dialog.current.close()
  }, [dialogOpen])

  function openEditor(todo: Todo | null = null) {
    setEditing(todo)
    setTitle(todo?.title ?? '')
    setDescription(todo?.description ?? '')
    setFormError('')
    setDialogOpen(true)
  }
  function closeEditor() {
    if (!saving) setDialogOpen(false)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setFormError('Give your task a title.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const saved = await api<Todo>(editing ? `/${editing.id}` : '', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          completed: editing?.completed ?? false,
        }),
      })
      setTodos((current) =>
        editing
          ? current.map((todo) => (todo.id === saved.id ? saved : todo))
          : [saved, ...current],
      )
      setDialogOpen(false)
      setError('')
    } catch (problem) {
      setFormError(
        problem instanceof Error ? problem.message : 'Could not save task.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function change(todo: Todo, remove = false) {
    if (busyIds.has(todo.id)) return
    if (remove && !window.confirm(`Delete “${todo.title}”?`)) return
    setBusyIds((current) => new Set(current).add(todo.id))
    setError('')
    try {
      if (remove) {
        await api<void>(`/${todo.id}`, { method: 'DELETE' })
        setTodos((current) => current.filter((item) => item.id !== todo.id))
      } else {
        const saved = await api<Todo>(`/${todo.id}/completion`, {
          method: 'PATCH',
          body: JSON.stringify({ completed: !todo.completed }),
        })
        setTodos((current) =>
          current.map((item) => (item.id === saved.id ? saved : item)),
        )
      }
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Could not update task.',
      )
    } finally {
      setBusyIds((current) => {
        const next = new Set(current)
        next.delete(todo.id)
        return next
      })
    }
  }

  const completed = todos.filter((todo) => todo.completed).length
  const active = todos.length - completed
  const progress = todos.length
    ? Math.round((completed / todos.length) * 100)
    : 0
  const visible = todos.filter(
    (todo) =>
      (filter === 'all' ||
        (filter === 'completed' ? todo.completed : !todo.completed)) &&
      `${todo.title} ${todo.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Little by little home">
          <span className="brand-mark">
            <Icon name="check" />
          </span>
          little by little<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Task views">
          <button
            className={filter === 'all' ? 'nav-item selected' : 'nav-item'}
            onClick={() => setFilter('all')}
          >
            <span className="nav-symbol">▦</span>All tasks
            <span className="nav-count">{todos.length}</span>
          </button>
          <button
            className={filter === 'active' ? 'nav-item selected' : 'nav-item'}
            onClick={() => setFilter('active')}
          >
            <span className="nav-symbol">◷</span>In progress
            <span className="nav-count">{active}</span>
          </button>
          <button
            className={
              filter === 'completed' ? 'nav-item selected' : 'nav-item'
            }
            onClick={() => setFilter('completed')}
          >
            <Icon name="check" />
            Completed<span className="nav-count">{completed}</span>
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="note-spark">✳</span>
          <p>
            Small steps.
            <br />
            Good things ahead.
          </p>
          <span>A little progress, every day.</span>
        </div>
        <div className="profile">
          <span className="avatar">Y</span>
          <div>
            <strong>Your space</strong>
            <small>Make room for what matters</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            WORKSPACE<span className="crumb">/</span>
            <strong>My tasks</strong>
          </span>
          <span className="date">
            {new Intl.DateTimeFormat('en', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date())}
          </span>
        </header>
        <div className="main-content">
          <div className="heading-row">
            <div>
              <div className="eyebrow">A CLEARER DAY STARTS HERE</div>
              <h1>
                A lil focus.
                <br />
                <span>A lot of possibility.</span>
              </h1>
              <p className="intro">
                Get it out of your head. Take it one task at a time.
              </p>
            </div>
            <button
              className="button primary new-task"
              onClick={() => openEditor()}
            >
              <Icon name="plus" />
              New task
            </button>
          </div>
          <section className="overview" aria-label="Task overview">
            <div className="stat">
              <span className="stat-label">ON YOUR LIST</span>
              <div>
                <strong>{todos.length.toString().padStart(2, '0')}</strong>
                <span>total tasks</span>
              </div>
            </div>
            <div className="stat">
              <span className="stat-label">ONE STEP AT A TIME</span>
              <div>
                <strong>{active.toString().padStart(2, '0')}</strong>
                <span>still to do</span>
              </div>
            </div>
            <div className="stat progress-stat">
              <span className="stat-label">LOOK AT YOU GO</span>
              <div>
                <strong>
                  {progress}
                  <small>%</small>
                </strong>
                <span>completed</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </section>
          <section className="task-section" aria-labelledby="task-heading">
            <div className="section-heading">
              <div>
                <h2 id="task-heading">
                  Your tasks<span>{todos.length}</span>
                </h2>
                <p>A place for everything on your mind.</p>
              </div>
              <label className="search">
                <Icon name="search" />
                <input
                  aria-label="Search tasks"
                  placeholder="Find a task…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            <div className="filter-row" aria-label="Filter tasks">
              {(['all', 'active', 'completed'] as Filter[]).map((value) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  className={filter === value ? 'filter active' : 'filter'}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all'
                    ? 'All tasks'
                    : value === 'active'
                      ? 'To do'
                      : 'Completed'}
                </button>
              ))}
              <span className="sort-label">Newest first ↓</span>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {error}
                <button onClick={retryLoad}>Retry</button>
              </div>
            )}
            <div className="task-list" aria-live="polite" aria-busy={loading}>
              {loading ? (
                <div className="empty-state">
                  <span className="loading-dot" />
                  <h3>Gathering your tasks…</h3>
                </div>
              ) : visible.length ? (
                visible.map((todo) => (
                  <article
                    key={todo.id}
                    className={`task-card ${todo.completed ? 'is-complete' : ''}`}
                  >
                    <button
                      disabled={busyIds.has(todo.id)}
                      className="checkbox"
                      role="checkbox"
                      aria-checked={todo.completed}
                      aria-label={`Mark ${todo.title} ${todo.completed ? 'incomplete' : 'complete'}`}
                      onClick={() => void change(todo)}
                    >
                      {todo.completed && <Icon name="check" />}
                    </button>
                    <div className="task-copy">
                      <h3>{todo.title}</h3>
                      {todo.description && <p>{todo.description}</p>}
                      <div className="task-meta">
                        <span
                          className={
                            todo.completed ? 'status complete' : 'status'
                          }
                        >
                          {todo.completed ? 'Completed' : 'To do'}
                        </span>
                        <time dateTime={todo.createdAt}>
                          {new Intl.DateTimeFormat('en', {
                            month: 'short',
                            day: 'numeric',
                          }).format(new Date(todo.createdAt))}
                        </time>
                      </div>
                    </div>
                    <div className="task-actions">
                      <button
                        className="icon-button"
                        disabled={busyIds.has(todo.id)}
                        aria-label={`Edit ${todo.title}`}
                        onClick={() => openEditor(todo)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="icon-button delete"
                        disabled={busyIds.has(todo.id)}
                        aria-label={`Delete ${todo.title}`}
                        onClick={() => void change(todo, true)}
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-illustration">
                    <Icon name="check" />
                  </span>
                  <h3>
                    {error
                      ? 'Your tasks are out of reach'
                      : search
                        ? 'No matching tasks'
                        : filter === 'completed'
                          ? 'Your wins will live here'
                          : filter === 'active' && todos.length
                            ? 'Everything is checked off'
                            : 'Make room for your next little step'}
                  </h3>
                  <p>
                    {error
                      ? 'Check that the backend is running, then try again.'
                      : search
                        ? 'Try another word or clear your search.'
                        : filter === 'completed'
                          ? 'Complete a task and celebrate a little progress.'
                          : 'Big plans start with one small task.'}
                  </p>
                  {!error && !search && filter !== 'completed' && (
                    <button
                      className="text-button"
                      onClick={() => openEditor()}
                    >
                      Add a task
                      <Icon name="arrow" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="list-footer">
              <span>
                {loading
                  ? 'Loading tasks'
                  : `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'} in this view`}
              </span>
              <span>You’ve got this. One thing at a time.</span>
            </div>
          </section>
          <footer className="page-footer">
            LESS MENTAL CLUTTER. MORE ROOM TO BREATHE.<span>✳</span>
          </footer>
        </div>
      </main>
      <dialog
        ref={dialog}
        onCancel={(event) => {
          event.preventDefault()
          closeEditor()
        }}
        onClose={() => {
          if (!saving) setDialogOpen(false)
        }}
      >
        <form onSubmit={save} className="task-form">
          <div className="dialog-heading">
            <span className="eyebrow">ONE SMALL STEP</span>
            <button
              type="button"
              className="close-button"
              aria-label="Close task form"
              disabled={saving}
              onClick={closeEditor}
            >
              ×
            </button>
          </div>
          <h2>{editing ? 'A little adjustment.' : 'What’s on your mind?'}</h2>
          <p>
            {editing
              ? 'Give your next step a little clarity.'
              : 'Give it a name. We’ll keep it here for you.'}
          </p>
          <label htmlFor="task-title">
            Task title<span> *</span>
          </label>
          <input
            ref={titleInput}
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
            placeholder="e.g. Make a little progress on my project"
            disabled={saving}
          />
          <label htmlFor="task-description">
            Notes<span className="optional">optional</span>
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Any details you’d like to remember…"
            disabled={saving}
          />
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={closeEditor}
            >
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
              <Icon name="plus" />
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
